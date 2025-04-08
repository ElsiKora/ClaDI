import type { ILogger } from "@domain/interface";

import { BaseError, BaseRegistry } from "src/infrastructure/class/base"; // Assuming index exports BaseRegistry
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Logger
const mockLogger: ILogger = {
	debug: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	trace: vi.fn(),
	warn: vi.fn(),
};

// Mock Item Type
interface IMockItem {
	getName(): string;
	value: number;
}

// Helper to create mock items consistently
const createMockItem = (name: string, value: number): IMockItem => ({
	getName: () => name,
	value,
});

describe("BaseRegistry", () => {
	let registry: BaseRegistry<IMockItem>;

	beforeEach(() => {
		// Reset mocks and create a new registry before each test
		vi.clearAllMocks();
		registry = new BaseRegistry<IMockItem>({ logger: mockLogger });
	});

	it("should be defined", () => {
		expect(registry).toBeDefined();
	});

	describe("register", () => {
		it("should register a new item successfully", () => {
			const item = createMockItem("item1", 10);
			registry.register(item);
			expect(registry.has("item1")).toBe(true);
			expect(registry.get("item1")).toEqual(item);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Registering item with name: ${item.getName()}`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Item registered successfully: ${item.getName()}`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("All caches cleared", { source: "Registry" }); // Cache cleared on register
		});

		it("should throw an error if registering an item with an existing name", () => {
			const item1 = createMockItem("item1", 10);
			const item2 = createMockItem("item1", 20); // Same name
			registry.register(item1);
			expect(() => {
				registry.register(item2);
			}).toThrow(BaseError);
			expect(() => {
				registry.register(item2);
			}).toThrow("Item already exists in registry");
		});

		it("should throw an error if registering a null or undefined item", () => {
			expect(() => {
				registry.register(null as any);
			}).toThrow("Item cannot be null or undefined");
			expect(() => {
				registry.register(undefined as any);
			}).toThrow("Item cannot be null or undefined");
		});

		it("register should clear the getAll cache", () => {
			const item1 = createMockItem("item1", 10);
			const item2 = createMockItem("item2", 20);
			registry.register(item1);
			registry.register(item2);

			// Populate getAll cache
			registry.getAll();
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for getAll query"), { source: "Registry" });
			vi.clearAllMocks();

			// Register a new item, which should clear the cache (hitting lines 266-267)
			const item3 = createMockItem("item3", 30);
			registry.register(item3);
			expect(mockLogger.debug).toHaveBeenCalledWith("All caches cleared", { source: "Registry" });

			// Verify getAll cache was cleared (no cache hit log)
			vi.clearAllMocks();
			registry.getAll();
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Cache hit for getAll query", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for getAll query"), { source: "Registry" });
		});
	});

	describe("get", () => {
		it("should return the item if it exists", () => {
			const item = createMockItem("item1", 10);
			registry.register(item);
			const retrievedItem = registry.get("item1");
			expect(retrievedItem).toEqual(item);
			expect(mockLogger.debug).toHaveBeenCalledWith("Getting item with name: item1", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Item found: item1", { source: "Registry" });
		});

		it("should return undefined if the item does not exist", () => {
			const retrievedItem = registry.get("nonexistent");
			expect(retrievedItem).toBeUndefined();
			expect(mockLogger.debug).toHaveBeenCalledWith("Getting item with name: nonexistent", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Item not found: nonexistent", { source: "Registry" });
		});

		it("should return undefined and log warning for empty name", () => {
			const retrievedItem = registry.get("");
			expect(retrievedItem).toBeUndefined();
			expect(mockLogger.warn).toHaveBeenCalledWith("Attempted to get item with empty name", { source: "Registry" });
		});
	});

	describe("has", () => {
		it("should return true if the item exists", () => {
			const item = createMockItem("item1", 10);
			registry.register(item);
			expect(registry.has("item1")).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith("Checking if item exists: item1", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Item exists: item1", { source: "Registry" });
		});

		it("should return false if the item does not exist", () => {
			expect(registry.has("nonexistent")).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith("Checking if item exists: nonexistent", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Item does not exist: nonexistent", { source: "Registry" });
		});

		it("should return false for empty name", () => {
			expect(registry.has("")).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith("Checking if item exists: ", { source: "Registry" });
		});
	});

	describe("unregister", () => {
		it("should remove an existing item", () => {
			const item = createMockItem("item1", 10);
			registry.register(item);
			expect(registry.has("item1")).toBe(true);
			registry.unregister("item1");
			expect(registry.has("item1")).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith("Unregistering item with name: item1", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Item unregistered successfully: item1", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("All caches cleared", { source: "Registry" }); // Cache cleared on unregister
		});

		it("should not throw if unregistering a non-existent item but log it", () => {
			expect(() => {
				registry.unregister("nonexistent");
			}).not.toThrow();
			expect(registry.has("nonexistent")).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith("Unregistering item with name: nonexistent", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Item not found for unregistering: nonexistent", { source: "Registry" });
		});

		it("should throw an error if unregistering with an empty name", () => {
			expect(() => {
				registry.unregister("");
			}).toThrow(BaseError);
			expect(() => {
				registry.unregister("");
			}).toThrow("Name cannot be empty");
		});
	});

	describe("clear", () => {
		it("should remove all items from the registry", () => {
			const item1 = createMockItem("item1", 10);
			const item2 = createMockItem("item2", 20);
			registry.register(item1);
			registry.register(item2);
			expect(registry.has("item1")).toBe(true);
			expect(registry.has("item2")).toBe(true);

			registry.clear();

			expect(registry.has("item1")).toBe(false);
			expect(registry.has("item2")).toBe(false);
			expect(registry.get("item1")).toBeUndefined();
			expect(registry.get("item2")).toBeUndefined();
			expect(mockLogger.debug).toHaveBeenCalledWith("Clearing registry", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Registry cleared", { source: "Registry" });
			// Check cache clear called twice (once in clear, once implicitly by clearCache)
			expect(mockLogger.debug).toHaveBeenCalledWith("All caches cleared", { source: "Registry" });
		});

		it("should handle clear on an already empty registry", () => {
			// Registry is empty here as it's created in beforeEach
			expect(registry.getAll()).toHaveLength(0);
			registry.clear();
			expect(registry.getAll()).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith("Clearing registry", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("Registry cleared", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith("All caches cleared", { source: "Registry" });
		});

		it("should ensure internal CACHE map is cleared via clearCache()", () => {
			// Register an item and manually add something to the cache
			const item1 = createMockItem("item1", 10);
			registry.register(item1);
			(registry as any).CACHE.set("manualKey", [createMockItem("cachedItem", 99)]);
			expect((registry as any).CACHE.size).toBeGreaterThan(0);
			vi.clearAllMocks(); // Clear mocks before calling clear()

			// Call clear, which calls clearCache() without args
			registry.clear();

			// Assert that the CACHE map itself is now empty
			expect((registry as any).CACHE.size).toBe(0);
			expect(mockLogger.debug).toHaveBeenCalledWith("All caches cleared", { source: "Registry" }); // Verify log too
		});
	});

	describe("registerMany", () => {
		it("should register multiple items successfully", () => {
			const items: Array<IMockItem> = [
				createMockItem("item1", 10),
				createMockItem("item2", 20),
			];
			registry.registerMany(items);
			expect(registry.has("item1")).toBe(true);
			expect(registry.has("item2")).toBe(true);
			expect(registry.get("item1")).toEqual(items[0]);
			expect(registry.get("item2")).toEqual(items[1]);
			expect(mockLogger.debug).toHaveBeenCalledTimes(20);
		});

		it("should throw an error if any item has an existing name", () => {
			const item1 = createMockItem("item1", 10);
			registry.register(item1);

			const items: Array<IMockItem> = [
				createMockItem("item2", 20),
				createMockItem("item1", 30), // Duplicate name
			];
			expect(() => {
				registry.registerMany(items);
			}).toThrow("Item already exists in registry");
		});

		it("should throw an error if the items array is null or undefined", () => {
			expect(() => {
				registry.registerMany(null as any);
			}).toThrow("Items cannot be null or undefined");
			expect(() => {
				registry.registerMany(undefined as any);
			}).toThrow("Items cannot be null or undefined");
		});

		it("should throw an error if items is not an array", () => {
			expect(() => {
				registry.registerMany({} as any);
			}).toThrow("Items must be an array");
		});
	});

	describe("getMany", () => {
		beforeEach(() => {
			const items: Array<IMockItem> = [
				createMockItem("item1", 10),
				createMockItem("item2", 20),
				createMockItem("item3", 30),
			];
			registry.registerMany(items);
			vi.clearAllMocks(); // Clear mocks after setup
		});

		it("should return the specified items", () => {
			const names = ["item1", "item3"];
			const retrievedItems = registry.getMany(names);
			expect(retrievedItems).toHaveLength(2);
			expect(retrievedItems).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 10 }),
					expect.objectContaining({ value: 30 }),
				]),
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Getting ${names.length} items by name`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for query: getMany:"), { source: "Registry" });
		});

		it("should return only existing items", () => {
			const names = ["item1", "nonexistent", "item3"];
			const retrievedItems = registry.getMany(names);
			expect(retrievedItems).toHaveLength(2);
			expect(retrievedItems).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 10 }),
					expect.objectContaining({ value: 30 }),
				]),
			);
		});

		it("should return an empty array if no items match", () => {
			const names = ["nonexistent1", "nonexistent2"];
			const retrievedItems = registry.getMany(names);
			expect(retrievedItems).toHaveLength(0);
		});

		it("should return items from cache on subsequent calls", () => {
			const names = ["item1", "item2"];
			registry.getMany(names); // First call - populate cache
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for query: getMany:item1,item2"), { source: "Registry" });
			vi.clearAllMocks();

			const retrievedItems = registry.getMany(names); // Second call - should hit cache
			expect(retrievedItems).toHaveLength(2);
			expect(retrievedItems).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 10 }),
					expect.objectContaining({ value: 20 }),
				]),
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cache hit for query: getMany:item1,item2"), { source: "Registry" });
			// Ensure individual 'get' was not called this time
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Getting item with name: item1", { source: "Registry" });
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Getting item with name: item2", { source: "Registry" });
		});

		it("should throw error if names is null or undefined", () => {
			expect(() => registry.getMany(null as any)).toThrow("Names cannot be null or undefined");
			expect(() => registry.getMany(undefined as any)).toThrow("Names cannot be null or undefined");
		});

		it("should throw error if names is not an array", () => {
			expect(() => registry.getMany("item1" as any)).toThrow("Names must be an array");
		});
	});

	describe("getAll", () => {
		const item1 = createMockItem("item1", 10);
		const item2 = createMockItem("item2", 20);

		beforeEach(() => {
			registry.register(item1);
			registry.register(item2);
			vi.clearAllMocks(); // Clear mocks after setup
		});

		it("should return all registered items", () => {
			const allItems = registry.getAll();
			expect(allItems).toHaveLength(2);
			expect(allItems).toEqual(expect.arrayContaining([item1, item2]));
			expect(mockLogger.debug).toHaveBeenCalledWith("Getting all items", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for getAll query"), { source: "Registry" });
		});

		it("should return an empty array if registry is empty", () => {
			registry.clear();
			vi.clearAllMocks();
			const allItems = registry.getAll();
			expect(allItems).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith("Getting all items", { source: "Registry" });
		});

		it("should return items from cache on subsequent calls", () => {
			registry.getAll(); // First call
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for getAll query"), { source: "Registry" });
			vi.clearAllMocks();

			const allItems = registry.getAll(); // Second call
			expect(allItems).toHaveLength(2);
			expect(mockLogger.debug).toHaveBeenCalledWith("Cache hit for getAll query", { source: "Registry" });
			// Ensure underlying map access was not performed
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Getting item with name: item1", { source: "Registry" });
		});

		it("should return fresh items after cache is cleared by register", () => {
			registry.getAll(); // Populate cache
			const item3 = createMockItem("item3", 30);
			registry.register(item3); // Clears cache
			vi.clearAllMocks();

			const allItems = registry.getAll(); // Should retrieve fresh list
			expect(allItems).toHaveLength(3);
			expect(allItems).toEqual(expect.arrayContaining([item1, item2, item3]));
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Cache hit for getAll query", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for getAll query"), { source: "Registry" });
		});

		it("should return fresh items after cache is cleared by unregister", () => {
			registry.getAll(); // Populate cache
			registry.unregister("item1"); // Clears cache
			vi.clearAllMocks();

			const allItems = registry.getAll(); // Should retrieve fresh list
			expect(allItems).toHaveLength(1);
			expect(allItems).toEqual(expect.arrayContaining([item2]));
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Cache hit for getAll query", { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cached result for getAll query"), { source: "Registry" });
		});

		it("should return fresh items after cache is cleared by clear", () => {
			registry.getAll(); // Populate cache
			registry.clear(); // Clears cache
			vi.clearAllMocks();

			const allItems = registry.getAll(); // Should retrieve fresh list
			expect(allItems).toHaveLength(0);
			expect(mockLogger.debug).not.toHaveBeenCalledWith("Cache hit for getAll query", { source: "Registry" });
		});
	});

	describe("unregisterMany", () => {
		beforeEach(() => {
			const items: Array<IMockItem> = [
				createMockItem("item1", 10),
				createMockItem("item2", 20),
				createMockItem("item3", 30),
			];
			registry.registerMany(items);
			vi.clearAllMocks(); // Clear mocks after setup
		});

		it("should unregister multiple specified items", () => {
			const namesToUnregister = ["item1", "item3"];
			registry.unregisterMany(namesToUnregister);
			expect(registry.has("item1")).toBe(false);
			expect(registry.has("item2")).toBe(true);
			expect(registry.has("item3")).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Unregistering ${namesToUnregister.length} items`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Item unregistered successfully: item1`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Item unregistered successfully: item3`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`${namesToUnregister.length} items unregistered`, { source: "Registry" });
		});

		it("should handle non-existent items gracefully", () => {
			const namesToUnregister = ["item1", "nonexistent"];
			registry.unregisterMany(namesToUnregister);
			expect(registry.has("item1")).toBe(false);
			expect(registry.has("item2")).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith(`Item unregistered successfully: item1`, { source: "Registry" });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Item not found for unregistering: nonexistent`, { source: "Registry" });
		});

		it("should throw error if names is null or undefined", () => {
			expect(() => {
				registry.unregisterMany(null as any);
			}).toThrow("Names cannot be null or undefined");
			expect(() => {
				registry.unregisterMany(undefined as any);
			}).toThrow("Names cannot be null or undefined");
		});

		it("should throw error if names is not an array", () => {
			expect(() => {
				registry.unregisterMany({} as any);
			}).toThrow("Names must be an array");
		});

		it("should throw error if any name in the array is empty", () => {
			// Note: The current implementation calls unregister for each name,
			// so the error ("Name cannot be empty") comes from the individual unregister call.
			const namesToUnregister = ["item1", ""];
			expect(() => {
				registry.unregisterMany(namesToUnregister);
			}).toThrow("Name cannot be empty");
		});
	});

	// TODO: Add tests for getAll and cache behaviour
});
