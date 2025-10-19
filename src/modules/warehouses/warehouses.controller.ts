import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { WarehousesService } from "./warehouses.service";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { CreateRackDto } from "./dto/create-rack.dto";
import { CreateBinDto } from "./dto/create-bin.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("warehouses")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("warehouses")
export class WarehousesController {
  constructor(private readonly svc: WarehousesService) {}

  @Post()
  @ApiOperation({ summary: "Create a warehouse" })
  @ApiResponse({ status: 201, description: "Warehouse created" })
  async create(
    @Body() dto: CreateWarehouseDto,
    @Request() req: any
  ): Promise<any> {
    const authUserId = req.user?.sub ?? req.user?.id;
    if (!authUserId) {
      throw new UnauthorizedException("User not authenticated");
    }
    return this.svc.createWarehouse(dto, authUserId);
  }

  @Get()
  @ApiOperation({ summary: "List warehouses (optionally by companyId)" })
  @ApiResponse({ status: 200, description: "List of warehouses" })
  async list(@Query("companyId") companyId?: string): Promise<any> {
    return this.svc.listWarehouses(companyId);
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "Warehouse id" })
  @ApiOperation({
    summary: "Get warehouse details (zones → racks → bins) with computed usage",
  })
  async get(@Param("id") id: string): Promise<any> {
    return this.svc.getWarehouse(id);
  }

  @Get(":id/capacity")
  @ApiParam({ name: "id", description: "Warehouse id" })
  @ApiOperation({
    summary:
      "Get compact capacity summary for a warehouse (used, reserved, available, computedStatus)",
  })
  async capacity(@Param("id") id: string): Promise<any> {
    return this.svc.getWarehouseCapacity(id);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Warehouse id" })
  @ApiOperation({ summary: "Update warehouse" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto
  ): Promise<any> {
    return this.svc.updateWarehouse(id, dto);
  }

  @Delete(":id")
  @ApiParam({ name: "id", description: "Warehouse id" })
  @ApiOperation({ summary: "Delete warehouse" })
  async remove(@Param("id") id: string): Promise<any> {
    return this.svc.deleteWarehouse(id);
  }

  @Post(":id/zones")
  @ApiParam({ name: "id", description: "Warehouse id" })
  @ApiOperation({ summary: "Create a zone inside a warehouse" })
  async createZone(
    @Param("id") id: string,
    @Body() dto: CreateZoneDto
  ): Promise<any> {
    return this.svc.createZone(id, dto);
  }

  @Post("zones/:zoneId/racks")
  @ApiParam({ name: "zoneId", description: "Zone id" })
  @ApiOperation({ summary: "Create a rack inside a zone" })
  async createRack(
    @Param("zoneId") zoneId: string,
    @Body() dto: CreateRackDto
  ): Promise<any> {
    return this.svc.createRack(zoneId, dto);
  }

  @Post("racks/:rackId/bins")
  @ApiParam({ name: "rackId", description: "Rack id" })
  @ApiOperation({ summary: "Create a bin inside a rack" })
  async createBin(
    @Param("rackId") rackId: string,
    @Body() dto: CreateBinDto
  ): Promise<any> {
    return this.svc.createBin(rackId, dto);
  }

  @Get("bins/:binId/availability")
  @ApiParam({ name: "binId", description: "Bin id" })
  @ApiOperation({ summary: "Get availability details for a bin" })
  async binAvailability(@Param("binId") binId: string): Promise<any> {
    return this.svc.getBinAvailability(binId);
  }
}
