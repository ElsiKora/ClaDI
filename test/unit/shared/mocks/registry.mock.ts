import type { IRegistry } from "@domain/interface";
import type { TConstructor } from "@domain/type";

export class MockRegistry<T> implements IRegistry<T> {
	public calls: Record<string, Array<any>> = {
		clear: [],
		get: [],
		getAll: [],
		getMany: [],
		has: [],
		register: [],
		registerMany: [],
		unregister: [],
		unregisterMany: [],
	};

	private readonly items = new Map<string, T | TConstructor<T>>();

	clear(): void {
		this.calls.clear.push([]);
		this.items.clear();
	}

	get(name: symbol): T | TConstructor<T> | undefined {
		this.calls.get.push([name]);

		return this.items.get(String(name));
	}

	getAll(): Array<T | TConstructor<T>> {
		this.calls.getAll.push([]);

		return [...this.items.values()];
	}

	getMany(names: Array<symbol>): Array<T | TConstructor<T>> {
		this.calls.getMany.push([names]);

		return names.map((name) => this.items.get(String(name))).filter((item): item is T | TConstructor<T> => item !== undefined);
	}

	has(name: symbol): boolean {
		this.calls.has.push([name]);

		return this.items.has(String(name));
	}

	register(name: symbol, item: T | TConstructor<T>): void {
		this.calls.register.push([name, item]);

		// Simulate potential error for duplicate registration if needed in tests
		if (this.items.has(String(name))) {
			// Optionally throw or just overwrite based on test needs
			// console.warn(`MockRegistry: Overwriting existing item for ${String(name)}`);
		}
		this.items.set(String(name), item);
	}

	registerMany(items: Record<symbol, T | TConstructor<T>>): void {
		this.calls.registerMany.push([items]);

		for (const name of Object.getOwnPropertySymbols(items)) {
			const item: T | TConstructor<T> | undefined = items[name];

			if (item) {
				this.items.set(String(name), item);
			}
		}
	}

	// Helper method to reset calls and items between tests
	reset(): void {
		this.items.clear();
		this.calls = {
			clear: [],
			get: [],
			getAll: [],
			getMany: [],
			has: [],
			register: [],
			registerMany: [],
			unregister: [],
			unregisterMany: [],
		};
	}

	unregister(name: symbol): void {
		this.calls.unregister.push([name]);
		this.items.delete(String(name));
	}

	unregisterMany(names: Array<symbol>): void {
		this.calls.unregisterMany.push([names]);

		for (const name of names) {
			this.items.delete(String(name));
		}
	}
}
