/**
 * Example 09: Layered REST API
 *
 * Simulates a production REST API with Clean Architecture layers
 * wired entirely through ClaDI:
 *
 * - Controller → UseCase → Repository → Database
 * - Middleware pipeline (auth, rate limiter, logging) composed via multi-binding
 * - Unit of Work pattern: repositories share a transactional context per request
 * - Request/response cycle with proper scope disposal
 * - Module-based organization of feature slices
 */

import { composeModules, createDIContainer, createModule, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, IDIModule, IDIScope, Token } from "@elsikora/cladi";

// ─── HTTP Abstractions ───

interface IHttpRequest {
	body?: Record<string, unknown>;
	headers: Record<string, string>;
	method: string;
	params: Record<string, string>;
	path: string;
}

interface IHttpResponse {
	body: unknown;
	headers: Record<string, string>;
	status: number;
}

interface IMiddleware {
	readonly name: string;
	readonly order: number;
	process(request: IHttpRequest, next: () => Promise<IHttpResponse>): Promise<IHttpResponse>;
}

interface IRequestContext {
	requestId: string;
	startedAt: number;
	userId?: string;
	role?: string;
}

// ─── Domain ───

interface IProduct {
	id: string;
	name: string;
	price: number;
	stock: number;
	category: string;
}

interface IProductRepository {
	findAll(filter?: { category?: string }): Array<IProduct>;
	findById(id: string): IProduct | undefined;
	create(product: IProduct): void;
	update(id: string, patch: Partial<IProduct>): void;
}

interface IUnitOfWork {
	begin(): void;
	commit(): void;
	rollback(): void;
	getLog(): Array<string>;
}

// ─── Use Cases ───

interface IListProductsUseCase {
	execute(category?: string): Array<IProduct>;
}

interface IGetProductUseCase {
	execute(id: string): IProduct | undefined;
}

interface ICreateProductUseCase {
	execute(input: { category: string; name: string; price: number; stock: number }): IProduct;
}

// ─── Controllers ───

interface IProductController {
	handleRequest(request: IHttpRequest): Promise<IHttpResponse>;
}

// ─── Tokens ───

const RequestContextToken: Token<IRequestContext> = createToken<IRequestContext>("RequestContext");
const UnitOfWorkToken: Token<IUnitOfWork> = createToken<IUnitOfWork>("UnitOfWork");
const MiddlewareToken: Token<IMiddleware> = createToken<IMiddleware>("Middleware");
const ProductRepositoryToken: Token<IProductRepository> = createToken<IProductRepository>("ProductRepository");
const ListProductsUseCaseToken: Token<IListProductsUseCase> = createToken<IListProductsUseCase>("ListProductsUseCase");
const GetProductUseCaseToken: Token<IGetProductUseCase> = createToken<IGetProductUseCase>("GetProductUseCase");
const CreateProductUseCaseToken: Token<ICreateProductUseCase> = createToken<ICreateProductUseCase>("CreateProductUseCase");
const ProductControllerToken: Token<IProductController> = createToken<IProductController>("ProductController");

// ─── Infrastructure Module ───

function createUnitOfWork(): IUnitOfWork {
	const log: Array<string> = [];
	let active = false;

	return {
		begin: () => {
			active = true;
			log.push("BEGIN TRANSACTION");
		},
		commit: () => {
			if (active) {
				log.push("COMMIT");
				active = false;
			}
		},
		getLog: () => [...log],
		rollback: () => {
			if (active) {
				log.push("ROLLBACK");
				active = false;
			}
		},
	};
}

function createProductRepository(unitOfWork: IUnitOfWork): IProductRepository {
	const products: Map<string, IProduct> = new Map([
		["prod-1", { category: "electronics", id: "prod-1", name: "Wireless Mouse", price: 29.99, stock: 150 }],
		["prod-2", { category: "electronics", id: "prod-2", name: "USB-C Hub", price: 49.99, stock: 75 }],
		["prod-3", { category: "accessories", id: "prod-3", name: "Laptop Stand", price: 39.99, stock: 200 }],
		["prod-4", { category: "accessories", id: "prod-4", name: "Cable Organizer", price: 12.99, stock: 500 }],
	]);

	return {
		create: (product: IProduct) => {
			unitOfWork.begin();
			products.set(product.id, product);
			unitOfWork.commit();
		},
		findAll: (filter?: { category?: string }) => {
			const all: Array<IProduct> = [...products.values()];

			return filter?.category ? all.filter((p) => p.category === filter.category) : all;
		},
		findById: (id: string) => products.get(id),
		update: (id: string, patch: Partial<IProduct>) => {
			const existing: IProduct | undefined = products.get(id);

			if (existing) {
				unitOfWork.begin();
				products.set(id, { ...existing, ...patch });
				unitOfWork.commit();
			}
		},
	};
}

const infrastructureModule: IDIModule = createModule({
	exports: [UnitOfWorkToken, ProductRepositoryToken],
	name: "infrastructure",
	providers: [
		{
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: UnitOfWorkToken,
			useFactory: () => createUnitOfWork(),
		},
		{
			deps: [UnitOfWorkToken] as const,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ProductRepositoryToken,
			useFactory: (uow: IUnitOfWork) => createProductRepository(uow),
		},
	],
});

// ─── Use Case Module ───

const useCaseModule: IDIModule = createModule({
	exports: [ListProductsUseCaseToken, GetProductUseCaseToken, CreateProductUseCaseToken],
	imports: [infrastructureModule],
	name: "use-cases",
	providers: [
		{
			deps: [ProductRepositoryToken] as const,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ListProductsUseCaseToken,
			useFactory: (repo: IProductRepository): IListProductsUseCase => ({
				execute: (category?: string) => repo.findAll(category ? { category } : undefined),
			}),
		},
		{
			deps: [ProductRepositoryToken] as const,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: GetProductUseCaseToken,
			useFactory: (repo: IProductRepository): IGetProductUseCase => ({
				execute: (id: string) => repo.findById(id),
			}),
		},
		{
			deps: [ProductRepositoryToken] as const,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: CreateProductUseCaseToken,
			useFactory: (repo: IProductRepository): ICreateProductUseCase => ({
				execute: (input) => {
					const product: IProduct = {
						category: input.category,
						id: `prod-${Date.now().toString(36)}`,
						name: input.name,
						price: input.price,
						stock: input.stock,
					};

					repo.create(product);

					return product;
				},
			}),
		},
	],
});

// ─── Controller Module ───

const controllerModule: IDIModule = createModule({
	exports: [ProductControllerToken],
	imports: [useCaseModule],
	name: "controllers",
	providers: [
		{
			deps: [ListProductsUseCaseToken, GetProductUseCaseToken, CreateProductUseCaseToken, RequestContextToken] as const,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ProductControllerToken,
			useFactory: (listProducts: IListProductsUseCase, getProduct: IGetProductUseCase, createProduct: ICreateProductUseCase, context: IRequestContext): IProductController => ({
				handleRequest: async (request: IHttpRequest) => {
					if (request.method === "GET" && request.path === "/products") {
						const category: string | undefined = request.params["category"];
						const products: Array<IProduct> = listProducts.execute(category);

						return { body: products, headers: { "x-request-id": context.requestId }, status: 200 };
					}

					if (request.method === "GET" && request.path.startsWith("/products/")) {
						const id: string = request.path.split("/")[2];
						const product: IProduct | undefined = getProduct.execute(id);

						if (!product) {
							return { body: { error: "Product not found" }, headers: { "x-request-id": context.requestId }, status: 404 };
						}

						return { body: product, headers: { "x-request-id": context.requestId }, status: 200 };
					}

					if (request.method === "POST" && request.path === "/products") {
						if (context.role !== "admin") {
							return { body: { error: "Forbidden: admin role required" }, headers: { "x-request-id": context.requestId }, status: 403 };
						}

						const product: IProduct = createProduct.execute(request.body as { category: string; name: string; price: number; stock: number });

						return { body: product, headers: { "x-request-id": context.requestId }, status: 201 };
					}

					return { body: { error: "Not found" }, headers: { "x-request-id": context.requestId }, status: 404 };
				},
			}),
		},
	],
});

// ─── Middleware Module ───

const middlewareModule: IDIModule = createModule({
	exports: [MiddlewareToken],
	name: "middleware",
	providers: [
		// Auth middleware
		{
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: MiddlewareToken,
			useFactory: (): IMiddleware => ({
				name: "auth",
				order: 1,
				process: async (request: IHttpRequest, next: () => Promise<IHttpResponse>) => {
					const token: string | undefined = request.headers["authorization"];

					if (!token) {
						return { body: { error: "Unauthorized" }, headers: {}, status: 401 };
					}

					return next();
				},
			}),
		},
		// Rate limiter middleware
		{
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: MiddlewareToken,
			useFactory: (): IMiddleware => {
				const requestCounts: Map<string, number> = new Map();
				const LIMIT = 10;

				return {
					name: "rate-limiter",
					order: 2,
					process: async (request: IHttpRequest, next: () => Promise<IHttpResponse>) => {
						const clientIp: string = request.headers["x-forwarded-for"] ?? "unknown";
						const count: number = (requestCounts.get(clientIp) ?? 0) + 1;
						requestCounts.set(clientIp, count);

						if (count > LIMIT) {
							return { body: { error: "Rate limit exceeded" }, headers: { "retry-after": "60" }, status: 429 };
						}

						return next();
					},
				};
			},
		},
		// Logging middleware
		{
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: MiddlewareToken,
			useFactory: (): IMiddleware => ({
				name: "logging",
				order: 3,
				process: async (request: IHttpRequest, next: () => Promise<IHttpResponse>) => {
					const start: number = performance.now();
					const response: IHttpResponse = await next();
					const duration: string = (performance.now() - start).toFixed(1);
					console.log(`    ${request.method} ${request.path} → ${response.status} (${duration}ms)`);

					return response;
				},
			}),
		},
	],
});

// ─── HTTP Engine ───

function buildMiddlewarePipeline(middlewares: Array<IMiddleware>, handler: (request: IHttpRequest) => Promise<IHttpResponse>): (request: IHttpRequest) => Promise<IHttpResponse> {
	const sorted: Array<IMiddleware> = [...middlewares].sort((a, b) => a.order - b.order);

	return (request: IHttpRequest) => {
		let index = 0;

		const next = (): Promise<IHttpResponse> => {
			if (index < sorted.length) {
				const middleware: IMiddleware = sorted[index++];

				return middleware.process(request, next);
			}

			return handler(request);
		};

		return next();
	};
}

let requestSeq = 0;

async function simulateRequest(container: IDIContainer, middlewares: Array<IMiddleware>, request: IHttpRequest): Promise<IHttpResponse> {
	const requestId: string = `req-${++requestSeq}`;
	const scope: IDIScope = container.createScope(`request-${requestId}`);

	scope.register({
		provide: RequestContextToken,
		useValue: {
			requestId,
			role: request.headers["x-user-role"],
			startedAt: Date.now(),
			userId: request.headers["x-user-id"],
		},
	});

	try {
		const controller: IProductController = scope.resolve(ProductControllerToken);

		const pipeline = buildMiddlewarePipeline(middlewares, (req: IHttpRequest) => controller.handleRequest(req));

		return await pipeline(request);
	} finally {
		await scope.dispose();
	}
}

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 09: Layered REST API ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "api-server" });

	console.log("── Composing modules ──");
	composeModules(container, [controllerModule, middlewareModule]);

	const middlewares: Array<IMiddleware> = container.resolveAll(MiddlewareToken);
	console.log(
		`  Middleware pipeline: ${middlewares
			.sort((a, b) => a.order - b.order)
			.map((m) => m.name)
			.join(" → ")}\n`,
	);

	// ─── Request 1: GET /products (list all) ───

	console.log("── Request 1: GET /products ──");
	const response1: IHttpResponse = await simulateRequest(container, middlewares, {
		headers: { authorization: "Bearer token-123", "x-forwarded-for": "192.168.1.1", "x-user-id": "user-1", "x-user-role": "user" },
		method: "GET",
		params: {},
		path: "/products",
	});

	console.log(`    Response: ${response1.status}, ${(response1.body as Array<unknown>).length} products\n`);

	// ─── Request 2: GET /products?category=electronics ───

	console.log("── Request 2: GET /products?category=electronics ──");
	const response2: IHttpResponse = await simulateRequest(container, middlewares, {
		headers: { authorization: "Bearer token-123", "x-forwarded-for": "192.168.1.1", "x-user-id": "user-1", "x-user-role": "user" },
		method: "GET",
		params: { category: "electronics" },
		path: "/products",
	});

	console.log(`    Response: ${response2.status}, ${(response2.body as Array<unknown>).length} products\n`);

	// ─── Request 3: GET /products/prod-2 (single item) ───

	console.log("── Request 3: GET /products/prod-2 ──");
	const response3: IHttpResponse = await simulateRequest(container, middlewares, {
		headers: { authorization: "Bearer token-456", "x-forwarded-for": "10.0.0.1", "x-user-id": "user-2", "x-user-role": "user" },
		method: "GET",
		params: {},
		path: "/products/prod-2",
	});

	const product = response3.body as IProduct;
	console.log(`    Response: ${response3.status}, ${product.name} — $${product.price}\n`);

	// ─── Request 4: POST /products (create — admin only) ───

	console.log("── Request 4: POST /products (as admin) ──");
	const response4: IHttpResponse = await simulateRequest(container, middlewares, {
		body: { category: "peripherals", name: "Mechanical Keyboard", price: 89.99, stock: 30 },
		headers: { authorization: "Bearer admin-token", "x-forwarded-for": "10.0.0.1", "x-user-id": "admin-1", "x-user-role": "admin" },
		method: "POST",
		params: {},
		path: "/products",
	});

	console.log(`    Response: ${response4.status}, created: ${JSON.stringify((response4.body as IProduct).name)}\n`);

	// ─── Request 5: POST /products (forbidden — regular user) ───

	console.log("── Request 5: POST /products (as regular user) ──");
	const response5: IHttpResponse = await simulateRequest(container, middlewares, {
		body: { category: "test", name: "Hack", price: 0, stock: 0 },
		headers: { authorization: "Bearer user-token", "x-forwarded-for": "10.0.0.1", "x-user-id": "user-3", "x-user-role": "user" },
		method: "POST",
		params: {},
		path: "/products",
	});

	console.log(`    Response: ${response5.status}, ${JSON.stringify(response5.body)}\n`);

	// ─── Request 6: No auth token (rejected by middleware) ───

	console.log("── Request 6: GET /products (no auth) ──");
	const response6: IHttpResponse = await simulateRequest(container, middlewares, {
		headers: { "x-forwarded-for": "10.0.0.1" },
		method: "GET",
		params: {},
		path: "/products",
	});

	console.log(`    Response: ${response6.status}, ${JSON.stringify(response6.body)}\n`);

	// ─── Container diagnostics ───

	console.log("── Container state ──");
	const snapshot = container.snapshot();
	console.log(`  Total providers: ${snapshot.providerCount}`);
	console.log(`  Singleton cache (middleware): ${snapshot.singletonCacheSize}`);
	console.log(`  Scoped cache: ${snapshot.scopedCacheSize} (should be 0 — scopes are disposed)`);
	console.log(`  Child scopes: ${snapshot.childScopeCount} (should be 0)`);

	await container.dispose();
	console.log("\n✓ Example 09 complete");
}

main().catch((error: unknown) => {
	console.error((error as Error).message);
	process.exitCode = 1;
});
