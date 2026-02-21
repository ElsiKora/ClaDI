/**
 * Example 02: Lifecycle Management
 *
 * Demonstrates the three dependency lifecycles:
 * - SINGLETON: One instance shared across the entire container and all scopes
 * - SCOPED: One instance per scope (child scopes get their own)
 * - TRANSIENT: A new instance on every resolve() call
 *
 * Also shows lifecycle hooks: onInit, afterResolve, onDispose.
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, Token } from "@elsikora/cladi";

// ─── Domain ───

interface ICounterService {
	id: number;
	increment(): number;
	value(): number;
}

// ─── Tokens ───

const SingletonCounterToken: Token<ICounterService> = createToken<ICounterService>("SingletonCounter");
const ScopedCounterToken: Token<ICounterService> = createToken<ICounterService>("ScopedCounter");
const TransientCounterToken: Token<ICounterService> = createToken<ICounterService>("TransientCounter");

// ─── Implementation ───

let nextInstanceId = 0;

class CounterService implements ICounterService {
	readonly id: number;
	private count = 0;

	constructor() {
		this.id = ++nextInstanceId;
	}

	increment(): number {
		return ++this.count;
	}

	value(): number {
		return this.count;
	}
}

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 02: Lifecycle Management ===\n");

	nextInstanceId = 0;

	const container: IDIContainer = createDIContainer({ scopeName: "root" });

	// Singleton — shared everywhere
	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		onDispose: (instance: ICounterService) => console.log(`  [dispose] Singleton counter #${instance.id} disposed (final value: ${instance.value()})`),
		onInit: (instance: ICounterService) => console.log(`  [init] Singleton counter #${instance.id} created`),
		provide: SingletonCounterToken,
		useFactory: () => new CounterService(),
	});

	// Scoped — one per scope
	container.register({
		lifecycle: EDependencyLifecycle.SCOPED,
		onDispose: (instance: ICounterService) => console.log(`  [dispose] Scoped counter #${instance.id} disposed (final value: ${instance.value()})`),
		onInit: (instance: ICounterService) => console.log(`  [init] Scoped counter #${instance.id} created`),
		provide: ScopedCounterToken,
		useFactory: () => new CounterService(),
	});

	// Transient — new instance every time
	container.register({
		afterResolve: (instance: ICounterService) => console.log(`  [afterResolve] Transient counter #${instance.id} resolved`),
		lifecycle: EDependencyLifecycle.TRANSIENT,
		provide: TransientCounterToken,
		useFactory: () => new CounterService(),
	});

	// ─── Singleton behavior ───

	console.log("── Singleton (same instance everywhere) ──");
	const s1: ICounterService = container.resolve(SingletonCounterToken);
	const s2: ICounterService = container.resolve(SingletonCounterToken);
	s1.increment();
	s1.increment();
	console.log(`  s1.id=${s1.id}, s2.id=${s2.id}, same ref: ${s1 === s2}, value: ${s2.value()}\n`);

	// ─── Scoped behavior ───

	console.log("── Scoped (one instance per scope) ──");
	const scopeA = container.createScope("scope-A");
	const scopeB = container.createScope("scope-B");

	const scopedA1: ICounterService = scopeA.resolve(ScopedCounterToken);
	const scopedA2: ICounterService = scopeA.resolve(ScopedCounterToken);
	scopedA1.increment();

	const scopedB1: ICounterService = scopeB.resolve(ScopedCounterToken);
	scopedB1.increment();
	scopedB1.increment();
	scopedB1.increment();

	console.log(`  Scope A: id=${scopedA1.id}, same ref: ${scopedA1 === scopedA2}, value: ${scopedA2.value()}`);
	console.log(`  Scope B: id=${scopedB1.id}, value: ${scopedB1.value()}`);
	console.log(`  Different scopes, different instances: ${scopedA1 !== scopedB1}\n`);

	// Singleton is still shared across scopes
	const sFromA: ICounterService = scopeA.resolve(SingletonCounterToken);
	const sFromB: ICounterService = scopeB.resolve(SingletonCounterToken);
	console.log(`  Singleton in scope A: id=${sFromA.id}, same as root: ${sFromA === s1}`);
	console.log(`  Singleton in scope B: id=${sFromB.id}, same as root: ${sFromB === s1}\n`);

	// ─── Transient behavior ───

	console.log("── Transient (new instance every time) ──");
	const t1: ICounterService = container.resolve(TransientCounterToken);
	const t2: ICounterService = container.resolve(TransientCounterToken);
	const t3: ICounterService = scopeA.resolve(TransientCounterToken);

	console.log(`  t1.id=${t1.id}, t2.id=${t2.id}, t3.id=${t3.id}`);
	console.log(`  All different: ${t1 !== t2 && t2 !== t3}\n`);

	// ─── Disposal ───

	console.log("── Disposing scopes ──");
	await scopeA.dispose();
	console.log("  Scope A disposed.\n");
	await scopeB.dispose();
	console.log("  Scope B disposed.\n");

	console.log("── Disposing root container ──");
	await container.dispose();
	console.log("  Root container disposed.\n");

	console.log("✓ Example 02 complete");
}

main().catch((error: Error) => {
	console.error(error.message);
	process.exitCode = 1;
});
