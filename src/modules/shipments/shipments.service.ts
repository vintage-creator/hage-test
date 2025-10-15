// src/modules/shipments/shipments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import type { Shipment } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShipmentDto): Promise<Shipment> {
    // parse estimatedDelivery if passed as string
    const estimated = typeof dto.estimatedDelivery === 'string' ? new Date(dto.estimatedDelivery) : dto.estimatedDelivery;

    if (Number.isNaN(estimated.getTime())) {
      throw new BadRequestException('Invalid estimatedDelivery date');
    }

    try {
      return this.prisma.shipment.create({
        data: {
          trackingNumber: dto.trackingNumber,
          origin: dto.origin,
          destination: dto.destination,
          status: dto.status ?? undefined,
          customerId: dto.customerId,
          estimatedDelivery: estimated,
        },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') {
        throw new BadRequestException('Tracking number already exists');
      }
      throw err;
    }
  }

  async findAll(): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, email: true, name: true } } }, 
    });
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment> {
    const s = await this.prisma.shipment.findUnique({
      where: { trackingNumber },
      include: { events: { orderBy: { timestamp: 'desc' } }, customer: { select: { id: true, email: true, name: true } } },
    });
    if (!s) throw new NotFoundException('Shipment not found');
    return s;
  }
}
