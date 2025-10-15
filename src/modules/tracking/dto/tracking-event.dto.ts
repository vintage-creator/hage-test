import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackingEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  shipmentId!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  location?: string | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty()
  timestamp!: Date;
}
