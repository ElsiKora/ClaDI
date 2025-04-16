import { afterEach, beforeEach, describe, expect, it } from "vitest";

// @ts-expect-error - Ignore TS errors for e2e tests that use the built package
import { BaseContainer, BaseError, ConsoleLoggerService, containerRegistry, ELoggerLogLevel } from "../../../../../dist/esm/index.js";

/**
 * E2E tests for BaseContainer
 *
 * These tests differ from unit tests in several ways:
 * 1. They use the actual built package (from dist/esm) rather than source files
 * 2. They test end-to-end functionality with real dependencies
 * 3. They validate that all dependencies work together as expected
 *
 * For e2e tests, we use factory functions rather than decorators for dependency
 * injection to ensure compatibility regardless of build process changes.
 */
import "reflect-metadata";

// Type imports
interface IContainerDynamicFactoryResolutionContext {
	container: any;
}

describe("E2E: BaseContainer", () => {
	// Test container instance
	const containerName = Symbol("E2ETestContainer");
	let container: BaseContainer;

	// Test dependencies to register
	const USER_TOKEN = Symbol("USER");
	const CONFIG_TOKEN = Symbol("CONFIG");
	const LOGGER_TOKEN = Symbol("LOGGER");
	const API_CLIENT_TOKEN = Symbol("API_CLIENT");

	// Test data
	const userData = { id: 1, username: "test_user" };
	const configData = { apiUrl: "https://api.example.com", timeout: 5000 };

	// Create logger instance
	const logger = new ConsoleLoggerService({ level: ELoggerLogLevel.INFO });

	// Setup helper classes for testing DI
	// We use plain classes instead of decorated ones for E2E tests
	class ApiClient {
		private readonly config: typeof configData;

		private readonly logger: ConsoleLoggerService;

		constructor(config: typeof configData, logger: ConsoleLoggerService) {
			this.config = config;
			this.logger = logger;
		}

		getBaseUrl() {
			return this.config.apiUrl;
		}

		getLogger() {
			return this.logger;
		}
	}

	class UserService {
		private readonly apiClient: ApiClient;

		private readonly user: typeof userData;

		constructor(user: typeof userData, apiClient: ApiClient) {
			this.user = user;
			this.apiClient = apiClient;
		}

		getUserWithApiInfo() {
			return {
				...this.user,
				apiUrl: this.apiClient.getBaseUrl(),
			};
		}
	}

	beforeEach(() => {
		// Create a fresh container for each test
		container = new BaseContainer({
			logger: logger,
			name: containerName,
		});

		// Register base dependencies
		container.register(USER_TOKEN, userData);
		container.register(CONFIG_TOKEN, configData);
		container.register(LOGGER_TOKEN, logger);

		// Create a factory function for ApiClient
		const apiClientFactory = ({ container }: IContainerDynamicFactoryResolutionContext) => {
			const config = container.get(CONFIG_TOKEN);
			const logger = container.get(LOGGER_TOKEN);

			return new ApiClient(config, logger);
		};

		// Remove prototype to make it work as a factory function
		Object.defineProperty(apiClientFactory, "prototype", { value: undefined });

		// Register the factory
		container.register(API_CLIENT_TOKEN, apiClientFactory);
	});

	afterEach(() => {
		// Clean up
		container.clear();
		containerRegistry.unregister(containerName);
	});

	it("should create a container instance from the distribution build", () => {
		expect(container).toBeInstanceOf(BaseContainer);
		expect(containerRegistry.has(containerName)).toBe(true);
	});

	it("should retrieve registered dependencies", () => {
		expect(container.get(USER_TOKEN)).toEqual(userData);
		expect(container.get(CONFIG_TOKEN)).toEqual(configData);
		expect(container.get(LOGGER_TOKEN)).toBeInstanceOf(ConsoleLoggerService);
	});

	it("should resolve dependencies through factory functions", () => {
		const apiClient = container.get(API_CLIENT_TOKEN);

		expect(apiClient).toBeInstanceOf(ApiClient);
		expect(apiClient.getBaseUrl()).toBe(configData.apiUrl);
		expect(apiClient.getLogger()).toBe(logger);
	});

	it("should resolve nested dependencies through the full dependency chain", () => {
		// Create a factory function for UserService
		const userServiceFactory = ({ container }: IContainerDynamicFactoryResolutionContext) => {
			const user = container.get(USER_TOKEN);
			const apiClient = container.get(API_CLIENT_TOKEN);

			return new UserService(user, apiClient);
		};

		// Remove prototype to make it work as a factory function
		Object.defineProperty(userServiceFactory, "prototype", { value: undefined });

		// Register UserService factory
		const USER_SERVICE_TOKEN = Symbol("USER_SERVICE");
		container.register(USER_SERVICE_TOKEN, userServiceFactory);

		// Get UserService instance with all its dependencies resolved
		const userService = container.get(USER_SERVICE_TOKEN);

		// Check if it's properly constructed
		expect(userService).toBeInstanceOf(UserService);

		// Check if nested dependencies were properly injected
		const userWithApiInfo = userService.getUserWithApiInfo();
		expect(userWithApiInfo).toEqual({
			...userData,
			apiUrl: configData.apiUrl,
		});
	});

	it("should throw error when dependency is not found", () => {
		const MISSING_TOKEN = Symbol("MISSING");

		expect(() => container.get(MISSING_TOKEN)).toThrow(BaseError);
		expect(() => container.get(MISSING_TOKEN)).toThrow(/Dependency not found/);
	});

	it("should handle different registration and resolution scenarios", () => {
		// Clear previous registrations
		container.clear();

		// Register dependencies using different methods

		// 1. Direct value
		container.register(USER_TOKEN, userData);
		container.register(CONFIG_TOKEN, configData);

		// 2. Instance of a class
		const loggerInstance = new ConsoleLoggerService({ level: ELoggerLogLevel.DEBUG });
		container.register(LOGGER_TOKEN, loggerInstance);

		// 3. Factory function
		const apiClientFactory = ({ container }: IContainerDynamicFactoryResolutionContext) => {
			const config = container.get(CONFIG_TOKEN);
			const logger = container.get(LOGGER_TOKEN);

			return new ApiClient(config, logger);
		};

		// Remove prototype to make it work as a factory function
		Object.defineProperty(apiClientFactory, "prototype", { value: undefined });
		container.register(API_CLIENT_TOKEN, apiClientFactory);

		// Now resolve API client which uses multiple dependencies
		const apiClient = container.get(API_CLIENT_TOKEN);

		// Verify everything works
		expect(apiClient).toBeInstanceOf(ApiClient);
		expect(apiClient.getBaseUrl()).toBe(configData.apiUrl);
		expect(apiClient.getLogger()).toBe(loggerInstance);
	});
});
