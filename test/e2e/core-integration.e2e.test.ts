import type { IContainer, IFactory, ILogger, IRegistry } from "@domain/interface";

import { CoreFactory, type ICoreFactoryOptions } from "src/infrastructure";
import { beforeEach, describe, expect, it } from "vitest";

// Define a simple data structure for testing registry/factory
interface ITestConfig {
	id: number;
	name: string; // Required by BaseRegistry
	settings: { enabled: boolean };
}

// Define a token for the container
const TestConfigToken = Symbol("TestConfig");

describe("Core Infrastructure E2E Integration", () => {
	let coreFactory: CoreFactory;
	let registry: IRegistry<ITestConfig>;
	let itemFactory: IFactory<ITestConfig>;
	let container: IContainer;

	const testConfigTemplate: ITestConfig = {
		id: 1,
		name: "DefaultConfig",
		settings: { enabled: true },
	};

	beforeEach(() => {
		// Reset CoreFactory singleton instance if possible (using previous method)
		try {
			(CoreFactory as any).instance = undefined;
		} catch {
			console.warn("Could not reset CoreFactory instance for E2E test.");
		}

		// Create real instances using the CoreFactory
		const loggerMock: ILogger = { debug: () => {}, error: () => {}, info: () => {}, trace: () => {}, warn: () => {} };
		const factoryOptions: ICoreFactoryOptions = { logger: loggerMock };
		coreFactory = CoreFactory.getInstance(factoryOptions);

		// Create components using the factory
		registry = coreFactory.createRegistry<ITestConfig>({});
		itemFactory = coreFactory.createFactory<ITestConfig>({ registry });
		container = coreFactory.createContainer({});
	});

	it("should allow registering, creating via factory, registering in container, and retrieving", () => {
		// 1. Register template in Registry
		registry.register(testConfigTemplate);
		expect(registry.has(testConfigTemplate.name)).toBe(true);

		// 2. Create new instance using Item Factory (should be a clone)
		const createdInstance = itemFactory.create(testConfigTemplate.name);
		expect(createdInstance).toBeDefined();
		expect(createdInstance).toEqual(testConfigTemplate);
		expect(createdInstance).not.toBe(testConfigTemplate);
		expect(createdInstance.settings).not.toBe(testConfigTemplate.settings);

		// Modify the created instance to ensure it's separate
		createdInstance.id = 999;
		createdInstance.settings.enabled = false;
		expect(testConfigTemplate.id).toBe(1);
		expect(testConfigTemplate.settings.enabled).toBe(true);

		// 3. Register the *created* instance in the Container
		container.register(TestConfigToken, createdInstance);
		expect(container.has(TestConfigToken)).toBe(true);

		// 4. Retrieve the instance from the Container
		const retrievedInstance = container.get<ITestConfig>(TestConfigToken);
		expect(retrievedInstance).toBeDefined();
		expect(retrievedInstance).toBe(createdInstance);

		// 5. Verify the retrieved instance has the modified values
		expect(retrievedInstance?.id).toBe(999);
		expect(retrievedInstance?.settings.enabled).toBe(false);
	});

	// Add more E2E tests as needed for other flows
});
