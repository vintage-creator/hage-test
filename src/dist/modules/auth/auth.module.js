"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const prisma_module_1 = require("../../prisma/prisma.module");
const cloudinary_service_1 = require("../../common/storage/cloudinary.service");
const mail_service_1 = require("../../common/mail/mail.service");
const token_service_1 = __importDefault(require("./token.service"));
const url_service_1 = __importDefault(require("./url.service"));
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    secret: cfg.get('JWT_SECRET') ?? 'unsafe-dev-secret',
                    signOptions: { expiresIn: (cfg.get('JWT_EXPIRES_IN') ?? '1h') },
                }),
            }),
            prisma_module_1.PrismaModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            mail_service_1.MailService,
            token_service_1.default,
            url_service_1.default,
            { provide: 'StorageService', useClass: cloudinary_service_1.CloudinaryService },
        ],
        exports: [auth_service_1.AuthService, token_service_1.default, url_service_1.default],
    })
], AuthModule);
