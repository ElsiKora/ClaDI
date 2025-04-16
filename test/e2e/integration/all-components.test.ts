import { afterEach, beforeEach, describe, expect, it } from "vitest";

// @ts-expect-error - Ignore TS errors for e2e tests that use the built package
import { BaseContainer, BaseFactory, BaseRegistry, ConsoleLoggerService, containerRegistry, createContainer, createFactory, createRegistry, Inject, Injectable } from "../../../dist/esm/index.js";

/**
 * Integration E2E tests
 *
 * These tests verify that all components of the ClaDI library work together:
 * 1. Container, Registry, and Factory components integrate properly
 * 2. Decorators for dependency injection work as expected
 * 3. End-to-end dependency chains are resolved correctly
 * 4. The full system behaves as expected in real-world scenarios
 */
import "reflect-metadata";

describe("E2E: All Components Integration", () => {
	// Integration test components
	const CONTAINER_NAME: symbol = Symbol("IntegrationContainer");
	let container: BaseContainer;
	let registry: BaseRegistry<any>;
	let factory: BaseFactory<any>;

	// Logger for components
	const logger: ConsoleLoggerService = new ConsoleLoggerService();

	// Token constants
	const CONFIG_TOKEN: symbol = Symbol("CONFIG");
	const LOGGER_TOKEN: symbol = Symbol("LOGGER");
	const DATABASE_SERVICE_TOKEN: symbol = Symbol("DATABASE_SERVICE");
	const USER_SERVICE_TOKEN: symbol = Symbol("USER_SERVICE");
	const AUTH_SERVICE_TOKEN: symbol = Symbol("AUTH_SERVICE");

	// Test data
	const configData = {
		apiUrl: "https://api.example.com",
		debug: false,
		timeout: 5000,
	};

	// Service classes for testing
	@Injectable(CONTAINER_NAME)
	class DatabaseService {
		constructor(
			@Inject(CONFIG_TOKEN) private readonly config: typeof configData,
			@Inject(LOGGER_TOKEN) private readonly logger: ConsoleLoggerService,
		) {}

		connect() {
			return `Connected to ${this.config.apiUrl}`;
		}

		getConnectionTimeout() {
			return this.config.timeout;
		}

		getLogger() {
			return this.logger;
		}
	}

	@Injectable(CONTAINER_NAME)
	class UserService {
		constructor(
			@Inject(DATABASE_SERVICE_TOKEN) private readonly database: DatabaseService,
			@Inject(LOGGER_TOKEN) private readonly logger: ConsoleLoggerService,
		) {}

		getLogger() {
			return this.logger;
		}

		getUserData() {
			// Demonstrate dependency chain
			return {
				connectionString: this.database.connect(),
				timeout: this.database.getConnectionTimeout(),
			};
		}
	}

	@Injectable(CONTAINER_NAME)
	class AuthService {
		constructor(
			@Inject(USER_SERVICE_TOKEN) private readonly userService: UserService,
			@Inject(CONFIG_TOKEN) private readonly config: typeof configData,
		) {}

		authenticate() {
			const userData = this.userService.getUserData();

			return {
				authenticated: true,
				debugMode: this.config.debug,
				userData,
			};
		}
	}

	// Clean up any existing container before each test
	beforeEach(() => {
		// First make sure any existing registration with this name is removed
		containerRegistry.unregister(CONTAINER_NAME);

		// Create components using utility functions (higher-level API)
		container = createContainer({
			logger,
			name: CONTAINER_NAME,
		});

		registry = createRegistry({
			logger,
		});

		factory = createFactory({
			logger,
			registry,
		});

		// Register dependencies in container
		container.register(CONFIG_TOKEN, configData);
		container.register(LOGGER_TOKEN, logger);
		container.register(DATABASE_SERVICE_TOKEN, DatabaseService);
		container.register(USER_SERVICE_TOKEN, UserService);
		container.register(AUTH_SERVICE_TOKEN, AuthService);

		// Register classes in registry
		registry.register(Symbol("DatabaseService"), DatabaseService);
		registry.register(Symbol("UserService"), UserService);
		registry.register(Symbol("AuthService"), AuthService);
	});

	// Clean up after each test
	afterEach(() => {
		container.clear();
		registry.clear();
		containerRegistry.unregister(CONTAINER_NAME);
	});

	it("should create all components using utility functions", () => {
		expect(container).toBeInstanceOf(BaseContainer);
		expect(registry).toBeInstanceOf(BaseRegistry);
		expect(factory).toBeInstanceOf(BaseFactory);
	});

	it("should resolve a direct dependency using the container", () => {
		const databaseService = container.get<DatabaseService>(DATABASE_SERVICE_TOKEN);

		expect(databaseService).toBeInstanceOf(DatabaseService);
		expect(databaseService.connect()).toBe(`Connected to ${configData.apiUrl}`);
		expect(databaseService.getConnectionTimeout()).toBe(configData.timeout);
		expect(databaseService.getLogger()).toBe(logger);
	});

	it("should resolve a dependency chain with multiple levels", () => {
		const authService = container.get<AuthService>(AUTH_SERVICE_TOKEN);

		expect(authService).toBeInstanceOf(AuthService);

		const authResult = authService.authenticate();

		expect(authResult.authenticated).toBe(true);
		expect(authResult.debugMode).toBe(configData.debug);
		expect(authResult.userData.connectionString).toBe(`Connected to ${configData.apiUrl}`);
		expect(authResult.userData.timeout).toBe(configData.timeout);
	});

	it("should create instances using the factory", () => {
		const databaseServiceSymbol = Symbol("DatabaseService");
		const instance = factory.create(databaseServiceSymbol);

		expect(instance).toBeInstanceOf(DatabaseService);
	});

	it("should demonstrate registry and container working together", () => {
		// Get a class from the registry
		const UserServiceClass = registry.get(Symbol("UserService"));

		// Register it with a new symbol in the container
		const NEW_SERVICE_TOKEN = Symbol("NewService");
		container.register(NEW_SERVICE_TOKEN, UserServiceClass);

		// Get an instance through the container
		const instance = container.get(NEW_SERVICE_TOKEN);

		expect(instance).toBeInstanceOf(UserService);
		expect(instance.getUserData()).toEqual({
			connectionString: `Connected to ${configData.apiUrl}`,
			timeout: configData.timeout,
		});
	});

	it("should handle a complete real-world dependency graph", () => {
		// This test simulates a more complex real-world scenario
		// with multiple services depending on each other

		// Create a new service that depends on multiple other services
		@Injectable(CONTAINER_NAME)
		class ApiService {
			constructor(
				@Inject(DATABASE_SERVICE_TOKEN) private readonly database: DatabaseService,
				@Inject(USER_SERVICE_TOKEN) private readonly users: UserService,
				@Inject(AUTH_SERVICE_TOKEN) private readonly auth: AuthService,
				@Inject(CONFIG_TOKEN) private readonly config: typeof configData,
			) {}

			getSystemStatus() {
				return {
					allServicesOperational: true,
					authServiceActive: !!this.auth,
					configLoaded: !!this.config,
					databaseUrl: this.database.connect(),
					userServiceActive: !!this.users,
				};
			}
		}

		// Register this new service
		const API_SERVICE_TOKEN = Symbol("API_SERVICE");
		container.register(API_SERVICE_TOKEN, ApiService);

		// Resolve the service with its entire dependency graph
		const apiService = container.get<ApiService>(API_SERVICE_TOKEN);

		// Verify the service works and has all its dependencies
		const status = apiService.getSystemStatus();

		expect(status.databaseUrl).toBe(`Connected to ${configData.apiUrl}`);
		expect(status.userServiceActive).toBe(true);
		expect(status.authServiceActive).toBe(true);
		expect(status.configLoaded).toBe(true);
		expect(status.allServicesOperational).toBe(true);
	});
});
