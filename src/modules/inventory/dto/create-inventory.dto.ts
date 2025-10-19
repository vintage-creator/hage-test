import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ description: 'ID of the product associated with the inventory' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'ID of the warehouse where the inventory is stored' })
  @IsString()
  warehouseId!: string;

  @ApiPropertyOptional({
    description: 'Total quantity of the product in the warehouse. If not provided, defaults to 0.',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalQty?: number;
}
