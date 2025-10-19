// src/modules/auth/dto/register-company.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterCompanyDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString() @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: '+2348010000000' })
  @IsString() @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({ example: 'me@example.com' })
  @IsString() @IsNotEmpty()
  emailAddress!: string;

  @ApiProperty({ example: 'ACME Ltd' })
  @IsString() @IsNotEmpty()
  businessName!: string;

  @ApiProperty({ example: '12 Port Road' })
  @IsString() @IsNotEmpty()
  businessAddress!: string;

  @ApiProperty({ enum: ['ENTERPRISE','DISTRIBUTOR','END_USER','LOGISTIC_SERVICE_PROVIDER'] })
  @IsString() @IsNotEmpty()
  kind!: string;

  @ApiProperty({ enum: ['CROSS_BORDER_LOGISTICS','TRANSPORTER','LAST_MILE_PROVIDER'] })
  @IsString() @IsNotEmpty()
  role!: string;
}
