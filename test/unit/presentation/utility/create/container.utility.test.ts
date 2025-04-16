import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseContainer } from "@infrastructure/class/base";
import { createContainer } from "@presentation/utility/create";
import { MockLogger } from "@test-shared/mocks/logger.mock";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the BaseContainer implementation
vi.mock("@infrastructure/class/base", () => ({
	BaseContainer: vi.fn(),
	// Include other exports from the module if needed by other imports, or make mock more specific
}));

describe("createContainer utility", () => {
	const mockContainerInstance = { name: "MockInstance" };

	beforeEach(() => {
		vi.clearAllMocks();
		(BaseContainer as ReturnType<typeof vi.fn>).mockImplementation(() => mockContainerInstance);
	});

	it("should call BaseContainer constructor with provided options", () => {
		const options: IBaseContainerOptions = {
			logger: new MockLogger(),
			name: Symbol.for("UtilityTestContainer"),
		};
		const container = createContainer(options);

		expect(BaseContainer).toHaveBeenCalledTimes(1);
		expect(BaseContainer).toHaveBeenCalledWith(options);
		expect(container).toBe(mockContainerInstance);
	});
});
