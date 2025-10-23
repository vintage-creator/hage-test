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
exports.UpdateStatusDto = exports.ShipmentStatus = void 0;
const class_validator_1 = require("class-validator");
var ShipmentStatus;
(function (ShipmentStatus) {
    ShipmentStatus["PENDING_ACCEPTANCE"] = "PENDING_ACCEPTANCE";
    ShipmentStatus["ACCEPTED"] = "ACCEPTED";
    ShipmentStatus["EN_ROUTE_TO_PICKUP"] = "EN_ROUTE_TO_PICKUP";
    ShipmentStatus["PICKED_UP"] = "PICKED_UP";
    ShipmentStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ShipmentStatus["ARRIVED_AT_DESTINATION"] = "ARRIVED_AT_DESTINATION";
    ShipmentStatus["COMPLETED"] = "COMPLETED";
    ShipmentStatus["CANCELLED"] = "CANCELLED";
})(ShipmentStatus || (exports.ShipmentStatus = ShipmentStatus = {}));
class UpdateStatusDto {
}
exports.UpdateStatusDto = UpdateStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(ShipmentStatus),
    __metadata("design:type", String)
], UpdateStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStatusDto.prototype, "note", void 0);
