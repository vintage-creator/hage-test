import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateTrackingDto {
  @ApiProperty({ example: 'IN_TRANSIT' })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional({ example: 'Lagos Warehouse' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Picked up by driver' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: new Date().toISOString(), description: 'ISO date string' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
