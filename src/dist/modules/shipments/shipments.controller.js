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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const shipments_service_1 = require("./shipments.service");
const create_shipment_dto_1 = require("./dto/create-shipment.dto");
const update_shipment_dto_1 = require("./dto/update-shipment.dto");
const assign_shipment_dto_1 = require("./dto/assign-shipment.dto");
const filter_shipment_dto_1 = require("./dto/filter-shipment.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ShipmentsController = class ShipmentsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto, req, files) {
        const userId = req.user?.id;
        return this.svc.create(dto, userId, files);
    }
    generateTracking() {
        return { trackingNumber: this.svc.generateOrderTrackingId() };
    }
    async acceptAndAssign(shipmentId, dto, req) {
        const userId = req.user?.id;
        return this.svc.acceptAndAssign(shipmentId, dto, userId);
    }
    async findAll(filters, req) {
        return this.svc.findAll(filters, req.user.id);
    }
    async getMyAssignedShipments(filters, req) {
        return this.svc.findAllForTransporter(req.user.id, filters);
    }
    async getMyCreatedShipments(filters, req) {
        return this.svc.findAllForCustomer(req.user.id, filters);
    }
    async getAllShipmentsAdmin(filters, req) {
        return this.svc.findAllForLSP(req.user.id, filters);
    }
    findOne(id, req) {
        const userId = req.user.id;
        return this.svc.findOne(id, userId);
    }
    async trackByOrderId(orderId, req) {
        const userId = req.user.id;
        return this.svc.trackByOrderId(orderId, userId);
    }
    update(id, dto, req) {
        const userId = req.user.id;
        return this.svc.update(id, dto, userId);
    }
    remove(id, req) {
        const userId = req.user.id;
        return this.svc.remove(id, userId);
    }
    async updateStatus(shipmentId, dto, req) {
        const userId = req.user.id;
        return this.svc.updateStatus(shipmentId, dto, userId);
    }
};
exports.ShipmentsController = ShipmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("documents")),
    (0, swagger_1.ApiBody)({
        description: "Create a new shipment record",
        type: create_shipment_dto_1.CreateShipmentDto,
        examples: {
            example1: {
                summary: "Basic Air Freight example",
                value: {
                    orderId: "SHP-67890",
                    clientName: "Acme Logistics",
                    email: "client@acme.com",
                    phone: "+2348123456789",
                    cargoType: "Electronics",
                    tons: 2,
                    weight: 1200,
                    handlingInstructions: "Handle with care",
                    origin: {
                        country: "Nigeria",
                        state: "Lagos",
                        address: "12 Marina Street",
                    },
                    destination: {
                        country: "Ghana",
                        state: "Accra",
                        address: "45 High Street",
                    },
                    pickupMode: "PICKUP",
                    pickupDate: "2025-10-20T09:00:00Z",
                    deliveryDate: "2025-10-25T15:00:00Z",
                    serviceType: "AIR",
                    baseFrieght: 1200,
                    handlingFee: 100,
                    insuranceFee: 50,
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Shipment successfully created",
        schema: {
            example: {
                id: "clx0a12340000a3l45d8x9e7t",
                orderId: "SHP-12345",
                clientName: "Acme Logistics",
                serviceType: "AIR",
                status: "PENDING",
                createdAt: "2025-10-18T18:00:00.000Z",
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Array]),
    __metadata("design:returntype", void 0)
], ShipmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("generate-tracking"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShipmentsController.prototype, "generateTracking", null);
__decorate([
    (0, common_1.Patch)(":id/assign"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("LOGISTIC_SERVICE_PROVIDER", "CROSS_BORDER_LOGISTICS"),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_shipment_dto_1.AssignShipmentDto, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "acceptAndAssign", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, swagger_1.ApiQuery)({
        name: "status",
        required: false,
        description: "Filter shipments by status (e.g., PENDING, IN_TRANSIT, DELIVERED)",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "List of all shipments",
        schema: {
            example: [
                {
                    id: "clx0a12340000a3l45d8x9e7t",
                    orderId: "SHP-12345",
                    clientName: "Acme Logistics",
                    serviceType: "AIR",
                    status: "PENDING",
                },
                {
                    id: "clx0b56780000b5p67y2z3q9r",
                    orderId: "SHP-67890",
                    clientName: "Global Movers",
                    serviceType: "OCEAN",
                    status: "DELIVERED",
                },
            ],
        },
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [filter_shipment_dto_1.FilterShipmentDto, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)("my/assigned"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("TRANSPORTER"),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [filter_shipment_dto_1.FilterShipmentDto, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "getMyAssignedShipments", null);
__decorate([
    (0, common_1.Get)("my/created"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [filter_shipment_dto_1.FilterShipmentDto, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "getMyCreatedShipments", null);
__decorate([
    (0, common_1.Get)("admin/all"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("LOGISTIC_SERVICE_PROVIDER"),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [filter_shipment_dto_1.FilterShipmentDto, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "getAllShipmentsAdmin", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Shipment ID", example: "clx0a12340000a3l45d8x9e7t" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Details of a single shipment",
        schema: {
            example: {
                id: "clx0a12340000a3l45d8x9e7t",
                orderId: "SHP-12345",
                clientName: "Acme Logistics",
                cargoType: "Electronics",
                weight: 1200,
                serviceType: "AIR",
                status: "PENDING",
                createdAt: "2025-10-18T18:00:00.000Z",
            },
        },
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)("track/:orderId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __param(0, (0, common_1.Param)("orderId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "trackByOrderId", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("LOGISTIC_SERVICE_PROVIDER", "TRANSPORTER", "LAST_MILE_PROVIDER"),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Shipment ID" }),
    (0, swagger_1.ApiBody)({
        description: "Update shipment details",
        schema: {
            example: {
                status: "IN_TRANSIT",
                deliveryDate: "2025-10-22T10:00:00Z",
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Shipment updated successfully",
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_shipment_dto_1.UpdateShipmentDto, Object]),
    __metadata("design:returntype", void 0)
], ShipmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Shipment ID" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Shipment deleted successfully",
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(":id/status"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_status_dto_1.UpdateStatusDto, Object]),
    __metadata("design:returntype", Promise)
], ShipmentsController.prototype, "updateStatus", null);
exports.ShipmentsController = ShipmentsController = __decorate([
    (0, swagger_1.ApiTags)("shipments"),
    (0, common_1.Controller)("shipments"),
    __metadata("design:paramtypes", [shipments_service_1.ShipmentsService])
], ShipmentsController);
