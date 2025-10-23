"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentsModule = void 0;
const common_1 = require("@nestjs/common");
const shipments_controller_1 = require("./shipments.controller");
const shipments_service_1 = require("./shipments.service");
const prisma_module_1 = require("../../prisma/prisma.module");
const cloudinary_service_1 = require("../../common/storage/cloudinary.service");
const mail_service_1 = require("../../common/mail/mail.service");
const config_1 = require("@nestjs/config");
let ShipmentsModule = class ShipmentsModule {
};
exports.ShipmentsModule = ShipmentsModule;
exports.ShipmentsModule = ShipmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            config_1.ConfigModule,
        ],
        controllers: [shipments_controller_1.ShipmentsController],
        providers: [shipments_service_1.ShipmentsService, mail_service_1.MailService, { provide: "StorageService", useClass: cloudinary_service_1.CloudinaryService }],
        exports: [shipments_service_1.ShipmentsService],
    })
], ShipmentsModule);
