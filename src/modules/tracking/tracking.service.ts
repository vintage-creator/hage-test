import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrackingDto } from './dto/create-tracking.dto';
import type { TrackingEvent } from '@prisma/client';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return the shipment with events ordered by timestamp desc.
   * If you want events in ascending order, change orderBy.
   */
  async trackByTrackingNumber(trackingNumber: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingNumber },
      include: { events: { orderBy: { timestamp: 'desc' } }, customer: true },
    });
    return shipment;
  }

  /**
   * Create a tracking event using the shipment's trackingNumber.
   * If timestamp is provided it will be used; otherwise server time is used.
   */
  async createEventByTrackingNumber(trackingNumber: string, dto: CreateTrackingDto): Promise<TrackingEvent> {
    const shipment = await this.prisma.shipment.findUnique({ where: { trackingNumber } });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const payload: any = {
      shipmentId: shipment.id,
      status: dto.status,
    };
    if (dto.location) payload.location = dto.location;
    if (dto.note) payload.note = dto.note;
    if (dto.timestamp) payload.timestamp = new Date(dto.timestamp);

    return this.prisma.trackingEvent.create({ data: payload });
  }

  async findEventById(id: string) {
    const ev = await this.prisma.trackingEvent.findUnique({ where: { id } });
    return ev;
  }

  /** Optional helper: append an event */
  async appendEvent(shipmentId: string, dto: CreateTrackingDto) {
    const payload: any = { shipmentId, status: dto.status, location: dto.location, note: dto.note };
    if (dto.timestamp) payload.timestamp = new Date(dto.timestamp);
    return this.prisma.trackingEvent.create({ data: payload });
  }
}
