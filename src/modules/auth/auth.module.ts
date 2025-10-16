import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { MailService } from '../../common/mail/mail.service';
import TokenService from "./token.service";
import UrlService from "./url.service";


@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): JwtModuleOptions => ({
        secret: cfg.get<string>('JWT_SECRET') ?? 'unsafe-dev-secret',
        signOptions: { expiresIn: (cfg.get<string>('JWT_EXPIRES_IN') ?? '1h') as any },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy,
    MailService,
    TokenService, 
    UrlService,
    { provide: 'StorageService', useClass: CloudinaryService }, 
  ],
  exports: [AuthService, TokenService, UrlService],
})
export class AuthModule {}
