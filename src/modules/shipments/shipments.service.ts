// src/modules/shipments/shipments.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger, Inject, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import type { Shipment } from "@prisma/client";
import { UpdateShipmentDto } from "./dto/update-shipment.dto";
import type { StorageService } from "../../common/storage/storage.interface";
import { MailService } from "../../common/mail/mail.service";
import { ShipmentsGateway } from "./shipments.gateway";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";

@Injectable()
export class ShipmentsService {
	private readonly logger = new Logger(ShipmentsService.name);

	constructor(
		private readonly prisma: PrismaService,
		@Inject("StorageService") private readonly storage: StorageService,
		private readonly mailer: MailService,
		private readonly gateway: ShipmentsGateway,
		private readonly cfg: ConfigService
	) {}

	// CREATE SHIPMENT
	async create(dto: CreateShipmentDto, userId: string, files?: Express.Multer.File[]): Promise<Shipment> {
		try {
			// Upload all shipment files concurrently
			const uploadPromises = files?.map((file) => this.storage.uploadFile(file, { folder: "shipment-docs" })) ?? [];

			const uploadedDocs = await Promise.all(uploadPromises);

			// Create shipment + related documents in a transaction
			const shipment = await this.prisma.$transaction(async (tx) => {
				const createdShipment = await tx.shipment.create({
					data: {
						trackingNumber: dto.trackingNumber,
						originCountry: dto.originCountry,
						destinationCountry: dto.destinationCountry,
						status: dto.status ?? "pending",
						customerId: userId,

						payment: dto.payment,
						client: dto.client,
						email: dto.email,
						originAddress: dto.originAddress,
						originPhone: dto.originPhone,
						originState: dto.originState,
						destinationAddress: dto.destinationAddress,
						destinationPhone: dto.destinationPhone,
						destinationState: dto.destinationState,
						cargoType: dto.cargoType,
						weight: dto.weight,
						tons: dto.tons,
						pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : null,
						deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
						serviceLevel: dto.serviceLevel,
					},
				});

				if (uploadedDocs.length > 0) {
					await tx.shipmentDocument.createMany({
						data: uploadedDocs.map((doc) => ({
							shipmentId: createdShipment.id,
							url: doc.url,
						})),
					});
				}

				return createdShipment;
			});

			// Send shipment confirmation email
			if (dto.email) {
				await this.mailer.sendShipmentCreated(dto.email, {
					clientName: dto.client ?? "Customer",
					trackingNumber: dto.trackingNumber,
					origin: dto.originCountry,
					destination: dto.destinationCountry,
					estimatedDelivery: dto.deliveryDate ? new Date(dto.deliveryDate).toDateString() : null,
					status: dto.status ?? "Pending",
					trackingUrl: `${this.cfg.get("APP_URL")}/shipments/tracking/${dto.trackingNumber}`,
				});
			}

			// // Emit WebSocket notification
			this.gateway.emitShipmentCreated({
				id: shipment.id,
				trackingNumber: shipment.trackingNumber,
				origin: shipment.originCountry,
				destination: shipment.destinationCountry,
				status: shipment.status,
			});

			return shipment;
		} catch (err: any) {
			this.logger.error("Shipment creation failed", err);
			throw new BadRequestException(err.message || "Shipment creation failed");
		}
	}

	// FIND ONE (verify belongs to user)
	async findOneForUser(id: string, userId: string): Promise<Shipment> {
		const shipment = await this.prisma.shipment.findFirst({
			where: { id, customerId: userId },
			include: { documents: true },
		});

		if (!shipment) throw new NotFoundException("Shipment not found or access denied");
		return shipment;
	}

	// UPDATE (only if owned by user)
	async updateForUser(id: string, dto: UpdateShipmentDto, userId: string): Promise<Shipment> {
		const exists = await this.prisma.shipment.findFirst({ where: { id, customerId: userId } });
		if (!exists) throw new NotFoundException("Shipment not found or access denied");

		const updated = await this.prisma.shipment.update({
			where: { id },
			data: {
				...dto,
				pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : exists.pickupDate,
				deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : exists.deliveryDate,
			},
		});

		this.gateway.emitShipmentUpdated(updated);
		return updated;
	}

	// DELETE (only if owned by user)
	async removeForUser(id: string, userId: string): Promise<{ message: string }> {
		const exists = await this.prisma.shipment.findFirst({ where: { id, customerId: userId } });
		if (!exists) throw new NotFoundException("Shipment not found or access denied");

		await this.prisma.$transaction(async (tx) => {
			await tx.shipmentDocument.deleteMany({ where: { shipmentId: id } });
			await tx.shipment.delete({ where: { id } });
		});

		return { message: "Shipment deleted successfully" };
	}

	async findAllForUser(userId: string): Promise<Shipment[]> {
		return this.prisma.shipment.findMany({
			where: { customerId: userId },
			orderBy: { createdAt: "desc" },
			include: {
				customer: { select: { id: true, email: true } },
				documents: true,
			},
		});
	}

	generateTrackingNumber(prefix = "HAGE"): string {
		const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
		const randomPart = randomBytes(3).toString("hex").toUpperCase();
		return `${prefix}-${datePart}-${randomPart}`;
	}

	async findByTrackingNumber(trackingNumber: string): Promise<Shipment> {
		const s = await this.prisma.shipment.findUnique({
			where: { trackingNumber },
			include: {
				events: { orderBy: { timestamp: "desc" } },
				documents: true,
				customer: { select: { id: true, email: true } },
			},
		});
		if (!s) throw new NotFoundException("Shipment not found");
		return s;
	}

	async updateStatus(id: string, newStatus: string, note?: string, userId?: string): Promise<Shipment> {
		const shipment = await this.prisma.shipment.findUnique({
			where: { id },
			include: { customer: true },
		});

		if (!shipment) throw new NotFoundException("Shipment not found");

		// Ensure the shipment belongs to the authenticated user (customer)
		if (shipment.customerId && shipment.customerId !== userId) {
			throw new ForbiddenException("You are not authorized to update this shipment");
		}

		// Skip if status didn’t actually change
		if (shipment.status === newStatus) {
			throw new BadRequestException(`Shipment is already ${newStatus}`);
		}

		// perform status update + create a tracking event
		const updated = await this.prisma.$transaction(async (tx) => {
			const updatedShipment = await tx.shipment.update({
				where: { id },
				data: { status: newStatus },
				include: { customer: true, documents: true },
			});

			return updatedShipment;
		});

		// Emit real-time update via WebSocket
		this.gateway.emitShipmentUpdated({
			id: updated.id,
			trackingNumber: updated.trackingNumber,
			status: updated.status,
		});

		// Send email notification (optional)
		if (updated.email) {
			try {
				await this.mailer.sendShipmentStatusUpdate(updated.email, {
					clientName: updated.client ?? "Customer",
					trackingNumber: updated.trackingNumber,
					status: newStatus,
					origin: updated.originCountry ?? updated.originAddress,
					destination: updated.destinationCountry ?? updated.destinationAddress,
					estimatedDelivery: updated.deliveryDate?.toDateString() ?? "N/A",
					trackingUrl: `${this.cfg.get("APP_URL")}/shipments/tracking/${updated.trackingNumber}`,
				});
			} catch (err: any) {
				this.logger.error(`Failed to send status update email: ${err.message}`);
			}
		}

		return updated;
	}
}
