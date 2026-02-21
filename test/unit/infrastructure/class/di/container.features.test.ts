import type { IDependencyGraph } from "@domain/interface";

import { EDependencyLifecycle } from "@domain/enum";
import { describe, expect, it } from "vitest";
import { DIContainer } from "@infrastructure/class/di";
import { createToken } from "@presentation/utility/create";

const LockedValueToken = createToken<string>("LockedValue");
const BootstrapSingletonValueToken = createToken<{ value: string }>("BootstrapSingletonValue");
const MultiBindingBootstrapValueToken = createToken<string>("MultiBindingBootstrapValue");
const GraphDependencyValueToken = createToken<string>("GraphDependencyValue");
const GraphRootValueToken = createToken<string>("GraphRootValue");

describe("DIContainer features", () => {
	it("locks registrations when lock() is called", async () => {
		const container = new DIContainer();
		container.register({
			provide: LockedValueToken,
			useValue: "initial",
		});

		container.lock();
		expect(container.isLocked).toBe(true);
		expect(container.snapshot().isLocked).toBe(true);

		expect(() =>
			container.register({
				provide: LockedValueToken,
				useValue: "override",
			}),
		).toThrow("Scope is locked for registrations");

		await expect(container.unregister(LockedValueToken)).rejects.toThrow("Scope is locked for registrations");
		expect(container.resolve(LockedValueToken)).toBe("initial");
	});

	it("bootstraps singleton providers and runs onInit hook", async () => {
		let onInitCount: number = 0;
		const container = new DIContainer();

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onInit: () => {
				onInitCount += 1;
			},
			provide: BootstrapSingletonValueToken,
			useFactory: () => ({ value: "bootstrapped" }),
		});

		await container.bootstrap();
		expect(onInitCount).toBe(1);

		const resolved = container.resolve(BootstrapSingletonValueToken);
		expect(resolved.value).toBe("bootstrapped");
		expect(onInitCount).toBe(1);
	});

	it("bootstraps explicit multi-binding tokens", async () => {
		const container = new DIContainer();

		container.register({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: MultiBindingBootstrapValueToken,
			useValue: "alpha",
		});

		container.register({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: MultiBindingBootstrapValueToken,
			useValue: "beta",
		});

		await container.bootstrap([MultiBindingBootstrapValueToken]);

		expect(container.resolveAll(MultiBindingBootstrapValueToken)).toEqual(["alpha", "beta"]);
	});

	it("throws structured token-not-found error when bootstrapping missing token", async () => {
		const container = new DIContainer();
		const missingBootstrapToken = createToken<string>("MissingBootstrap");

		await expect(container.bootstrap([missingBootstrapToken])).rejects.toThrow("Token not found in container");
	});

	it("exports dependency graph nodes and edges for current scope", () => {
		const container = new DIContainer();
		container.register({
			provide: GraphDependencyValueToken,
			useValue: "dep",
		});

		container.register({
			deps: [GraphDependencyValueToken],
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: GraphRootValueToken,
			useFactory: (dependency: string) => `root:${dependency}`,
		});

		const graph: IDependencyGraph = container.exportGraph();
		const hasRootNode: boolean = graph.nodes.some((node) => node.token === "Symbol(GraphRootValue)");
		const hasDependencyNode: boolean = graph.nodes.some((node) => node.token === "Symbol(GraphDependencyValue)");
		const hasEdge: boolean = graph.edges.some((edge) => edge.from === "Symbol(GraphRootValue)" && edge.to === "Symbol(GraphDependencyValue)");

		expect(graph.scopeId).toBe(container.id);
		expect(hasRootNode).toBe(true);
		expect(hasDependencyNode).toBe(true);
		expect(hasEdge).toBe(true);
	});
});
