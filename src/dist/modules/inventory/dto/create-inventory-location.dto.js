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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInventoryLocationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateInventoryLocationDto {
}
exports.CreateInventoryLocationDto = CreateInventoryLocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the inventory record' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "inventoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the bin where the items will be stored' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "binId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantity of items to place in the bin', example: 100 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateInventoryLocationDto.prototype, "qty", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated shipment ID if applicable' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "shipmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Client ID if the inventory belongs to a client' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Client name (for display purposes)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Condition of the inventory (e.g., NEW, USED, DAMAGED)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Lot number of the batch' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "lotNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Expiry date of the batch (if applicable)', example: '2025-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Special handling instructions (e.g., temperature, hazardous flag, compatibility)',
        example: {
            tempMin: 5,
            tempMax: 25,
            isHazardous: false,
            compatibility: ['ItemA', 'ItemB']
        },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateInventoryLocationDto.prototype, "specialHandling", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Status of the inventory location (e.g., AVAILABLE, RESERVED, DAMAGED)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryLocationDto.prototype, "status", void 0);
