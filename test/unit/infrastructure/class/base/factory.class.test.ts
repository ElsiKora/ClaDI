import { BaseFactory } from "@infrastructure/class/base";
import { BaseError } from "@infrastructure/class/base/error.class";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { MockRegistry } from "@test-shared/mocks/registry.mock";
import { beforeEach, describe, expect, it } from "vitest";

// Define a simple object type for testing pre-created instances
interface IGadget {
	type: string;
}

// Define a simple class for testing instantiation
class Widget {
	public args: Array<any>;

	public name: string;

	constructor(name: string, ...arguments_: Array<any>) {
		this.name = name;
		this.args = arguments_;
	}
}

describe("BaseFactory", () => {
	let factory: BaseFactory<IGadget | Widget>;
	let mockRegistry: MockRegistry<IGadget | Widget>;
	let mockLogger: MockLogger;

	const widgetSymbol: symbol = Symbol.for("widget");
	const gadgetSymbol: symbol = Symbol.for("gadget");
	const nonExistentSymbol: symbol = Symbol.for("nonexistent");
	const gadgetInstance: IGadget = { type: "simple" };

	beforeEach(() => {
		mockLogger = new MockLogger();
		mockRegistry = new MockRegistry<IGadget | Widget>();
		factory = new BaseFactory<IGadget | Widget>({
			logger: mockLogger,
			registry: mockRegistry,
		});

		// Pre-register items in the mock registry for tests
		mockRegistry.register(widgetSymbol, Widget);
		mockRegistry.register(gadgetSymbol, gadgetInstance);
	});

	describe("constructor", () => {
		it("should store the provided registry and logger", () => {
			expect((factory as any).REGISTRY).toBe(mockRegistry);
			expect((factory as any).LOGGER).toBe(mockLogger);
		});

		it("should use ConsoleLoggerService if no logger is provided", () => {
			const fac = new BaseFactory({ registry: mockRegistry });
			expect((fac as any).LOGGER.getName()).toBe("console");
		});
	});

	describe("create", () => {
		it("should create an instance using the constructor from the registry", () => {
			const instance = factory.create(widgetSymbol, "TestWidget", 123);
			expect(instance).toBeInstanceOf(Widget);
			expect((instance as Widget).name).toBe("TestWidget");
			expect((instance as Widget).args).toEqual([123]);
			expect(mockLogger.getCalls("info")).toContainEqual(expect.objectContaining({ message: `Creating instance: ${String(widgetSymbol)}` }));
			expect(mockLogger.getCalls("info")).toContainEqual(expect.objectContaining({ message: `Instance created: ${String(widgetSymbol)}` }));
		});

		it("should create an instance without constructor arguments", () => {
			const instance = factory.create(widgetSymbol, "NoArgsWidget");
			expect(instance).toBeInstanceOf(Widget);
			expect((instance as Widget).name).toBe("NoArgsWidget");
			expect((instance as Widget).args).toEqual([]);
		});

		it("should return a pre-created instance from the registry", () => {
			const instance = factory.create(gadgetSymbol);
			expect(instance).toBe(gadgetInstance);
			expect(mockLogger.getCalls("info")).toContainEqual(expect.objectContaining({ message: `Creating instance: ${String(gadgetSymbol)}` }));
			expect(mockLogger.getCalls("info")).toContainEqual(expect.objectContaining({ message: `Instance created: ${String(gadgetSymbol)}` }));
		});

		it("should throw BaseError if the name is not found in the registry", () => {
			expect(() => factory.create(nonExistentSymbol)).toThrow(BaseError);
			expect(() => factory.create(nonExistentSymbol)).toThrow(`Constructor or instance not found: ${String(nonExistentSymbol)}`);
		});

		it("should throw if constructor requires arguments but none are provided", () => {
			// Need a class that actually throws if args are missing
			class StrictWidget {
				public args: Array<any> = [];

				constructor(public name: string) {
					if (typeof name !== "string") {
						throw new TypeError("Name must be a string");
					}
				}
			}
			const strictSymbol = Symbol.for("strict");
			mockRegistry.register(strictSymbol, StrictWidget);
			// This will throw TypeError during `new StrictWidget()` inside `create`
			expect(() => factory.create(strictSymbol)).toThrow(TypeError); // The original error bubbles up
		});
	});

	describe("getRegistry", () => {
		it("should return the associated registry instance", () => {
			expect(factory.getRegistry()).toBe(mockRegistry);
		});
	});
});
