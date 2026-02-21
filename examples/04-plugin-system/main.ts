/**
 * Example 04: Plugin System
 *
 * Demonstrates advanced provider patterns:
 * - Multi-binding: multiple providers for the same token (resolveAll)
 * - Alias providers (useExisting) for interface abstraction
 * - Lazy providers for deferred initialization
 * - Dynamic plugin registration and discovery
 */

import { createDIContainer, createLazyProvider, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, Token } from "@elsikora/cladi";

// ─── Domain ───

interface IPlugin {
	name: string;
	execute(input: string): string;
}

interface IPluginRegistry {
	executeAll(input: string): Array<{ plugin: string; result: string }>;
	listPlugins(): Array<string>;
}

interface IHeavyAnalytics {
	analyze(data: string): string;
}

interface ITextFormatter {
	format(input: string): string;
}

// ─── Tokens ───

const PluginToken: Token<IPlugin> = createToken<IPlugin>("Plugin");
const PluginRegistryToken: Token<IPluginRegistry> = createToken<IPluginRegistry>("PluginRegistry");
const TextFormatterToken: Token<ITextFormatter> = createToken<ITextFormatter>("TextFormatter");
const FormatterAliasToken: Token<ITextFormatter> = createToken<ITextFormatter>("FormatterAlias");
const HeavyAnalyticsToken: Token<IHeavyAnalytics> = createToken<IHeavyAnalytics>("HeavyAnalytics");
const LazyAnalyticsToken: Token<() => Promise<IHeavyAnalytics>> = createToken<() => Promise<IHeavyAnalytics>>("LazyAnalytics");

// ─── Plugin Implementations ───

class UpperCasePlugin implements IPlugin {
	name = "uppercase";

	execute(input: string): string {
		return input.toUpperCase();
	}
}

class ReversePlugin implements IPlugin {
	name = "reverse";

	execute(input: string): string {
		return input.split("").reverse().join("");
	}
}

class Base64Plugin implements IPlugin {
	name = "base64";

	execute(input: string): string {
		return Buffer.from(input).toString("base64");
	}
}

class WordCountPlugin implements IPlugin {
	name = "word-count";

	execute(input: string): string {
		const count = input.split(/\s+/).filter(Boolean).length;

		return `${count} words`;
	}
}

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 04: Plugin System ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "plugin-app" });

	// ─── Multi-binding: register multiple plugins under one token ───

	console.log("── Registering plugins (multi-binding) ──");

	container.register({
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: PluginToken,
		useFactory: () => {
			console.log("  Created: UpperCasePlugin");

			return new UpperCasePlugin();
		},
	});

	container.register({
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: PluginToken,
		useFactory: () => {
			console.log("  Created: ReversePlugin");

			return new ReversePlugin();
		},
	});

	container.register({
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: PluginToken,
		useFactory: () => {
			console.log("  Created: Base64Plugin");

			return new Base64Plugin();
		},
	});

	container.register({
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: PluginToken,
		useFactory: () => {
			console.log("  Created: WordCountPlugin");

			return new WordCountPlugin();
		},
	});

	// ─── Alias provider: FormatterAlias → TextFormatter ───

	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: TextFormatterToken,
		useFactory: (): ITextFormatter => {
			console.log("  Created: TextFormatter");

			return {
				format: (input: string) => input.trim().replace(/\s+/g, " "),
			};
		},
	});

	container.register({
		provide: FormatterAliasToken,
		useExisting: TextFormatterToken,
	});

	// ─── Plugin registry that consumes all plugins ───

	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: PluginRegistryToken,
		useFactory: (): IPluginRegistry => {
			const allPlugins: Array<IPlugin> = container.resolveAll(PluginToken);

			return {
				executeAll: (input: string) => allPlugins.map((plugin) => ({ plugin: plugin.name, result: plugin.execute(input) })),
				listPlugins: () => allPlugins.map((p) => p.name),
			};
		},
	});

	// ─── Lazy provider: heavy analytics deferred until needed ───

	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: HeavyAnalyticsToken,
		useFactory: async (): Promise<IHeavyAnalytics> => {
			console.log("\n  [Lazy] HeavyAnalytics: initializing (simulated async load)...");
			await new Promise((resolve) => setTimeout(resolve, 100));
			console.log("  [Lazy] HeavyAnalytics: ready!");

			return {
				analyze: (data: string) => `Analysis of "${data}": ${data.length} chars, ${data.split(/\s+/).length} words`,
			};
		},
	});

	container.register(createLazyProvider(LazyAnalyticsToken, HeavyAnalyticsToken));

	// ─── Using the plugin system ───

	console.log("\n── Resolving all plugins ──");
	const allPlugins: Array<IPlugin> = container.resolveAll(PluginToken);
	console.log(`  Found ${allPlugins.length} plugins: ${allPlugins.map((p) => p.name).join(", ")}\n`);

	console.log("── Alias provider (useExisting) ──");
	const formatter: ITextFormatter = container.resolve(TextFormatterToken);
	const aliased: ITextFormatter = container.resolve(FormatterAliasToken);
	console.log(`  Same instance via alias: ${formatter === aliased}`);
	console.log(`  Result: "${aliased.format("  hello    world  ")}"\n`);

	console.log("── Running all plugins ──");
	const registry: IPluginRegistry = container.resolve(PluginRegistryToken);
	const results = registry.executeAll("Hello ClaDI");

	for (const { plugin, result } of results) {
		console.log(`  [${plugin}] → ${result}`);
	}

	// ─── Lazy loading ───

	console.log("\n── Lazy provider (deferred initialization) ──");
	console.log("  Resolving lazy analytics factory...");
	const getAnalytics: () => Promise<IHeavyAnalytics> = container.resolve(LazyAnalyticsToken);
	console.log("  Factory resolved (analytics NOT yet initialized)");

	console.log("  Now calling the factory...");
	const analytics: IHeavyAnalytics = await getAnalytics();
	console.log(`  ${analytics.analyze("The quick brown fox jumps")}`);

	console.log("\n── Container stats ──");
	const tokens = container.getRegisteredTokens();
	console.log(`  Registered tokens: ${tokens.length}`);

	await container.dispose();
	console.log("\n✓ Example 04 complete");
}

main().catch((error: Error) => {
	console.error(error.message);
	process.exitCode = 1;
});
