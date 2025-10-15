// src/modules/shipments/shipments.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('shipments')
@Controller('shipments')
export class ShipmentsController {
  constructor(private svc: ShipmentsService) {}

  // Protected: only authenticated users can create shipments
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  create(@Body() dto: CreateShipmentDto) {
    return this.svc.create(dto);
  }

  // Public: list shipments (or change to protected if you prefer)
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  // Public: tracking by tracking number (often public)
  @Get('tracking/:tn')
  findByTracking(@Param('tn') tn: string) {
    return this.svc.findByTrackingNumber(tn);
  }
}
