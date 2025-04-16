import type { ILogger, ILoggerMethodOptions, ILoggerOptions } from "@domain/interface";

import { ELoggerLogLevel } from "@domain/enum";

export class MockLogger implements ILogger {
	public calls: Record<string, Array<{ message: string; options?: ILoggerMethodOptions }>> = {
		debug: [],
		error: [],
		info: [],
		trace: [],
		warn: [],
	};

	public defaultOptions: ILoggerOptions = { level: ELoggerLogLevel.INFO };

	public description = "Mock Logger";

	public name = "mock";

	debug(message: string, options?: ILoggerMethodOptions): void {
		this.calls.debug.push({ message, options });
	}

	error(message: string, options?: ILoggerMethodOptions): void {
		this.calls.error.push({ message, options });
	}

	// Helper method for tests to easily check calls
	getCalls(level: keyof MockLogger["calls"]): Array<{ message: string; options?: ILoggerMethodOptions }> {
		return this.calls[level] ?? [];
	}

	getDefaultOptions(): ILoggerOptions {
		return this.defaultOptions;
	}

	getDescription(): string {
		return this.description;
	}

	getName(): string {
		return this.name;
	}

	info(message: string, options?: ILoggerMethodOptions): void {
		this.calls.info.push({ message, options });
	}

	// Helper method to reset calls between tests
	reset(): void {
		this.calls = {
			debug: [],
			error: [],
			info: [],
			trace: [],
			warn: [],
		};
	}

	trace(message: string, options?: ILoggerMethodOptions): void {
		this.calls.trace.push({ message, options });
	}

	validateOptions(_options: ILoggerOptions): boolean {
		// For mock purposes, assume options are always valid
		return true;
	}

	warn(message: string, options?: ILoggerMethodOptions): void {
		this.calls.warn.push({ message, options });
	}
}
