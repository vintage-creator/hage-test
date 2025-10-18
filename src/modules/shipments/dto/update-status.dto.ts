import { IsEnum, IsOptional, IsString } from "class-validator";

export enum ShipmentStatus {
	PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE",
	ACCEPTED = "ACCEPTED",
	EN_ROUTE_TO_PICKUP = "EN_ROUTE_TO_PICKUP",
	PICKED_UP = "PICKED_UP",
	IN_TRANSIT = "IN_TRANSIT",
	ARRIVED_AT_DESTINATION = "ARRIVED_AT_DESTINATION",
	COMPLETED = "COMPLETED",
	CANCELLED = "CANCELLED",
}

export class UpdateStatusDto {
	@IsEnum(ShipmentStatus)
	status!: ShipmentStatus;

	@IsString()
	@IsOptional()
	note?: string;
}
