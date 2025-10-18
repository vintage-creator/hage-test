// src/modules/auth/auth.service.ts
import { Inject, Injectable, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import TokenService from "./token.service";
import UrlService from "./url.service";
import { isStrongPassword } from "../../utils/password";
import * as bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";
import { add } from "date-fns";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { StorageService } from "../../common/storage/storage.interface";
import { MailService } from "../../common/mail/mail.service";

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);
	private refreshDays: number;

	constructor(
		private readonly prisma: PrismaService,
		private readonly jwt: JwtService,
		private readonly cfg: ConfigService,
		@Inject("StorageService") private readonly storage: StorageService,
		private readonly mailer: MailService,
		private readonly tokenService: TokenService,
		private readonly urlService: UrlService
	) {
		this.refreshDays = Number(this.cfg.get("REFRESH_EXPIRES_DAYS") ?? 30);
	}

	async registerCompany(dto: any, files: { companyCert?: Express.Multer.File; taxCert?: Express.Multer.File }) {
		if (!dto.kind) throw new BadRequestException("User kind is required");
		if (!dto.role) throw new BadRequestException("User role is required");

		// Check for existing user (prevent race as best effort)
		const existingUser = await this.prisma.user.findUnique({
			where: { email: dto.emailAddress },
		});
		if (existingUser) throw new BadRequestException("Email is already registered");

		const uploadPromises = [];
		if (files.companyCert) uploadPromises.push(this.storage.uploadFile(files.companyCert, { folder: "company-docs" }));
		if (files.taxCert) uploadPromises.push(this.storage.uploadFile(files.taxCert, { folder: "company-docs" }));

		const results = await Promise.all(uploadPromises);

		try {
			// create company + user in a transaction
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
								type: idx === 0 ? "COMPANY_REGISTRATION_CERTIFICATE" : "TAX_REGISTRATION_CERTIFICATE",
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
				await this.mailer.sendVerificationEmail(user.email!, emailContext);
			} catch (emailErr) {
				// try cleanup if email fails
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
				} catch (cleanupErr) {
					this.logger.error("Failed to cleanup after email send failure: " + ((cleanupErr as any)?.message ?? String(cleanupErr)));
				}

				throw new BadRequestException("Failed to send verification email. Please try again.");
			}

			return { ok: true };
		} catch (err: any) {
			if (err?.code === "P2002") {
				throw new BadRequestException("Email or phone already registered");
			}
			throw new BadRequestException(err.message || "Registration failed");
		}
	}

	async verifyEmail(token: string) {
		const rec = await this.tokenService.findVerificationToken(token);

		if (!rec || rec.expiresAt < new Date()) {
			throw new BadRequestException("Invalid or expired token");
		}

		return {
			ok: true,
			email: rec.user?.email ?? null,
			companyId: rec.user?.companyId ?? null,
			expiresAt: rec.expiresAt,
			token: rec.token,
		};
	}
	async verifyResetToken(token: string) {
		if (!token) throw new BadRequestException("Missing token");

		// reuse tokenService (or prisma) to find reset token
		const rec = await this.tokenService.findPasswordResetToken(token);
		if (!rec || rec.used || rec.expiresAt < new Date()) {
			throw new BadRequestException("Invalid or expired token");
		}

		return {
			ok: true,
			expiresAt: rec.expiresAt,
			token: rec.token,
		};
	}

	async setPassword(verificationToken: string, password: string, retype: string) {
		if (password !== retype) throw new BadRequestException("Passwords do not match");
		if (!isStrongPassword(password)) throw new BadRequestException("Password is not strong enough");

		const rec = await this.tokenService.findVerificationToken(verificationToken);
		if (!rec || rec.expiresAt < new Date()) throw new BadRequestException("Invalid or expired token");

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

	private signAccessToken(payload: any) {
		const secret = this.cfg.get("JWT_SECRET");
		const expiresIn = this.cfg.get("JWT_EXPIRES_IN") ?? "15m";
		return this.jwt.sign(payload, { secret, expiresIn });
	}

	private createRefreshTokenRaw() {
		return randomBytes(48).toString("hex");
	}

	private hashToken(token: string) {
		return createHash("sha256").update(token).digest("hex");
	}

	async login(identifier: string, password: string) {
		const user = await this.prisma.user.findFirst({
			where: { OR: [{ email: identifier }, { phone: identifier }] },
		});
		if (!user || !user.password) throw new UnauthorizedException("Invalid credentials");

		const ok = await bcrypt.compare(password, user.password);
		if (!ok) throw new UnauthorizedException("Invalid credentials");
		if (!user.isVerified) throw new UnauthorizedException("Email not verified");

		const payload = {
			sub: user.id,
			email: user.email,
			role: user.role,
			kind: user.kind,
		};
		const accessToken = this.signAccessToken(payload);

		const rawRefresh = this.createRefreshTokenRaw();
		const tokenHash = this.hashToken(rawRefresh);
		const expiresAt = add(new Date(), { days: this.refreshDays });

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

	async logout(input: { userId?: string | null; refreshToken?: string; refreshTokenId?: string }) {
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
		} catch (err) {
			this.logger.error("Logout error (ignored): " + ((err as any)?.message ?? String(err)));
		}
	}

	async requestPasswordReset(email: string) {
		const genericResp = {
			ok: true,
			message: "If an account with that email exists, a reset email has been sent.",
		};

		const user = await this.prisma.user.findUnique({ where: { email } });
		if (!user) return genericResp;

		const tokenRec = await this.tokenService.createPasswordResetToken(user.id);
		const resetUrl = this.urlService.resetUrl(tokenRec.token);

		const emailContext = {
			email: user.email,
			resetUrl,
		};

		try {
			await this.mailer.sendResetPasswordEmail(user.email!, emailContext);
		} catch (error) {
			await this.tokenService.deletePasswordResetToken(tokenRec.id);
			this.logger.error("Failed to send reset email:", (error as any)?.message ?? error);
		}

		return genericResp;
	}

	async resetPassword(token: string, password: string, retype: string) {
		if (password !== retype) throw new BadRequestException("Passwords do not match");
		if (!isStrongPassword(password)) throw new BadRequestException("Password is not strong enough");

		const rec = await this.tokenService.findPasswordResetToken(token);
		if (!rec || rec.used || rec.expiresAt < new Date()) throw new BadRequestException("Invalid or expired token");

		const hashed = await bcrypt.hash(password, 10);
		await this.prisma.user.update({
			where: { id: rec.userId },
			data: { password: hashed },
		});
		await this.tokenService.markPasswordTokenUsed(rec.id);
		return { ok: true };
	}
}
