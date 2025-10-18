// src/modules/shipments/shipments.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger, Inject, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { UpdateShipmentDto } from "./dto/update-shipment.dto";
import { UpdateStatusDto, ShipmentStatus } from "./dto/update-status.dto";
import { AssignShipmentDto } from "./dto/assign-shipment.dto";
import { FilterShipmentDto } from "./dto/filter-shipment.dto";
import type { Shipment } from "@prisma/client";
import type { StorageService } from "../../common/storage/storage.interface";
import { MailService } from "../../common/mail/mail.service";
import { ConfigService } from "@nestjs/config";

enum DocumentType {
	COMMERCIAL_INVOICE = "COMMERCIAL_INVOICE",
	PACKING_LIST = "PACKING_LIST",
	WAYBILL = "WAYBILL",
	BILL_OF_LADING = "BILL_OF_LADING",
	OTHER = "OTHER",
}

@Injectable()
export class ShipmentsService {
	private readonly logger = new Logger(ShipmentsService.name);

	constructor(private readonly prisma: PrismaService, @Inject("StorageService") private readonly storage: StorageService, private readonly mailer: MailService, private readonly cfg: ConfigService) {}

	// CREATE SHIPMENT (Step 1: Order Creation)
	async create(dto: CreateShipmentDto, lspUserId: string, files?: Express.Multer.File[]): Promise<Shipment> {
		try {
			// Validate required fields
			this.validateShipmentData(dto);

			// Upload documents concurrently
			const uploadPromises = files?.map((file) => this.storage.uploadFile(file, { folder: "shipment-documents" })) ?? [];
			const uploadedDocs = await Promise.all(uploadPromises);

			// Calculate total cost
			const totalCost = this.calculateTotalCost(dto.baseFrieght as any, dto.handlingFee as any, dto.insuranceFee as any);

			const sanitizeNumber = (num?: any) => (isNaN(Number(num)) ? 0 : Number(num));

			// Create shipment + documents in transaction
			const shipment = await this.prisma.$transaction(async (tx) => {
				const createdShipment = await tx.shipment.create({
					data: {
						orderId: dto.orderId,
						clientName: dto.clientName,
						email: dto.email,
						phone: dto.phone,
						cargoType: dto.cargoType,
						tons: sanitizeNumber(dto.tons),
						weight: sanitizeNumber(dto.weight),
						handlingInstructions: dto.handlingInstructions,
						origin: JSON.stringify(dto.origin),
						destination: JSON.stringify(dto.destination),
						pickupMode: dto.pickupMode,
						pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : null,
						deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
						serviceType: dto.serviceType,
						baseFrieght: sanitizeNumber(dto.baseFrieght),
						handlingFee: sanitizeNumber(dto.handlingFee),
						insuranceFee: sanitizeNumber(dto.insuranceFee),
						totalCost: sanitizeNumber(dto.baseFrieght) + sanitizeNumber(dto.handlingFee) + sanitizeNumber(dto.insuranceFee),
						status: "PENDING_ACCEPTANCE",
						createdBy: lspUserId,
						customerId: lspUserId,
					},
				});

				// Create status history entry
				await tx.shipmentStatusHistory.create({
					data: {
						shipmentId: createdShipment.id,
						status: ShipmentStatus.PENDING_ACCEPTANCE as any,
						updatedBy: lspUserId,
					},
				});

				// Upload and link documents
				if (uploadedDocs.length > 0) {
					await tx.shipmentDocument.createMany({
						data: uploadedDocs.map((doc, index) => ({
							shipmentId: createdShipment.id,
							docType: this.detectDocumentType(files?.[index]?.originalname) as any,
							url: doc.url,
						})),
					});
				}

				return createdShipment;
			});

			// Send confirmation email
			if (dto.email) {
				await this.mailer.sendShipmentCreated(dto.email, {
					clientName: dto.clientName,
					trackingNumber: dto.orderId,
					origin: (dto.origin as any).country,
					destination: (dto.destination as any).country,
					estimatedDelivery: dto.deliveryDate ? new Date(dto.deliveryDate).toDateString() : "TBD",
					status: "Pending Acceptance",
					trackingUrl: `${this.cfg.get("APP_URL")}/shipments/track/${dto.orderId}`,
				});
			}

			// Create in-app notification
			await this.createNotification(lspUserId, `New shipment ${dto.orderId} created successfully`, "in-app");

			return shipment;
		} catch (err: any) {
			this.logger.error("Shipment creation failed", err);
			throw new BadRequestException(err.message || "Shipment creation failed");
		}
	}

	// ACCEPT & ASSIGN SHIPMENT (Step 2)
	async acceptAndAssign(shipmentId: string, dto: AssignShipmentDto, lspUserId: string): Promise<Shipment> {
		// 1. Verify user is LSP
		const user = await this.prisma.user.findUnique({
			where: { id: lspUserId },
		});

		if (!user) throw new NotFoundException("User not found");

		if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && user.role !== "CROSS_BORDER_LOGISTICS") {
			throw new ForbiddenException("Only LSP can accept and assign orders");
		}

		// 2. Find shipment
		const shipment = await this.prisma.shipment.findUnique({
			where: { id: shipmentId },
		});

		if (!shipment) throw new NotFoundException("Shipment not found");

		if (shipment.status !== (ShipmentStatus.PENDING_ACCEPTANCE as any)) {
			throw new BadRequestException("Shipment already accepted or not pending");
		}

		// 3. Validate transporter exists and has correct role
		if (dto.transporterId) {
			const transporter = await this.prisma.user.findUnique({
				where: { id: dto.transporterId },
			});

			if (!transporter || transporter.role !== "TRANSPORTER") {
				throw new BadRequestException("Invalid transporter");
			}
		}

		// 4. Validate warehouse exists
		if (dto.warehouseId) {
			const warehouse = await this.prisma.warehouse.findUnique({
				where: { id: dto.warehouseId },
			});

			if (!warehouse) {
				throw new BadRequestException("Invalid warehouse");
			}
		}

		const updated = await this.prisma.$transaction(async (tx) => {
			const updatedShipment = await tx.shipment.update({
				where: { id: shipmentId },
				data: {
					status: ShipmentStatus.ACCEPTED as any,
					assignedTransporterId: dto.transporterId,
					assignedWarehouseId: dto.warehouseId,
				},
				include: {
					transporter: true,
					warehouse: true,
				},
			});

			await tx.shipmentStatusHistory.create({
				data: {
					shipmentId,
					status: ShipmentStatus.ACCEPTED as any,
					updatedBy: lspUserId,
				},
			});

			return updatedShipment;
		});

		// Notify assigned parties
		if (dto.transporterId) {
			await this.createNotification(dto.transporterId, `You have been assigned to shipment ${shipment.orderId}`, "in-app");
		}

		if (dto.warehouseId) {
			await this.createNotification(dto.warehouseId, `Shipment ${shipment.orderId} assigned to your warehouse`, "in-app");
		}

		if (shipment.email) {
			await this.mailer.sendShipmentStatusUpdate(shipment.email, {
				clientName: shipment.clientName,
				trackingNumber: shipment.orderId,
				status: "Accepted",
				origin: (shipment.origin as any).country,
				destination: (shipment.destination as any).country,
				estimatedDelivery: shipment.deliveryDate?.toDateString() ?? "TBD",
				trackingUrl: `${this.cfg.get("APP_URL")}/shipments/track/${shipment.orderId}`,
			});
		}

		// Create Notifications
		await Promise.all([
			this.createNotification(lspUserId, `You accepted shipment ${shipment.orderId}`, "in-app"),
			this.createNotification(shipment.customerId, `Shipment ${shipment.orderId} has been accepted`, "in-app"),
			dto.transporterId ? this.createNotification(dto.transporterId, `You have been assigned to shipment ${shipment.orderId}`, "in-app") : Promise.resolve(),
			dto.warehouseId ? this.createNotification(dto.warehouseId, `Shipment ${shipment.orderId} assigned to your warehouse`, "in-app") : Promise.resolve(),
		]);

		return updated;
	}

	// UPDATE STATUS (Step 3)
	async updateStatus(shipmentId: string, dto: UpdateStatusDto, updatedBy: string): Promise<Shipment> {
		const shipment = await this.prisma.shipment.findUnique({
			where: { id: shipmentId },
			include: { transporter: true },
		});

		if (!shipment) throw new NotFoundException("Shipment not found");

		const user = await this.prisma.user.findUnique({
			where: { id: updatedBy },
		});

		if (!user) throw new NotFoundException("User not found");

		// PERMISSION CHECK: Who can update what status
		if (dto.status === ShipmentStatus.ACCEPTED) {
			// Only LSP can accept
			if (user.kind !== "LOGISTIC_SERVICE_PROVIDER") {
				throw new ForbiddenException("Only LSP can accept orders");
			}
		} else if (dto.status === ShipmentStatus.PICKED_UP) {
			// Only assigned transporter can mark as picked up
			if (shipment.assignedTransporterId !== updatedBy) {
				throw new ForbiddenException("Only assigned transporter can update to picked up");
			}
		} else if (dto.status === ShipmentStatus.CANCELLED) {
			// Only LSP can cancel
			if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" || shipment.createdBy == user.id) {
				throw new ForbiddenException("Only LSP and order creator can cancel orders");
			}
		} else if ([ShipmentStatus.EN_ROUTE_TO_PICKUP, ShipmentStatus.IN_TRANSIT].includes(dto.status)) {
			// LSP or assigned transporter
			if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && shipment.assignedTransporterId !== updatedBy) {
				throw new ForbiddenException("Not authorized to update this status");
			}
		} else if (dto.status === ShipmentStatus.COMPLETED) {
			// LSP or last mile provider
			if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && user.role !== "LAST_MILE_PROVIDER") {
				throw new ForbiddenException("Only LSP or last mile provider can complete orders");
			}
		}

		this.validateStatusTransition(shipment.status, dto.status);

		const updated = await this.prisma.$transaction(async (tx) => {
			const updatedShipment = await tx.shipment.update({
				where: { id: shipmentId },
				data: { status: dto.status as any },
				include: { transporter: true, warehouse: true, documents: true },
			});

			await tx.shipmentStatusHistory.create({
				data: {
					shipmentId,
					status: dto.status as any,
					updatedBy,
					note: dto.note,
				},
			});

			return updatedShipment;
		});

		const majorStatuses = [ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.ARRIVED_AT_DESTINATION, ShipmentStatus.COMPLETED];

		if (majorStatuses.includes(dto.status) && shipment.email) {
			await this.mailer.sendShipmentStatusUpdate(shipment.email, {
				clientName: shipment.clientName,
				trackingNumber: shipment.orderId,
				status: this.formatStatusForDisplay(dto.status),
				origin: (shipment.origin as any).country,
				destination: (shipment.destination as any).country,
				estimatedDelivery: shipment.deliveryDate?.toDateString() ?? "TBD",
				trackingUrl: `${this.cfg.get("APP_URL")}/shipments/track/${shipment.orderId}`,
			});
		}

		// Create Notifications
		await Promise.all([
			this.createNotification(updatedBy, `You updated shipment ${shipment.orderId} to ${dto.status}`, "in-app"),
			this.createNotification(shipment.customerId, `Your shipment ${shipment.orderId} status changed to ${dto.status}`, "in-app"),
			shipment.assignedTransporterId ? this.createNotification(shipment.assignedTransporterId, `Shipment ${shipment.orderId} is now ${dto.status}`, "in-app") : Promise.resolve(),
			shipment.assignedWarehouseId ? this.createNotification(shipment.assignedWarehouseId, `Shipment ${shipment.orderId} is now ${dto.status}`, "in-app") : Promise.resolve(),
		]);

		return updated;
	}

	// MAIN FIND ALL WITH ROLE-BASED ACCESS CONTROL
	async findAll(filters: FilterShipmentDto, userId: string) {
		// Get user details to determine access level
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, kind: true, role: true },
		});

		if (!user) throw new ForbiddenException("User not found");

		const { page = 1, limit = 20, ...filterCriteria } = filters;
		const skip = (page - 1) * limit;

		// Base where clause
		const where: any = {};

		// ROLE-BASED FILTERING
		if (user.kind === "LOGISTIC_SERVICE_PROVIDER" || user.role === "CROSS_BORDER_LOGISTICS") {
			// LSP and Cross-Border Logistics can see ALL shipments
			// No additional filter needed - they have full access
			this.logger.log(`LSP/Admin ${userId} accessing all shipments`);
		} else if (user.role === "TRANSPORTER") {
			// Transporters can only see shipments assigned to them
			where.assignedTransporterId = userId;
			this.logger.log(`Transporter ${userId} accessing assigned shipments`);
		} else if (user.role === "LAST_MILE_PROVIDER") {
			// Last mile providers can see shipments assigned to them
			where.assignedTransporterId = userId;
			this.logger.log(`Last mile provider ${userId} accessing assigned shipments`);
		} else if (user.kind === "ENTERPRISE" || user.kind === "DISTRIBUTOR") {
			// Enterprises and Distributors can only see shipments they created
			where.createdBy = userId;
			this.logger.log(`Enterprise/Distributor ${userId} accessing their shipments`);
		} else if (user.kind === "END_USER") {
			// End users can only see shipments where they are the customer
			where.customerId = userId;
			this.logger.log(`End user ${userId} accessing their shipments`);
		} else {
			// Unknown role - deny access
			throw new ForbiddenException("You do not have permission to view shipments");
		}

		// Apply additional filters from query parameters
		if (filterCriteria.status) {
			where.status = filterCriteria.status;
		}

		if (filterCriteria.orderId) {
			where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
		}

		if (filterCriteria.cargoType) {
			where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };
		}

		if (filterCriteria.origin) {
			where.origin = {
				path: ["country"],
				string_contains: filterCriteria.origin,
			};
		}

		if (filterCriteria.destination) {
			where.destination = {
				path: ["country"],
				string_contains: filterCriteria.destination,
			};
		}

		// Execute query
		const [shipments, total] = await Promise.all([
			this.prisma.shipment.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					customer: {
						select: {
							id: true,
							email: true,
							kind: true,
						},
					},
					transporter: {
						select: {
							id: true,
							email: true,
							role: true,
						},
					},
					warehouse: {
						select: {
							id: true,
							name: true,
							address: true,
						},
					},
					documents: {
						select: {
							id: true,
							docType: true,
							url: true,
							uploadedAt: true,
						},
					},
					creator: {
						select: {
							id: true,
							email: true,
							kind: true,
						},
					},
				},
			}),
			this.prisma.shipment.count({ where }),
		]);

		return {
			data: shipments,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
			meta: {
				userRole: user.kind,
				userRoleType: user.role,
				accessLevel: this.getAccessLevel(user.kind, user.role),
			},
		};
	}

	// SPECIFIC METHODS FOR EACH ROLE (Optional - for explicit calls)

	async findAllForTransporter(transporterId: string, filters: FilterShipmentDto) {
		// Verify user is actually a transporter
		const user = await this.prisma.user.findUnique({
			where: { id: transporterId },
			select: { role: true },
		});

		if (!user || (user.role !== "TRANSPORTER" && user.role !== "LAST_MILE_PROVIDER")) {
			throw new ForbiddenException("User is not a transporter");
		}

		const { page = 1, limit = 20, ...filterCriteria } = filters;
		const skip = (page - 1) * limit;

		const where: any = {
			assignedTransporterId: transporterId,
		};

		// Apply filters
		if (filterCriteria.status) where.status = filterCriteria.status;
		if (filterCriteria.orderId) where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
		if (filterCriteria.cargoType) where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };

		const [shipments, total] = await Promise.all([
			this.prisma.shipment.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					customer: { select: { id: true, email: true } },
					warehouse: { select: { id: true, name: true } },
					documents: true,
				},
			}),
			this.prisma.shipment.count({ where }),
		]);

		return {
			data: shipments,
			pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
		};
	}

	async findAllForCustomer(customerId: string, filters: FilterShipmentDto) {
		// Verify user is customer/enterprise
		const user = await this.prisma.user.findUnique({
			where: { id: customerId },
			select: { kind: true },
		});

		if (!user || !["ENTERPRISE", "DISTRIBUTOR", "END_USER"].includes(user.kind)) {
			throw new ForbiddenException("Invalid customer access");
		}

		const { page = 1, limit = 20, ...filterCriteria } = filters;
		const skip = (page - 1) * limit;

		const where: any = {
			// Check both createdBy and customerId
			OR: [{ createdBy: customerId }, { customerId: customerId }],
		};

		// Apply filters
		if (filterCriteria.status) where.status = filterCriteria.status;
		if (filterCriteria.orderId) where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
		if (filterCriteria.cargoType) where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };

		const [shipments, total] = await Promise.all([
			this.prisma.shipment.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					transporter: { select: { id: true, email: true } },
					warehouse: { select: { id: true, name: true } },
					documents: true,
					statusHistory: {
						orderBy: { timestamp: "desc" },
						take: 5, // Only recent history for customers
					},
				},
			}),
			this.prisma.shipment.count({ where }),
		]);

		return {
			data: shipments,
			pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
		};
	}

	async findAllForLSP(lspUserId: string, filters: FilterShipmentDto) {
		// Verify user is LSP
		const user = await this.prisma.user.findUnique({
			where: { id: lspUserId },
			select: { kind: true, role: true },
		});

		if (!user || (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && user.role !== "CROSS_BORDER_LOGISTICS")) {
			throw new ForbiddenException("Only LSP can access all shipments");
		}

		const { page = 1, limit = 20, ...filterCriteria } = filters;
		const skip = (page - 1) * limit;

		const where: any = {};

		// Apply all filters (LSP can filter everything)
		if (filterCriteria.status) where.status = filterCriteria.status;
		if (filterCriteria.orderId) where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
		if (filterCriteria.cargoType) where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };
		if (filterCriteria.origin) where.origin = { path: ["country"], string_contains: filterCriteria.origin };
		if (filterCriteria.destination) where.destination = { path: ["country"], string_contains: filterCriteria.destination };

		const [shipments, total] = await Promise.all([
			this.prisma.shipment.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					customer: { select: { id: true, email: true, kind: true } },
					creator: { select: { id: true, email: true, kind: true } },
					transporter: { select: { id: true, email: true, role: true } },
					warehouse: { select: { id: true, name: true, address: true } },
					documents: true,
					statusHistory: {
						orderBy: { timestamp: "desc" },
						take: 10,
						include: {
							updatedByUser: { select: { id: true, email: true } },
						},
					},
				},
			}),
			this.prisma.shipment.count({ where }),
		]);

		// Additional analytics for LSP
		const analytics = await this.getShipmentAnalytics(where);

		return {
			data: shipments,
			pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
			analytics,
		};
	}

	// HELPER: Get access level description
	private getAccessLevel(kind: string, role: string | null): string {
		if (kind === "LOGISTIC_SERVICE_PROVIDER" || role === "CROSS_BORDER_LOGISTICS") {
			return "full_access";
		} else if (role === "TRANSPORTER" || role === "LAST_MILE_PROVIDER") {
			return "assigned_only";
		} else if (kind === "ENTERPRISE" || kind === "DISTRIBUTOR") {
			return "created_only";
		} else if (kind === "END_USER") {
			return "customer_only";
		}
		return "no_access";
	}

	// HELPER: Get analytics for LSP dashboard
	private async getShipmentAnalytics(where: any) {
		const [totalShipments, pendingAcceptance, inTransit, completed, cancelled] = await Promise.all([
			this.prisma.shipment.count({ where }),
			this.prisma.shipment.count({ where: { ...where, status: "PENDING_ACCEPTANCE" } }),
			this.prisma.shipment.count({ where: { ...where, status: "IN_TRANSIT" } }),
			this.prisma.shipment.count({ where: { ...where, status: "COMPLETED" } }),
			this.prisma.shipment.count({ where: { ...where, status: "CANCELLED" } }),
		]);

		return {
			totalShipments,
			byStatus: {
				pendingAcceptance,
				inTransit,
				completed,
				cancelled,
			},
		};
	}

	// HELPER: Check if user can view specific shipment
	async canUserAccessShipment(shipmentId: string, userId: string): Promise<boolean> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { kind: true, role: true },
		});

		if (!user) return false;

		// LSP can access everything
		if (user.kind === "LOGISTIC_SERVICE_PROVIDER" || user.role === "CROSS_BORDER_LOGISTICS") {
			return true;
		}

		const shipment = await this.prisma.shipment.findUnique({
			where: { id: shipmentId },
			select: {
				createdBy: true,
				customerId: true,
				assignedTransporterId: true,
			},
		});

		if (!shipment) return false;

		// Check based on role
		if (user.role === "TRANSPORTER" || user.role === "LAST_MILE_PROVIDER") {
			return shipment.assignedTransporterId === userId;
		}

		if (user.kind === "ENTERPRISE" || user.kind === "DISTRIBUTOR") {
			return shipment.createdBy === userId;
		}

		if (user.kind === "END_USER") {
			return shipment.customerId === userId;
		}

		return false;
	}

	// UPDATE EXISTING findOne to include access check
	async findOne(shipmentId: string, userId: string): Promise<Shipment> {
		// Check access first
		const hasAccess = await this.canUserAccessShipment(shipmentId, userId);

		if (!hasAccess) {
			throw new ForbiddenException("You do not have permission to view this shipment");
		}

		const shipment = await this.prisma.shipment.findUnique({
			where: { id: shipmentId },
			include: {
				customer: true,
				creator: true,
				transporter: true,
				warehouse: true,
				documents: true,
				statusHistory: {
					orderBy: { timestamp: "desc" },
					include: { updatedByUser: { select: { id: true, email: true } } },
				},
			},
		});

		if (!shipment) throw new NotFoundException("Shipment not found");
		return shipment;
	}

	// TRACK BY ORDER ID
	async trackByOrderId(orderId: string, userId: string) {
		const shipment = await this.prisma.shipment.findUnique({
			where: { orderId },
			include: {
				statusHistory: { orderBy: { timestamp: "desc" } },
				documents: true,
			},
		});

		if (!shipment) throw new NotFoundException("Shipment not found");

		if (shipment.customerId !== userId) {
			throw new BadRequestException("Unauthorized to track this shipment");
		}

		return {
			orderId: shipment.orderId,
			clientName: shipment.clientName,
			status: shipment.status,
			origin: shipment.origin,
			destination: shipment.destination,
			pickupDate: shipment.pickupDate,
			deliveryDate: shipment.deliveryDate,
			currentLocation: this.getCurrentLocation(shipment.status),
			timeline: shipment.statusHistory.map((h) => ({
				status: h.status,
				timestamp: h.timestamp,
				note: h.note,
			})),
		};
	}

	// UPDATE SHIPMENT
	async update(shipmentId: string, dto: UpdateShipmentDto, userId: string): Promise<Shipment> {
		await this.verifyShipmentOwnership(shipmentId, userId);

		const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
		if (!shipment) throw new NotFoundException("Shipment not found");

		const totalCost =
			dto.baseFrieght || dto.handlingFee || dto.insuranceFee
				? this.calculateTotalCost((dto.baseFrieght as any) ?? shipment.baseFrieght, (dto.handlingFee as any) ?? shipment.handlingFee, dto.insuranceFee ?? (shipment.insuranceFee as any))
				: shipment.totalCost;

		const updated = await this.prisma.shipment.update({
			where: { id: shipmentId },
			data: {
				...dto,
				totalCost,
				pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : shipment.pickupDate,
				deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : shipment.deliveryDate,
				origin: dto.origin as any,
				destination: dto.destination as any,
				pickupMode: dto.pickupMode as any,
				serviceType: dto.serviceType as any,
			},
		});

		return updated;
	}

	// DELETE SHIPMENT
	async remove(shipmentId: string, userId: string): Promise<{ message: string }> {
		await this.verifyShipmentOwnership(shipmentId, userId);

		await this.prisma.$transaction(async (tx) => {
			await tx.shipmentDocument.deleteMany({ where: { shipmentId } });
			await tx.shipmentStatusHistory.deleteMany({ where: { shipmentId } });
			await tx.shipment.delete({ where: { id: shipmentId } });
		});

		return { message: "Shipment deleted successfully" };
	}

	// HELPERS
	generateOrderTrackingId(): string {
		const year = new Date().getFullYear();
		const randomId = Math.floor(10000 + Math.random() * 90000);
		return `SHP-${year}-${randomId}`;
	}

	private calculateTotalCost(base: number, handling: number, insurance?: number): number {
		return Number(base) + Number(handling) + (Number(insurance) ?? 0);
	}

	private validateShipmentData(dto: CreateShipmentDto): void {
		if (!dto.clientName || !dto.cargoType || !dto.orderId) {
			throw new BadRequestException("Missing required fields");
		}
	}

	private validateStatusTransition(current: string, next: ShipmentStatus): void {
		const validTransitions: Record<string, ShipmentStatus[]> = {
			[ShipmentStatus.PENDING_ACCEPTANCE]: [ShipmentStatus.ACCEPTED, ShipmentStatus.CANCELLED],
			[ShipmentStatus.ACCEPTED]: [ShipmentStatus.EN_ROUTE_TO_PICKUP, ShipmentStatus.CANCELLED],
			[ShipmentStatus.EN_ROUTE_TO_PICKUP]: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
			[ShipmentStatus.PICKED_UP]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
			[ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.ARRIVED_AT_DESTINATION, ShipmentStatus.CANCELLED],
			[ShipmentStatus.ARRIVED_AT_DESTINATION]: [ShipmentStatus.COMPLETED],
		};

		if (!validTransitions[current]?.includes(next)) {
			throw new BadRequestException(`Invalid status transition from ${current} to ${next}`);
		}
	}

	private formatStatusForDisplay(status: ShipmentStatus): string {
		return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	}

	private getCurrentLocation(status: string): string {
		const locationMap: Record<string, string> = {
			[ShipmentStatus.PENDING_ACCEPTANCE]: "Order Pending",
			[ShipmentStatus.ACCEPTED]: "Preparing for Pickup",
			[ShipmentStatus.EN_ROUTE_TO_PICKUP]: "En Route to Pickup Location",
			[ShipmentStatus.PICKED_UP]: "Picked Up",
			[ShipmentStatus.IN_TRANSIT]: "In Transit",
			[ShipmentStatus.ARRIVED_AT_DESTINATION]: "Arrived at Destination",
			[ShipmentStatus.COMPLETED]: "Delivered",
			[ShipmentStatus.CANCELLED]: "Cancelled",
		};
		return locationMap[status] || "Unknown";
	}

	private detectDocumentType(filename?: string): DocumentType {
		if (!filename) return DocumentType.OTHER;
		const lower = filename.toLowerCase();
		if (lower.includes("invoice")) return DocumentType.COMMERCIAL_INVOICE;
		if (lower.includes("packing")) return DocumentType.PACKING_LIST;
		if (lower.includes("waybill")) return DocumentType.WAYBILL;
		if (lower.includes("lading")) return DocumentType.BILL_OF_LADING;
		return DocumentType.OTHER;
	}

	private async createNotification(userId: string, message: string, type: "email" | "in-app" | "sms") {
		try {
			await this.prisma.notification.create({
				data: {
					userId,
					message,
					type: type.toUpperCase().replace("-", "_") as any,
					read: false,
				},
			});

			console.log("DONEEEEEEE");
		} catch (err: any) {
			this.logger.error(`Failed to create notification: ${err.message}`);
		}
	}

	private async verifyShipmentOwnership(shipmentId: string, userId: string): Promise<void> {
		const shipment = await this.prisma.shipment.findUnique({
			where: { id: shipmentId },
			select: { id: true, customerId: true },
		});

		if (!shipment) {
			throw new NotFoundException("Shipment not found");
		}

		if (shipment.customerId !== userId) {
			throw new BadRequestException("You are not authorized to access this shipment");
		}
	}
}
