// src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";

// Feature modules
import { AuthModule } from "./modules/auth/auth.module";
//import { UsersModule } from "./modules/users/users.module";
import { ShipmentsModule } from "./modules/shipments/shipments.module";
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    //UsersModule,
    ShipmentsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
