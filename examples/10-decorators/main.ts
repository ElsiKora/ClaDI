/**
 * Example 10: Enterprise Decorators
 *
 * Demonstrates advanced decorator ergonomics in ClaDI:
 * - @Injectable now holds token + lifecycle metadata
 * - @OnInit / @AfterResolve / @OnDispose lifecycle method decorators
 * - autowire() shorthand (token comes from @Injectable metadata)
 * - @Module decorator with composeDecoratedModules()
 */

import { AfterResolve, autowire, composeDecoratedModules, createDIContainer, createToken, EDependencyLifecycle, getInjectableMetadata, Inject, Injectable, Module, OnDispose, OnInit } from "@elsikora/cladi";

import type { IDIContainer, IInjectableMetadata, Token } from "@elsikora/cladi";

interface ILogger {
	debug(message: string): void;
	info(message: string): void;
}

interface IConfigService {
	get(key: string): string | undefined;
}

interface ICacheService {
	get(key: string): string | undefined;
	set(key: string, value: string, ttlMs: number): void;
}

interface IUserRepository {
	findById(id: string): { email: string; id: string; name: string } | undefined;
	findAll(): Array<{ email: string; id: string; name: string }>;
}

interface IUserService {
	getUser(id: string): { cached: boolean; email: string; id: string; name: string } | undefined;
	listUsers(): Array<{ email: string; id: string; name: string }>;
}

const LoggerToken: Token<ILogger> = createToken<ILogger>("Logger");
const ConfigToken: Token<IConfigService> = createToken<IConfigService>("ConfigService");
const CacheToken: Token<ICacheService> = createToken<ICacheService>("CacheService");
const UserRepositoryToken: Token<IUserRepository> = createToken<IUserRepository>("UserRepository");
const UserServiceToken: Token<IUserService> = createToken<IUserService>("UserService");

@Injectable({
	lifecycle: EDependencyLifecycle.SINGLETON,
	token: LoggerToken,
})
class ConsoleLogger implements ILogger {
	public debug(message: string): void {
		console.log(`    [DEBUG] ${message}`);
	}

	public info(message: string): void {
		console.log(`    [INFO] ${message}`);
	}
}

@Injectable({
	lifecycle: EDependencyLifecycle.SINGLETON,
	token: ConfigToken,
})
class InMemoryConfigService implements IConfigService {
	private readonly config: Map<string, string> = new Map<string, string>([
		["cache.ttl", "30000"],
		["app.name", "DecoratorEnterpriseApp"],
		["app.version", "3.0.0"],
	]);

	public get(key: string): string | undefined {
		return this.config.get(key);
	}
}

@Injectable({
	lifecycle: EDependencyLifecycle.SINGLETON,
	token: CacheToken,
})
class InMemoryCacheService implements ICacheService {
	private readonly store: Map<string, { expiresAt: number; value: string }> = new Map<string, { expiresAt: number; value: string }>();

	constructor(@Inject(LoggerToken) private readonly logger: ILogger) {}

	public get(key: string): string | undefined {
		const entry: { expiresAt: number; value: string } | undefined = this.store.get(key);

		if (!entry) {
			return undefined;
		}

		if (Date.now() > entry.expiresAt) {
			this.store.delete(key);
			this.logger.debug(`Cache MISS (expired): ${key}`);

			return undefined;
		}

		this.logger.debug(`Cache HIT: ${key}`);

		return entry.value;
	}

	public set(key: string, value: string, ttlMs: number): void {
		this.store.set(key, { expiresAt: Date.now() + ttlMs, value });
		this.logger.debug(`Cache SET: ${key} (TTL: ${ttlMs}ms)`);
	}
}

@Injectable({
	lifecycle: EDependencyLifecycle.SINGLETON,
	token: UserRepositoryToken,
})
class InMemoryUserRepository implements IUserRepository {
	private readonly users: Array<{ email: string; id: string; name: string }> = [
		{ email: "alice@example.com", id: "usr-1", name: "Alice Johnson" },
		{ email: "bob@example.com", id: "usr-2", name: "Bob Smith" },
		{ email: "charlie@example.com", id: "usr-3", name: "Charlie Brown" },
	];

	constructor(@Inject(LoggerToken) private readonly logger: ILogger) {}

	public findAll(): Array<{ email: string; id: string; name: string }> {
		this.logger.debug(`UserRepository.findAll() -> ${String(this.users.length)} users`);

		return [...this.users];
	}

	public findById(id: string): { email: string; id: string; name: string } | undefined {
		const user: { email: string; id: string; name: string } | undefined = this.users.find((currentUser: { email: string; id: string; name: string }) => currentUser.id === id);
		this.logger.debug(`UserRepository.findById("${id}") -> ${user ? user.name : "not found"}`);

		return user;
	}
}

@Injectable({
	lifecycle: EDependencyLifecycle.SINGLETON,
	token: UserServiceToken,
})
class CachedUserService implements IUserService {
	private readonly cacheTtl: number;

	private disposeCount: number = 0;

	private resolveCount: number = 0;

	constructor(
		@Inject(UserRepositoryToken) private readonly repository: IUserRepository,
		@Inject(CacheToken) private readonly cache: ICacheService,
		@Inject(ConfigToken) config: IConfigService,
		@Inject(LoggerToken) private readonly logger: ILogger,
	) {
		this.cacheTtl = Number(config.get("cache.ttl") ?? "60000");
	}

	@OnInit()
	public initialize(): void {
		this.logger.info(`UserService initialized (cache TTL: ${String(this.cacheTtl)}ms)`);
	}

	@AfterResolve()
	public trackResolve(): void {
		this.resolveCount += 1;
		this.logger.debug(`UserService resolved ${String(this.resolveCount)} time(s)`);
	}

	@OnDispose()
	public cleanup(): void {
		this.disposeCount += 1;
		this.logger.info(`UserService disposed ${String(this.disposeCount)} time(s)`);
	}

	public getUser(id: string): { cached: boolean; email: string; id: string; name: string } | undefined {
		const cacheKey: string = `user:${id}`;
		const cached: string | undefined = this.cache.get(cacheKey);

		if (cached) {
			return { ...(JSON.parse(cached) as { email: string; id: string; name: string }), cached: true };
		}

		const user: { email: string; id: string; name: string } | undefined = this.repository.findById(id);

		if (user) {
			this.cache.set(cacheKey, JSON.stringify(user), this.cacheTtl);

			return { ...user, cached: false };
		}

		return undefined;
	}

	public listUsers(): Array<{ email: string; id: string; name: string }> {
		return this.repository.findAll();
	}
}

@Module({
	exports: [LoggerToken, ConfigToken, CacheToken],
	name: "InfrastructureModule",
	providers: [ConsoleLogger, InMemoryConfigService, InMemoryCacheService],
})
class InfrastructureModule {}

@Module({
	exports: [UserRepositoryToken],
	imports: [InfrastructureModule],
	name: "DataModule",
	providers: [InMemoryUserRepository],
})
class DataModule {}

@Module({
	exports: [UserServiceToken],
	imports: [InfrastructureModule, DataModule],
	name: "AppModule",
	providers: [CachedUserService],
})
class AppModule {}

async function main(): Promise<void> {
	console.log("=== Example 10: Enterprise Decorators ===\n");

	console.log("── 1. Metadata inspection ──");
	const userServiceMetadata: IInjectableMetadata | undefined = getInjectableMetadata(CachedUserService);
	console.log(`  token: ${userServiceMetadata?.token?.description ?? "none"}`);
	console.log(`  lifecycle: ${userServiceMetadata?.lifecycle ?? "default"}`);
	console.log(`  deps: ${(userServiceMetadata?.deps ?? []).map((token: Token<unknown>) => token.description ?? "?").join(", ")}`);
	console.log(`  onInitMethod: ${userServiceMetadata?.onInitMethod ?? "none"}`);
	console.log(`  afterResolveMethod: ${userServiceMetadata?.afterResolveMethod ?? "none"}`);
	console.log(`  onDisposeMethod: ${userServiceMetadata?.onDisposeMethod ?? "none"}`);

	console.log("\n── 2. autowire() registration ──");
	const container: IDIContainer = createDIContainer({ scopeName: "decorator-enterprise" });
	container.register([autowire(ConsoleLogger), autowire(InMemoryConfigService), autowire(InMemoryCacheService), autowire(InMemoryUserRepository), autowire(CachedUserService)]);

	const userService: IUserService = container.resolve(UserServiceToken);
	console.log("  Fetching user usr-1 (cache miss expected):");
	const firstFetch: ReturnType<IUserService["getUser"]> = userService.getUser("usr-1");
	console.log(`    ${firstFetch?.name}, cached=${String(firstFetch?.cached)}`);

	console.log("  Fetching user usr-1 (cache hit expected):");
	const secondFetch: ReturnType<IUserService["getUser"]> = userService.getUser("usr-1");
	console.log(`    ${secondFetch?.name}, cached=${String(secondFetch?.cached)}`);

	console.log("\n── 3. @Module + composeDecoratedModules() ──");
	const moduleContainer: IDIContainer = createDIContainer({ scopeName: "decorator-module-enterprise" });
	composeDecoratedModules(moduleContainer, [AppModule]);

	const modularUserService: IUserService = moduleContainer.resolve(UserServiceToken);
	const modularResult: ReturnType<IUserService["getUser"]> = modularUserService.getUser("usr-2");
	console.log(`  Resolved through @Module graph: ${modularResult?.name}, cached=${String(modularResult?.cached)}`);

	await container.dispose();
	await moduleContainer.dispose();

	console.log("\n✓ Example 10 complete");
}

main().catch((error: unknown) => {
	console.error((error as Error).message);
	process.exitCode = 1;
});
