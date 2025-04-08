import type { ILogger } from "@domain/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IBaseContainerOptions, IBaseFactoryOptions, IBaseRegistryOptions, IConsoleLoggerOptions, ICoreFactoryOptions } from "@infrastructure/interface";
import { CoreFactory } from "@infrastructure/factory";
import { BaseContainer, BaseFactory as BaseItemFactory } from "@infrastructure/class/base";
import { BaseRegistry } from "@infrastructure/class/base";
import { ConsoleLoggerService } from "@infrastructure/service";

// Mock Logger for CoreFactory internal use
const mockCoreLogger: ILogger = {
	debug: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	trace: vi.fn(),
	warn: vi.fn(),
};

// Mock classes (optional, but can help isolate CoreFactory logic)
vi.mock("@infrastructure/class/base/container.class", () => ({
	BaseContainer: vi.fn().mockImplementation((options) => ({ __type: "MockContainer", options })),
}));
vi.mock("@infrastructure/class/base/factory.class", () => ({
	BaseFactory: vi.fn().mockImplementation((options) => ({ __type: "MockItemFactory", options })),
}));
vi.mock("@infrastructure/class/base/registry.class", () => ({
	BaseRegistry: vi.fn().mockImplementation((options) => ({ __type: "MockRegistry", options })),
}));
vi.mock("@infrastructure/service/console-logger.service", () => ({
	ConsoleLoggerService: vi.fn().mockImplementation((options) => ({
		__type: "MockLogger",
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		options,
		trace: vi.fn(),
		warn: vi.fn(),
	})),
}));

describe("CoreFactory", () => {
	let coreFactory: CoreFactory;
	const coreFactoryOptions: ICoreFactoryOptions = { logger: mockCoreLogger };

	// Hacky way to reset singleton instance before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Resetting static instance requires careful handling or specific test setup.
		// For simplicity here, we assume direct access/reset or test framework features handle it.
		// If CoreFactory wasn't easily resettable, testing singleton might need module mocking workarounds.
		// A cleaner approach might involve making getInstance resettable for tests.
		(CoreFactory as any).instance = undefined; // Reset static instance (use with caution)
		coreFactory = CoreFactory.getInstance(coreFactoryOptions);
	});

	it("should be defined", () => {
		expect(coreFactory).toBeDefined();
	});

	describe("getInstance (Singleton)", () => {
		it("should return the same instance on subsequent calls", () => {
			const instance1 = CoreFactory.getInstance(coreFactoryOptions);
			const instance2 = CoreFactory.getInstance(coreFactoryOptions);
			expect(instance1).toBe(instance2);
		});

		it("should use provided options on first call and ignore on subsequent calls", () => {
			const initialOptions = { logger: mockCoreLogger };
			const instance1 = CoreFactory.getInstance(initialOptions);

			const differentLogger = { debug: vi.fn() } as any as ILogger;
			const secondOptions = { logger: differentLogger };
			const instance2 = CoreFactory.getInstance(secondOptions);

			expect(instance1).toBe(instance2);
			// Check that the logger used internally is still the first one
			instance1.createContainer({ logger: mockCoreLogger }); // Trigger internal logger usage
			expect(mockCoreLogger.debug).toHaveBeenCalled();
			expect(differentLogger.debug).not.toHaveBeenCalled();
		});

		it("should create a default ConsoleLoggerService if no logger is provided in options", () => {
			(CoreFactory as any).instance = undefined; // Reset
			const factory = CoreFactory.getInstance({}); // Empty options
			expect(factory).toBeDefined();
			// Difficult to directly assert the default logger was created without exposing it.
			// Indirectly check by ensuring methods don't crash & mocks aren't called
			expect(() => factory.createContainer({})).not.toThrow();
			expect(mockCoreLogger.debug).not.toHaveBeenCalled();
		});
	});

	describe("createContainer", () => {
		it("should create a BaseContainer instance with provided options", () => {
			const containerOptions: IBaseContainerOptions = { logger: mockCoreLogger }; // Example options
			const container = coreFactory.createContainer(containerOptions);

			expect(BaseContainer).toHaveBeenCalledTimes(1);
			expect(BaseContainer).toHaveBeenCalledWith(containerOptions);
			// Check if the mock implementation received the options
			expect((container as any).options).toEqual(containerOptions);
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Creating new container instance", { source: "InfrastructureFactory" });
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Container instance created", { source: "InfrastructureFactory" });
		});
	});

	describe("createFactory (Item Factory)", () => {
		it("should create a BaseItemFactory instance with provided options", () => {
			const mockRegistry = { get: vi.fn() } as any;
			const factoryOptions: IBaseFactoryOptions<any> = { logger: mockCoreLogger, registry: mockRegistry };
			const itemFactory = coreFactory.createFactory(factoryOptions);

			expect(BaseItemFactory).toHaveBeenCalledTimes(1);
			expect(BaseItemFactory).toHaveBeenCalledWith(factoryOptions);
			expect((itemFactory as any).options).toEqual(factoryOptions);
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Creating new factory instance", { source: "InfrastructureFactory" });
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Factory instance created", { source: "InfrastructureFactory" });
		});
	});

	describe("createRegistry", () => {
		it("should create a BaseRegistry instance with provided options", () => {
			const registryOptions: IBaseRegistryOptions = { logger: mockCoreLogger };
			const registry = coreFactory.createRegistry(registryOptions);

			expect(BaseRegistry).toHaveBeenCalledTimes(1);
			expect(BaseRegistry).toHaveBeenCalledWith(registryOptions);
			expect((registry as any).options).toEqual(registryOptions);
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Creating new registry instance", { source: "InfrastructureFactory" });
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Registry instance created", { source: "InfrastructureFactory" });
		});
	});

	describe("createLogger", () => {
		it("should create a ConsoleLoggerService instance with provided options", () => {
			const loggerOptions: IConsoleLoggerOptions = { level: ELoggerLogLevel.WARN, source: "TestLogger" };
			const logger = coreFactory.createLogger(loggerOptions);

			expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
			expect(ConsoleLoggerService).toHaveBeenCalledWith(loggerOptions);
			expect((logger as any).options).toEqual(loggerOptions);
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Creating new logger instance", expect.anything());
			expect(mockCoreLogger.debug).toHaveBeenCalledWith("Logger instance created", { source: "InfrastructureFactory" });
		});
	});
});
