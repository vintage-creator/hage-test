import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Register a new user (simple example)
  async register(payload: { email: string; password: string; name?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: { email: payload.email, password: hashed, name: payload.name },
    });

    // do not return password
    const { password, ...safe } = user as any;
    return safe;
  }

  // Validate password & return user (or null)
  async validateUser(email: string, plain: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const match = await bcrypt.compare(plain, user.password);
    if (!match) return null;
    const { password, ...safe } = user as any;
    return safe;
  }

  // Login -> returns { accessToken }
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  // helper: get user by id
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const { password, ...safe } = user as any;
    return safe;
  }
}
