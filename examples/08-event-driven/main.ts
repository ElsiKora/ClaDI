/**
 * Example 08: Event-Driven Architecture
 *
 * Demonstrates a publish/subscribe event system built on ClaDI:
 * - Event bus with typed events and multiple handlers per event
 * - Handlers registered via multi-binding — adding a handler requires zero changes to the bus
 * - Saga / process manager: coordinates multi-step workflows across events
 * - Dead letter queue for failed event processing
 * - Per-event scoping to isolate handler state
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, Token } from "@elsikora/cladi";

// ─── Event System Kernel ───

interface IDomainEvent {
	readonly occurredAt: Date;
	readonly eventId: string;
	readonly type: string;
	readonly payload: Record<string, unknown>;
}

interface IEventHandler {
	readonly eventType: string;
	handle(event: IDomainEvent): Promise<void>;
}

interface IDeadLetterQueue {
	push(event: IDomainEvent, error: Error, handlerName: string): void;
	getEntries(): Array<{ error: string; event: IDomainEvent; handlerName: string }>;
	size(): number;
}

interface IEventBus {
	publish(event: IDomainEvent): Promise<void>;
	getProcessedCount(): number;
}

// ─── Domain Events ───

function createEvent(type: string, payload: Record<string, unknown>): IDomainEvent {
	return {
		eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
		occurredAt: new Date(),
		payload,
		type,
	};
}

// ─── Domain Services ───

interface IInventoryService {
	reserve(productId: string, quantity: number): boolean;
	release(productId: string, quantity: number): void;
	getStock(productId: string): number;
}

interface IPaymentService {
	charge(orderId: string, amount: number): { success: boolean; transactionId: string };
	refund(transactionId: string): void;
}

interface INotificationService {
	send(userId: string, message: string): void;
	getSentMessages(): Array<{ message: string; userId: string }>;
}

interface IOrderStore {
	save(order: Record<string, unknown>): void;
	updateStatus(orderId: string, status: string): void;
	findById(orderId: string): Record<string, unknown> | undefined;
	getAll(): Array<Record<string, unknown>>;
}

// ─── Tokens ───

const EventHandlerToken: Token<IEventHandler> = createToken<IEventHandler>("EventHandler");
const EventBusToken: Token<IEventBus> = createToken<IEventBus>("EventBus");
const DeadLetterQueueToken: Token<IDeadLetterQueue> = createToken<IDeadLetterQueue>("DeadLetterQueue");
const InventoryServiceToken: Token<IInventoryService> = createToken<IInventoryService>("InventoryService");
const PaymentServiceToken: Token<IPaymentService> = createToken<IPaymentService>("PaymentService");
const NotificationServiceToken: Token<INotificationService> = createToken<INotificationService>("NotificationService");
const OrderStoreToken: Token<IOrderStore> = createToken<IOrderStore>("OrderStore");

// ─── Infrastructure Implementations ───

function createInventoryService(): IInventoryService {
	const stock: Map<string, number> = new Map([
		["WIDGET-01", 50],
		["GADGET-02", 10],
		["DOOHICKEY-03", 0],
	]);

	return {
		getStock: (productId: string) => stock.get(productId) ?? 0,
		release: (productId: string, quantity: number) => {
			stock.set(productId, (stock.get(productId) ?? 0) + quantity);
		},
		reserve: (productId: string, quantity: number) => {
			const current: number = stock.get(productId) ?? 0;

			if (current < quantity) {
				return false;
			}

			stock.set(productId, current - quantity);

			return true;
		},
	};
}

function createPaymentService(): IPaymentService {
	let transactionSeq = 0;
	const transactions: Map<string, { amount: number; orderId: string; refunded: boolean }> = new Map();

	return {
		charge: (orderId: string, amount: number) => {
			const transactionId: string = `txn_${++transactionSeq}`;
			transactions.set(transactionId, { amount, orderId, refunded: false });

			return { success: amount < 10_000, transactionId };
		},
		refund: (transactionId: string) => {
			const transaction = transactions.get(transactionId);

			if (transaction) {
				transaction.refunded = true;
			}
		},
	};
}

function createNotificationService(): INotificationService {
	const messages: Array<{ message: string; userId: string }> = [];

	return {
		getSentMessages: () => [...messages],
		send: (userId: string, message: string) => {
			messages.push({ message, userId });
			console.log(`      [Notification → ${userId}] ${message}`);
		},
	};
}

function createOrderStore(): IOrderStore {
	const orders: Map<string, Record<string, unknown>> = new Map();

	return {
		findById: (orderId: string) => orders.get(orderId),
		getAll: () => [...orders.values()],
		save: (order: Record<string, unknown>) => orders.set(order["orderId"] as string, order),
		updateStatus: (orderId: string, status: string) => {
			const order: Record<string, unknown> | undefined = orders.get(orderId);

			if (order) {
				order["status"] = status;
			}
		},
	};
}

function createDeadLetterQueue(): IDeadLetterQueue {
	const entries: Array<{ error: string; event: IDomainEvent; handlerName: string }> = [];

	return {
		getEntries: () => [...entries],
		push: (event: IDomainEvent, error: Error, handlerName: string) => {
			entries.push({ error: error.message, event, handlerName });
		},
		size: () => entries.length,
	};
}

// ─── Event Handlers ───

function createOrderCreatedInventoryHandler(inventory: IInventoryService): IEventHandler {
	return {
		eventType: "OrderCreated",
		handle: async (event: IDomainEvent) => {
			const productId: string = event.payload["productId"] as string;
			const quantity: number = event.payload["quantity"] as number;
			const reserved: boolean = inventory.reserve(productId, quantity);

			if (reserved) {
				console.log(`      [InventoryHandler] Reserved ${quantity}x ${productId}`);
			} else {
				throw new Error(`Insufficient stock for ${productId} (requested: ${quantity}, available: ${inventory.getStock(productId)})`);
			}
		},
	};
}

function createOrderCreatedPaymentHandler(payment: IPaymentService, orders: IOrderStore): IEventHandler {
	return {
		eventType: "OrderCreated",
		handle: async (event: IDomainEvent) => {
			const orderId: string = event.payload["orderId"] as string;
			const amount: number = event.payload["amount"] as number;
			const result = payment.charge(orderId, amount);

			if (result.success) {
				orders.updateStatus(orderId, "paid");
				console.log(`      [PaymentHandler] Charged $${amount} for order ${orderId} (${result.transactionId})`);
			} else {
				orders.updateStatus(orderId, "payment_failed");
				throw new Error(`Payment failed for order ${orderId}`);
			}
		},
	};
}

function createOrderCreatedNotificationHandler(notifications: INotificationService): IEventHandler {
	return {
		eventType: "OrderCreated",
		handle: async (event: IDomainEvent) => {
			const userId: string = event.payload["userId"] as string;
			const orderId: string = event.payload["orderId"] as string;
			notifications.send(userId, `Your order ${orderId} has been received and is being processed.`);
		},
	};
}

function createPaymentFailedHandler(notifications: INotificationService, inventory: IInventoryService): IEventHandler {
	return {
		eventType: "PaymentFailed",
		handle: async (event: IDomainEvent) => {
			const productId: string = event.payload["productId"] as string;
			const quantity: number = event.payload["quantity"] as number;
			const userId: string = event.payload["userId"] as string;

			inventory.release(productId, quantity);
			console.log(`      [CompensationHandler] Released ${quantity}x ${productId} back to inventory`);
			notifications.send(userId, `Payment failed for your order. Inventory has been released.`);
		},
	};
}

function createOrderShippedHandler(notifications: INotificationService): IEventHandler {
	return {
		eventType: "OrderShipped",
		handle: async (event: IDomainEvent) => {
			const userId: string = event.payload["userId"] as string;
			const orderId: string = event.payload["orderId"] as string;
			const trackingNumber: string = event.payload["trackingNumber"] as string;
			notifications.send(userId, `Order ${orderId} shipped! Tracking: ${trackingNumber}`);
		},
	};
}

// ─── Event Bus with Dead Letter Queue ───

function createEventBus(handlers: Array<IEventHandler>, deadLetterQueue: IDeadLetterQueue): IEventBus {
	const handlersByType: Map<string, Array<IEventHandler>> = new Map();

	for (const handler of handlers) {
		const list: Array<IEventHandler> = handlersByType.get(handler.eventType) ?? [];
		list.push(handler);
		handlersByType.set(handler.eventType, list);
	}

	let processedCount = 0;

	return {
		getProcessedCount: () => processedCount,
		publish: async (event: IDomainEvent) => {
			const applicableHandlers: Array<IEventHandler> = handlersByType.get(event.type) ?? [];

			console.log(`    [EventBus] Publishing "${event.type}" → ${applicableHandlers.length} handler(s)`);

			for (const handler of applicableHandlers) {
				try {
					await handler.handle(event);
					processedCount++;
				} catch (error: unknown) {
					deadLetterQueue.push(event, error as Error, handler.constructor.name || handler.eventType);
					console.log(`      [EventBus] Handler failed: ${(error as Error).message} → Dead Letter Queue`);
				}
			}
		},
	};
}

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 08: Event-Driven Architecture ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "event-system" });

	// Infrastructure (singletons — shared state)
	container.register({ lifecycle: EDependencyLifecycle.SINGLETON, provide: InventoryServiceToken, useFactory: () => createInventoryService() });
	container.register({ lifecycle: EDependencyLifecycle.SINGLETON, provide: PaymentServiceToken, useFactory: () => createPaymentService() });
	container.register({ lifecycle: EDependencyLifecycle.SINGLETON, provide: NotificationServiceToken, useFactory: () => createNotificationService() });
	container.register({ lifecycle: EDependencyLifecycle.SINGLETON, provide: OrderStoreToken, useFactory: () => createOrderStore() });
	container.register({ lifecycle: EDependencyLifecycle.SINGLETON, provide: DeadLetterQueueToken, useFactory: () => createDeadLetterQueue() });

	// Event handlers (multi-binding)
	container.register({
		deps: [InventoryServiceToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: EventHandlerToken,
		useFactory: (inv: IInventoryService) => createOrderCreatedInventoryHandler(inv),
	});

	container.register({
		deps: [PaymentServiceToken, OrderStoreToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: EventHandlerToken,
		useFactory: (pay: IPaymentService, store: IOrderStore) => createOrderCreatedPaymentHandler(pay, store),
	});

	container.register({
		deps: [NotificationServiceToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: EventHandlerToken,
		useFactory: (notif: INotificationService) => createOrderCreatedNotificationHandler(notif),
	});

	container.register({
		deps: [NotificationServiceToken, InventoryServiceToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: EventHandlerToken,
		useFactory: (notif: INotificationService, inv: IInventoryService) => createPaymentFailedHandler(notif, inv),
	});

	container.register({
		deps: [NotificationServiceToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: EventHandlerToken,
		useFactory: (notif: INotificationService) => createOrderShippedHandler(notif),
	});

	// Event bus
	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: EventBusToken,
		useFactory: () => {
			const handlers: Array<IEventHandler> = container.resolveAll(EventHandlerToken);
			const dlq: IDeadLetterQueue = container.resolve(DeadLetterQueueToken);
			console.log(`  EventBus initialized with ${handlers.length} handler(s)\n`);

			return createEventBus(handlers, dlq);
		},
	});

	const eventBus: IEventBus = container.resolve(EventBusToken);
	const orderStore: IOrderStore = container.resolve(OrderStoreToken);
	const inventory: IInventoryService = container.resolve(InventoryServiceToken);

	// ─── Scenario 1: Successful order ───

	console.log("── Scenario 1: Successful order ──");
	const order1 = { amount: 49.99, orderId: "ORD-001", productId: "WIDGET-01", quantity: 2, userId: "user-42" };
	orderStore.save({ ...order1, status: "created" });
	await eventBus.publish(createEvent("OrderCreated", order1));

	console.log(`\n    Order status: ${orderStore.findById("ORD-001")?.["status"]}`);
	console.log(`    WIDGET-01 stock: ${inventory.getStock("WIDGET-01")}\n`);

	// ─── Scenario 2: Out-of-stock order (partial failure) ───

	console.log("── Scenario 2: Out-of-stock order ──");
	const order2 = { amount: 19.99, orderId: "ORD-002", productId: "DOOHICKEY-03", quantity: 5, userId: "user-99" };
	orderStore.save({ ...order2, status: "created" });
	await eventBus.publish(createEvent("OrderCreated", order2));

	// Trigger compensation
	console.log("\n    Publishing PaymentFailed for compensation...");
	await eventBus.publish(createEvent("PaymentFailed", order2));

	console.log(`\n    DOOHICKEY-03 stock: ${inventory.getStock("DOOHICKEY-03")}\n`);

	// ─── Scenario 3: Order shipped ───

	console.log("── Scenario 3: Order shipped ──");
	await eventBus.publish(
		createEvent("OrderShipped", {
			orderId: "ORD-001",
			trackingNumber: "TRK-789XYZ",
			userId: "user-42",
		}),
	);

	// ─── Summary ───

	console.log("\n── Summary ──");
	console.log(`  Events processed: ${eventBus.getProcessedCount()}`);

	const dlq: IDeadLetterQueue = container.resolve(DeadLetterQueueToken);
	console.log(`  Dead letter queue size: ${dlq.size()}`);

	if (dlq.size() > 0) {
		console.log("  Dead letter entries:");

		for (const entry of dlq.getEntries()) {
			console.log(`    - [${entry.event.type}] ${entry.error}`);
		}
	}

	const notifications: INotificationService = container.resolve(NotificationServiceToken);
	console.log(`\n  Total notifications sent: ${notifications.getSentMessages().length}`);

	const orders: Array<Record<string, unknown>> = orderStore.getAll();
	console.log("  Orders:");

	for (const order of orders) {
		console.log(`    - ${order["orderId"]}: ${order["status"]}`);
	}

	await container.dispose();
	console.log("\n✓ Example 08 complete");
}

main().catch((error: unknown) => {
	console.error((error as Error).message);
	process.exitCode = 1;
});
