import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty()
  @IsString()
  trackingNumber!: string;

  @ApiProperty()
  @IsString()
  origin!: string;

  @ApiProperty()
  @IsString()
  destination!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty({ description: 'ISO date string or Date object' })
  @IsDateString()
  estimatedDelivery!: string; // accept ISO string from client
}
