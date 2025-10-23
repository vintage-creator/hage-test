"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShipmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const update_status_dto_1 = require("./dto/update-status.dto");
const mail_service_1 = require("../../common/mail/mail.service");
const config_1 = require("@nestjs/config");
var DocumentType;
(function (DocumentType) {
    DocumentType["COMMERCIAL_INVOICE"] = "COMMERCIAL_INVOICE";
    DocumentType["PACKING_LIST"] = "PACKING_LIST";
    DocumentType["WAYBILL"] = "WAYBILL";
    DocumentType["BILL_OF_LADING"] = "BILL_OF_LADING";
    DocumentType["OTHER"] = "OTHER";
})(DocumentType || (DocumentType = {}));
let ShipmentsService = ShipmentsService_1 = class ShipmentsService {
    constructor(prisma, storage, mailer, cfg) {
        this.prisma = prisma;
        this.storage = storage;
        this.mailer = mailer;
        this.cfg = cfg;
        this.logger = new common_1.Logger(ShipmentsService_1.name);
    }
    async create(dto, lspUserId, files) {
        try {
            this.validateShipmentData(dto);
            const uploadPromises = files?.map((file) => this.storage.uploadFile(file, { folder: "shipment-documents" })) ?? [];
            const uploadedDocs = await Promise.all(uploadPromises);
            const totalCost = this.calculateTotalCost(dto.baseFrieght, dto.handlingFee, dto.insuranceFee);
            const sanitizeNumber = (num) => (isNaN(Number(num)) ? 0 : Number(num));
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
                await tx.shipmentStatusHistory.create({
                    data: {
                        shipmentId: createdShipment.id,
                        status: update_status_dto_1.ShipmentStatus.PENDING_ACCEPTANCE,
                        updatedBy: lspUserId,
                    },
                });
                if (uploadedDocs.length > 0) {
                    await tx.shipmentDocument.createMany({
                        data: uploadedDocs.map((doc, index) => ({
                            shipmentId: createdShipment.id,
                            docType: this.detectDocumentType(files?.[index]?.originalname),
                            url: doc.url,
                        })),
                    });
                }
                return createdShipment;
            });
            if (dto.email) {
                await this.mailer.sendShipmentCreated(dto.email, {
                    clientName: dto.clientName,
                    trackingNumber: dto.orderId,
                    origin: dto.origin.country,
                    destination: dto.destination.country,
                    estimatedDelivery: dto.deliveryDate ? new Date(dto.deliveryDate).toDateString() : "TBD",
                    status: "Pending Acceptance",
                    trackingUrl: `${this.cfg.get("APP_URL")}/shipments/track/${dto.orderId}`,
                });
            }
            await this.createNotification(lspUserId, `New shipment ${dto.orderId} created successfully`, "in-app");
            return shipment;
        }
        catch (err) {
            this.logger.error("Shipment creation failed", err);
            throw new common_1.BadRequestException(err.message || "Shipment creation failed");
        }
    }
    async acceptAndAssign(shipmentId, dto, lspUserId) {
        const user = await this.prisma.user.findUnique({
            where: { id: lspUserId },
        });
        if (!user)
            throw new common_1.NotFoundException("User not found");
        if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && user.role !== "CROSS_BORDER_LOGISTICS") {
            throw new common_1.ForbiddenException("Only LSP can accept and assign orders");
        }
        const shipment = await this.prisma.shipment.findUnique({
            where: { id: shipmentId },
        });
        if (!shipment)
            throw new common_1.NotFoundException("Shipment not found");
        if (shipment.status !== update_status_dto_1.ShipmentStatus.PENDING_ACCEPTANCE) {
            throw new common_1.BadRequestException("Shipment already accepted or not pending");
        }
        if (dto.transporterId) {
            const transporter = await this.prisma.user.findUnique({
                where: { id: dto.transporterId },
            });
            if (!transporter || transporter.role !== "TRANSPORTER") {
                throw new common_1.BadRequestException("Invalid transporter");
            }
        }
        if (dto.warehouseId) {
            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: dto.warehouseId },
            });
            if (!warehouse) {
                throw new common_1.BadRequestException("Invalid warehouse");
            }
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: { id: shipmentId },
                data: {
                    status: update_status_dto_1.ShipmentStatus.ACCEPTED,
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
                    status: update_status_dto_1.ShipmentStatus.ACCEPTED,
                    updatedBy: lspUserId,
                },
            });
            return updatedShipment;
        });
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
                origin: shipment.origin.country,
                destination: shipment.destination.country,
                estimatedDelivery: shipment.deliveryDate?.toDateString() ?? "TBD",
                trackingUrl: `${this.cfg.get("APP_URL")}/shipments/track/${shipment.orderId}`,
            });
        }
        await Promise.all([
            this.createNotification(lspUserId, `You accepted shipment ${shipment.orderId}`, "in-app"),
            this.createNotification(shipment.customerId, `Shipment ${shipment.orderId} has been accepted`, "in-app"),
            dto.transporterId ? this.createNotification(dto.transporterId, `You have been assigned to shipment ${shipment.orderId}`, "in-app") : Promise.resolve(),
            dto.warehouseId ? this.createNotification(dto.warehouseId, `Shipment ${shipment.orderId} assigned to your warehouse`, "in-app") : Promise.resolve(),
        ]);
        return updated;
    }
    async updateStatus(shipmentId, dto, updatedBy) {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { transporter: true },
        });
        if (!shipment)
            throw new common_1.NotFoundException("Shipment not found");
        const user = await this.prisma.user.findUnique({
            where: { id: updatedBy },
        });
        if (!user)
            throw new common_1.NotFoundException("User not found");
        if (dto.status === update_status_dto_1.ShipmentStatus.ACCEPTED) {
            if (user.kind !== "LOGISTIC_SERVICE_PROVIDER") {
                throw new common_1.ForbiddenException("Only LSP can accept orders");
            }
        }
        else if (dto.status === update_status_dto_1.ShipmentStatus.PICKED_UP) {
            if (shipment.assignedTransporterId !== updatedBy) {
                throw new common_1.ForbiddenException("Only assigned transporter can update to picked up");
            }
        }
        else if (dto.status === update_status_dto_1.ShipmentStatus.CANCELLED) {
            if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" || shipment.createdBy == user.id) {
                throw new common_1.ForbiddenException("Only LSP and order creator can cancel orders");
            }
        }
        else if ([update_status_dto_1.ShipmentStatus.EN_ROUTE_TO_PICKUP, update_status_dto_1.ShipmentStatus.IN_TRANSIT].includes(dto.status)) {
            if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && shipment.assignedTransporterId !== updatedBy) {
                throw new common_1.ForbiddenException("Not authorized to update this status");
            }
        }
        else if (dto.status === update_status_dto_1.ShipmentStatus.COMPLETED) {
            if (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && user.role !== "LAST_MILE_PROVIDER") {
                throw new common_1.ForbiddenException("Only LSP or last mile provider can complete orders");
            }
        }
        this.validateStatusTransition(shipment.status, dto.status);
        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedShipment = await tx.shipment.update({
                where: { id: shipmentId },
                data: { status: dto.status },
                include: { transporter: true, warehouse: true, documents: true },
            });
            await tx.shipmentStatusHistory.create({
                data: {
                    shipmentId,
                    status: dto.status,
                    updatedBy,
                    note: dto.note,
                },
            });
            return updatedShipment;
        });
        const majorStatuses = [update_status_dto_1.ShipmentStatus.PICKED_UP, update_status_dto_1.ShipmentStatus.IN_TRANSIT, update_status_dto_1.ShipmentStatus.ARRIVED_AT_DESTINATION, update_status_dto_1.ShipmentStatus.COMPLETED];
        if (majorStatuses.includes(dto.status) && shipment.email) {
            await this.mailer.sendShipmentStatusUpdate(shipment.email, {
                clientName: shipment.clientName,
                trackingNumber: shipment.orderId,
                status: this.formatStatusForDisplay(dto.status),
                origin: shipment.origin.country,
                destination: shipment.destination.country,
                estimatedDelivery: shipment.deliveryDate?.toDateString() ?? "TBD",
                trackingUrl: `${this.cfg.get("APP_URL")}/shipments/track/${shipment.orderId}`,
            });
        }
        await Promise.all([
            this.createNotification(updatedBy, `You updated shipment ${shipment.orderId} to ${dto.status}`, "in-app"),
            this.createNotification(shipment.customerId, `Your shipment ${shipment.orderId} status changed to ${dto.status}`, "in-app"),
            shipment.assignedTransporterId ? this.createNotification(shipment.assignedTransporterId, `Shipment ${shipment.orderId} is now ${dto.status}`, "in-app") : Promise.resolve(),
            shipment.assignedWarehouseId ? this.createNotification(shipment.assignedWarehouseId, `Shipment ${shipment.orderId} is now ${dto.status}`, "in-app") : Promise.resolve(),
        ]);
        return updated;
    }
    async findAll(filters, userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, kind: true, role: true },
        });
        if (!user)
            throw new common_1.ForbiddenException("User not found");
        const { page = 1, limit = 20, ...filterCriteria } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (user.kind === "LOGISTIC_SERVICE_PROVIDER" || user.role === "CROSS_BORDER_LOGISTICS") {
            this.logger.log(`LSP/Admin ${userId} accessing all shipments`);
        }
        else if (user.role === "TRANSPORTER") {
            where.assignedTransporterId = userId;
            this.logger.log(`Transporter ${userId} accessing assigned shipments`);
        }
        else if (user.role === "LAST_MILE_PROVIDER") {
            where.assignedTransporterId = userId;
            this.logger.log(`Last mile provider ${userId} accessing assigned shipments`);
        }
        else if (user.kind === "ENTERPRISE" || user.kind === "DISTRIBUTOR") {
            where.createdBy = userId;
            this.logger.log(`Enterprise/Distributor ${userId} accessing their shipments`);
        }
        else if (user.kind === "END_USER") {
            where.customerId = userId;
            this.logger.log(`End user ${userId} accessing their shipments`);
        }
        else {
            throw new common_1.ForbiddenException("You do not have permission to view shipments");
        }
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
    async findAllForTransporter(transporterId, filters) {
        const user = await this.prisma.user.findUnique({
            where: { id: transporterId },
            select: { role: true },
        });
        if (!user || (user.role !== "TRANSPORTER" && user.role !== "LAST_MILE_PROVIDER")) {
            throw new common_1.ForbiddenException("User is not a transporter");
        }
        const { page = 1, limit = 20, ...filterCriteria } = filters;
        const skip = (page - 1) * limit;
        const where = {
            assignedTransporterId: transporterId,
        };
        if (filterCriteria.status)
            where.status = filterCriteria.status;
        if (filterCriteria.orderId)
            where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
        if (filterCriteria.cargoType)
            where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };
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
    async findAllForCustomer(customerId, filters) {
        const user = await this.prisma.user.findUnique({
            where: { id: customerId },
            select: { kind: true },
        });
        if (!user || !["ENTERPRISE", "DISTRIBUTOR", "END_USER"].includes(user.kind)) {
            throw new common_1.ForbiddenException("Invalid customer access");
        }
        const { page = 1, limit = 20, ...filterCriteria } = filters;
        const skip = (page - 1) * limit;
        const where = {
            OR: [{ createdBy: customerId }, { customerId: customerId }],
        };
        if (filterCriteria.status)
            where.status = filterCriteria.status;
        if (filterCriteria.orderId)
            where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
        if (filterCriteria.cargoType)
            where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };
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
                        take: 5,
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
    async findAllForLSP(lspUserId, filters) {
        const user = await this.prisma.user.findUnique({
            where: { id: lspUserId },
            select: { kind: true, role: true },
        });
        if (!user || (user.kind !== "LOGISTIC_SERVICE_PROVIDER" && user.role !== "CROSS_BORDER_LOGISTICS")) {
            throw new common_1.ForbiddenException("Only LSP can access all shipments");
        }
        const { page = 1, limit = 20, ...filterCriteria } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (filterCriteria.status)
            where.status = filterCriteria.status;
        if (filterCriteria.orderId)
            where.orderId = { contains: filterCriteria.orderId, mode: "insensitive" };
        if (filterCriteria.cargoType)
            where.cargoType = { contains: filterCriteria.cargoType, mode: "insensitive" };
        if (filterCriteria.origin)
            where.origin = { path: ["country"], string_contains: filterCriteria.origin };
        if (filterCriteria.destination)
            where.destination = { path: ["country"], string_contains: filterCriteria.destination };
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
        const analytics = await this.getShipmentAnalytics(where);
        return {
            data: shipments,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            analytics,
        };
    }
    getAccessLevel(kind, role) {
        if (kind === "LOGISTIC_SERVICE_PROVIDER" || role === "CROSS_BORDER_LOGISTICS") {
            return "full_access";
        }
        else if (role === "TRANSPORTER" || role === "LAST_MILE_PROVIDER") {
            return "assigned_only";
        }
        else if (kind === "ENTERPRISE" || kind === "DISTRIBUTOR") {
            return "created_only";
        }
        else if (kind === "END_USER") {
            return "customer_only";
        }
        return "no_access";
    }
    async getShipmentAnalytics(where) {
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
    async canUserAccessShipment(shipmentId, userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { kind: true, role: true },
        });
        if (!user)
            return false;
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
        if (!shipment)
            return false;
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
    async findOne(shipmentId, userId) {
        const hasAccess = await this.canUserAccessShipment(shipmentId, userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException("You do not have permission to view this shipment");
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
        if (!shipment)
            throw new common_1.NotFoundException("Shipment not found");
        return shipment;
    }
    async trackByOrderId(orderId, userId) {
        const shipment = await this.prisma.shipment.findUnique({
            where: { orderId },
            include: {
                statusHistory: { orderBy: { timestamp: "desc" } },
                documents: true,
            },
        });
        if (!shipment)
            throw new common_1.NotFoundException("Shipment not found");
        if (shipment.customerId !== userId) {
            throw new common_1.BadRequestException("Unauthorized to track this shipment");
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
    async update(shipmentId, dto, userId) {
        await this.verifyShipmentOwnership(shipmentId, userId);
        const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
        if (!shipment)
            throw new common_1.NotFoundException("Shipment not found");
        const totalCost = dto.baseFrieght || dto.handlingFee || dto.insuranceFee
            ? this.calculateTotalCost(dto.baseFrieght ?? shipment.baseFrieght, dto.handlingFee ?? shipment.handlingFee, dto.insuranceFee ?? shipment.insuranceFee)
            : shipment.totalCost;
        const updated = await this.prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                ...dto,
                totalCost,
                pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : shipment.pickupDate,
                deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : shipment.deliveryDate,
                origin: dto.origin,
                destination: dto.destination,
                pickupMode: dto.pickupMode,
                serviceType: dto.serviceType,
            },
        });
        return updated;
    }
    async remove(shipmentId, userId) {
        await this.verifyShipmentOwnership(shipmentId, userId);
        await this.prisma.$transaction(async (tx) => {
            await tx.shipmentDocument.deleteMany({ where: { shipmentId } });
            await tx.shipmentStatusHistory.deleteMany({ where: { shipmentId } });
            await tx.shipment.delete({ where: { id: shipmentId } });
        });
        return { message: "Shipment deleted successfully" };
    }
    generateOrderTrackingId() {
        const year = new Date().getFullYear();
        const randomId = Math.floor(10000 + Math.random() * 90000);
        return `SHP-${year}-${randomId}`;
    }
    calculateTotalCost(base, handling, insurance) {
        return Number(base) + Number(handling) + (Number(insurance) ?? 0);
    }
    validateShipmentData(dto) {
        if (!dto.clientName || !dto.cargoType || !dto.orderId) {
            throw new common_1.BadRequestException("Missing required fields");
        }
    }
    validateStatusTransition(current, next) {
        const validTransitions = {
            [update_status_dto_1.ShipmentStatus.PENDING_ACCEPTANCE]: [update_status_dto_1.ShipmentStatus.ACCEPTED, update_status_dto_1.ShipmentStatus.CANCELLED],
            [update_status_dto_1.ShipmentStatus.ACCEPTED]: [update_status_dto_1.ShipmentStatus.EN_ROUTE_TO_PICKUP, update_status_dto_1.ShipmentStatus.CANCELLED],
            [update_status_dto_1.ShipmentStatus.EN_ROUTE_TO_PICKUP]: [update_status_dto_1.ShipmentStatus.PICKED_UP, update_status_dto_1.ShipmentStatus.CANCELLED],
            [update_status_dto_1.ShipmentStatus.PICKED_UP]: [update_status_dto_1.ShipmentStatus.IN_TRANSIT, update_status_dto_1.ShipmentStatus.CANCELLED],
            [update_status_dto_1.ShipmentStatus.IN_TRANSIT]: [update_status_dto_1.ShipmentStatus.ARRIVED_AT_DESTINATION, update_status_dto_1.ShipmentStatus.CANCELLED],
            [update_status_dto_1.ShipmentStatus.ARRIVED_AT_DESTINATION]: [update_status_dto_1.ShipmentStatus.COMPLETED],
        };
        if (!validTransitions[current]?.includes(next)) {
            throw new common_1.BadRequestException(`Invalid status transition from ${current} to ${next}`);
        }
    }
    formatStatusForDisplay(status) {
        return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    getCurrentLocation(status) {
        const locationMap = {
            [update_status_dto_1.ShipmentStatus.PENDING_ACCEPTANCE]: "Order Pending",
            [update_status_dto_1.ShipmentStatus.ACCEPTED]: "Preparing for Pickup",
            [update_status_dto_1.ShipmentStatus.EN_ROUTE_TO_PICKUP]: "En Route to Pickup Location",
            [update_status_dto_1.ShipmentStatus.PICKED_UP]: "Picked Up",
            [update_status_dto_1.ShipmentStatus.IN_TRANSIT]: "In Transit",
            [update_status_dto_1.ShipmentStatus.ARRIVED_AT_DESTINATION]: "Arrived at Destination",
            [update_status_dto_1.ShipmentStatus.COMPLETED]: "Delivered",
            [update_status_dto_1.ShipmentStatus.CANCELLED]: "Cancelled",
        };
        return locationMap[status] || "Unknown";
    }
    detectDocumentType(filename) {
        if (!filename)
            return DocumentType.OTHER;
        const lower = filename.toLowerCase();
        if (lower.includes("invoice"))
            return DocumentType.COMMERCIAL_INVOICE;
        if (lower.includes("packing"))
            return DocumentType.PACKING_LIST;
        if (lower.includes("waybill"))
            return DocumentType.WAYBILL;
        if (lower.includes("lading"))
            return DocumentType.BILL_OF_LADING;
        return DocumentType.OTHER;
    }
    async createNotification(userId, message, type) {
        try {
            await this.prisma.notification.create({
                data: {
                    userId,
                    message,
                    type: type.toUpperCase().replace("-", "_"),
                    read: false,
                },
            });
            console.log("DONEEEEEEE");
        }
        catch (err) {
            this.logger.error(`Failed to create notification: ${err.message}`);
        }
    }
    async verifyShipmentOwnership(shipmentId, userId) {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id: shipmentId },
            select: { id: true, customerId: true },
        });
        if (!shipment) {
            throw new common_1.NotFoundException("Shipment not found");
        }
        if (shipment.customerId !== userId) {
            throw new common_1.BadRequestException("You are not authorized to access this shipment");
        }
    }
};
exports.ShipmentsService = ShipmentsService;
exports.ShipmentsService = ShipmentsService = ShipmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)("StorageService")),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, mail_service_1.MailService, config_1.ConfigService])
], ShipmentsService);
