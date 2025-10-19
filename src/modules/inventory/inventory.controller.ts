import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create or upsert inventory (product + warehouse)' })
  async createInventory(@Body() dto: CreateInventoryDto) {
    return this.svc.createInventory(dto);
  }

  @Get('product/:productId/warehouse/:warehouseId')
  @ApiOperation({ summary: 'Get inventory for a product in a warehouse' })
  async getInventory(@Param('productId') productId: string, @Param('warehouseId') warehouseId: string) {
    return this.svc.getInventory(productId, warehouseId);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Place inventory into a bin (create InventoryLocation) — transactional' })
  async createInventoryLocation(@Body() dto: CreateInventoryLocationDto) {
    // createdBy could come from request user — wire in when auth returns user id
    return this.svc.createInventoryLocation(dto);
  }

  @Get('locations')
  @ApiOperation({ summary: 'List inventory locations (filter by clientId, shipmentId, status, binId)' })
  async listInventoryLocations(
    @Query('clientId') clientId?: string,
    @Query('shipmentId') shipmentId?: string,
    @Query('status') status?: string,
    @Query('binId') binId?: string,
  ) {
    return this.svc.listInventoryLocations({ clientId, shipmentId, status, binId });
  }

  @Get('locations/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Get single inventory location' })
  async getInventoryLocation(@Param('id') id: string) {
    return this.svc.getInventoryLocation(id);
  }

  @Patch('locations/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Move or update inventory location (qty, bin, metadata) — transactional' })
  async updateInventoryLocation(@Param('id') id: string, @Body() dto: UpdateInventoryLocationDto) {
    return this.svc.moveOrUpdateInventoryLocation(id, dto);
  }

  @Delete('locations/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Delete inventory location and adjust totals (assumes removal)' })
  async deleteInventoryLocation(@Param('id') id: string) {
    return this.svc.deleteInventoryLocation(id);
  }
}
