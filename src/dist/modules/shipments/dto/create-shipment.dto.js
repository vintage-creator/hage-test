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
exports.CreateShipmentDto = exports.ServiceType = exports.PickupMode = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PickupMode;
(function (PickupMode) {
    PickupMode["PICKUP"] = "PICKUP";
    PickupMode["DROPOFF"] = "DROPOFF";
})(PickupMode || (exports.PickupMode = PickupMode = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["AIR"] = "AIR";
    ServiceType["OCEAN"] = "OCEAN";
    ServiceType["ROAD"] = "ROAD";
    ServiceType["RAIL"] = "RAIL";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
class LocationDto {
}
__decorate([
    (0, class_validator_1.IsString)({ message: "Country must be a string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Country is required" }),
    __metadata("design:type", String)
], LocationDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "State must be a string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "State is required" }),
    __metadata("design:type", String)
], LocationDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "Address must be a string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Address is required" }),
    __metadata("design:type", String)
], LocationDto.prototype, "address", void 0);
class CreateShipmentDto {
}
exports.CreateShipmentDto = CreateShipmentDto;
__decorate([
    (0, class_validator_1.IsString)({ message: "Order ID must be a string" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "orderId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "Tracking ID must be a string" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "trackingId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "Client name must be a string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Client name is required" }),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "clientName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: "Please provide a valid email address" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "Phone number must be a string" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "Cargo type must be a string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Cargo type is required" }),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "cargoType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: "Tons must be a valid number" }),
    __metadata("design:type", Number)
], CreateShipmentDto.prototype, "tons", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: "Weight must be a valid number" }),
    (0, class_validator_1.Min)(0.1, { message: "Weight must be greater than 0" }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateShipmentDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: "Handling instructions must be a string" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "handlingInstructions", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ message: "Origin must be a valid location object" }),
    (0, class_transformer_1.Type)(() => LocationDto),
    (0, class_validator_1.IsNotEmpty)({ message: "Origin is required" }),
    __metadata("design:type", LocationDto)
], CreateShipmentDto.prototype, "origin", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ message: "Destination must be a valid location object" }),
    (0, class_transformer_1.Type)(() => LocationDto),
    (0, class_validator_1.IsNotEmpty)({ message: "Destination is required" }),
    __metadata("design:type", LocationDto)
], CreateShipmentDto.prototype, "destination", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PickupMode, { message: "Pickup mode must be either PICKUP or DROPOFF" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Pickup mode is required" }),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "pickupMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "pickupDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ServiceType, {
        message: "Service type must be one of: AIR, OCEAN, ROAD, or RAIL",
    }),
    (0, class_validator_1.IsNotEmpty)({ message: "Service type is required" }),
    __metadata("design:type", String)
], CreateShipmentDto.prototype, "serviceType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: "Base freight must be a valid number" }),
    (0, class_validator_1.Min)(0, { message: "Base freight cannot be negative" }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateShipmentDto.prototype, "baseFrieght", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: "Handling fee must be a valid number" }),
    (0, class_validator_1.Min)(0, { message: "Handling fee cannot be negative" }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateShipmentDto.prototype, "handlingFee", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: "Insurance fee must be a valid number" }),
    (0, class_validator_1.Min)(0, { message: "Insurance fee cannot be negative" }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateShipmentDto.prototype, "insuranceFee", void 0);
