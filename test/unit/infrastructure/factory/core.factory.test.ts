import type { ILogger } from "@domain/interface";
import type { ICoreFactoryOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { describe, expect, it, vi } from "vitest";
import { DIContainer } from "@infrastructure/class/di";
import { CoreFactory } from "@infrastructure/factory";
import { ConsoleLoggerService } from "@infrastructure/service";

describe("CoreFactory", () => {
	it("returns a new instance for each getInstance call", () => {
		const options: ICoreFactoryOptions = {};
		const firstFactory = CoreFactory.getInstance(options);
		const secondFactory = CoreFactory.getInstance(options);

		expect(firstFactory).not.toBe(secondFactory);
	});

	it("creates DIContainer instances with forwarded options", () => {
		const factory = new CoreFactory({});
		const container = factory.createDIContainer({ scopeName: "request-scope" });

		expect(container).toBeInstanceOf(DIContainer);
		expect(container.id).toBe("request-scope");
	});

	it("creates ConsoleLoggerService instances", () => {
		const loggerProxy: ILogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
		const factory = new CoreFactory({ logger: loggerProxy });
		const logger = factory.createLogger({
			level: ELoggerLogLevel.DEBUG,
			source: "CoreFactoryTest",
		});

		expect(logger).toBeInstanceOf(ConsoleLoggerService);
		expect(loggerProxy.debug).toHaveBeenCalled();
	});
});
