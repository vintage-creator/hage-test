// src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";

// Feature modules
import { AuthModule } from "./modules/auth/auth.module";
import { ShipmentsModule } from "./modules/shipments/shipments.module";
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WarehousesModule } from "./modules/warehouses/warehouses.module";
import { InventoryModule } from "./modules/inventory/inventory.module";


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ShipmentsModule,
    NotificationsModule,
    WarehousesModule,
    InventoryModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
