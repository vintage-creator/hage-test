// src/modules/shipments/dto/filter-shipment.dto.ts
import { IsEnum, IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ShipmentStatus } from "./update-status.dto";

export class FilterShipmentDto {
	@IsEnum(ShipmentStatus)
	@IsOptional()
	status?: ShipmentStatus;

	@IsString()
	@IsOptional()
	origin?: string;

	@IsString()
	@IsOptional()
	destination?: string;

	@IsString()
	@IsOptional()
	cargoType?: string;

	@IsString()
	@IsOptional()
	orderId?: string;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	@IsOptional()
	page?: number = 1;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	@IsOptional()
	limit?: number = 20;
}
