/**
 * Example 07: Multi-Tenant SaaS Application
 *
 * Demonstrates tenant isolation through DI scopes — the same pattern
 * used in production SaaS platforms to keep tenant data separated.
 *
 * Key patterns:
 * - Root container holds shared infrastructure (cache, metrics)
 * - Each tenant gets its own scope with isolated config, DB connection, and services
 * - Scoped lifecycle guarantees one instance per tenant
 * - Proper disposal when tenant session ends
 * - Tenant-aware logging
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, IDIScope, Token } from "@elsikora/cladi";

// ─── Domain ───

interface ITenantConfig {
	databaseUrl: string;
	features: Array<string>;
	maxUsers: number;
	plan: "enterprise" | "free" | "pro";
	tenantId: string;
	tenantName: string;
}

interface ITenantDatabase {
	close(): void;
	insert(table: string, record: Record<string, unknown>): void;
	query(table: string, filter?: Record<string, unknown>): Array<Record<string, unknown>>;
}

interface IUserService {
	createUser(name: string, email: string): { email: string; id: string; name: string };
	getUsers(): Array<Record<string, unknown>>;
	getUserCount(): number;
}

interface IBillingService {
	calculateInvoice(): { amount: number; plan: string; tenantId: string; userCount: number };
}

interface IFeatureGate {
	isEnabled(feature: string): boolean;
	listEnabled(): Array<string>;
}

interface IMetricsCollector {
	increment(metric: string, tags?: Record<string, string>): void;
	report(): Array<{ count: number; metric: string; tags: Record<string, string> }>;
}

interface ITenantLogger {
	info(message: string): void;
	warn(message: string): void;
}

// ─── Tokens ───

const TenantConfigToken: Token<ITenantConfig> = createToken<ITenantConfig>("TenantConfig");
const TenantDatabaseToken: Token<ITenantDatabase> = createToken<ITenantDatabase>("TenantDatabase");
const TenantLoggerToken: Token<ITenantLogger> = createToken<ITenantLogger>("TenantLogger");
const UserServiceToken: Token<IUserService> = createToken<IUserService>("UserService");
const BillingServiceToken: Token<IBillingService> = createToken<IBillingService>("BillingService");
const FeatureGateToken: Token<IFeatureGate> = createToken<IFeatureGate>("FeatureGate");
const MetricsToken: Token<IMetricsCollector> = createToken<IMetricsCollector>("Metrics");

// ─── Infrastructure: In-Memory Database ───

function createTenantDatabase(tenantId: string, logger: ITenantLogger): ITenantDatabase {
	const tables: Map<string, Array<Record<string, unknown>>> = new Map();

	logger.info(`Database connection opened`);

	return {
		close: () => logger.info(`Database connection closed`),
		insert: (table: string, record: Record<string, unknown>) => {
			if (!tables.has(table)) {
				tables.set(table, []);
			}

			tables.get(table)!.push({ ...record, _tenantId: tenantId });
		},
		query: (table: string, filter?: Record<string, unknown>) => {
			const rows: Array<Record<string, unknown>> = tables.get(table) ?? [];

			if (!filter) {
				return rows;
			}

			return rows.filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
		},
	};
}

// ─── Infrastructure: Shared Metrics ───

function createMetricsCollector(): IMetricsCollector {
	const counters: Map<string, { count: number; tags: Record<string, string> }> = new Map();

	return {
		increment: (metric: string, tags: Record<string, string> = {}) => {
			const key: string = `${metric}:${JSON.stringify(tags)}`;
			const existing = counters.get(key);

			if (existing) {
				existing.count++;
			} else {
				counters.set(key, { count: 1, tags });
			}
		},
		report: () =>
			[...counters.entries()].map(([key, value]) => ({
				count: value.count,
				metric: key.split(":")[0],
				tags: value.tags,
			})),
	};
}

// ─── Pricing ───

const PLAN_PRICES: Record<string, number> = {
	enterprise: 99,
	free: 0,
	pro: 29,
};

const PER_USER_PRICE = 5;

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 07: Multi-Tenant SaaS Application ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "saas-platform" });

	// Shared singleton: metrics collector (cross-tenant)
	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: MetricsToken,
		useFactory: () => createMetricsCollector(),
	});

	// Scoped: tenant config (injected per-tenant scope)
	// Note: the actual value is registered in each tenant scope, not here.
	// We register the dependent services here with scoped lifecycle.

	container.register({
		deps: [TenantConfigToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: TenantLoggerToken,
		useFactory: (config: ITenantConfig): ITenantLogger => ({
			info: (message: string) => console.log(`    [${config.tenantName}] ${message}`),
			warn: (message: string) => console.log(`    [${config.tenantName}] ⚠ ${message}`),
		}),
	});

	container.register({
		deps: [TenantConfigToken, TenantLoggerToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		onDispose: (db: ITenantDatabase) => db.close(),
		provide: TenantDatabaseToken,
		useFactory: (config: ITenantConfig, logger: ITenantLogger) => createTenantDatabase(config.tenantId, logger),
	});

	container.register({
		deps: [TenantConfigToken, TenantDatabaseToken, TenantLoggerToken, MetricsToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: UserServiceToken,
		useFactory: (config: ITenantConfig, db: ITenantDatabase, logger: ITenantLogger, metrics: IMetricsCollector): IUserService => {
			let userSeq = 0;

			return {
				createUser: (name: string, email: string) => {
					const currentCount: number = db.query("users").length;

					if (currentCount >= config.maxUsers) {
						logger.warn(`User limit reached (${config.maxUsers}). Upgrade plan to add more users.`);
						throw new Error(`Tenant ${config.tenantId} reached max user limit (${config.maxUsers})`);
					}

					const id: string = `${config.tenantId}_u${++userSeq}`;
					db.insert("users", { email, id, name });
					metrics.increment("user_created", { plan: config.plan, tenant: config.tenantId });
					logger.info(`Created user "${name}" (${id})`);

					return { email, id, name };
				},
				getUserCount: () => db.query("users").length,
				getUsers: () => db.query("users"),
			};
		},
	});

	container.register({
		deps: [TenantConfigToken, TenantDatabaseToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: BillingServiceToken,
		useFactory: (config: ITenantConfig, db: ITenantDatabase): IBillingService => ({
			calculateInvoice: () => {
				const userCount: number = db.query("users").length;
				const baseCost: number = PLAN_PRICES[config.plan] ?? 0;
				const userCost: number = config.plan === "free" ? 0 : userCount * PER_USER_PRICE;

				return {
					amount: baseCost + userCost,
					plan: config.plan,
					tenantId: config.tenantId,
					userCount,
				};
			},
		}),
	});

	container.register({
		deps: [TenantConfigToken] as const,
		lifecycle: EDependencyLifecycle.SCOPED,
		provide: FeatureGateToken,
		useFactory: (config: ITenantConfig): IFeatureGate => ({
			isEnabled: (feature: string) => config.features.includes(feature),
			listEnabled: () => [...config.features],
		}),
	});

	// ─── Tenant Configurations ───

	const tenants: Array<ITenantConfig> = [
		{
			databaseUrl: "postgres://db/acme",
			features: ["sso", "analytics", "api-access", "custom-branding"],
			maxUsers: 1000,
			plan: "enterprise",
			tenantId: "acme",
			tenantName: "Acme Corp",
		},
		{
			databaseUrl: "postgres://db/startup",
			features: ["analytics", "api-access"],
			maxUsers: 25,
			plan: "pro",
			tenantId: "startup",
			tenantName: "StartupCo",
		},
		{
			databaseUrl: "postgres://db/hobby",
			features: [],
			maxUsers: 3,
			plan: "free",
			tenantId: "hobby",
			tenantName: "HobbyProject",
		},
	];

	// ─── Process each tenant ───

	for (const tenantConfig of tenants) {
		console.log(`── Tenant: ${tenantConfig.tenantName} (${tenantConfig.plan}) ──`);

		const tenantScope: IDIScope = container.createScope(`tenant-${tenantConfig.tenantId}`);

		tenantScope.register({
			provide: TenantConfigToken,
			useValue: tenantConfig,
		});

		try {
			const userService: IUserService = tenantScope.resolve(UserServiceToken);
			const featureGate: IFeatureGate = tenantScope.resolve(FeatureGateToken);
			const billing: IBillingService = tenantScope.resolve(BillingServiceToken);
			const logger: ITenantLogger = tenantScope.resolve(TenantLoggerToken);

			// Create users
			userService.createUser("Admin", `admin@${tenantConfig.tenantId}.com`);
			userService.createUser("User 1", `user1@${tenantConfig.tenantId}.com`);

			// Free plan: try to exceed limit
			if (tenantConfig.plan === "free") {
				userService.createUser("User 2", `user2@${tenantConfig.tenantId}.com`);

				try {
					userService.createUser("User 3", `user3@${tenantConfig.tenantId}.com`);
				} catch {
					// expected: limit reached
				}
			}

			// Check features
			logger.info(`Features: [${featureGate.listEnabled().join(", ")}]`);
			logger.info(`SSO enabled: ${featureGate.isEnabled("sso")}`);

			// Generate invoice
			const invoice = billing.calculateInvoice();
			logger.info(`Invoice: $${invoice.amount} (${invoice.userCount} users on ${invoice.plan} plan)`);

			// Data isolation check
			logger.info(`Total users in this tenant's DB: ${userService.getUserCount()}`);
		} finally {
			await tenantScope.dispose();
		}

		console.log();
	}

	// ─── Platform-wide metrics ───

	console.log("── Platform Metrics (cross-tenant) ──");
	const metrics: IMetricsCollector = container.resolve(MetricsToken);

	for (const entry of metrics.report()) {
		console.log(
			`  ${entry.metric} [${Object.entries(entry.tags)
				.map(([k, v]) => `${k}=${v}`)
				.join(", ")}]: ${entry.count}`,
		);
	}

	// Verify data isolation
	console.log("\n── Data Isolation Verification ──");
	const snapshot = container.snapshot();
	console.log(`  Active child scopes after disposal: ${snapshot.childScopeCount}`);
	console.log(`  Singletons alive (shared metrics): ${snapshot.singletonCacheSize}`);

	await container.dispose();
	console.log("\n✓ Example 07 complete");
}

main().catch((error: unknown) => {
	console.error((error as Error).message);
	process.exitCode = 1;
});
