import type { IContainer } from "@domain/interface";
import type { TConstructor, TContainerDynamicFactory } from "@domain/type";

export class MockContainer implements IContainer {
	public calls: Record<string, Array<any>> = {
		clear: [],
		get: [],
		getAll: [],
		getMany: [],
		has: [],
		register: [],
		registerMany: [],
		resolve: [],
		unregister: [],
		unregisterMany: [],
	};

	private readonly dependencies = new Map<symbol, unknown>();

	clear(): void {
		this.calls.clear.push([]);
		this.dependencies.clear();
	}

	get<T>(token: symbol): T {
		this.calls.get.push([token]);

		if (!this.dependencies.has(token)) {
			throw new Error(`MockContainer: Dependency not found for token "${String(token.description)}"`);
		}
		const dependency = this.dependencies.get(token);

		// Basic mock: Return registered value directly. Doesn't handle constructor/factory resolution.
		return dependency as T;
	}

	getAll<T>(): Array<T> {
		this.calls.getAll.push([]);

		// Basic mock: Return all registered values directly.
		return [...this.dependencies.values()] as Array<T>;
	}

	getMany<T>(tokens: Array<symbol>): Array<T> {
		this.calls.getMany.push([tokens]);

		return tokens.map((token) => this.get<T>(token));
	}

	has(token: symbol): boolean {
		this.calls.has.push([token]);

		return this.dependencies.has(token);
	}

	register<T>(token: symbol, implementation: T | TConstructor<T> | TContainerDynamicFactory<T>): void {
		this.calls.register.push([token, implementation]);

		if (this.dependencies.has(token)) {
			// console.warn(`MockContainer: Overwriting existing dependency for ${String(token.description)}`);
		}
		this.dependencies.set(token, implementation);
	}

	registerMany<T>(tokens: Array<symbol>, implementations: Record<symbol, T | TConstructor<T> | TContainerDynamicFactory<T>>): void {
		this.calls.registerMany.push([tokens, implementations]);

		for (const token of tokens) {
			if (Object.prototype.hasOwnProperty.call(implementations, token)) {
				this.dependencies.set(token, implementations[token]);
			}
		}
	}

	// Helper method to reset calls and dependencies between tests
	reset(): void {
		this.dependencies.clear();
		this.calls = {
			clear: [],
			get: [],
			getAll: [],
			getMany: [],
			has: [],
			register: [],
			registerMany: [],
			resolve: [],
			unregister: [],
			unregisterMany: [],
		};
	}

	resolve<T>(constructor: TConstructor<T>): T {
		this.calls.resolve.push([constructor]);
		// Basic mock: Does not actually resolve dependencies.
		// This needs to be mocked specifically in tests if resolve behavior is needed.
		console.warn(`MockContainer: resolve called for ${constructor.name}, but mock doesn't implement resolution.`);

		// Attempt a basic instantiation, might fail if constructor needs args
		try {
			return new constructor();
		} catch {
			throw new Error(`MockContainer: Failed to instantiate ${constructor.name} in basic resolve. Mock resolve behavior if needed.`);
		}
	}

	// Helper method to set a dependency directly for testing
	setDependency<T>(token: symbol, instance: T): void {
		this.dependencies.set(token, instance);
	}

	unregister(token: symbol): void {
		this.calls.unregister.push([token]);
		this.dependencies.delete(token);
	}

	unregisterMany(tokens: Array<symbol>): void {
		this.calls.unregisterMany.push([tokens]);

		for (const token of tokens) this.dependencies.delete(token);
	}
}
