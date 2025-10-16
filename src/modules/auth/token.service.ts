// src/modules/auth/token.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { randomBytes } from "crypto";
import { add } from "date-fns";

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async createVerificationToken(userId: string, hours = 24) {
    const token = randomBytes(24).toString("hex");
    const expiresAt = add(new Date(), { hours });
    const rec = await this.prisma.verificationToken.create({
      data: { userId, token, expiresAt },
    });
    return { id: rec.id, token: rec.token, expiresAt: rec.expiresAt };
  }

  async createPasswordResetToken(userId: string, hours = 2) {
    const token = randomBytes(24).toString("hex");
    const expiresAt = add(new Date(), { hours });
    const rec = await this.prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });
    return { id: rec.id, token: rec.token, expiresAt: rec.expiresAt };
  }

  async findVerificationToken(token: string) {
    return this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async findPasswordResetToken(token: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deletePasswordResetToken(id: string) {
    return this.prisma.passwordResetToken.delete({ where: { id } });
  }

  async deleteVerificationTokensByUser(userId: string) {
    return this.prisma.verificationToken.deleteMany({ where: { userId } });
  }

  async markPasswordTokenUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}
export default TokenService;
