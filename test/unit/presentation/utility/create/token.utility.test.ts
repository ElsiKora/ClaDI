import { describe, expect, it } from "vitest";
import { createToken } from "@presentation/utility/create";

describe("createToken utility", () => {
	it("creates symbol tokens with description", () => {
		const token = createToken<string>("example-token");

		expect(typeof token).toBe("symbol");
		expect(token.description).toBe("example-token");
	});
});
