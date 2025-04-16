import type { IBaseRegistryOptions } from "@infrastructure/interface";

import { BaseRegistry } from "@infrastructure/class/base";
import { createRegistry } from "@presentation/utility/create";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the BaseRegistry implementation
vi.mock("@infrastructure/class/base", () => ({
	BaseRegistry: vi.fn(),
	// Include other exports from the module if needed by other imports, or make mock more specific
}));

describe("createRegistry utility", () => {
	const mockRegistryInstance = { name: "MockInstance" };

	beforeEach(() => {
		vi.clearAllMocks();
		(BaseRegistry as ReturnType<typeof vi.fn>).mockImplementation(() => mockRegistryInstance);
	});

	it("should call BaseRegistry constructor with provided options", () => {
		const options: IBaseRegistryOptions = {
			logger: new MockLogger(),
		};
		const registry = createRegistry(options);

		expect(BaseRegistry).toHaveBeenCalledTimes(1);
		expect(BaseRegistry).toHaveBeenCalledWith(options);
		expect(registry).toBe(mockRegistryInstance);
	});

	it("should call BaseRegistry constructor without options if none provided", () => {
		const registry = createRegistry();

		expect(BaseRegistry).toHaveBeenCalledTimes(1);
		expect(BaseRegistry).toHaveBeenCalledWith(undefined);
		expect(registry).toBe(mockRegistryInstance);
	});
});
