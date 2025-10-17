// src/modules/shipments/shipments.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../../prisma/prisma.service";
import { Logger } from "@nestjs/common";

@WebSocketGateway({ cors: { origin: "*" } })
export class ShipmentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server;

	private readonly logger = new Logger(ShipmentsGateway.name);
	private connectedUsers = new Map<string, string>(); // socket.id -> userId

	constructor(private readonly prisma: PrismaService) {}

	// Client connects with ?userId=xxx
	handleConnection(client: Socket) {
		const userId = client.handshake.query.userId as string;
		if (userId) {
			this.connectedUsers.set(client.id, userId);
			this.logger.verbose(`User ${userId} connected (socket ${client.id})`);
		} else {
			this.logger.warn("Connection without userId query param");
		}
	}

	handleDisconnect(client: Socket) {
		this.connectedUsers.delete(client.id);
		this.logger.verbose(`Socket disconnected: ${client.id}`);
	}

	private findSocketByUser(userId: string): Socket[] {
		const sockets: Socket[] = [];
		for (const [socketId, uid] of this.connectedUsers.entries()) {
			if (uid === userId) {
				const s = this.server.sockets.sockets.get(socketId);
				if (s) sockets.push(s);
			}
		}
		return sockets;
	}

	// Notify when a new shipment is created
	async emitShipmentCreated(shipment: any) {
		try {
			// Persist notification
			const notification = await this.prisma.notification.create({
				data: {
					userId: shipment.customerId,
					title: "Shipment Created",
					message: `Your shipment ${shipment.trackingNumber} has been created.`,
					data: shipment,
				},
			});

			// Emit real-time event only to this user
			const sockets = this.findSocketByUser(shipment.customerId);
			for (const socket of sockets) {
				socket.emit("shipment:created", { ...shipment, notification });
			}

			this.logger.verbose(`Notified user ${shipment.customerId} about shipment ${shipment.trackingNumber}`);
		} catch (err) {
			this.logger.error("emitShipmentCreated failed", err);
		}
	}

	// Notify when a shipment is updated
	async emitShipmentUpdated(shipment: any) {
		try {
			const notification = await this.prisma.notification.create({
				data: {
					userId: shipment.customerId,
					title: "Shipment Updated",
					message: `Your shipment ${shipment.trackingNumber} status is now ${shipment.status}.`,
					data: shipment,
				},
			});

			const sockets = this.findSocketByUser(shipment.customerId);
			for (const socket of sockets) {
				socket.emit("shipment:updated", { ...shipment, notification });
			}
		} catch (err) {
			this.logger.error("emitShipmentUpdated failed", err);
		}
	}

	// optional: mark as read when client confirms
	@SubscribeMessage("notification:read")
	async markAsRead(client: Socket, payload: { id: string }) {
		await this.prisma.notification.update({
			where: { id: payload.id },
			data: { isRead: true },
		});
	}
}
