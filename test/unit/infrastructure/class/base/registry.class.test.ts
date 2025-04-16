import { BaseRegistry } from "@infrastructure/class/base";
import { BaseError } from "@infrastructure/class/base/error.class";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Define a simple type for testing
interface ITestItem {
	id: number;
	name: string;
}

// Define a simple constructor type
class TestItemClass implements ITestItem {
	constructor(
		public id: number,
		public name: string,
	) {}
}

describe("BaseRegistry", () => {
	let registry: BaseRegistry<ITestItem>;
	let mockLogger: MockLogger;

	const item1: ITestItem = { id: 1, name: "Item One" };
	const item2: ITestItem = { id: 2, name: "Item Two" };
	const itemSymbol1: symbol = Symbol.for("item1");
	const itemSymbol2: symbol = Symbol.for("item2");
	const constructorSymbol: symbol = Symbol.for("itemConstructor");

	beforeEach(() => {
		mockLogger = new MockLogger();
		registry = new BaseRegistry<ITestItem>({ logger: mockLogger });
		// Spy on cache methods
		vi.spyOn(registry as any, "clearCache");
	});

	describe("constructor", () => {
		it("should initialize with an empty map and cache", () => {
			expect((registry as any).ITEMS.size).toBe(0);
			expect((registry as any).CACHE.size).toBe(0);
			expect((registry as any).LOGGER).toBe(mockLogger);
		});

		it("should use ConsoleLoggerService if no logger is provided", () => {
			const reg = new BaseRegistry();
			expect((reg as any).LOGGER.getName()).toBe("console"); // Check default logger name
		});
	});

	describe("register", () => {
		it("should register an item successfully", () => {
			registry.register(itemSymbol1, item1);
			expect(registry.has(itemSymbol1)).toBe(true);
			expect((registry as any).ITEMS.get(String(itemSymbol1))).toBe(item1);
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1);
			expect(mockLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: `Registering item with name: ${String(itemSymbol1)}` }));
			expect(mockLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: `Item registered successfully: ${String(itemSymbol1)}` }));
		});

		it("should register a constructor successfully", () => {
			registry.register(constructorSymbol, TestItemClass);
			expect(registry.has(constructorSymbol)).toBe(true);
			expect((registry as any).ITEMS.get(String(constructorSymbol))).toBe(TestItemClass);
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1);
		});

		it("should throw BaseError if item is null or undefined", () => {
			expect(() => {
				registry.register(itemSymbol1, null as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.register(itemSymbol1, null as any);
			}).toThrow("Item cannot be null or undefined");
			expect(() => {
				registry.register(itemSymbol1, undefined as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.register(itemSymbol1, undefined as any);
			}).toThrow("Item cannot be null or undefined");
		});

		it("should throw BaseError if item already exists", () => {
			registry.register(itemSymbol1, item1);
			expect(() => {
				registry.register(itemSymbol1, item2);
			}).toThrow(BaseError);
			expect(() => {
				registry.register(itemSymbol1, item2);
			}).toThrow("Item already exists in registry");
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1); // Only called once for the first registration
		});
	});

	describe("registerMany", () => {
		it("should register multiple items successfully", () => {
			const itemsToRegister = {
				[constructorSymbol]: TestItemClass,
				[itemSymbol1]: item1,
				[itemSymbol2]: item2,
			};
			registry.registerMany(itemsToRegister);

			expect(registry.has(itemSymbol1)).toBe(true);
			expect(registry.has(itemSymbol2)).toBe(true);
			expect(registry.has(constructorSymbol)).toBe(true);
			expect(registry.get(itemSymbol1)).toBe(item1);
			expect(registry.get(itemSymbol2)).toBe(item2);
			expect(registry.get(constructorSymbol)).toBe(TestItemClass);
			expect((registry as any).clearCache).toHaveBeenCalledTimes(3); // Called once for each item via register()
			expect(mockLogger.getCalls("debug").length).toBeGreaterThanOrEqual(4); // Initial msg + 3 registrations
		});

		it("should throw BaseError if items object is null or undefined", () => {
			expect(() => {
				registry.registerMany(null as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.registerMany(undefined as any);
			}).toThrow(BaseError);
		});

		it("should throw BaseError if items is not an object", () => {
			expect(() => {
				registry.registerMany([] as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.registerMany("string" as any);
			}).toThrow(BaseError);
		});

		it("should throw during iteration if an item already exists", () => {
			registry.register(itemSymbol1, item1);

			const itemsToRegister = {
				[itemSymbol1]: item2, // Duplicate
				[itemSymbol2]: item2,
			};
			expect(() => {
				registry.registerMany(itemsToRegister);
			}).toThrow(BaseError);
			expect(() => {
				registry.registerMany(itemsToRegister);
			}).toThrow("Item already exists in registry");
			// itemSymbol2 might or might not be registered depending on iteration order, test has() state if needed
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1); // Only for the initial registration
		});
	});

	describe("get", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
			registry.register(constructorSymbol, TestItemClass);
		});

		it("should return the registered item", () => {
			expect(registry.get(itemSymbol1)).toBe(item1);
		});

		it("should return the registered constructor", () => {
			expect(registry.get(constructorSymbol)).toBe(TestItemClass);
		});

		it("should return undefined if item does not exist", () => {
			expect(registry.get(itemSymbol2)).toBeUndefined();
		});

		it("should return undefined and log warning if name is null or undefined", () => {
			mockLogger.reset();
			expect(registry.get(null as any)).toBeUndefined();
			expect(registry.get(undefined as any)).toBeUndefined();
			expect(mockLogger.getCalls("warn")).toContainEqual(expect.objectContaining({ message: "Attempted to get item with empty name" }));
		});
	});

	describe("has", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
		});

		it("should return true if item exists", () => {
			expect(registry.has(itemSymbol1)).toBe(true);
		});

		it("should return false if item does not exist", () => {
			expect(registry.has(itemSymbol2)).toBe(false);
		});

		it("should return false if name is null or undefined", () => {
			expect(registry.has(null as any)).toBe(false);
			expect(registry.has(undefined as any)).toBe(false);
		});
	});

	describe("getAll", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
			registry.register(itemSymbol2, item2);
			registry.register(constructorSymbol, TestItemClass);
		});

		it("should return all registered items and constructors", () => {
			const allItems = registry.getAll();
			expect(allItems).toHaveLength(3);
			expect(allItems).toContain(item1);
			expect(allItems).toContain(item2);
			expect(allItems).toContain(TestItemClass);
		});

		it("should return an empty array if registry is empty", () => {
			registry.clear();
			expect(registry.getAll()).toEqual([]);
		});

		it("should use cache on subsequent calls", () => {
			const result1 = registry.getAll();
			expect((registry as any).CACHE.has("getAll")).toBe(true);
			const result2 = registry.getAll();
			expect(result1).toBe(result2); // Should return the cached array instance
			// Check logger messages for cache hit
			expect(mockLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: "Cache hit for getAll query" }));
		});

		it("should clear cache after modification", () => {
			registry.getAll(); // Populate cache
			expect((registry as any).CACHE.has("getAll")).toBe(true);
			registry.unregister(itemSymbol1);
			expect((registry as any).clearCache).toHaveBeenCalled();
			expect((registry as any).CACHE.has("getAll")).toBe(false);
		});
	});

	describe("getMany", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
			registry.register(itemSymbol2, item2);
			registry.register(constructorSymbol, TestItemClass);
		});

		it("should return the specified items and constructors", () => {
			const names = [itemSymbol1, constructorSymbol, Symbol("nonexistent")];
			const result = registry.getMany(names);
			expect(result).toHaveLength(2);
			expect(result).toContain(item1);
			expect(result).toContain(TestItemClass);
		});

		it("should return an empty array if no names match", () => {
			const names = [Symbol("nonexistent1"), Symbol("nonexistent2")];
			expect(registry.getMany(names)).toEqual([]);
		});

		it("should return an empty array if names array is empty", () => {
			expect(registry.getMany([])).toEqual([]);
		});

		it("should throw BaseError if names is null or undefined", () => {
			expect(() => registry.getMany(null as any)).toThrow(BaseError);
			expect(() => registry.getMany(undefined as any)).toThrow(BaseError);
		});

		it("should throw BaseError if names is not an array", () => {
			expect(() => registry.getMany({} as any)).toThrow(BaseError);
		});

		it("should use cache on subsequent identical calls", () => {
			const names = [itemSymbol1, itemSymbol2];
			const cacheKey = `getMany:${String(itemSymbol1)},${String(itemSymbol2)}`;
			const result1 = registry.getMany(names);
			expect((registry as any).CACHE.has(cacheKey)).toBe(true);
			const result2 = registry.getMany(names);
			expect(result1).toEqual(result2);
			expect(mockLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: `Cache hit for query: ${cacheKey}` }));
		});

		it("should clear cache after modification", () => {
			const names = [itemSymbol1, itemSymbol2];
			const cacheKey = `getMany:${String(itemSymbol1)},${String(itemSymbol2)}`;
			registry.getMany(names); // Populate cache
			expect((registry as any).CACHE.has(cacheKey)).toBe(true);
			registry.register(Symbol("newItem"), { id: 3, name: "New" });
			expect((registry as any).clearCache).toHaveBeenCalled();
			expect((registry as any).CACHE.has(cacheKey)).toBe(false);
		});
	});

	describe("unregister", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
			registry.register(itemSymbol2, item2);
			(registry as any).clearCache.mockClear(); // Reset spy count
		});

		it("should unregister an existing item", () => {
			registry.unregister(itemSymbol1);
			expect(registry.has(itemSymbol1)).toBe(false);
			expect(registry.get(itemSymbol1)).toBeUndefined();
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1);
			expect(mockLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: `Item unregistered successfully: ${String(itemSymbol1)}` }));
		});

		it("should not throw if item does not exist", () => {
			const nonExistentSymbol = Symbol("nonexistent");
			expect(() => {
				registry.unregister(nonExistentSymbol);
			}).not.toThrow();
			expect(registry.has(nonExistentSymbol)).toBe(false);
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1);
			expect(mockLogger.getCalls("debug")).toContainEqual(expect.objectContaining({ message: `Item not found for unregistering: ${String(nonExistentSymbol)}` }));
		});

		it("should throw BaseError if name is null or undefined", () => {
			expect(() => {
				registry.unregister(null as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.unregister(undefined as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.unregister(null as any);
			}).toThrow("Name cannot be empty");
		});
	});

	describe("unregisterMany", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
			registry.register(itemSymbol2, item2);
			registry.register(constructorSymbol, TestItemClass);
			(registry as any).clearCache.mockClear(); // Reset spy count
		});

		it("should unregister multiple existing items", () => {
			const namesToUnregister = [itemSymbol1, constructorSymbol, Symbol("nonexistent")];
			registry.unregisterMany(namesToUnregister);
			expect(registry.has(itemSymbol1)).toBe(false);
			expect(registry.has(constructorSymbol)).toBe(false);
			expect(registry.has(itemSymbol2)).toBe(true); // Should still exist
			expect((registry as any).clearCache).toHaveBeenCalledTimes(3); // Called once per item
		});

		it("should not throw if names array contains non-existent items", () => {
			const namesToUnregister = [itemSymbol1, Symbol("nonexistent")];
			expect(() => {
				registry.unregisterMany(namesToUnregister);
			}).not.toThrow();
			expect(registry.has(itemSymbol1)).toBe(false);
			expect((registry as any).clearCache).toHaveBeenCalledTimes(2);
		});

		it("should throw BaseError if names is null or undefined", () => {
			expect(() => {
				registry.unregisterMany(null as any);
			}).toThrow(BaseError);
			expect(() => {
				registry.unregisterMany(undefined as any);
			}).toThrow(BaseError);
		});

		it("should throw BaseError if names is not an array", () => {
			expect(() => {
				registry.unregisterMany({} as any);
			}).toThrow(BaseError);
		});
	});

	describe("clear", () => {
		beforeEach(() => {
			registry.register(itemSymbol1, item1);
			registry.register(itemSymbol2, item2);
			// Prime cache
			registry.getAll();
			registry.getMany([itemSymbol1]);
			(registry as any).clearCache.mockClear();
		});

		it("should remove all items and clear cache", () => {
			expect((registry as any).ITEMS.size).toBe(2);
			expect((registry as any).CACHE.size).toBeGreaterThan(0);

			registry.clear();

			expect((registry as any).ITEMS.size).toBe(0);
			expect((registry as any).CACHE.size).toBe(0);
			expect(registry.has(itemSymbol1)).toBe(false);
			expect(registry.has(itemSymbol2)).toBe(false);
			expect((registry as any).clearCache).toHaveBeenCalledTimes(1); // Called by clear()
		});
	});
});
