import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * E2E tests for BaseRegistry
 *
 * These tests verify that the built BaseRegistry component works as expected:
 * 1. Items can be registered and retrieved correctly
 * 2. The registry properly handles different types of items (values, classes)
 * 3. Registry operations like getAll, getMany, and clear function properly
 * 4. Caching mechanisms work as expected
 */
// @ts-expect-error - Ignore TS errors for e2e tests that use the built package
import { BaseError, BaseRegistry, ConsoleLoggerService } from "../../../../../dist/esm/index.js";

describe("E2E: BaseRegistry", () => {
	// Test registry instance
	let registry: BaseRegistry<any>;

	// Logger for registry
	const logger = new ConsoleLoggerService();

	// Test data
	const item1 = { id: 1, name: "Item One" };
	const item2 = { id: 2, name: "Item Two" };

	// Test symbols for items
	const itemSymbol1 = Symbol("item1");
	const itemSymbol2 = Symbol("item2");

	// Test class
	class TestItem {
		constructor(
			public id: number,
			public name: string,
		) {}
	}
	const testItemClass = TestItem;
	const testItemSymbol = Symbol("TestItem");

	beforeEach(() => {
		// Create a fresh registry for each test
		registry = new BaseRegistry({
			logger,
		});
	});

	afterEach(() => {
		// Clean up
		registry.clear();
	});

	it("should create a registry instance from the distribution build", () => {
		expect(registry).toBeInstanceOf(BaseRegistry);
	});

	it("should register and retrieve items", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);

		// Retrieve items
		const retrievedItem1 = registry.get(itemSymbol1);
		const retrievedItem2 = registry.get(itemSymbol2);

		expect(retrievedItem1).toBe(item1);
		expect(retrievedItem2).toBe(item2);
	});

	it("should register and retrieve a class constructor", () => {
		// Register a class constructor
		registry.register(testItemSymbol, testItemClass);

		// Retrieve the constructor
		const retrievedClass = registry.get(testItemSymbol);

		expect(retrievedClass).toBe(testItemClass);

		// Should be able to instantiate the class
		const instance = new (retrievedClass as typeof TestItem)(3, "New Item");
		expect(instance).toBeInstanceOf(TestItem);
		expect(instance.id).toBe(3);
		expect(instance.name).toBe("New Item");
	});

	it("should get all registered items", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);

		// Get all items
		const allItems = registry.getAll();

		expect(allItems).toHaveLength(2);
		expect(allItems).toContain(item1);
		expect(allItems).toContain(item2);
	});

	it("should get many items by their symbols", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);
		registry.register(testItemSymbol, testItemClass);

		// Get specific items
		const items = registry.getMany([itemSymbol1, testItemSymbol]);

		expect(items).toHaveLength(2);
		expect(items).toContain(item1);
		expect(items).toContain(testItemClass);
		expect(items).not.toContain(item2);
	});

	it("should check if items exist in the registry", () => {
		// Register one item
		registry.register(itemSymbol1, item1);

		// Check existence
		expect(registry.has(itemSymbol1)).toBe(true);
		expect(registry.has(itemSymbol2)).toBe(false);
	});

	it("should register many items at once", () => {
		// Register multiple items
		const items = {
			[itemSymbol1]: item1,
			[itemSymbol2]: item2,
			[testItemSymbol]: testItemClass,
		};

		registry.registerMany(items);

		// Verify all items are registered
		expect(registry.has(itemSymbol1)).toBe(true);
		expect(registry.has(itemSymbol2)).toBe(true);
		expect(registry.has(testItemSymbol)).toBe(true);

		// Verify they can be retrieved
		expect(registry.get(itemSymbol1)).toBe(item1);
		expect(registry.get(itemSymbol2)).toBe(item2);
		expect(registry.get(testItemSymbol)).toBe(testItemClass);
	});

	it("should unregister items", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);

		// Verify registration
		expect(registry.has(itemSymbol1)).toBe(true);
		expect(registry.has(itemSymbol2)).toBe(true);

		// Unregister one item
		registry.unregister(itemSymbol1);

		// Verify unregistration
		expect(registry.has(itemSymbol1)).toBe(false);
		expect(registry.has(itemSymbol2)).toBe(true);
	});

	it("should unregister many items at once", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);
		registry.register(testItemSymbol, testItemClass);

		// Verify registration
		expect(registry.has(itemSymbol1)).toBe(true);
		expect(registry.has(itemSymbol2)).toBe(true);
		expect(registry.has(testItemSymbol)).toBe(true);

		// Unregister multiple items
		registry.unregisterMany([itemSymbol1, testItemSymbol]);

		// Verify unregistration
		expect(registry.has(itemSymbol1)).toBe(false);
		expect(registry.has(itemSymbol2)).toBe(true);
		expect(registry.has(testItemSymbol)).toBe(false);
	});

	it("should clear all items from the registry", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);

		// Verify registration
		expect(registry.has(itemSymbol1)).toBe(true);
		expect(registry.has(itemSymbol2)).toBe(true);

		// Clear registry
		registry.clear();

		// Verify all items are removed
		expect(registry.has(itemSymbol1)).toBe(false);
		expect(registry.has(itemSymbol2)).toBe(false);
		expect(registry.getAll()).toHaveLength(0);
	});

	it("should throw when trying to register a null or undefined item", () => {
		expect(() => registry.register(itemSymbol1, null as any)).toThrow(BaseError);
		expect(() => registry.register(itemSymbol1, undefined as any)).toThrow(BaseError);
	});

	it("should throw when trying to register an item with an existing name", () => {
		// Register an item
		registry.register(itemSymbol1, item1);

		// Try to register another item with the same name
		expect(() => registry.register(itemSymbol1, item2)).toThrow(BaseError);
	});

	it("should handle caching for repeated get calls", () => {
		// Register items
		registry.register(itemSymbol1, item1);
		registry.register(itemSymbol2, item2);

		// First call should populate cache
		const allItems1 = registry.getAll();

		// Second call should use cache
		const allItems2 = registry.getAll();

		// Same array instance should be returned (from cache)
		expect(allItems1).toBe(allItems2);

		// Modifying the registry should invalidate cache
		registry.register(testItemSymbol, testItemClass);

		// This should create a new array
		const allItems3 = registry.getAll();

		expect(allItems3).not.toBe(allItems1);
		expect(allItems3).toHaveLength(3);
	});
});
