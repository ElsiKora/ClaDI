import type { IContainer } from "@domain/interface";
import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseContainer, BaseError } from "@infrastructure/class/base";
import { containerRegistry } from "@infrastructure/registry";
import { DECORATOR_TOKENS_CONSTANT } from "@infrastructure/constant";
import { TEST_TOKENS } from "@test-shared/constants/test-tokens";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import "reflect-metadata";

// Mock container registry
vi.mock("@infrastructure/registry", () => ({
	containerRegistry: {
		get: vi.fn(),
		register: vi.fn(),
	},
}));

// Test data
const containerName = TEST_TOKENS.Container;

// Helper for creating test classes with decorators
const createInjectableClass = (containerSymbol: symbol) => {
	class TestClass {
		constructor() {}
	}

	// Simulate the @Injectable decorator
	Reflect.defineMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, containerSymbol, TestClass);
	Reflect.defineMetadata("design:paramtypes", [], TestClass);

	return TestClass;
};

// Helper for creating injectable class with dependencies
const createInjectableClassWithDeps = (containerSymbol: symbol, injectTokens: Array<symbol>) => {
	class TestClassWithDeps {
		constructor(...deps: Array<unknown>) {
			// Store injected dependencies
			Object.assign(this, { deps });
		}
	}

	// Simulate the @Injectable decorator
	Reflect.defineMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, containerSymbol, TestClassWithDeps);

	// Mock constructor parameters metadata
	Reflect.defineMetadata("design:paramtypes", Array.from({ length: injectTokens.length }).fill(Object), TestClassWithDeps);

	// Create injection map (simulates @Inject decorators)
	const injectionMap = new Map<number, symbol>();

	for (const [index, token] of injectTokens.entries()) {
		injectionMap.set(index, token);
	}

	Reflect.defineMetadata(DECORATOR_TOKENS_CONSTANT.INJECT_TOKEN_KEY, injectionMap, TestClassWithDeps);

	return TestClassWithDeps;
};

describe("BaseContainer", () => {
	let container: IContainer;
	let mockLogger: MockLogger;

	beforeEach(() => {
		// Create a fresh MockLogger for each test
		mockLogger = new MockLogger();

		container = new BaseContainer({
			logger: mockLogger,
			name: containerName,
		});

		// Reset mocks
		vi.clearAllMocks();

		// Mock containerRegistry.get to return our container
		(containerRegistry.get as Mock).mockImplementation((name: symbol) => {
			if (name === containerName) {
				return container;
			}

			return;
		});
	});

	afterEach(() => {
		container.clear();
		mockLogger.reset();
	});

	it("should create a new instance with name and logger", () => {
		const options: IBaseContainerOptions = {
			logger: mockLogger,
			name: Symbol("OtherContainer"),
		};

		const newContainer = new BaseContainer(options);

		expect(newContainer).toBeInstanceOf(BaseContainer);
		expect(newContainer).toBeInstanceOf(Object);
		expect(containerRegistry.register).toHaveBeenCalledWith(options.name, expect.any(BaseContainer));
	});

	it("should register and retrieve a dependency", () => {
		const tokenSymbol = Symbol("testDependency");
		const testValue = { prop: "value" };

		container.register(tokenSymbol, testValue);
		const result = container.get(tokenSymbol);

		expect(result).toEqual(testValue);

		// Use the mock logger's getCalls method to check logging
		const debugCalls = mockLogger.getCalls("debug");
		expect(debugCalls).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining(`Getting dependency with token: ${String(tokenSymbol.description)}`),
				options: expect.objectContaining({ source: "Container" }),
			}),
		);
	});

	it("should throw an error when retrieving a non-existent dependency", () => {
		const nonExistentToken = Symbol("nonExistentToken");

		expect(() => container.get(nonExistentToken)).toThrow(BaseError);
		expect(() => container.get(nonExistentToken)).toThrow(/Dependency not found/);

		// Check that a warning was logged
		const warnCalls = mockLogger.getCalls("warn");
		expect(warnCalls).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining(`Dependency not found for token "${String(nonExistentToken.description)}"`),
				options: expect.objectContaining({ source: "Container" }),
			}),
		);
	});

	it("should check if a dependency exists", () => {
		const tokenSymbol = Symbol("existingDependency");
		const testValue = "test-value";

		container.register(tokenSymbol, testValue);

		expect(container.has(tokenSymbol)).toBe(true);
		expect(container.has(Symbol("nonExistent"))).toBe(false);
	});

	it("should throw an error when registering a duplicate dependency", () => {
		const tokenSymbol = Symbol("duplicateDependency");

		container.register(tokenSymbol, "value1");

		expect(() => {
			container.register(tokenSymbol, "value2");
		}).toThrow(BaseError);
		expect(() => {
			container.register(tokenSymbol, "value2");
		}).toThrow(/Dependency already exists/);
	});

	it("should register and retrieve multiple dependencies", () => {
		const token1 = Symbol("dep1");
		const token2 = Symbol("dep2");
		const value1 = "value1";
		const value2 = "value2";

		container.registerMany([token1, token2], {
			[token1]: value1,
			[token2]: value2,
		});

		const results = container.getMany([token1, token2]);

		expect(results).toHaveLength(2);
		expect(results).toContain(value1);
		expect(results).toContain(value2);

		// Check debug logs to verify registration happened
		const debugCalls = mockLogger.getCalls("debug");
		expect(debugCalls).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining(`Attempting to register ${String([token1, token2].length)} dependencies`),
				options: expect.objectContaining({ source: "Container" }),
			}),
		);
	});

	it("should unregister a dependency", () => {
		const tokenSymbol = Symbol("toBeRemoved");

		container.register(tokenSymbol, "someValue");
		expect(container.has(tokenSymbol)).toBe(true);

		container.unregister(tokenSymbol);
		expect(container.has(tokenSymbol)).toBe(false);
	});

	it("should unregister multiple dependencies", () => {
		const token1 = Symbol("toRemove1");
		const token2 = Symbol("toRemove2");

		container.register(token1, "value1");
		container.register(token2, "value2");

		container.unregisterMany([token1, token2]);

		expect(container.has(token1)).toBe(false);
		expect(container.has(token2)).toBe(false);
	});

	it("should clear all dependencies", () => {
		const token1 = Symbol("clearTest1");
		const token2 = Symbol("clearTest2");

		container.register(token1, "value1");
		container.register(token2, "value2");

		container.clear();

		expect(container.has(token1)).toBe(false);
		expect(container.has(token2)).toBe(false);

		// Check for debug logs about clearing
		const debugCalls = mockLogger.getCalls("debug");
		expect(debugCalls).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining("Clearing all dependencies from container"),
				options: expect.objectContaining({ source: "Container" }),
			}),
		);
	});

	it("should get all dependencies", () => {
		const token1 = Symbol("getAllTest1");
		const token2 = Symbol("getAllTest2");
		const value1 = { name: "dep1" };
		const value2 = { name: "dep2" };

		container.register(token1, value1);
		container.register(token2, value2);

		const allDeps = container.getAll();

		expect(allDeps).toHaveLength(2);
		expect(allDeps).toContainEqual(value1);
		expect(allDeps).toContainEqual(value2);
	});

	it("should handle dynamic factory functions", () => {
		const factoryToken = Symbol("factoryToken");
		const factoryValue = { dynamic: true };

		// Create a proper arrow function factory (arrow functions have no prototype)
		const factory = Object.assign(
			vi.fn((_context: unknown) => factoryValue),
			{ prototype: undefined },
		);

		container.register(factoryToken, factory);
		const result = container.get(factoryToken);

		expect(result).toEqual(factoryValue);
		expect(factory).toHaveBeenCalledWith(
			expect.objectContaining({
				container: expect.any(Object),
			}),
		);

		// Check debug logs about factory execution
		const debugCalls = mockLogger.getCalls("debug");
		expect(debugCalls).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining(`Token ${String(factoryToken.description)} corresponds to a dynamic factory`),
				options: expect.objectContaining({ source: "Container" }),
			}),
		);
	});

	describe("resolve functionality", () => {
		it("should resolve a simple injectable class", () => {
			const TestClass = createInjectableClass(containerName);

			const instance = container.resolve(TestClass);

			expect(instance).toBeInstanceOf(TestClass);
		});

		it("should resolve an injectable class with dependencies", () => {
			const dep1Token = Symbol("dep1");
			const dep2Token = Symbol("dep2");
			const dep1Value = { name: "dependency1" };
			const dep2Value = { name: "dependency2" };

			// Register dependencies
			container.register(dep1Token, dep1Value);
			container.register(dep2Token, dep2Value);

			// Create class with dependencies
			const TestClassWithDeps = createInjectableClassWithDeps(containerName, [dep1Token, dep2Token]);

			// Resolve the class
			const instance = container.resolve(TestClassWithDeps);

			expect(instance).toBeInstanceOf(TestClassWithDeps);
			expect((instance as any).deps).toEqual([dep1Value, dep2Value]);
		});

		it("should cache resolved instances when retrieving via get()", () => {
			const classToken = Symbol("classToken");
			const TestClass = createInjectableClass(containerName);

			// Register the injectable class
			container.register(classToken, TestClass);

			// Get it twice to verify caching
			const instance1 = container.get(classToken);
			const instance2 = container.get(classToken);

			expect(instance1).toBe(instance2); // Same instance reference
			expect(instance1).toBeInstanceOf(TestClass);
		});

		it("should throw an error when resolving a non-injectable class", () => {
			class NonInjectableClass {}

			expect(() => container.resolve(NonInjectableClass)).toThrow(BaseError);
			expect(() => container.resolve(NonInjectableClass)).toThrow(/not marked as @Injectable/);
		});

		it("should throw an error when container referenced by @Injectable is not found", () => {
			const nonExistentContainerSymbol = Symbol("NonExistentContainer");
			const TestClass = createInjectableClass(nonExistentContainerSymbol);

			(containerRegistry.get as Mock).mockReturnValue();

			expect(() => container.resolve(TestClass)).toThrow(BaseError);
			expect(() => container.resolve(TestClass)).toThrow(/Container with name .* not found/);
		});

		it("should throw an error when a required dependency is not registered", () => {
			const missingDependencyToken = Symbol("missingDep");
			const TestClassWithMissingDep = createInjectableClassWithDeps(containerName, [missingDependencyToken]);

			expect(() => container.resolve(TestClassWithMissingDep)).toThrow(BaseError);
			expect(() => container.resolve(TestClassWithMissingDep)).toThrow(/Failed to resolve dependency/);
		});

		it("should throw an error when a constructor parameter lacks @Inject decorator", () => {
			class ClassWithoutInject {
				constructor(private readonly dep1: unknown) {}
			}

			// Add only @Injectable but not @Inject
			Reflect.defineMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, containerName, ClassWithoutInject);
			Reflect.defineMetadata("design:paramtypes", [Object], ClassWithoutInject);
			// No INJECT_TOKEN_KEY metadata

			expect(() => container.resolve(ClassWithoutInject)).toThrow(BaseError);
			expect(() => container.resolve(ClassWithoutInject)).toThrow(/has constructor parameters but no valid @Inject metadata/);
		});
	});
});
