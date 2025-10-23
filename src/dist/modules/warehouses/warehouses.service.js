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
exports.WarehousesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let WarehousesService = class WarehousesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createWarehouse(dto, authUserId) {
        let companyIdToUse = dto.companyId ?? null;
        if (!companyIdToUse) {
            if (!authUserId) {
                throw new common_1.BadRequestException("companyId missing and no authenticated user provided");
            }
            const user = await this.prisma.user.findUnique({
                where: { id: authUserId },
            });
            if (!user)
                throw new common_1.UnauthorizedException("Authenticated user not found");
            if (!user.companyId) {
                throw new common_1.BadRequestException("Authenticated user is not linked to a company; companyId required");
            }
            companyIdToUse = user.companyId;
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyIdToUse },
        });
        if (!company) {
            throw new common_1.NotFoundException(`Company with id "${companyIdToUse}" not found`);
        }
        if (authUserId) {
            const authUser = await this.prisma.user.findUnique({
                where: { id: authUserId },
            });
            if (!authUser)
                throw new common_1.UnauthorizedException("Authenticated user not found");
            if (authUser.companyId && authUser.companyId !== companyIdToUse) {
                throw new common_1.UnauthorizedException("User not authorized to create a warehouse for this company");
            }
        }
        const exists = await this.prisma.warehouse.findFirst({
            where: { companyId: companyIdToUse, name: dto.name },
        });
        if (exists)
            throw new common_1.BadRequestException("Warehouse with this name already exists for the company");
        const data = {
            companyId: companyIdToUse,
            name: dto.name,
            country: dto.country,
            city: dto.city,
            address: dto.address,
            totalCapacity: dto.totalCapacity,
            capacityUnit: dto.capacityUnit ?? "pieces",
            allowsTemperature: dto.allowsTemperature ?? false,
            allowsHazardous: dto.allowsHazardous ?? false,
            allowsQuarantine: dto.allowsQuarantine ?? false,
        };
        if (dto.numZones !== undefined)
            data.numZones = dto.numZones;
        if (dto.numRows !== undefined)
            data.numRows = dto.numRows;
        if (dto.numRacks !== undefined)
            data.numRacks = dto.numRacks;
        if (dto.numBinsPerRack !== undefined)
            data.numBinsPerRack = dto.numBinsPerRack;
        const warehouse = await this.prisma.warehouse.create({ data });
        return {
            ok: true,
            message: "Warehouse created successfully",
            warehouse,
        };
    }
    async computeUsageForWarehouse(warehouseId) {
        const agg = await this.prisma.bin.aggregate({
            _sum: {
                currentQty: true,
                reservedQty: true,
            },
            where: {
                rack: {
                    zone: {
                        warehouseId: warehouseId,
                    },
                },
            },
        });
        const used = Number(agg._sum.currentQty ?? 0);
        const reserved = Number(agg._sum.reservedQty ?? 0);
        const usedPlusReserved = used + reserved;
        return { used, reserved, usedPlusReserved };
    }
    async listWarehouses(companyId) {
        const where = companyId ? { companyId } : {};
        const warehouses = await this.prisma.warehouse.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        const results = await Promise.all(warehouses.map(async (w) => {
            const { used, reserved, usedPlusReserved } = await this.computeUsageForWarehouse(w.id);
            const computedStatus = usedPlusReserved >= w.totalCapacity ? "INACTIVE" : w.status;
            const available = Math.max(0, w.totalCapacity - usedPlusReserved);
            return {
                ...w,
                usedCapacity: used,
                reservedCapacity: reserved,
                usedPlusReserved,
                availableCapacity: available,
                computedStatus,
            };
        }));
        return results;
    }
    async getWarehouse(id) {
        const wh = await this.prisma.warehouse.findUnique({
            where: { id },
            include: {
                zones: {
                    include: {
                        racks: {
                            include: {
                                bins: true,
                            },
                        },
                    },
                },
            },
        });
        if (!wh)
            throw new common_1.NotFoundException("Warehouse not found");
        const { used, reserved, usedPlusReserved } = await this.computeUsageForWarehouse(id);
        const computedStatus = usedPlusReserved >= wh.totalCapacity ? "INACTIVE" : wh.status;
        const available = Math.max(0, wh.totalCapacity - usedPlusReserved);
        return {
            ...wh,
            usedCapacity: used,
            reservedCapacity: reserved,
            usedPlusReserved,
            availableCapacity: available,
            computedStatus,
        };
    }
    async updateWarehouse(id, dto) {
        const wh = await this.prisma.warehouse.findUnique({ where: { id } });
        if (!wh)
            throw new common_1.NotFoundException("Warehouse not found");
        const data = {
            name: dto.name ?? undefined,
            country: dto.country ?? undefined,
            city: dto.city ?? undefined,
            address: dto.address ?? undefined,
            totalCapacity: dto.totalCapacity ?? undefined,
            capacityUnit: dto.capacityUnit ?? undefined,
            status: dto.status ?? undefined,
            numZones: dto.numZones ?? undefined,
            numRows: dto.numRows ?? undefined,
            numRacks: dto.numRacks ?? undefined,
            numBinsPerRack: dto.numBinsPerRack ?? undefined,
            allowsTemperature: dto.allowsTemperature ?? undefined,
            allowsHazardous: dto.allowsHazardous ?? undefined,
            allowsQuarantine: dto.allowsQuarantine ?? undefined,
        };
        Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
        return this.prisma.warehouse.update({ where: { id }, data });
    }
    async deleteWarehouse(id) {
        const zoneCount = await this.prisma.zone.count({
            where: { warehouseId: id },
        });
        const inventoryCount = await this.prisma.inventory.count({
            where: { warehouseId: id },
        });
        if (zoneCount > 0 || inventoryCount > 0) {
            throw new common_1.BadRequestException("Cannot delete warehouse that still has zones or inventory. Please remove zones/inventory first.");
        }
        await this.prisma.warehouse.delete({ where: { id } });
        return { ok: true };
    }
    async createZone(warehouseId, dto) {
        const wh = await this.prisma.warehouse.findUnique({
            where: { id: warehouseId },
        });
        if (!wh)
            throw new common_1.NotFoundException("Warehouse not found");
        const exists = await this.prisma.zone.findFirst({
            where: { warehouseId, name: dto.name },
        });
        if (exists)
            throw new common_1.BadRequestException("Zone name must be unique within warehouse");
        return this.prisma.zone.create({
            data: {
                warehouseId,
                name: dto.name,
                tempMin: dto.tempMin ?? null,
                tempMax: dto.tempMax ?? null,
                allowsHazardous: dto.allowsHazardous ?? false,
                isQuarantineZone: dto.isQuarantineZone ?? false,
                capacity: dto.capacity ?? null,
            },
        });
    }
    async createRack(zoneId, dto) {
        const z = await this.prisma.zone.findUnique({ where: { id: zoneId } });
        if (!z)
            throw new common_1.NotFoundException("Zone not found");
        const exists = await this.prisma.rack.findFirst({
            where: { zoneId, name: dto.name },
        });
        if (exists)
            throw new common_1.BadRequestException("Rack name must be unique within zone");
        return this.prisma.rack.create({
            data: {
                zoneId,
                name: dto.name,
                capacity: dto.capacity ?? null,
            },
        });
    }
    async createBin(rackId, dto) {
        const r = await this.prisma.rack.findUnique({ where: { id: rackId } });
        if (!r)
            throw new common_1.NotFoundException("Rack not found");
        const exists = await this.prisma.bin.findFirst({
            where: { rackId, name: dto.name },
        });
        if (exists)
            throw new common_1.BadRequestException("Bin name must be unique within rack");
        return this.prisma.bin.create({
            data: {
                rackId,
                name: dto.name,
                capacity: dto.capacity,
                tempMin: dto.tempMin ?? null,
                tempMax: dto.tempMax ?? null,
                allowsHazardous: dto.allowsHazardous ?? false,
                isQuarantine: dto.isQuarantine ?? false,
            },
        });
    }
    async getBinAvailability(binId) {
        const bin = await this.prisma.bin.findUnique({ where: { id: binId } });
        if (!bin)
            throw new common_1.NotFoundException("Bin not found");
        const available = bin.capacity - (bin.currentQty + bin.reservedQty);
        return {
            binId: bin.id,
            capacity: bin.capacity,
            currentQty: bin.currentQty,
            reservedQty: bin.reservedQty,
            available,
            tempMin: bin.tempMin,
            tempMax: bin.tempMax,
            allowsHazardous: bin.allowsHazardous,
            isQuarantine: bin.isQuarantine,
        };
    }
    async getWarehouseCapacity(warehouseId) {
        const wh = await this.prisma.warehouse.findUnique({
            where: { id: warehouseId },
        });
        if (!wh)
            throw new common_1.NotFoundException("Warehouse not found");
        const { used, reserved, usedPlusReserved } = await this.computeUsageForWarehouse(warehouseId);
        const available = Math.max(0, wh.totalCapacity - usedPlusReserved);
        const computedStatus = usedPlusReserved >= wh.totalCapacity ? "INACTIVE" : wh.status;
        return {
            warehouseId,
            totalCapacity: wh.totalCapacity,
            capacityUnit: wh.capacityUnit,
            used,
            reserved,
            usedPlusReserved,
            available,
            computedStatus,
        };
    }
};
exports.WarehousesService = WarehousesService;
exports.WarehousesService = WarehousesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WarehousesService);
