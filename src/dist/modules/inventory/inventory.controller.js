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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const inventory_service_1 = require("./inventory.service");
const create_inventory_dto_1 = require("./dto/create-inventory.dto");
const create_inventory_location_dto_1 = require("./dto/create-inventory-location.dto");
const update_inventory_location_dto_1 = require("./dto/update-inventory-location.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let InventoryController = class InventoryController {
    constructor(svc) {
        this.svc = svc;
    }
    async createInventory(dto) {
        return this.svc.createInventory(dto);
    }
    async getInventory(productId, warehouseId) {
        return this.svc.getInventory(productId, warehouseId);
    }
    async createInventoryLocation(dto) {
        return this.svc.createInventoryLocation(dto);
    }
    async listInventoryLocations(clientId, shipmentId, status, binId) {
        return this.svc.listInventoryLocations({ clientId, shipmentId, status, binId });
    }
    async getInventoryLocation(id) {
        return this.svc.getInventoryLocation(id);
    }
    async updateInventoryLocation(id, dto) {
        return this.svc.moveOrUpdateInventoryLocation(id, dto);
    }
    async deleteInventoryLocation(id) {
        return this.svc.deleteInventoryLocation(id);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create or upsert inventory (product + warehouse)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inventory_dto_1.CreateInventoryDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createInventory", null);
__decorate([
    (0, common_1.Get)('product/:productId/warehouse/:warehouseId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory for a product in a warehouse' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Param)('warehouseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getInventory", null);
__decorate([
    (0, common_1.Post)('locations'),
    (0, swagger_1.ApiOperation)({ summary: 'Place inventory into a bin (create InventoryLocation) — transactional' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inventory_location_dto_1.CreateInventoryLocationDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createInventoryLocation", null);
__decorate([
    (0, common_1.Get)('locations'),
    (0, swagger_1.ApiOperation)({ summary: 'List inventory locations (filter by clientId, shipmentId, status, binId)' }),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)('shipmentId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('binId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listInventoryLocations", null);
__decorate([
    (0, common_1.Get)('locations/:id'),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiOperation)({ summary: 'Get single inventory location' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getInventoryLocation", null);
__decorate([
    (0, common_1.Patch)('locations/:id'),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiOperation)({ summary: 'Move or update inventory location (qty, bin, metadata) — transactional' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_inventory_location_dto_1.UpdateInventoryLocationDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateInventoryLocation", null);
__decorate([
    (0, common_1.Delete)('locations/:id'),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiOperation)({ summary: 'Delete inventory location and adjust totals (assumes removal)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteInventoryLocation", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('inventory'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
