/**
 * Example 11: Container Operations
 *
 * Demonstrates runtime container operations in ClaDI:
 * - bootstrap() for eager singleton initialization
 * - lock() and isLocked to freeze registrations
 * - exportGraph() to inspect dependency nodes and edges
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDependencyGraph, IDIContainer, Token } from "@elsikora/cladi";

interface ILogger {
	info(message: string): void;
}

interface ICacheService {
	get(key: string): string | undefined;
	set(key: string, value: string): void;
}

interface IHealthService {
	status(): string;
}

const LoggerToken: Token<ILogger> = createToken<ILogger>("OpsLogger");
const CacheToken: Token<ICacheService> = createToken<ICacheService>("OpsCache");
const HealthToken: Token<IHealthService> = createToken<IHealthService>("OpsHealth");
const ExtraToken: Token<string> = createToken<string>("OpsExtra");

class ConsoleLogger implements ILogger {
	info(message: string): void {
		console.log(`[INFO] ${message}`);
	}
}

class InMemoryCache implements ICacheService {
	private readonly store: Map<string, string> = new Map<string, string>();

	constructor(private readonly logger: ILogger) {}

	get(key: string): string | undefined {
		return this.store.get(key);
	}

	set(key: string, value: string): void {
		this.store.set(key, value);
		this.logger.info(`Cache updated for key "${key}"`);
	}
}

class HealthService implements IHealthService {
	constructor(private readonly cache: ICacheService) {}

	status(): string {
		this.cache.set("health:lastCheck", new Date().toISOString());

		return "ok";
	}
}

async function main(): Promise<void> {
	console.log("=== Example 11: Container Operations ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "operations-example" });

	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: LoggerToken,
		useClass: ConsoleLogger,
	});

	container.register({
		deps: [LoggerToken],
		lifecycle: EDependencyLifecycle.SINGLETON,
		onInit: (cache: ICacheService) => {
			cache.set("boot", "ready");
		},
		provide: CacheToken,
		useClass: InMemoryCache,
	});

	container.register({
		deps: [CacheToken],
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: HealthToken,
		useClass: HealthService,
	});

	console.log("1) Graph before bootstrap:");
	const graphBeforeBootstrap: IDependencyGraph = container.exportGraph();
	console.log(`   nodes=${String(graphBeforeBootstrap.nodes.length)}, edges=${String(graphBeforeBootstrap.edges.length)}`);

	console.log("\n2) bootstrap() singletons:");
	await container.bootstrap();
	const healthService: IHealthService = container.resolve(HealthToken);
	console.log(`   health status: ${healthService.status()}`);

	console.log("\n3) lock() container:");
	container.lock();
	console.log(`   isLocked=${String(container.isLocked)}`);
	try {
		container.register({
			provide: ExtraToken,
			useValue: "should-fail",
		});
	} catch (error) {
		console.log(`   register blocked: ${(error as Error).message}`);
	}

	console.log("\n4) exportGraph() details:");
	const graphAfterBootstrap: IDependencyGraph = container.exportGraph();
	for (const node of graphAfterBootstrap.nodes) {
		console.log(`   node: ${node.token} [${node.providerType}/${node.lifecycle}]`);
	}
	for (const edge of graphAfterBootstrap.edges) {
		console.log(`   edge: ${edge.from} -> ${edge.to}`);
	}

	await container.dispose();
	console.log("\n✓ Example 11 complete");
}

main().catch((error: unknown) => {
	console.error((error as Error).message);
	process.exitCode = 1;
});
