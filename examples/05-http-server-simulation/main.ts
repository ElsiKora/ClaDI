/**
 * Example 05: HTTP Server Simulation
 *
 * Demonstrates a real-world pattern: per-request DI scoping for an HTTP server.
 * - Root container holds singletons (database, config)
 * - Each incoming request gets its own scope with scoped services
 * - Scopes are disposed after the request completes
 * - Resolve interceptors provide observability
 * - Container diagnostics (explain, snapshot, validate)
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, IDIScope, IResolveInterceptor, Token } from "@elsikora/cladi";

// ─── Domain Interfaces ───

interface IRequestContext {
	method: string;
	path: string;
	requestId: string;
}

interface IDatabase {
	query(sql: string): Array<Record<string, unknown>>;
}

interface IRequestLogger {
	log(message: string): void;
}

interface IAuthService {
	authenticate(requestId: string): { role: string; userId: number };
}

interface IResponseBuilder {
	build(data: unknown): { body: string; requestId: string; status: number };
}

// ─── Tokens ───

const DatabaseToken: Token<IDatabase> = createToken<IDatabase>("Database");
const RequestContextToken: Token<IRequestContext> = createToken<IRequestContext>("RequestContext");
const RequestLoggerToken: Token<IRequestLogger> = createToken<IRequestLogger>("RequestLogger");
const AuthServiceToken: Token<IAuthService> = createToken<IAuthService>("AuthService");
const ResponseBuilderToken: Token<IResponseBuilder> = createToken<IResponseBuilder>("ResponseBuilder");

// ─── Interceptor for observability ───

function createTimingInterceptor(): IResolveInterceptor {
	const timings: Map<string, number> = new Map();

	return {
		onStart: (context) => {
			timings.set(context.tokenDescription, performance.now());
		},
		onSuccess: (context) => {
			const start = timings.get(context.tokenDescription);

			if (start !== undefined) {
				const elapsed = (performance.now() - start).toFixed(2);
				console.log(`    [interceptor] Resolved "${context.tokenDescription}" in ${elapsed}ms (scope: ${context.scopeId})`);
				timings.delete(context.tokenDescription);
			}
		},
	};
}

// ─── Simulated HTTP Request Handler ───

async function handleRequest(container: IDIContainer, request: IRequestContext): Promise<void> {
	console.log(`\n  ── Request: ${request.method} ${request.path} [${request.requestId}] ──`);

	const scope: IDIScope = container.createScope(`request-${request.requestId}`);

	try {
		scope.register({
			provide: RequestContextToken,
			useValue: request,
		});

		const logger: IRequestLogger = scope.resolve(RequestLoggerToken);
		logger.log("Processing request");

		const auth: IAuthService = scope.resolve(AuthServiceToken);
		const user = auth.authenticate(request.requestId);
		logger.log(`Authenticated as user ${user.userId} (${user.role})`);

		const db: IDatabase = scope.resolve(DatabaseToken);
		const data = db.query("SELECT * FROM items LIMIT 2");
		logger.log(`Fetched ${data.length} items from database`);

		const responseBuilder: IResponseBuilder = scope.resolve(ResponseBuilderToken);
		const response = responseBuilder.build(data);
		logger.log(`Response: ${response.status} — ${response.body}`);
	} finally {
		await scope.dispose();
		console.log(`    [scope] Request ${request.requestId} scope disposed`);
	}
}

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 05: HTTP Server Simulation ===\n");

	const interceptor: IResolveInterceptor = createTimingInterceptor();

	const container: IDIContainer = createDIContainer({
		resolveInterceptors: [interceptor],
		scopeName: "http-server",
	});

	// ─── Singleton providers (shared across all requests) ───

	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		onDispose: () => console.log("\n  [cleanup] Database connection closed"),
		provide: DatabaseToken,
		useFactory: (): IDatabase => {
			console.log("  [init] Database connection opened (singleton)");

			const items = [
				{ id: 1, name: "Widget", price: 9.99 },
				{ id: 2, name: "Gadget", price: 24.99 },
				{ id: 3, name: "Doohickey", price: 4.99 },
			];

			return {
				query: (_sql: string) => items,
			};
		},
	});

	// ─── Scoped providers (one per request scope) ───

	container.register({
		deps: [RequestContextToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: RequestLoggerToken,
		useFactory: (ctx: IRequestContext): IRequestLogger => ({
			log: (message: string) => console.log(`    [${ctx.requestId}] ${message}`),
		}),
	});

	container.register({
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: AuthServiceToken,
		useFactory: (): IAuthService => ({
			authenticate: (requestId: string) => {
				const userId = requestId.charCodeAt(requestId.length - 1) % 10;

				return { role: userId % 2 === 0 ? "admin" : "user", userId };
			},
		}),
	});

	container.register({
		deps: [RequestContextToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: ResponseBuilderToken,
		useFactory: (ctx: IRequestContext): IResponseBuilder => ({
			build: (data: unknown) => ({
				body: JSON.stringify(data),
				requestId: ctx.requestId,
				status: 200,
			}),
		}),
	});

	// ─── Diagnostics: explain a token ───

	console.log("── Token explanation (Database — singleton) ──");
	const dbExplanation = container.explain(DatabaseToken);
	console.log(`  Token: ${dbExplanation.token}`);
	console.log(`  Found: ${dbExplanation.isFound}`);
	console.log(`  Lifecycle: ${dbExplanation.lifecycle ?? "default"}`);
	console.log(`  Provider type: ${dbExplanation.providerType ?? "unknown"}`);
	console.log(`  Dependencies: [${dbExplanation.dependencies.join(", ")}]`);
	console.log(`  Lookup path: [${dbExplanation.lookupPath.join(" → ")}]`);

	console.log("\n── Token explanation (RequestLogger — scoped) ──");
	const loggerExplanation = container.explain(RequestLoggerToken);
	console.log(`  Token: ${loggerExplanation.token}`);
	console.log(`  Found: ${loggerExplanation.isFound}`);
	console.log(`  Lifecycle: ${loggerExplanation.lifecycle ?? "default"}`);
	console.log(`  Dependencies: [${loggerExplanation.dependencies.join(", ")}]`);

	// ─── Simulate concurrent HTTP requests ───

	console.log("\n── Simulating HTTP requests ──");

	const requests: Array<IRequestContext> = [
		{ method: "GET", path: "/api/items", requestId: "req-A" },
		{ method: "POST", path: "/api/items", requestId: "req-B" },
		{ method: "GET", path: "/api/items/1", requestId: "req-C" },
	];

	for (const request of requests) {
		await handleRequest(container, request);
	}

	// ─── Container snapshot ───

	console.log("\n── Container snapshot ──");
	const snapshot = container.snapshot();
	console.log(`  Scope ID: ${snapshot.scopeId}`);
	console.log(`  Provider count: ${snapshot.providerCount}`);
	console.log(`  Singleton cache size: ${snapshot.singletonCacheSize}`);
	console.log(`  Scoped cache size: ${snapshot.scopedCacheSize}`);
	console.log(`  Child scopes: ${snapshot.childScopeCount}`);
	console.log(`  Is disposed: ${snapshot.isDisposed}`);
	console.log(`  Tokens: ${snapshot.tokens.join(", ")}`);

	// ─── Shutdown ───

	console.log("\n── Shutting down server ──");
	await container.dispose();
	console.log("  Server stopped.\n");

	console.log("✓ Example 05 complete");
}

main().catch((error: Error) => {
	console.error(error.message);
	process.exitCode = 1;
});
