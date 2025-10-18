// src/modules/shipments/shipments.controller.ts
import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, UseInterceptors, UploadedFiles, Req, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ShipmentsService } from "./shipments.service";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { UpdateShipmentDto } from "./dto/update-shipment.dto";
import { Request } from "express";
import { AssignShipmentDto } from "./dto/assign-shipment.dto";
import { FilterShipmentDto } from "./dto/filter-shipment.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("shipments")
@Controller("shipments")
export class ShipmentsController {
	constructor(private readonly svc: ShipmentsService) {}

	// Protected: Create shipment with file upload (documents)
	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("LOGISTIC_SERVICE_PROVIDER", "ENTERPRISE", "DISTRIBUTOR")
	@ApiBearerAuth("access-token")
	@ApiConsumes("multipart/form-data")
	@UseInterceptors(FilesInterceptor("documents"))
	create(@Body() dto: any, @Req() req: Request, @UploadedFiles() files: Express.Multer.File[]) {
		// use the authenticated user's ID from token
		const userId = (req.user as any)?.id;
		return this.svc.create(dto, userId, files);
	}

	@Get("generate-tracking")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	generateTracking() {
		return { trackingNumber: this.svc.generateOrderTrackingId() };
	}

	// ACCEPT & ASSIGN SHIPMENT
	@Patch(":id/assign")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("LOGISTIC_SERVICE_PROVIDER", "CROSS_BORDER_LOGISTICS") // Only LSP can assign
	@ApiBearerAuth("access-token")
	async acceptAndAssign(@Param("id") shipmentId: string, @Body() dto: AssignShipmentDto, @Req() req: Request) {
		const userId = (req.user as any)?.id;
		return this.svc.acceptAndAssign(shipmentId, dto, userId);
	}

	// Public: List all shipments
	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	async findAll(@Query() filters: FilterShipmentDto, @Req() req: any) {
		return this.svc.findAll(filters, req.user.id);
	}

	// GET /shipments/my/assigned - For transporters
	@Get("my/assigned")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("TRANSPORTER")
	@ApiBearerAuth("access-token")
	async getMyAssignedShipments(@Query() filters: FilterShipmentDto, @Req() req: any) {
		return this.svc.findAllForTransporter(req.user.id, filters);
	}

	// GET /shipments/my/created - For customers
	@Get("my/created")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	async getMyCreatedShipments(@Query() filters: FilterShipmentDto, @Req() req: any) {
		return this.svc.findAllForCustomer(req.user.id, filters);
	}

	// GET /shipments/admin/all - Explicit LSP endpoint
	@Get("admin/all")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("LOGISTIC_SERVICE_PROVIDER")
	@ApiBearerAuth("access-token")
	async getAllShipmentsAdmin(@Query() filters: FilterShipmentDto, @Req() req: any) {
		return this.svc.findAllForLSP(req.user.id, filters);
	}

	@Get(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	findOne(@Param("id") id: string, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.findOne(id, userId);
	}

	@Get("track/:orderId")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	async trackByOrderId(@Param("orderId") orderId: string, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.trackByOrderId(orderId, userId);
	}

	@Patch(":id")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("LOGISTIC_SERVICE_PROVIDER", "TRANSPORTER", "LAST_MILE_PROVIDER")
	@ApiBearerAuth("access-token")
	update(@Param("id") id: string, @Body() dto: UpdateShipmentDto, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.update(id, dto, userId);
	}

	@Delete(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	remove(@Param("id") id: string, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.remove(id, userId);
	}

	@Patch(":id/status")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	@ApiBody({
		description: "Update the status of a shipment",
		schema: {
			type: "object",
			properties: {
				status: {
					type: "string",
					enum: ["pending", "in_transit", "delivered", "cancelled"], // optional enum list
					example: "in_transit",
					description: "New shipment status",
				},
				note: {
					type: "string",
					example: "Package has left the Lagos warehouse",
					description: "Optional status update note",
				},
			},
			required: ["status"],
		},
	})
	async updateStatus(@Param("id") shipmentId: string, @Body() dto: UpdateStatusDto, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.updateStatus(shipmentId, dto, userId);
	}
}
