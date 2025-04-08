import type { ILogger } from "@domain/interface";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseContainer, BaseError } from "@infrastructure/class/base";

// Mock Logger
const mockLogger: ILogger = {
	debug: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	trace: vi.fn(),
	warn: vi.fn(),
};

// Define some service types and tokens for testing
interface IServiceA {
	operationA(): string;
}
interface IServiceB {
	operationB(): number;
}

const ServiceAToken = Symbol("ServiceA");
const ServiceBToken = Symbol("ServiceB");
const NonExistentToken = Symbol("NonExistent");

describe("BaseContainer", () => {
	let container: BaseContainer;
	let serviceAInstance: IServiceA;
	let serviceBInstance: IServiceB;

	beforeEach(() => {
		vi.clearAllMocks();
		container = new BaseContainer({ logger: mockLogger });

		serviceAInstance = { operationA: () => "Result A" };
		serviceBInstance = { operationB: () => 123 };
	});

	it("should be defined", () => {
		expect(container).toBeDefined();
	});

	it("constructor should use default logger if logger is undefined", () => {
		// Test the class constructor directly
		const containerInstance = new BaseContainer({ logger: undefined });
		expect(containerInstance).toBeDefined();
		// We can't easily check the *instance* of the default logger was created
		// without exposing it, but we ensure constructor doesn't crash.
	});

	describe("register", () => {
		it("should register a dependency successfully", () => {
			container.register(ServiceAToken, serviceAInstance);
			expect(container.has(ServiceAToken)).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Registering dependency with token: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency registered successfully: ${String(ServiceAToken.description)}`, { source: "Container" });
		});

		it("should throw error if registering with an existing token", () => {
			container.register(ServiceAToken, serviceAInstance);
			const anotherInstance = { operationA: () => "Another A" };
			expect(() => {
				container.register(ServiceAToken, anotherInstance);
			}).toThrow(BaseError);
			expect(() => {
				container.register(ServiceAToken, anotherInstance);
			}).toThrow("Dependency already exists in container");
		});

		it("should throw error if registering with a null or undefined token", () => {
			expect(() => {
				container.register(null as any, serviceAInstance);
			}).toThrow("Token cannot be null or undefined");
			expect(() => {
				container.register(undefined as any, serviceAInstance);
			}).toThrow("Token cannot be null or undefined");
		});

		// Although implementation can be anything, test with null/undefined for completeness
		it("should allow registering null or undefined implementation", () => {
			expect(() => {
				container.register(ServiceAToken, null);
			}).not.toThrow();
			expect(container.has(ServiceAToken)).toBe(true);
			expect(container.get(ServiceAToken)).toBeNull();

			expect(() => {
				container.register(ServiceBToken);
			}).not.toThrow();
			expect(container.has(ServiceBToken)).toBe(true);
			expect(container.get(ServiceBToken)).toBeUndefined();
		});
	});

	describe("get", () => {
		beforeEach(() => {
			container.register(ServiceAToken, serviceAInstance);
			container.register(Symbol("NullService"), null);
			vi.clearAllMocks();
		});

		it("should return the dependency instance if token exists", () => {
			const retrieved = container.get<IServiceA>(ServiceAToken);
			expect(retrieved).toBe(serviceAInstance);
			expect(retrieved?.operationA()).toBe("Result A");
			expect(mockLogger.debug).toHaveBeenCalledWith(`Getting dependency with token: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency found: ${String(ServiceAToken.description)}`, { source: "Container" });
		});

		it("should return undefined if token does not exist", () => {
			const retrieved = container.get<IServiceB>(NonExistentToken);
			expect(retrieved).toBeUndefined();
			expect(mockLogger.debug).toHaveBeenCalledWith(`Getting dependency with token: ${String(NonExistentToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency not found: ${String(NonExistentToken.description)}`, { source: "Container" });
		});

		it("should return null if the registered implementation was null", () => {
			const retrieved = container.get<null>(Symbol.for("NullService")); // Need to re-fetch symbol if not stored
			// Note: Direct comparison with Symbol("NullService") won't work unless symbol is shared/global
			// Better to retrieve all and find or register/get in same test block if specific symbol needed.
			// For this test, let's re-register and get to ensure we use the *exact* same symbol:
			const NullToken = Symbol("NullService");
			container.register(NullToken, null);
			const retrievedDirect = container.get<null>(NullToken);
			expect(retrievedDirect).toBeNull();
		});

		it("should return undefined and log warning if token is null or undefined", () => {
			expect(container.get(null as any)).toBeUndefined();
			expect(mockLogger.warn).toHaveBeenCalledWith("Attempted to get dependency with empty token", { source: "Container" });
			vi.clearAllMocks();
			expect(container.get(undefined as any)).toBeUndefined();
			expect(mockLogger.warn).toHaveBeenCalledWith("Attempted to get dependency with empty token", { source: "Container" });
		});
	});

	describe("has", () => {
		beforeEach(() => {
			container.register(ServiceAToken, serviceAInstance);
			vi.clearAllMocks();
		});

		it("should return true if token exists", () => {
			expect(container.has(ServiceAToken)).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Checking if dependency exists: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency exists: ${String(ServiceAToken.description)}`, { source: "Container" });
		});

		it("should return false if token does not exist", () => {
			expect(container.has(NonExistentToken)).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Checking if dependency exists: ${String(NonExistentToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency does not exist: ${String(NonExistentToken.description)}`, { source: "Container" });
		});

		it("should return false if token is null or undefined", () => {
			expect(container.has(null as any)).toBe(false);
			expect(container.has(undefined as any)).toBe(false);
			// Check logs were not spammed for null/undefined check
			expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining("null"), { source: "Container" });
			expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining("undefined"), { source: "Container" });
		});
	});

	describe("unregister", () => {
		beforeEach(() => {
			container.register(ServiceAToken, serviceAInstance);
			vi.clearAllMocks();
		});

		it("should remove an existing dependency", () => {
			expect(container.has(ServiceAToken)).toBe(true);
			container.unregister(ServiceAToken);
			expect(container.has(ServiceAToken)).toBe(false);
			expect(container.get(ServiceAToken)).toBeUndefined();
			expect(mockLogger.debug).toHaveBeenCalledWith(`Unregistering dependency with token: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency unregistered successfully: ${String(ServiceAToken.description)}`, { source: "Container" });
		});

		it("should not throw if unregistering a non-existent token but log it", () => {
			expect(() => {
				container.unregister(NonExistentToken);
			}).not.toThrow();
			expect(container.has(NonExistentToken)).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Unregistering dependency with token: ${String(NonExistentToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency not found for unregistering: ${String(NonExistentToken.description)}`, { source: "Container" });
		});

		it("should throw error if unregistering with a null or undefined token", () => {
			expect(() => {
				container.unregister(null as any);
			}).toThrow("Token cannot be null or undefined");
			expect(() => {
				container.unregister(undefined as any);
			}).toThrow("Token cannot be null or undefined");
		});
	});

	describe("clear", () => {
		it("should remove all dependencies", () => {
			container.register(ServiceAToken, serviceAInstance);
			container.register(ServiceBToken, serviceBInstance);
			expect(container.has(ServiceAToken)).toBe(true);
			expect(container.has(ServiceBToken)).toBe(true);
			vi.clearAllMocks();

			container.clear();

			expect(container.has(ServiceAToken)).toBe(false);
			expect(container.has(ServiceBToken)).toBe(false);
			expect(container.get(ServiceAToken)).toBeUndefined();
			expect(container.get(ServiceBToken)).toBeUndefined();
			expect(mockLogger.debug).toHaveBeenCalledWith("Clearing all dependencies from container", { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Container cleared successfully", { source: "Container" });
		});
	});

	describe("getAll", () => {
		it("should return all registered dependencies", () => {
			container.register(ServiceAToken, serviceAInstance);
			container.register(ServiceBToken, serviceBInstance);
			vi.clearAllMocks();

			const allDeps = container.getAll();

			expect(allDeps).toHaveLength(2);
			expect(allDeps).toEqual(expect.arrayContaining([serviceAInstance, serviceBInstance]));
			expect(mockLogger.debug).toHaveBeenCalledWith("Getting all dependencies", { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Retrieved ${allDeps.length} dependencies`, { source: "Container" });
		});

		it("should return an empty array if container is empty", () => {
			const allDeps = container.getAll();
			expect(allDeps).toHaveLength(0);
		});
	});

	describe("getMany", () => {
		beforeEach(() => {
			container.register(ServiceAToken, serviceAInstance);
			container.register(ServiceBToken, serviceBInstance);
			vi.clearAllMocks();
		});

		it("should return the specified dependencies", () => {
			const tokens = [ServiceAToken, ServiceBToken];
			const retrieved = container.getMany<IServiceA | IServiceB>(tokens);
			expect(retrieved).toHaveLength(2);
			expect(retrieved).toEqual(expect.arrayContaining([serviceAInstance, serviceBInstance]));
			expect(mockLogger.debug).toHaveBeenCalledWith(`Getting ${tokens.length} dependencies by token`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Retrieved ${retrieved.length} dependencies`, { source: "Container" });
		});

		it("should return only existing dependencies", () => {
			const tokens = [ServiceAToken, NonExistentToken, ServiceBToken];
			const retrieved = container.getMany<IServiceA | IServiceB>(tokens);
			expect(retrieved).toHaveLength(2);
			expect(retrieved).toEqual(expect.arrayContaining([serviceAInstance, serviceBInstance]));
		});

		it("should return an empty array if no tokens match", () => {
			const tokens = [NonExistentToken, Symbol("AnotherMissing")];
			const retrieved = container.getMany<any>(tokens);
			expect(retrieved).toHaveLength(0);
		});

		it("should throw error if tokens is null or undefined", () => {
			expect(() => container.getMany(null as any)).toThrow("Tokens cannot be null or undefined");
			expect(() => container.getMany(undefined as any)).toThrow("Tokens cannot be null or undefined");
		});

		it("should throw error if tokens is not an array", () => {
			expect(() => container.getMany(ServiceAToken as any)).toThrow("Tokens must be an array");
		});
	});

	describe("registerMany", () => {
		it("should register multiple dependencies successfully", () => {
			const tokens = [ServiceAToken, ServiceBToken];

			const implementations = {
				[ServiceAToken]: serviceAInstance,
				[ServiceBToken]: serviceBInstance,
			};
			container.registerMany(tokens, implementations);
			expect(container.has(ServiceAToken)).toBe(true);
			expect(container.has(ServiceBToken)).toBe(true);
			expect(container.get(ServiceAToken)).toBe(serviceAInstance);
			expect(container.get(ServiceBToken)).toBe(serviceBInstance);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Registering ${tokens.length} dependencies`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency registered successfully: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency registered successfully: ${String(ServiceBToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`${tokens.length} dependencies registered successfully`, { source: "Container" });
		});

		it("should throw error if any token already exists", () => {
			container.register(ServiceAToken, serviceAInstance); // Pre-register one
			const tokens = [ServiceBToken, ServiceAToken]; // Try to register A again

			const implementations = {
				[ServiceAToken]: serviceAInstance,
				[ServiceBToken]: serviceBInstance,
			};
			expect(() => {
				container.registerMany(tokens, implementations);
			}).toThrow("Dependency already exists in container");
		});

		it("should throw error if tokens array is null or undefined", () => {
			const implementations = { [ServiceAToken]: serviceAInstance };
			expect(() => {
				container.registerMany(null as any, implementations);
			}).toThrow("Tokens cannot be null or undefined");
			expect(() => {
				container.registerMany(undefined as any, implementations);
			}).toThrow("Tokens cannot be null or undefined");
		});

		it("should throw error if tokens is not an array", () => {
			const implementations = { [ServiceAToken]: serviceAInstance };
			expect(() => {
				container.registerMany({} as any, implementations);
			}).toThrow("Tokens must be an array");
		});

		// Test behavior when implementation is missing
		it("should register undefined if implementation is missing for a token", () => {
			const tokens = [ServiceAToken];
			const implementations = {}; // Missing implementation for ServiceAToken
			expect(() => {
				container.registerMany(tokens, implementations);
			}).not.toThrow();
			expect(container.has(ServiceAToken)).toBe(true);
			expect(container.get(ServiceAToken)).toBeUndefined();
		});
	});

	describe("unregisterMany", () => {
		beforeEach(() => {
			container.register(ServiceAToken, serviceAInstance);
			container.register(ServiceBToken, serviceBInstance);
			vi.clearAllMocks();
		});

		it("should unregister multiple specified dependencies", () => {
			const tokensToUnregister = [ServiceAToken, ServiceBToken];
			container.unregisterMany(tokensToUnregister);
			expect(container.has(ServiceAToken)).toBe(false);
			expect(container.has(ServiceBToken)).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Unregistering ${tokensToUnregister.length} dependencies`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency unregistered successfully: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency unregistered successfully: ${String(ServiceBToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`${tokensToUnregister.length} dependencies unregistered`, { source: "Container" });
		});

		it("should handle non-existent tokens gracefully", () => {
			const tokensToUnregister = [ServiceAToken, NonExistentToken];
			container.unregisterMany(tokensToUnregister);
			expect(container.has(ServiceAToken)).toBe(false);
			expect(container.has(ServiceBToken)).toBe(true); // B should remain
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency unregistered successfully: ${String(ServiceAToken.description)}`, { source: "Container" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Dependency not found for unregistering: ${String(NonExistentToken.description)}`, { source: "Container" });
		});

		it("should throw error if tokens is null or undefined", () => {
			expect(() => {
				container.unregisterMany(null as any);
			}).toThrow("Tokens cannot be null or undefined");
			expect(() => {
				container.unregisterMany(undefined as any);
			}).toThrow("Tokens cannot be null or undefined");
		});

		it("should throw error if tokens is not an array", () => {
			expect(() => {
				container.unregisterMany({} as any);
			}).toThrow("Tokens must be an array");
		});

		it("should throw error if any token in the array is null/undefined", () => {
			const tokensToUnregister = [ServiceAToken, null as any];
			// Error comes from the nested unregister call
			expect(() => {
				container.unregisterMany(tokensToUnregister);
			}).toThrow("Token cannot be null or undefined");
		});
	});
});
