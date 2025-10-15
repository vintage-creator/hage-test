// src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // create user, hash password, return safe user (no password)
  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const hashed = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name ?? null,
          password: hashed,
          // role: dto.role?.toUpperCase() ?? undefined, // if you allow role via DTO
        },
      });
      const { password, ...safe } = user as any;
      return safe;
    } catch (err) {
      // map Prisma unique constraint code to friendly error
      if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') {
        throw new BadRequestException('Email already in use');
      }
      throw err;
    }
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany();
    return users.map(u => {
      const { password, ...safe } = u as any;
      return safe;
    });
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...safe } = user as any;
    return safe;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // optionally verify credentials
  async validateCredentials(email: string, plain: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(plain, user.password);
    if (!ok) return null;
    const { password, ...safe } = user as any;
    return safe;
  }
}
