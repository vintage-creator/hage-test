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
exports.WarehousesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const warehouses_service_1 = require("./warehouses.service");
const create_warehouse_dto_1 = require("./dto/create-warehouse.dto");
const create_zone_dto_1 = require("./dto/create-zone.dto");
const create_rack_dto_1 = require("./dto/create-rack.dto");
const create_bin_dto_1 = require("./dto/create-bin.dto");
const update_warehouse_dto_1 = require("./dto/update-warehouse.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let WarehousesController = class WarehousesController {
    constructor(svc) {
        this.svc = svc;
    }
    async create(dto, req) {
        const authUserId = req.user?.sub ?? req.user?.id;
        if (!authUserId) {
            throw new common_1.UnauthorizedException("User not authenticated");
        }
        return this.svc.createWarehouse(dto, authUserId);
    }
    async list(companyId) {
        return this.svc.listWarehouses(companyId);
    }
    async get(id) {
        return this.svc.getWarehouse(id);
    }
    async capacity(id) {
        return this.svc.getWarehouseCapacity(id);
    }
    async update(id, dto) {
        return this.svc.updateWarehouse(id, dto);
    }
    async remove(id) {
        return this.svc.deleteWarehouse(id);
    }
    async createZone(id, dto) {
        return this.svc.createZone(id, dto);
    }
    async createRack(zoneId, dto) {
        return this.svc.createRack(zoneId, dto);
    }
    async createBin(rackId, dto) {
        return this.svc.createBin(rackId, dto);
    }
    async binAvailability(binId) {
        return this.svc.getBinAvailability(binId);
    }
};
exports.WarehousesController = WarehousesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create a warehouse" }),
    (0, swagger_1.ApiResponse)({ status: 201, description: "Warehouse created" }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_warehouse_dto_1.CreateWarehouseDto, Object]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "List warehouses (optionally by companyId)" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "List of warehouses" }),
    __param(0, (0, common_1.Query)("companyId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Warehouse id" }),
    (0, swagger_1.ApiOperation)({
        summary: "Get warehouse details (zones → racks → bins) with computed usage",
    }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(":id/capacity"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Warehouse id" }),
    (0, swagger_1.ApiOperation)({
        summary: "Get compact capacity summary for a warehouse (used, reserved, available, computedStatus)",
    }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "capacity", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Warehouse id" }),
    (0, swagger_1.ApiOperation)({ summary: "Update warehouse" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_warehouse_dto_1.UpdateWarehouseDto]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Warehouse id" }),
    (0, swagger_1.ApiOperation)({ summary: "Delete warehouse" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(":id/zones"),
    (0, swagger_1.ApiParam)({ name: "id", description: "Warehouse id" }),
    (0, swagger_1.ApiOperation)({ summary: "Create a zone inside a warehouse" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_zone_dto_1.CreateZoneDto]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "createZone", null);
__decorate([
    (0, common_1.Post)("zones/:zoneId/racks"),
    (0, swagger_1.ApiParam)({ name: "zoneId", description: "Zone id" }),
    (0, swagger_1.ApiOperation)({ summary: "Create a rack inside a zone" }),
    __param(0, (0, common_1.Param)("zoneId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_rack_dto_1.CreateRackDto]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "createRack", null);
__decorate([
    (0, common_1.Post)("racks/:rackId/bins"),
    (0, swagger_1.ApiParam)({ name: "rackId", description: "Rack id" }),
    (0, swagger_1.ApiOperation)({ summary: "Create a bin inside a rack" }),
    __param(0, (0, common_1.Param)("rackId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_bin_dto_1.CreateBinDto]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "createBin", null);
__decorate([
    (0, common_1.Get)("bins/:binId/availability"),
    (0, swagger_1.ApiParam)({ name: "binId", description: "Bin id" }),
    (0, swagger_1.ApiOperation)({ summary: "Get availability details for a bin" }),
    __param(0, (0, common_1.Param)("binId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WarehousesController.prototype, "binAvailability", null);
exports.WarehousesController = WarehousesController = __decorate([
    (0, swagger_1.ApiTags)("warehouses"),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("warehouses"),
    __metadata("design:paramtypes", [warehouses_service_1.WarehousesService])
], WarehousesController);
