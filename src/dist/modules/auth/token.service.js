"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
let TokenService = class TokenService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createVerificationToken(userId, hours = 24) {
        const token = (0, crypto_1.randomBytes)(24).toString("hex");
        const expiresAt = (0, date_fns_1.add)(new Date(), { hours });
        const rec = await this.prisma.verificationToken.create({
            data: { userId, token, expiresAt },
        });
        return { id: rec.id, token: rec.token, expiresAt: rec.expiresAt };
    }
    async createPasswordResetToken(userId, hours = 2) {
        const token = (0, crypto_1.randomBytes)(24).toString("hex");
        const expiresAt = (0, date_fns_1.add)(new Date(), { hours });
        const rec = await this.prisma.passwordResetToken.create({
            data: { userId, token, expiresAt },
        });
        return { id: rec.id, token: rec.token, expiresAt: rec.expiresAt };
    }
    async findVerificationToken(token) {
        return this.prisma.verificationToken.findUnique({
            where: { token },
            include: { user: true },
        });
    }
    async findPasswordResetToken(token) {
        return this.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });
    }
    async deletePasswordResetToken(id) {
        return this.prisma.passwordResetToken.delete({ where: { id } });
    }
    async deleteVerificationTokensByUser(userId) {
        return this.prisma.verificationToken.deleteMany({ where: { userId } });
    }
    async markPasswordTokenUsed(id) {
        return this.prisma.passwordResetToken.update({
            where: { id },
            data: { used: true },
        });
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TokenService);
exports.default = TokenService;
