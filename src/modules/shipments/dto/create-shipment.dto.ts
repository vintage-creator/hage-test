// src/modules/shipments/dto/create-shipment.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, IsDateString, IsNumber, IsEmail, IsNotEmpty } from "class-validator";

export class CreateShipmentDto {
	// Tracking number (optional if auto-generated)
	@ApiPropertyOptional({ example: "HAGE-20251016-8F4C2D" })
	@IsOptional()
	@IsString()
	trackingNumber!: string;

	// ORIGIN
	@ApiProperty({ example: "Nigeria" })
	@IsString()
	@IsNotEmpty()
	originCountry!: string;

	@ApiProperty({ example: "Lagos" })
	@IsString()
	@IsNotEmpty()
	originState!: string;

	@ApiProperty({ example: "123, Broad Street, Marina" })
	@IsString()
	@IsNotEmpty()
	originAddress!: string;

	@ApiPropertyOptional({ example: "+234 812 456 7890" })
	@IsOptional()
	@IsString()
	originPhone?: string;

	// DESTINATION
	@ApiProperty({ example: "Ghana" })
	@IsString()
	@IsNotEmpty()
	destinationCountry!: string;

	@ApiProperty({ example: "Accra" })
	@IsString()
	@IsNotEmpty()
	destinationState!: string;

	@ApiProperty({ example: "15 Independence Ave, Accra" })
	@IsString()
	@IsNotEmpty()
	destinationAddress!: string;

	@ApiPropertyOptional({ example: "+233 501 123 4567" })
	@IsOptional()
	@IsString()
	destinationPhone?: string;

	// SHIPMENT DETAILS
	@ApiPropertyOptional({ example: "pending" })
	@IsOptional()
	@IsString()
	status?: string;

	@ApiProperty()
	@IsString()
	// @IsNotEmpty()
	customerId!: string;

	@ApiPropertyOptional({ example: 2500 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	payment?: number;

	@ApiPropertyOptional({ example: "Global Imports Ltd." })
	@IsOptional()
	@IsString()
	client?: string;

	@ApiPropertyOptional({ example: "customer@example.com" })
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiPropertyOptional({ example: "Electronics" })
	@IsOptional()
	@IsString()
	cargoType?: string;

	@ApiPropertyOptional({ example: "500KG" })
	@IsOptional()
	@IsString()
	weight?: string;

	@ApiPropertyOptional({ example: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	tons?: number;

	@ApiPropertyOptional({ example: "2025-07-15" })
	@IsOptional()
	@IsDateString()
	pickupDate?: string;

	@ApiPropertyOptional({ example: "2025-10-03" })
	@IsOptional()
	@IsDateString()
	deliveryDate?: string;

	@ApiPropertyOptional({ example: "Express" })
	@IsOptional()
	@IsString()
	serviceLevel?: string;

	@ApiPropertyOptional({ example: "https://files.company.com/docs/invoice.pdf" })
	@IsOptional()
	@IsString()
	documentUrl?: string;
}
