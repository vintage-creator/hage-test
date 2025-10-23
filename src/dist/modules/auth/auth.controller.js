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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const multer = __importStar(require("multer"));
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const register_company_dto_1 = require("./dto/register-company.dto");
const create_password_dto_1 = require("./dto/create-password.dto");
const login_dto_1 = require("./dto/login.dto");
const forgot_password_request_dto_1 = require("./dto/forgot-password-request.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const logout_dto_1 = require("./dto/logout.dto");
let AuthController = class AuthController {
    constructor(auth) {
        this.auth = auth;
    }
    async registerCompany(dto, files) {
        if (!dto.kind)
            throw new common_1.BadRequestException("User kind is required");
        if (!dto.role)
            throw new common_1.BadRequestException("User role is required");
        if (!files || !files.companyCert?.[0] || !files.taxCert?.[0]) {
            throw new common_1.BadRequestException("companyCert and taxCert files are required (fields: companyCert, taxCert)");
        }
        return this.auth.registerCompany(dto, {
            companyCert: files.companyCert[0],
            taxCert: files.taxCert[0],
        });
    }
    async verifyEmail(token) {
        return this.auth.verifyEmail(token);
    }
    async setPassword(dto) {
        return this.auth.setPassword(dto.verificationToken, dto.password, dto.retypePassword);
    }
    async login(dto) {
        return this.auth.login(dto.identifier, dto.password);
    }
    async logout(req, res, dto) {
        const user = req.user;
        const userId = user?.sub ?? null;
        await this.auth.logout({
            userId,
            refreshToken: dto.refreshToken,
            refreshTokenId: dto.refreshTokenId,
        });
        const isProd = process.env.NODE_ENV === "production";
        res.clearCookie("refresh_token", {
            httpOnly: true,
            sameSite: "lax",
            secure: isProd,
        });
        return;
    }
    async forgotPassword(dto) {
        return this.auth.requestPasswordReset(dto.email);
    }
    async resetPassword(dto) {
        return this.auth.resetPassword(dto.token, dto.password, dto.retypePassword);
    }
    async verifyReset(token) {
        return this.auth.verifyResetToken(token);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("register-company"),
    (0, swagger_1.ApiOperation)({
        summary: "Register company and upload documents (creates unverified user)",
    }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Registration accepted; verify email",
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "companyCert", maxCount: 1 },
        { name: "taxCert", maxCount: 1 },
    ], {
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                fullName: { type: "string" },
                phoneNumber: { type: "string" },
                emailAddress: { type: "string" },
                businessName: { type: "string" },
                businessAddress: { type: "string" },
                kind: {
                    type: "string",
                    enum: [
                        "ENTERPRISE",
                        "DISTRIBUTOR",
                        "END_USER",
                        "LOGISTIC_SERVICE_PROVIDER",
                    ],
                },
                role: {
                    type: "string",
                    enum: ["CROSS_BORDER_LOGISTICS", "TRANSPORTER", "LAST_MILE_PROVIDER"],
                },
                companyCert: { type: "string", format: "binary" },
                taxCert: { type: "string", format: "binary" },
            },
            required: [
                "fullName",
                "phoneNumber",
                "emailAddress",
                "businessName",
                "businessAddress",
                "kind",
                "role",
                "companyCert",
                "taxCert",
            ],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_company_dto_1.RegisterCompanyDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerCompany", null);
__decorate([
    (0, common_1.Get)("verify-email"),
    (0, swagger_1.ApiOperation)({ summary: "Verify user email using token" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Email verified — proceed to set password",
    }),
    __param(0, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)("set-password"),
    (0, swagger_1.ApiOperation)({ summary: "Set password after email verification" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Password set successfully" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_password_dto_1.CreatePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setPassword", null);
__decorate([
    (0, common_1.Post)("login"),
    (0, swagger_1.ApiOperation)({ summary: "Login using email or phone and password" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Returns access & refresh tokens" }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("logout"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)("access-token"),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: "Logout and revoke refresh token" }),
    (0, swagger_1.ApiResponse)({ status: 204, description: "Logged out (idempotent)" }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Request, Object, logout_dto_1.LogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)("forgot-password"),
    (0, swagger_1.ApiOperation)({
        summary: "Request password reset (email sent if account exists)",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "If account exists an email was sent",
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_request_dto_1.ForgotPasswordRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)("reset-password"),
    (0, swagger_1.ApiOperation)({ summary: "Reset password using token from email" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Password reset successfully" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)("reset-password"),
    (0, swagger_1.ApiOperation)({
        summary: "Verify the password reset token and return token details if valid",
    }),
    __param(0, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyReset", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)("auth"),
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
