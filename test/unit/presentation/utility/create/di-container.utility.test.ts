import { describe, expect, it } from "vitest";
import { createDIContainer, createToken } from "@presentation/utility/create";

describe("createDIContainer utility", () => {
	it("creates a DI container capable of resolving providers", () => {
		const container = createDIContainer();
		const countToken = createToken<number>("count");

		container.register({ provide: countToken, useValue: 3 });

		expect(container.resolve(countToken)).toBe(3);
	});
});
