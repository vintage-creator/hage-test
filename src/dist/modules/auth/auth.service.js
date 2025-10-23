"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const token_service_1 = __importDefault(require("./token.service"));
const url_service_1 = __importDefault(require("./url.service"));
const password_1 = require("../../utils/password");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const mail_service_1 = require("../../common/mail/mail.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwt, cfg, storage, mailer, tokenService, urlService) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.cfg = cfg;
        this.storage = storage;
        this.mailer = mailer;
        this.tokenService = tokenService;
        this.urlService = urlService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.refreshDays = Number(this.cfg.get("REFRESH_EXPIRES_DAYS") ?? 30);
    }
    async registerCompany(dto, files) {
        if (!dto.kind)
            throw new common_1.BadRequestException("User kind is required");
        if (!dto.role)
            throw new common_1.BadRequestException("User role is required");
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.emailAddress },
        });
        if (existingUser) {
            if (!existingUser.isVerified) {
                const latestToken = await this.prisma.verificationToken.findFirst({
                    where: { userId: existingUser.id },
                    orderBy: { createdAt: "desc" },
                });
                if (latestToken) {
                    const msSince = Date.now() - new Date(latestToken.createdAt).getTime();
                    const cooldownMs = 60 * 1000;
                    if (msSince < cooldownMs) {
                        throw new common_1.BadRequestException("Verification email recently sent. Please wait a moment before retrying.");
                    }
                }
                await this.tokenService.deleteVerificationTokensByUser(existingUser.id);
                const tokenRec = await this.tokenService.createVerificationToken(existingUser.id);
                const verificationUrl = this.urlService.verificationUrl(tokenRec.token);
                const emailContext = {
                    fullName: dto.fullName ?? existingUser.email,
                    businessName: dto.businessName ?? "",
                    verificationUrl,
                };
                try {
                    await this.mailer.sendVerificationEmail(existingUser.email, emailContext);
                }
                catch (emailErr) {
                    try {
                        await this.tokenService.deleteVerificationTokensByUser(existingUser.id);
                    }
                    catch (e) {
                        this.logger.error("Failed to cleanup token after email send failure: " +
                            (e?.message ?? e));
                    }
                    throw new common_1.BadRequestException("Failed to send verification email. Please try again later.");
                }
                return {
                    ok: true,
                    message: "Account exists but not verified — verification email resent.",
                };
            }
            throw new common_1.BadRequestException("Email is already registered");
        }
        const uploadPromises = [];
        if (files.companyCert)
            uploadPromises.push(this.storage.uploadFile(files.companyCert, { folder: "company-docs" }));
        if (files.taxCert)
            uploadPromises.push(this.storage.uploadFile(files.taxCert, { folder: "company-docs" }));
        const results = await Promise.all(uploadPromises);
        try {
            const { company, user } = await this.prisma.$transaction(async (tx) => {
                const newCompany = await tx.company.create({
                    data: {
                        fullName: dto.fullName,
                        phoneNumber: dto.phoneNumber,
                        emailAddress: dto.emailAddress,
                        businessName: dto.businessName,
                        businessAddress: dto.businessAddress,
                        documents: {
                            create: results.map((r, idx) => ({
                                type: idx === 0
                                    ? "COMPANY_REGISTRATION_CERTIFICATE"
                                    : "TAX_REGISTRATION_CERTIFICATE",
                                url: r.url,
                            })),
                        },
                    },
                });
                const newUser = await tx.user.create({
                    data: {
                        email: dto.emailAddress,
                        phone: dto.phoneNumber,
                        kind: dto.kind,
                        role: dto.role,
                        companyId: newCompany.id,
                        isVerified: false,
                    },
                });
                return {
                    company: newCompany,
                    user: newUser,
                };
            });
            const tokenRec = await this.tokenService.createVerificationToken(user.id);
            const verificationUrl = this.urlService.verificationUrl(tokenRec.token);
            const emailContext = {
                fullName: dto.fullName,
                businessName: dto.businessName,
                verificationUrl,
            };
            try {
                await this.mailer.sendVerificationEmail(user.email, emailContext);
            }
            catch (emailErr) {
                try {
                    await this.prisma.$transaction([
                        this.prisma.verificationToken.deleteMany({
                            where: { userId: user.id },
                        }),
                        this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
                        this.prisma.passwordResetToken.deleteMany({
                            where: { userId: user.id },
                        }),
                        this.prisma.user.delete({ where: { id: user.id } }),
                        this.prisma.company.delete({ where: { id: company.id } }),
                    ]);
                }
                catch (cleanupErr) {
                    this.logger.error("Failed to cleanup after email send failure: " +
                        (cleanupErr?.message ?? String(cleanupErr)));
                }
                throw new common_1.BadRequestException("Failed to send verification email. Please try again.");
            }
            return { ok: true };
        }
        catch (err) {
            if (err?.code === "P2002") {
                throw new common_1.BadRequestException("Email or phone already registered");
            }
            throw new common_1.BadRequestException(err.message || "Registration failed");
        }
    }
    async verifyEmail(token) {
        const rec = await this.tokenService.findVerificationToken(token);
        if (!rec || rec.expiresAt < new Date()) {
            throw new common_1.BadRequestException("Invalid or expired token");
        }
        return {
            ok: true,
            email: rec.user?.email ?? null,
            companyId: rec.user?.companyId ?? null,
            expiresAt: rec.expiresAt,
            token: rec.token,
        };
    }
    async verifyResetToken(token) {
        if (!token)
            throw new common_1.BadRequestException("Missing token");
        const rec = await this.tokenService.findPasswordResetToken(token);
        if (!rec || rec.used || rec.expiresAt < new Date()) {
            throw new common_1.BadRequestException("Invalid or expired token");
        }
        return {
            ok: true,
            expiresAt: rec.expiresAt,
            token: rec.token,
        };
    }
    async setPassword(verificationToken, password, retype) {
        if (password !== retype)
            throw new common_1.BadRequestException("Passwords do not match");
        if (!(0, password_1.isStrongPassword)(password))
            throw new common_1.BadRequestException("Password is not strong enough");
        const rec = await this.tokenService.findVerificationToken(verificationToken);
        if (!rec || rec.expiresAt < new Date())
            throw new common_1.BadRequestException("Invalid or expired token");
        const hashed = await bcrypt.hash(password, 10);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: rec.userId },
                data: { password: hashed, isVerified: true },
            }),
            this.prisma.verificationToken.delete({ where: { id: rec.id } }),
        ]);
        return { ok: true };
    }
    signAccessToken(payload) {
        const secret = this.cfg.get("JWT_SECRET");
        const expiresIn = this.cfg.get("JWT_EXPIRES_IN") ?? "15m";
        return this.jwt.sign(payload, { secret, expiresIn });
    }
    createRefreshTokenRaw() {
        return (0, crypto_1.randomBytes)(48).toString("hex");
    }
    hashToken(token) {
        return (0, crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    async login(identifier, password) {
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] },
        });
        if (!user || !user.password)
            throw new common_1.UnauthorizedException("Invalid credentials");
        const ok = await bcrypt.compare(password, user.password);
        if (!ok)
            throw new common_1.UnauthorizedException("Invalid credentials");
        if (!user.isVerified)
            throw new common_1.UnauthorizedException("Email not verified");
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            kind: user.kind,
        };
        const accessToken = this.signAccessToken(payload);
        const rawRefresh = this.createRefreshTokenRaw();
        const tokenHash = this.hashToken(rawRefresh);
        const expiresAt = (0, date_fns_1.add)(new Date(), { days: this.refreshDays });
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                userAgent: null,
                expiresAt,
            },
        });
        return {
            accessToken,
            refreshToken: rawRefresh,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        };
    }
    async logout(input) {
        try {
            if (input.refreshToken) {
                const tokenHash = this.hashToken(input.refreshToken);
                await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
            }
            if (input.refreshTokenId) {
                await this.prisma.refreshToken.deleteMany({
                    where: { id: input.refreshTokenId },
                });
            }
            if (input.userId) {
                await this.prisma.refreshToken.deleteMany({
                    where: { userId: input.userId },
                });
            }
        }
        catch (err) {
            this.logger.error("Logout error (ignored): " + (err?.message ?? String(err)));
        }
    }
    async requestPasswordReset(email) {
        const genericResp = {
            ok: true,
            message: "If an account with that email exists, a reset email has been sent.",
        };
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            return genericResp;
        const tokenRec = await this.tokenService.createPasswordResetToken(user.id);
        const resetUrl = this.urlService.resetUrl(tokenRec.token);
        const emailContext = {
            email: user.email,
            resetUrl,
        };
        try {
            await this.mailer.sendResetPasswordEmail(user.email, emailContext);
        }
        catch (error) {
            await this.tokenService.deletePasswordResetToken(tokenRec.id);
            this.logger.error("Failed to send reset email:", error?.message ?? error);
        }
        return genericResp;
    }
    async resendVerificationEmail(email) {
        if (!email)
            throw new common_1.BadRequestException("Missing email");
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { company: true },
        });
        if (!user)
            return { ok: true };
        if (user.isVerified) {
            return { ok: true, message: "Email already verified" };
        }
        const latestToken = await this.prisma.verificationToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });
        if (latestToken) {
            const msSince = Date.now() - new Date(latestToken.createdAt).getTime();
            const cooldownMs = 60 * 1000;
            if (msSince < cooldownMs) {
                throw new common_1.BadRequestException("Verification email recently sent. Please wait a moment before retrying.");
            }
        }
        await this.tokenService.deleteVerificationTokensByUser(user.id);
        const tokenRec = await this.tokenService.createVerificationToken(user.id);
        const verificationUrl = this.urlService.verificationUrl(tokenRec.token);
        const emailContext = {
            fullName: (user.company && user.company.fullName) ?? user.email,
            businessName: (user.company && user.company.businessName) ?? "",
            verificationUrl,
        };
        try {
            await this.mailer.sendVerificationEmail(user.email, emailContext);
        }
        catch (err) {
            try {
                await this.tokenService.deleteVerificationTokensByUser(user.id);
            }
            catch (cleanupErr) {
                this.logger.error("Failed to cleanup token after resend email failure: " +
                    (cleanupErr?.message ?? String(cleanupErr)));
            }
            this.logger.error("Failed to resend verification email: " +
                (err?.message ?? String(err)));
            throw new common_1.BadRequestException("Failed to send verification email. Please try again later.");
        }
        return { ok: true, message: "Verification email resent" };
    }
    async resetPassword(token, password, retype) {
        if (password !== retype)
            throw new common_1.BadRequestException("Passwords do not match");
        if (!(0, password_1.isStrongPassword)(password))
            throw new common_1.BadRequestException("Password is not strong enough");
        const rec = await this.tokenService.findPasswordResetToken(token);
        if (!rec || rec.used || rec.expiresAt < new Date())
            throw new common_1.BadRequestException("Invalid or expired token");
        const hashed = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
            where: { id: rec.userId },
            data: { password: hashed },
        });
        await this.tokenService.markPasswordTokenUsed(rec.id);
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)("StorageService")),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService, Object, mail_service_1.MailService,
        token_service_1.default,
        url_service_1.default])
], AuthService);
