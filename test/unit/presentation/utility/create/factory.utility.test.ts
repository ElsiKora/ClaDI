import type { IBaseFactoryOptions } from "@infrastructure/interface";

import { BaseFactory } from "@infrastructure/class/base";
import { createFactory } from "@presentation/utility/create";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { MockRegistry } from "@test-shared/mocks/registry.mock";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the BaseFactory implementation
vi.mock("@infrastructure/class/base", () => ({
	BaseFactory: vi.fn(),
	// Include other exports from the module if needed by other imports, or make mock more specific
}));

describe("createFactory utility", () => {
	const mockFactoryInstance = { name: "MockInstance" };

	beforeEach(() => {
		vi.clearAllMocks();
		(BaseFactory as ReturnType<typeof vi.fn>).mockImplementation(() => mockFactoryInstance);
	});

	it("should call BaseFactory constructor with provided options", () => {
		const options: IBaseFactoryOptions<any> = {
			logger: new MockLogger(),
			registry: new MockRegistry(),
		};
		const factory = createFactory(options);

		expect(BaseFactory).toHaveBeenCalledTimes(1);
		expect(BaseFactory).toHaveBeenCalledWith(options);
		expect(factory).toBe(mockFactoryInstance);
	});
});
