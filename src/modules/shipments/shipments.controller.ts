// src/modules/shipments/shipments.controller.ts
import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, UseInterceptors, UploadedFiles, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ShipmentsService } from "./shipments.service";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { UpdateShipmentDto } from "./dto/update-shipment.dto";
import { Request } from "express";

@ApiTags("shipments")
@Controller("shipments")
export class ShipmentsController {
	constructor(private readonly svc: ShipmentsService) {}

	// Protected: Create shipment with file upload (documents)
	@Post()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	@ApiConsumes("multipart/form-data")
	@UseInterceptors(FilesInterceptor("documents"))
	@ApiBody({
		description: "Create a new shipment with optional document uploads",
		schema: {
			type: "object",
			properties: {
				// Tracking
				trackingNumber: { type: "string", example: "HAGE-20251016-8F4C2D" },
				status: { type: "string", example: "pending" },

				// Customer
				customerId: { type: "string", example: "clu9f0b8b0000s8yz1hf9d7re" },
				client: { type: "string", example: "Global Imports Ltd." },
				email: { type: "string", example: "customer@example.com" },

				// Payment
				payment: { type: "number", example: 2500 },

				// ORIGIN DETAILS
				originCountry: { type: "string", example: "Nigeria" },
				originState: { type: "string", example: "Lagos" },
				originAddress: { type: "string", example: "123 Broad Street, Marina" },
				originPhone: { type: "string", example: "+234 812 456 7890" },

				// DESTINATION DETAILS
				destinationCountry: { type: "string", example: "United Kingdom" },
				destinationState: { type: "string", example: "London" },
				destinationAddress: { type: "string", example: "221B Baker Street" },
				destinationPhone: { type: "string", example: "+44 7700 900123" },

				// SHIPMENT DETAILS
				cargoType: { type: "string", example: "Electronics" },
				weight: { type: "string", example: "500KG" },
				tons: { type: "number", example: 0.5 },
				serviceLevel: { type: "string", example: "Express" },

				// Dates
				pickupDate: { type: "string", format: "date", example: "2025-07-15" },
				deliveryDate: { type: "string", format: "date", example: "2025-07-20" },

				// Document upload
				documents: {
					type: "array",
					items: { type: "string", format: "binary" },
					example: ["invoice.pdf", "bill_of_lading.pdf"],
				},
			},
			required: ["originCountry", "originState", "originAddress", "destinationCountry", "destinationState", "destinationAddress"],
		},
	})
	create(@Body() dto: CreateShipmentDto, @Req() req: Request, @UploadedFiles() files: Express.Multer.File[]) {
		// use the authenticated user's ID from token
		const userId = (req.user as any)?.id;
		return this.svc.create(dto, userId, files);
	}

	@Get("generate-tracking")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	generateTracking() {
		return { trackingNumber: this.svc.generateTrackingNumber() };
	}

	// Public: List all shipments
	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	findAll(@Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.findAllForUser(userId);
	}

	@Get(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	findOne(@Param("id") id: string, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.findOneForUser(id, userId);
	}

	@Patch(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	update(@Param("id") id: string, @Body() dto: UpdateShipmentDto, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.updateForUser(id, dto, userId);
	}

	@Delete(":id")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth("access-token")
	remove(@Param("id") id: string, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.removeForUser(id, userId);
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
	updateStatus(@Param("id") id: string, @Body() body: { status: string; note?: string }, @Req() req: Request) {
		const userId = (req.user as any).id;
		return this.svc.updateStatus(id, body.status, body.note, userId);
	}
}
