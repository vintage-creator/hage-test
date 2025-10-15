import { Body, Controller, Get, Param, Post, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TrackingService } from './tracking.service';
import { CreateTrackingDto } from './dto/create-tracking.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly svc: TrackingService) {}

  @Get(':tn')
  @ApiOperation({ summary: 'Get shipment and its tracking events by tracking number' })
  @ApiResponse({ status: 200, description: 'Shipment with events returned' })
  async getByTrackingNumber(@Param('tn') tn: string) {
    const res = await this.svc.trackByTrackingNumber(tn);
    if (!res) throw new NotFoundException('Shipment not found');
    return res;
  }

  @Post(':tn/events')
  @ApiOperation({ summary: 'Create a tracking event for a shipment' })
  @ApiResponse({ status: 201, description: 'Tracking event created', type: TrackingEventDto })
  @UseGuards(JwtAuthGuard) 
  @ApiBearerAuth('access-token')
  async createEvent(@Param('tn') tn: string, @Body() dto: CreateTrackingDto) {
    return this.svc.createEventByTrackingNumber(tn, dto);
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get single tracking event by id' })
  @ApiResponse({ status: 200, description: 'Tracking event' , type: TrackingEventDto})
  async findEvent(@Param('id') id: string) {
    const ev = await this.svc.findEventById(id);
    if (!ev) throw new NotFoundException('Tracking event not found');
    return ev;
  }
}
