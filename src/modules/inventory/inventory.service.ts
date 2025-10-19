import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  InventoryCondition,
  InventoryLocationStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { CreateInventoryLocationDto } from "./dto/create-inventory-location.dto";
import { UpdateInventoryLocationDto } from "./dto/update-inventory-location.dto";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or return an Inventory row for product+warehouse.
   * If totalQty is provided, set it (in practice this should reflect InventoryLocation sums).
   */
  async createInventory(dto: CreateInventoryDto) {
    // ensure product and warehouse exist
    const [product, warehouse] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);
    if (!product) throw new NotFoundException("Product not found");
    if (!warehouse) throw new NotFoundException("Warehouse not found");

    // Manual upsert: avoid reliance on generated compound-unique input name
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

  /**
   * Place qty into a given bin and create an InventoryLocation entry.
   * This is transactional: checks bin capacity, updates bin.currentQty, updates inventory.totalQty,
   * and inserts InventoryLocation.
   */
  async createInventoryLocation(
    dto: CreateInventoryLocationDto,
    createdBy?: string
  ) {
    // load bin and inventory
    const [bin, inventory] = await Promise.all([
      this.prisma.bin.findUnique({ where: { id: dto.binId } }),
      this.prisma.inventory.findUnique({
        where: { id: dto.inventoryId },
        include: { warehouse: true },
      }),
    ]);

    if (!bin) throw new NotFoundException("Bin not found");
    if (!inventory) throw new NotFoundException("Inventory not found");

    // compute available capacity
    const available = bin.capacity - (bin.currentQty + bin.reservedQty);
    if (dto.qty > available) {
      throw new BadRequestException(
        `Bin does not have enough available space. Available: ${available}`
      );
    }

    // Derive denormalized fields from specialHandling
    const special = dto.specialHandling; // could be undefined or object
    const derivedTempMin = special?.tempMin ?? null;
    const derivedTempMax = special?.tempMax ?? null;
    const derivedIsHazardous = !!special?.isHazardous;
    const derivedCompatibility = Array.isArray(special?.compatibility)
      ? special.compatibility
      : [];

    // Transaction: increment bin.currentQty, increment inventory.totalQty, create inv location
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedBin = await tx.bin.update({
        where: { id: bin.id },
        data: { currentQty: { increment: dto.qty } },
      });

      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: { totalQty: { increment: dto.qty } },
      });

      // Build inv location payload conditionally to satisfy Prisma types
      const invLocData: any = {
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

      // Enums: cast to Prisma enum types (dto validated via DTOs)
      if (dto.status !== undefined && dto.status !== null) {
        invLocData.status = dto.status as InventoryLocationStatus;
      }
      if (dto.condition !== undefined && dto.condition !== null) {
        invLocData.condition = dto.condition as InventoryCondition;
      }

      // include specialHandling only if provided (avoid passing null which can conflict with types)
      if (special !== undefined) {
        // If you explicitly want to clear the column (SQL NULL), set Prisma.DbNull
        // invLocData.specialHandling = special === null ? Prisma.DbNull : special;
        invLocData.specialHandling = special;
      }

      const invLoc = await tx.inventoryLocation.create({
        data: invLocData,
      });

      return { updatedBin, updatedInventory, invLoc };
    });

    return result.invLoc;
  }

  /**
   * Move inventory location between bins (or adjust qty).
   * If binId is changed, this will decrement the source bin currentQty and increment target bin currentQty.
   * All operations are done in a single transaction.
   */
  async moveOrUpdateInventoryLocation(
    id: string,
    dto: UpdateInventoryLocationDto,
    updatedBy?: string
  ) {
    const loc = await this.prisma.inventoryLocation.findUnique({
      where: { id },
    });
    if (!loc) throw new NotFoundException("InventoryLocation not found");

    // prepare fields
    const newQty = typeof dto.qty === "number" ? dto.qty : loc.qty;
    const targetBinId = dto.binId ?? loc.binId;

    // If moving bins or changing qty, we must update the two bins and the inventory total accordingly
    return this.prisma.$transaction(async (tx) => {
      // fetch bins inside tx for up-to-date quantities
      const [sourceBin, targetBin] = await Promise.all([
        tx.bin.findUnique({ where: { id: loc.binId } }),
        tx.bin.findUnique({ where: { id: targetBinId } }),
      ]);

      if (!sourceBin) throw new NotFoundException("Source bin not found");
      if (!targetBin) throw new NotFoundException("Target bin not found");

      const qtyDelta = newQty - loc.qty; // positive => increase total qty; negative => decrease

      // Helper to prepare specialHandling-derived fields
      const special = dto.specialHandling;
      const derivedTempMin = special?.tempMin ?? loc.tempMin;
      const derivedTempMax = special?.tempMax ?? loc.tempMax;
      const derivedIsHazardous = special?.isHazardous ?? loc.isHazardous;
      const derivedCompatibility = Array.isArray(special?.compatibility)
        ? special.compatibility
        : loc.itemCompatibility;

      // If moving between different bins
      if (targetBinId !== loc.binId) {
        // check target capacity (consider targetBin.current + targetBin.reserved + newQty)
        const targetAvailable =
          targetBin.capacity - (targetBin.currentQty + targetBin.reservedQty);
        if (newQty > targetAvailable) {
          throw new BadRequestException(
            `Target bin does not have enough available space. Available: ${targetAvailable}`
          );
        }

        // decrement source bin currentQty by existing loc.qty
        await tx.bin.update({
          where: { id: sourceBin.id },
          data: { currentQty: { decrement: loc.qty } },
        });

        // increment target bin currentQty by newQty
        await tx.bin.update({
          where: { id: targetBin.id },
          data: { currentQty: { increment: newQty } },
        });

        // update inventory.totalQty by qtyDelta (if qty changed)
        if (qtyDelta !== 0) {
          await tx.inventory.update({
            where: { id: loc.inventoryId },
            data: { totalQty: { increment: qtyDelta } },
          });
        }

        // build update payload for inventoryLocation (use Prisma enum casts where needed)
        const updateData: any = {
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
          updateData.status = dto.status as InventoryLocationStatus;
        if (dto.condition !== undefined)
          updateData.condition = dto.condition as InventoryCondition;
        if (dto.specialHandling !== undefined) {
          // to clear: use Prisma.DbNull; otherwise set the provided JSON
          updateData.specialHandling =
            dto.specialHandling === null ? Prisma.DbNull : dto.specialHandling;
        }

        const updated = await tx.inventoryLocation.update({
          where: { id },
          data: updateData,
        });
        return updated;
      } else {
        // same bin — only adjust quantities
        const binAvailable =
          sourceBin.capacity - (sourceBin.currentQty + sourceBin.reservedQty);
        // If qtyDelta > 0, need to ensure there's room
        if (qtyDelta > 0 && qtyDelta > binAvailable) {
          throw new BadRequestException(
            `Bin does not have enough available space for increase. Available: ${binAvailable}`
          );
        }

        // update bin.currentQty by qtyDelta
        if (qtyDelta !== 0) {
          await tx.bin.update({
            where: { id: sourceBin.id },
            data: { currentQty: { increment: qtyDelta } },
          });
        }

        // update inventory.totalQty
        if (qtyDelta !== 0) {
          await tx.inventory.update({
            where: { id: loc.inventoryId },
            data: { totalQty: { increment: qtyDelta } },
          });
        }

        // build update data
        const updateData: any = {
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
          updateData.status = dto.status as InventoryLocationStatus;
        if (dto.condition !== undefined)
          updateData.condition = dto.condition as InventoryCondition;
        if (dto.specialHandling !== undefined) {
          updateData.specialHandling =
            dto.specialHandling === null ? Prisma.DbNull : dto.specialHandling;
        }

        const updated = await tx.inventoryLocation.update({
          where: { id },
          data: updateData,
        });
        return updated;
      }
    });
  }

  /**
   * Remove an inventory location and decrement bin and inventory totals.
   * This assumes deletion means physical removal of the qty from warehouse.
   */
  async deleteInventoryLocation(id: string) {
    const loc = await this.prisma.inventoryLocation.findUnique({
      where: { id },
    });
    if (!loc) throw new NotFoundException("InventoryLocation not found");

    return this.prisma.$transaction(async (tx) => {
      // decrement bin currentQty
      await tx.bin.update({
        where: { id: loc.binId },
        data: { currentQty: { decrement: loc.qty } },
      });

      // decrement inventory.totalQty
      await tx.inventory.update({
        where: { id: loc.inventoryId },
        data: { totalQty: { decrement: loc.qty } },
      });

      // delete the location
      await tx.inventoryLocation.delete({ where: { id } });

      return { ok: true };
    });
  }

  async getInventoryLocation(id: string) {
    const loc = await this.prisma.inventoryLocation.findUnique({
      where: { id },
      include: {
        bin: true,
        inventory: { include: { product: true, warehouse: true } },
      },
    });
    if (!loc) throw new NotFoundException("InventoryLocation not found");
    return loc;
  }

  async listInventoryLocations(filter?: {
    clientId?: string;
    shipmentId?: string;
    status?: string;
    binId?: string;
  }) {
    const where: any = {};
    if (filter?.clientId) where.clientId = filter.clientId;
    if (filter?.shipmentId) where.shipmentId = filter.shipmentId;
    if (filter?.status) where.status = filter.status;
    if (filter?.binId) where.binId = filter.binId;

    return this.prisma.inventoryLocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { bin: true, inventory: { include: { product: true } } },
    });
  }

  async getInventory(productId: string, warehouseId: string) {
    // Use findFirst to avoid relying on generated compound unique field typings
    return this.prisma.inventory.findFirst({
      where: { productId, warehouseId },
      include: { locations: true, product: true },
    });
  }
}
