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
exports.CreateBinDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateBinDto {
}
exports.CreateBinDto = CreateBinDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Bin name', example: 'BIN-A1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBinDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Capacity in warehouse units', type: 'integer', example: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBinDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minimum allowed temperature (°C)', type: 'number', example: 2 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBinDto.prototype, "tempMin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum allowed temperature (°C)', type: 'number', example: 8 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBinDto.prototype, "tempMax", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Allows hazardous materials', type: 'boolean', example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBinDto.prototype, "allowsHazardous", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is this bin quarantine-capable', type: 'boolean', example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBinDto.prototype, "isQuarantine", void 0);
