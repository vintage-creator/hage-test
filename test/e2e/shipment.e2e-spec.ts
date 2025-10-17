// test/e2e/shipment.e2e-spec.ts
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import { MailService } from "../../src/common/mail/mail.service";
import { ShipmentsGateway } from "../../src/modules/shipments/shipments.gateway";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

jest.setTimeout(90000);

describe("Shipments (e2e)", () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let accessToken: string;
	let userId: string;
	let shipmentId: string;

	// ---- MOCK DEPENDENCIES ----
	const fakeMailer = {
		sendShipmentCreated: jest.fn().mockResolvedValue(undefined),
		sendShipmentStatusUpdate: jest.fn().mockResolvedValue(undefined),
	};

	const fakeStorageService = {
		uploadFile: jest.fn().mockImplementation(async (file: Express.Multer.File) => {
			const name = (file && (file.originalname || "file")) as string;
			return { url: `https://fake-bucket/${name}`, key: `shipments/${name}` };
		}),
		delete: jest.fn().mockResolvedValue(undefined),
	};

	const fakeGateway = {
		emitShipmentCreated: jest.fn(),
		emitShipmentUpdated: jest.fn(),
	};

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(MailService)
			.useValue(fakeMailer)
			.overrideProvider("StorageService")
			.useValue(fakeStorageService)
			.overrideProvider(ShipmentsGateway)
			.useValue(fakeGateway)
			.compile();

		app = moduleRef.createNestApplication();
		// ensure DTO transformation works for numbers/dates coming from multipart/form-data
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
		app.setGlobalPrefix("api");
		await app.init();

		prisma = app.get(PrismaService);
		jwtService = app.get(JwtService);

		// create a verified user with hashed password
		const email = `e2e-shipments-${Date.now()}@example.com`;
		const password = "Test123!";
		const hashed = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: {
				email,
				password: hashed,
				kind: "ENTERPRISE",
				role: "CROSS_BORDER_LOGISTICS",
				isVerified: true,
			},
		});

		userId = user.id;

		// sign a token directly so test doesn't depend on auth endpoint
		accessToken = jwtService.sign({ sub: userId, email: user.email });
	});

	afterAll(async () => {
		try {
			// delete refresh tokens first (FK)
			await prisma.refreshToken.deleteMany({ where: { userId } });

			// delete notifications
			await prisma.notification.deleteMany({ where: { userId } });

			// delete shipment documents that belong to shipments of this user
			await prisma.shipmentDocument.deleteMany({
				where: { shipment: { customerId: userId } },
			});

			// delete shipments
			await prisma.shipment.deleteMany({ where: { customerId: userId } });

			// finally delete user
			await prisma.user.deleteMany({ where: { id: userId } });
		} catch (err) {
			console.error("Cleanup error (ignoring):", (err as any)?.message ?? err);
		} finally {
			if (app) await app.close();
		}
	});

	// ---- TEST CASES ----

	it("should create a shipment successfully", async () => {
		const trackingNumber = `HAGE-${Date.now()}-ABC123`;

		const res = await request(app.getHttpServer())
			.post("/api/shipments")
			.set("Authorization", `Bearer ${accessToken}`)
			// required tracking + origin/destination details according to DTO
			.field("trackingNumber", trackingNumber)
			.field("originCountry", "Nigeria")
			.field("originState", "Lagos")
			.field("originAddress", "123 Broad Street")
			.field("originPhone", "+2348120000000")
			.field("destinationCountry", "United Kingdom")
			.field("destinationState", "London")
			.field("destinationAddress", "221B Baker Street")
			.field("destinationPhone", "+447700900123")
			.field("customerId", userId) // must be valid existing user
			.field("email", "customer@example.com")
			.field("client", "Test Client")
			.field("payment", "2500") // will be transformed to number by ValidationPipe+class-transformer
			.field("cargoType", "Electronics")
			.field("weight", "500KG")
			.field("tons", "0.5")
			.field("serviceLevel", "Express")
			.attach("documents", Buffer.from("dummy file"), "invoice.pdf")
			.expect(201);

		expect(res.body).toHaveProperty("id");
		expect(res.body.trackingNumber).toBe(trackingNumber);

		shipmentId = res.body.id;

		// check gateway was called
		expect(fakeGateway.emitShipmentCreated).toHaveBeenCalled();
	});

	it("should fetch all shipments for user", async () => {
		const res = await request(app.getHttpServer()).get("/api/shipments").set("Authorization", `Bearer ${accessToken}`).expect(200);

		expect(Array.isArray(res.body)).toBe(true);
		expect(res.body.length).toBeGreaterThan(0);
	});

	it("should get a single shipment by ID (for that user)", async () => {
		const res = await request(app.getHttpServer()).get(`/api/shipments/${shipmentId}`).set("Authorization", `Bearer ${accessToken}`).expect(200);

		expect(res.body.id).toBe(shipmentId);
		expect(res.body.customerId).toBe(userId);
	});

	it("should update shipment status", async () => {
		const res = await request(app.getHttpServer()).patch(`/api/shipments/${shipmentId}/status`).set("Authorization", `Bearer ${accessToken}`).send({ status: "in_transit" }).expect(200);

		expect(res.body.status).toBe("in_transit");
		expect(fakeGateway.emitShipmentUpdated).toHaveBeenCalled();
	});

	it("should delete a shipment", async () => {
		const res = await request(app.getHttpServer()).delete(`/api/shipments/${shipmentId}`).set("Authorization", `Bearer ${accessToken}`).expect(200);

		expect(res.body.message).toBe("Shipment deleted successfully");

		const check = await prisma.shipment.findUnique({ where: { id: shipmentId } });
		expect(check).toBeNull();
	});
});
