import { describe, expect, it } from "vitest";
import { createDIContainer, createLazyProvider, createToken } from "@presentation/utility/create";

const LazyDependencyToken = createToken<number>("LazyDependency");
const LazyResolverFactoryToken = createToken<() => Promise<number>>("LazyResolverFactory");

describe("createLazyProvider utility", () => {
	it("creates a lazy provider that resolves dependency on invocation", async () => {
		const container = createDIContainer();
		container.register({
			provide: LazyDependencyToken,
			useValue: 5,
		});
		container.register(createLazyProvider(LazyResolverFactoryToken, LazyDependencyToken));

		const lazyResolver = container.resolve(LazyResolverFactoryToken);

		await expect(lazyResolver()).resolves.toBe(5);
	});
});
