import type { IContainer, IFactory, ILogger, IRegistry } from "@domain/interface";
import type { IBaseContainerOptions, IBaseFactoryOptions, IBaseRegistryOptions, IConsoleLoggerOptions, ICoreFactoryOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { BaseContainer, BaseFactory, BaseRegistry } from "@infrastructure/class/base";
import { CoreFactory } from "@infrastructure/factory";
import { ConsoleLoggerService } from "@infrastructure/service";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { MockRegistry } from "@test-shared/mocks/registry.mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the base classes/services to ensure we test the factory in isolation
vi.mock("@infrastructure/class/base", () => ({
	BaseContainer: vi.fn(),
	BaseError: class MockBaseError extends Error {
		// Need BaseError for potential throws
		public CODE: string;

		constructor(message: string, options: { code: string }) {
			super(message);
			this.CODE = options.code;
		}
	},
	BaseFactory: vi.fn(),
	BaseRegistry: vi.fn(),
}));
vi.mock("@infrastructure/service", () => ({
	ConsoleLoggerService: vi.fn().mockImplementation(() => new MockLogger()), // Use MockLogger when ConsoleLoggerService is requested
}));

describe("CoreFactory", () => {
	let coreFactory: CoreFactory;
	let mockCoreLogger: MockLogger;
	let options: ICoreFactoryOptions;

	const mockContainerInstance = { name: "MockContainer" };
	const mockFactoryInstance = { name: "MockFactory" };
	const mockRegistryInstance = { name: "MockRegistry" };
	const mockLoggerInstance = { name: "MockConsoleLogger" };

	beforeEach(() => {
		vi.clearAllMocks(); // Clear mocks before each test

		// Reset mock implementations
		(BaseContainer as ReturnType<typeof vi.fn>).mockImplementation(() => mockContainerInstance);
		(BaseFactory as ReturnType<typeof vi.fn>).mockImplementation(() => mockFactoryInstance);
		(BaseRegistry as ReturnType<typeof vi.fn>).mockImplementation(() => mockRegistryInstance);
		(ConsoleLoggerService as ReturnType<typeof vi.fn>).mockImplementation(() => mockLoggerInstance);

		mockCoreLogger = new MockLogger();
		options = { logger: mockCoreLogger };
		// Reset singleton instance for isolation - Accessing private static directly is tricky,
		// so we rely on creating a new instance each time for testing.
		// In a real scenario, testing singletons requires careful setup/teardown or alternative patterns.
		coreFactory = new CoreFactory(options);
	});

	afterEach(() => {
		// vi.restoreAllMocks(); // Usually done globally
	});

	describe("constructor", () => {
		it("should store the provided logger", () => {
			expect((coreFactory as any).LOGGER).toBe(mockCoreLogger);
		});

		it("should create a ConsoleLoggerService if no logger is provided", () => {
			const fac = new CoreFactory({});
			expect(ConsoleLoggerService).toHaveBeenCalledTimes(1); // Check if the mock was called
			expect((fac as any).LOGGER).toBe(mockLoggerInstance); // Should get the instance returned by the mock ConsoleLoggerService
		});
	});

	// NOTE: Testing the singleton getInstance static method is complex in isolated unit tests.
	// It often requires manipulating module caches or specific test setups.
	// These tests focus on the instance methods.
	// describe("getInstance (Singleton)", () => { ... });

	describe("createContainer", () => {
		it("should create and return a BaseContainer instance with given options", () => {
			const containerOptions: IBaseContainerOptions = { logger: new MockLogger(), name: Symbol.for("MyTestContainer") };
			const container = coreFactory.createContainer(containerOptions);

			expect(BaseContainer).toHaveBeenCalledTimes(1);
			expect(BaseContainer).toHaveBeenCalledWith(containerOptions);
			expect(container).toBe(mockContainerInstance);
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Creating new container instance" }));
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Container instance created" }));
		});
	});

	describe("createFactory", () => {
		it("should create and return a BaseFactory instance with given options", () => {
			const registry = new MockRegistry<any>();
			const factoryOptions: IBaseFactoryOptions<any> = { logger: new MockLogger(), registry: registry };
			const factory = coreFactory.createFactory(factoryOptions);

			expect(BaseFactory).toHaveBeenCalledTimes(1);
			expect(BaseFactory).toHaveBeenCalledWith(factoryOptions);
			expect(factory).toBe(mockFactoryInstance);
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Creating new factory instance" }));
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Factory instance created" }));
		});
	});

	describe("createLogger", () => {
		it("should create and return a ConsoleLoggerService instance with given options", () => {
			const loggerOptions: IConsoleLoggerOptions = { level: ELoggerLogLevel.ERROR, source: "SpecificSource" };
			const logger = coreFactory.createLogger(loggerOptions);

			expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
			expect(ConsoleLoggerService).toHaveBeenCalledWith(loggerOptions);
			expect(logger).toBe(mockLoggerInstance);
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Creating new logger instance" }));
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Logger instance created" }));
		});
	});

	describe("createRegistry", () => {
		it("should create and return a BaseRegistry instance with given options", () => {
			const registryOptions: IBaseRegistryOptions = { logger: new MockLogger() };
			const registry = coreFactory.createRegistry(registryOptions);

			expect(BaseRegistry).toHaveBeenCalledTimes(1);
			expect(BaseRegistry).toHaveBeenCalledWith(registryOptions);
			expect(registry).toBe(mockRegistryInstance);
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Creating new registry instance" }));
			expect(mockCoreLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Registry instance created" }));
		});
	});
});
