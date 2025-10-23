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
exports.UpdateInventoryLocationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateInventoryLocationDto {
}
exports.UpdateInventoryLocationDto = UpdateInventoryLocationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated quantity for this inventory location', example: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateInventoryLocationDto.prototype, "qty", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'New bin ID if the inventory is being moved', example: 'bin_123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInventoryLocationDto.prototype, "binId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated status of the inventory (e.g., AVAILABLE, RESERVED)', example: 'AVAILABLE' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInventoryLocationDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Condition of the inventory (e.g., NEW, DAMAGED)', example: 'NEW' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInventoryLocationDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Lot number of the inventory', example: 'LOT-2025-XYZ' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInventoryLocationDto.prototype, "lotNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'New expiry date of the inventory', example: '2025-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateInventoryLocationDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Special handling instructions, temperature requirements, compatibility rules, etc.',
        example: {
            tempMin: 5,
            tempMax: 25,
            isHazardous: false,
            compatibility: ['productA', 'productB'],
        },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateInventoryLocationDto.prototype, "specialHandling", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated client name associated with this inventory', example: 'Acme Corp' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInventoryLocationDto.prototype, "clientName", void 0);
