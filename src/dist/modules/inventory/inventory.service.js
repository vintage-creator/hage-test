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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createInventory(dto) {
        const [product, warehouse] = await Promise.all([
            this.prisma.product.findUnique({ where: { id: dto.productId } }),
            this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
        ]);
        if (!product)
            throw new common_1.NotFoundException("Product not found");
        if (!warehouse)
            throw new common_1.NotFoundException("Warehouse not found");
        const existing = await this.prisma.inventory.findFirst({
            where: { productId: dto.productId, warehouseId: dto.warehouseId },
        });
        if (existing) {
            if (typeof dto.totalQty === "number") {
                return this.prisma.inventory.update({
                    where: { id: existing.id },
                    data: { totalQty: dto.totalQty },
                });
            }
            return existing;
        }
        return this.prisma.inventory.create({
            data: {
                productId: dto.productId,
                warehouseId: dto.warehouseId,
                totalQty: dto.totalQty ?? 0,
            },
        });
    }
    async createInventoryLocation(dto, createdBy) {
        const [bin, inventory] = await Promise.all([
            this.prisma.bin.findUnique({ where: { id: dto.binId } }),
            this.prisma.inventory.findUnique({
                where: { id: dto.inventoryId },
                include: { warehouse: true },
            }),
        ]);
        if (!bin)
            throw new common_1.NotFoundException("Bin not found");
        if (!inventory)
            throw new common_1.NotFoundException("Inventory not found");
        const available = bin.capacity - (bin.currentQty + bin.reservedQty);
        if (dto.qty > available) {
            throw new common_1.BadRequestException(`Bin does not have enough available space. Available: ${available}`);
        }
        const special = dto.specialHandling;
        const derivedTempMin = special?.tempMin ?? null;
        const derivedTempMax = special?.tempMax ?? null;
        const derivedIsHazardous = !!special?.isHazardous;
        const derivedCompatibility = Array.isArray(special?.compatibility)
            ? special.compatibility
            : [];
        const result = await this.prisma.$transaction(async (tx) => {
            const updatedBin = await tx.bin.update({
                where: { id: bin.id },
                data: { currentQty: { increment: dto.qty } },
            });
            const updatedInventory = await tx.inventory.update({
                where: { id: inventory.id },
                data: { totalQty: { increment: dto.qty } },
            });
            const invLocData = {
                inventoryId: inventory.id,
                binId: bin.id,
                qty: dto.qty,
                shipmentId: dto.shipmentId ?? null,
                clientId: dto.clientId ?? null,
                clientName: dto.clientName ?? null,
                lotNumber: dto.lotNumber ?? null,
                expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
                tempMin: derivedTempMin ?? null,
                tempMax: derivedTempMax ?? null,
                isHazardous: derivedIsHazardous,
                itemCompatibility: derivedCompatibility,
                createdBy: createdBy ?? null,
            };
            if (dto.status !== undefined && dto.status !== null) {
                invLocData.status = dto.status;
            }
            if (dto.condition !== undefined && dto.condition !== null) {
                invLocData.condition = dto.condition;
            }
            if (special !== undefined) {
                invLocData.specialHandling = special;
            }
            const invLoc = await tx.inventoryLocation.create({
                data: invLocData,
            });
            return { updatedBin, updatedInventory, invLoc };
        });
        return result.invLoc;
    }
    async moveOrUpdateInventoryLocation(id, dto, updatedBy) {
        const loc = await this.prisma.inventoryLocation.findUnique({
            where: { id },
        });
        if (!loc)
            throw new common_1.NotFoundException("InventoryLocation not found");
        const newQty = typeof dto.qty === "number" ? dto.qty : loc.qty;
        const targetBinId = dto.binId ?? loc.binId;
        return this.prisma.$transaction(async (tx) => {
            const [sourceBin, targetBin] = await Promise.all([
                tx.bin.findUnique({ where: { id: loc.binId } }),
                tx.bin.findUnique({ where: { id: targetBinId } }),
            ]);
            if (!sourceBin)
                throw new common_1.NotFoundException("Source bin not found");
            if (!targetBin)
                throw new common_1.NotFoundException("Target bin not found");
            const qtyDelta = newQty - loc.qty;
            const special = dto.specialHandling;
            const derivedTempMin = special?.tempMin ?? loc.tempMin;
            const derivedTempMax = special?.tempMax ?? loc.tempMax;
            const derivedIsHazardous = special?.isHazardous ?? loc.isHazardous;
            const derivedCompatibility = Array.isArray(special?.compatibility)
                ? special.compatibility
                : loc.itemCompatibility;
            if (targetBinId !== loc.binId) {
                const targetAvailable = targetBin.capacity - (targetBin.currentQty + targetBin.reservedQty);
                if (newQty > targetAvailable) {
                    throw new common_1.BadRequestException(`Target bin does not have enough available space. Available: ${targetAvailable}`);
                }
                await tx.bin.update({
                    where: { id: sourceBin.id },
                    data: { currentQty: { decrement: loc.qty } },
                });
                await tx.bin.update({
                    where: { id: targetBin.id },
                    data: { currentQty: { increment: newQty } },
                });
                if (qtyDelta !== 0) {
                    await tx.inventory.update({
                        where: { id: loc.inventoryId },
                        data: { totalQty: { increment: qtyDelta } },
                    });
                }
                const updateData = {
                    binId: targetBin.id,
                    qty: newQty,
                    lotNumber: dto.lotNumber ?? loc.lotNumber,
                    expiryDate: dto.expiryDate
                        ? new Date(dto.expiryDate)
                        : loc.expiryDate,
                    tempMin: derivedTempMin ?? null,
                    tempMax: derivedTempMax ?? null,
                    isHazardous: derivedIsHazardous,
                    itemCompatibility: derivedCompatibility,
                    clientName: dto.clientName ?? loc.clientName,
                    updatedAt: new Date(),
                };
                if (dto.status !== undefined)
                    updateData.status = dto.status;
                if (dto.condition !== undefined)
                    updateData.condition = dto.condition;
                if (dto.specialHandling !== undefined) {
                    updateData.specialHandling =
                        dto.specialHandling === null ? client_1.Prisma.DbNull : dto.specialHandling;
                }
                const updated = await tx.inventoryLocation.update({
                    where: { id },
                    data: updateData,
                });
                return updated;
            }
            else {
                const binAvailable = sourceBin.capacity - (sourceBin.currentQty + sourceBin.reservedQty);
                if (qtyDelta > 0 && qtyDelta > binAvailable) {
                    throw new common_1.BadRequestException(`Bin does not have enough available space for increase. Available: ${binAvailable}`);
                }
                if (qtyDelta !== 0) {
                    await tx.bin.update({
                        where: { id: sourceBin.id },
                        data: { currentQty: { increment: qtyDelta } },
                    });
                }
                if (qtyDelta !== 0) {
                    await tx.inventory.update({
                        where: { id: loc.inventoryId },
                        data: { totalQty: { increment: qtyDelta } },
                    });
                }
                const updateData = {
                    qty: newQty,
                    lotNumber: dto.lotNumber ?? loc.lotNumber,
                    expiryDate: dto.expiryDate
                        ? new Date(dto.expiryDate)
                        : loc.expiryDate,
                    tempMin: derivedTempMin ?? loc.tempMin,
                    tempMax: derivedTempMax ?? loc.tempMax,
                    isHazardous: derivedIsHazardous,
                    itemCompatibility: derivedCompatibility,
                    clientName: dto.clientName ?? loc.clientName,
                    updatedAt: new Date(),
                };
                if (dto.status !== undefined)
                    updateData.status = dto.status;
                if (dto.condition !== undefined)
                    updateData.condition = dto.condition;
                if (dto.specialHandling !== undefined) {
                    updateData.specialHandling =
                        dto.specialHandling === null ? client_1.Prisma.DbNull : dto.specialHandling;
                }
                const updated = await tx.inventoryLocation.update({
                    where: { id },
                    data: updateData,
                });
                return updated;
            }
        });
    }
    async deleteInventoryLocation(id) {
        const loc = await this.prisma.inventoryLocation.findUnique({
            where: { id },
        });
        if (!loc)
            throw new common_1.NotFoundException("InventoryLocation not found");
        return this.prisma.$transaction(async (tx) => {
            await tx.bin.update({
                where: { id: loc.binId },
                data: { currentQty: { decrement: loc.qty } },
            });
            await tx.inventory.update({
                where: { id: loc.inventoryId },
                data: { totalQty: { decrement: loc.qty } },
            });
            await tx.inventoryLocation.delete({ where: { id } });
            return { ok: true };
        });
    }
    async getInventoryLocation(id) {
        const loc = await this.prisma.inventoryLocation.findUnique({
            where: { id },
            include: {
                bin: true,
                inventory: { include: { product: true, warehouse: true } },
            },
        });
        if (!loc)
            throw new common_1.NotFoundException("InventoryLocation not found");
        return loc;
    }
    async listInventoryLocations(filter) {
        const where = {};
        if (filter?.clientId)
            where.clientId = filter.clientId;
        if (filter?.shipmentId)
            where.shipmentId = filter.shipmentId;
        if (filter?.status)
            where.status = filter.status;
        if (filter?.binId)
            where.binId = filter.binId;
        return this.prisma.inventoryLocation.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { bin: true, inventory: { include: { product: true } } },
        });
    }
    async getInventory(productId, warehouseId) {
        return this.prisma.inventory.findFirst({
            where: { productId, warehouseId },
            include: { locations: true, product: true },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
