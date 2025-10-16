import { IsEnum, IsString } from 'class-validator';
import { UserKind, RoleType } from '@prisma/client';

export class RegisterCompanyDto {
  @IsString()
  fullName!: string;          

  @IsString()
  phoneNumber!: string;

  @IsString()
  emailAddress!: string;

  @IsString()
  businessName!: string;

  @IsString()
  businessAddress!: string;

  @IsEnum(UserKind)
  kind!: UserKind;

  @IsEnum(RoleType)
  role!: RoleType;
}
