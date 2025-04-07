import type { ILogger, IRegistry } from "@domain/interface";

import { BaseError, BaseFactory } from "src/infrastructure/class/base";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Logger
const mockLogger: ILogger = {
	debug: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	trace: vi.fn(),
	warn: vi.fn(),
};

// Mock Registry using vi.fn()
const mockRegistryInternal = {
	clear: vi.fn(),
	get: vi.fn(),
	getAll: vi.fn(),
	getMany: vi.fn(),
	has: vi.fn(),
	register: vi.fn(),
	registerMany: vi.fn(),
	unregister: vi.fn(),
	unregisterMany: vi.fn(),
};
// Cast the mock object to the required interface type
const mockRegistry = mockRegistryInternal as unknown as IRegistry<IMockTemplate>;

// Mock Template Type
interface IMockTemplate {
	config: { nested: boolean };
	name: string;
	value: number;
}

// Mock Transformer
const mockTransformer = vi.fn((template: IMockTemplate) => ({
	...template,
	value: template.value * 2, // Example transformation
}));

describe("BaseFactory", () => {
	let factory: BaseFactory<IMockTemplate>;
	let factoryWithTransformer: BaseFactory<IMockTemplate>;
	const template1: IMockTemplate = { config: { nested: true }, name: "template1", value: 10 };
	const template2: IMockTemplate = { config: { nested: false }, name: "template2", value: 20 };

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset registry mock behaviour using the internal mock object
		mockRegistryInternal.get.mockImplementation((name: string) => {
			if (name === template1.name) return structuredClone(template1);

			if (name === template2.name) return structuredClone(template2);

			return;
		});

		factory = new BaseFactory<IMockTemplate>({ logger: mockLogger, registry: mockRegistry });
		factoryWithTransformer = new BaseFactory<IMockTemplate>({
			logger: mockLogger,
			registry: mockRegistry,
			transformer: mockTransformer,
		});
	});

	it("should be defined", () => {
		expect(factory).toBeDefined();
		expect(factoryWithTransformer).toBeDefined();
	});

	it("constructor should use default logger if logger is undefined", () => {
		// Test the class constructor directly
		const factoryInstance = new BaseFactory<IMockTemplate>({ logger: undefined, registry: mockRegistry });
		expect(factoryInstance).toBeDefined();
		// Ensure constructor doesn't crash.
	});

	it("getRegistry should return the provided registry", () => {
		expect(factory.getRegistry()).toBe(mockRegistry);
	});

	describe("create", () => {
		it("should create an item by calling registry.get", () => {
			const createdItem = factory.create("template1");

			expect(mockRegistry.get).toHaveBeenCalledTimes(1);
			expect(mockRegistry.get).toHaveBeenCalledWith("template1");
			expect(createdItem).toEqual(template1);
			// Important: check it's a clone, not the original reference
			expect(createdItem).not.toBe(template1);
			expect(createdItem.config).not.toBe(template1.config);

			expect(mockLogger.debug).toHaveBeenCalledWith("Creating item: template1", { source: "Factory" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Created item: template1", { source: "Factory" });
		});

		it("should throw BaseError if template not found in registry", () => {
			// Use the internal mock object to modify mock behaviour
			mockRegistryInternal.get.mockReturnValueOnce();
			expect(() => factory.create("nonexistent")).toThrow(BaseError);
			expect(() => factory.create("nonexistent")).toThrow("Template not found");
			expect(mockLogger.debug).toHaveBeenCalledWith("Creating item: nonexistent", { source: "Factory" });
		});

		it("should cache the created item and return clone from cache on subsequent calls", () => {
			const item1 = factory.create("template1"); // First call: create & cache
			expect(mockRegistry.get).toHaveBeenCalledTimes(1);
			vi.clearAllMocks(); // Clear mocks for the second call check

			const item2 = factory.create("template1"); // Second call: should hit cache
			expect(mockRegistry.get).not.toHaveBeenCalled(); // Registry should not be called again
			expect(item2).toEqual(item1);
			expect(item2).not.toBe(item1); // Should be a clone from cache
			expect(item2.config).not.toBe(item1.config);

			expect(mockLogger.debug).toHaveBeenCalledWith("Creating item: template1", { source: "Factory" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Retrieved item from cache: template1", { source: "Factory" });
		});

		it("should use the transformer function if provided", () => {
			const createdItem = factoryWithTransformer.create("template1");
			expect(mockRegistry.get).toHaveBeenCalledWith("template1");
			expect(mockTransformer).toHaveBeenCalledTimes(1);
			expect(mockTransformer).toHaveBeenCalledWith(template1);
			expect(createdItem.value).toBe(template1.value * 2);
			expect(createdItem.name).toBe(template1.name);
		});

		it("should cache the transformed item", () => {
			const item1 = factoryWithTransformer.create("template1");
			expect(mockTransformer).toHaveBeenCalledTimes(1);
			vi.clearAllMocks();

			const item2 = factoryWithTransformer.create("template1"); // Should get from cache
			expect(mockRegistry.get).not.toHaveBeenCalled();
			expect(mockTransformer).not.toHaveBeenCalled();
			expect(item2.value).toBe(template1.value * 2);
			expect(item2).toEqual(item1);
			expect(item2).not.toBe(item1);
		});
	});

	describe("clearCache", () => {
		beforeEach(() => {
			// Populate cache
			factory.create("template1");
			factory.create("template2");
			expect(mockRegistry.get).toHaveBeenCalledTimes(2);
			vi.clearAllMocks();
		});

		it("should clear the entire cache if no name is provided", () => {
			factory.clearCache();
			expect(mockLogger.debug).toHaveBeenCalledWith("Factory cache cleared", { source: "Factory" });

			// Verify cache is empty by checking if registry is called again
			factory.create("template1");
			expect(mockRegistry.get).toHaveBeenCalledWith("template1");
			vi.clearAllMocks();
			factory.create("template2");
			expect(mockRegistry.get).toHaveBeenCalledWith("template2");
		});

		it("should clear only the specified item cache if name is provided", () => {
			factory.clearCache("template1");
			expect(mockLogger.debug).toHaveBeenCalledWith("Cache cleared for item: template1", { source: "Factory" });

			// Verify template1 requires registry call, template2 uses cache
			factory.create("template1");
			expect(mockRegistry.get).toHaveBeenCalledWith("template1");
			vi.clearAllMocks();
			factory.create("template2");
			expect(mockRegistry.get).not.toHaveBeenCalled(); // Should still be cached
		});

		it("should do nothing if clearing cache for a non-cached item name", () => {
			factory.clearCache("nonexistent");
			expect(mockLogger.debug).toHaveBeenCalledWith("Cache cleared for item: nonexistent", { source: "Factory" });
			// Verify existing items are still cached
			factory.create("template1");
			expect(mockRegistry.get).not.toHaveBeenCalled();
			vi.clearAllMocks();
			factory.create("template2");
			expect(mockRegistry.get).not.toHaveBeenCalled();
		});
	});
});
