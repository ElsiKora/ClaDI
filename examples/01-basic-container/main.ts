/**
 * Example 01: Basic Container
 *
 * Demonstrates fundamental ClaDI concepts:
 * - Creating tokens for dependency identification
 * - Registering value, factory, and class providers
 * - Resolving dependencies from the container
 * - Optional resolution for missing providers
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, Token } from "@elsikora/cladi";

// ─── Domain Interfaces ───

interface IAppConfig {
	appName: string;
	debug: boolean;
	version: string;
}

interface ILogger {
	info(message: string): void;
	warn(message: string): void;
}

interface IGreetingService {
	greet(name: string): string;
}

interface IUserRepository {
	findById(id: number): { id: number; name: string } | undefined;
}

// ─── Tokens ───

const AppConfigToken: Token<IAppConfig> = createToken<IAppConfig>("AppConfig");
const LoggerToken: Token<ILogger> = createToken<ILogger>("Logger");
const GreetingServiceToken: Token<IGreetingService> = createToken<IGreetingService>("GreetingService");
const UserRepositoryToken: Token<IUserRepository> = createToken<IUserRepository>("UserRepository");
const MissingServiceToken: Token<unknown> = createToken<unknown>("MissingService");

// ─── Implementations ───

class ConsoleLogger implements ILogger {
	constructor(private readonly config: IAppConfig) {}

	info(message: string): void {
		if (this.config.debug) {
			console.log(`[INFO] [${this.config.appName}] ${message}`);
		}
	}

	warn(message: string): void {
		console.warn(`[WARN] [${this.config.appName}] ${message}`);
	}
}

class GreetingService implements IGreetingService {
	constructor(private readonly logger: ILogger) {}

	greet(name: string): string {
		const message = `Hello, ${name}! Welcome aboard.`;
		this.logger.info(`Generated greeting for "${name}"`);

		return message;
	}
}

// ─── Bootstrap ───

function main(): void {
	console.log("=== Example 01: Basic Container ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "basic-example" });

	// Value provider — static config object
	container.register({
		provide: AppConfigToken,
		useValue: { appName: "MyApp", debug: true, version: "1.0.0" },
	});

	// Factory provider — logger that depends on config
	container.register({
		deps: [AppConfigToken] as const,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: LoggerToken,
		useFactory: (config: IAppConfig) => new ConsoleLogger(config),
	});

	// Class provider — greeting service that depends on logger
	container.register({
		deps: [LoggerToken] as const,
		provide: GreetingServiceToken,
		useClass: GreetingService,
	});

	// Factory provider — in-memory user repository
	container.register({
		deps: [LoggerToken] as const,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: UserRepositoryToken,
		useFactory: (logger: ILogger): IUserRepository => {
			const users = [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
			];

			logger.info(`UserRepository initialized with ${users.length} users`);

			return {
				findById: (id: number) => users.find((u) => u.id === id),
			};
		},
	});

	// ─── Resolve & Use ───

	const config: IAppConfig = container.resolve(AppConfigToken);
	console.log(`App: ${config.appName} v${config.version}\n`);

	const greetingService: IGreetingService = container.resolve(GreetingServiceToken);
	console.log(greetingService.greet("Developer"));

	const userRepo: IUserRepository = container.resolve(UserRepositoryToken);
	const user = userRepo.findById(2);
	console.log(`Found user: ${user?.name ?? "not found"}\n`);

	// Optional resolution — returns undefined instead of throwing
	const missing: unknown = container.resolveOptional(MissingServiceToken);
	console.log(`Optional resolution for unregistered token: ${missing ?? "undefined (expected)"}\n`);

	// Check if tokens are registered
	console.log(`Has AppConfig: ${container.has(AppConfigToken)}`);
	console.log(`Has MissingService: ${container.has(MissingServiceToken)}`);

	console.log("\n✓ Example 01 complete");
}

main();
