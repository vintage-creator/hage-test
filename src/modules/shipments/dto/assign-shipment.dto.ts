// src/modules/shipments/dto/assign-shipment.dto.ts
import { IsString, IsOptional } from "class-validator";

export class AssignShipmentDto {
	@IsString()
	@IsOptional()
	transporterId?: string;

	@IsString()
	@IsOptional()
	warehouseId?: string;
}
