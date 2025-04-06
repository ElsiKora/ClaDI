# Project: TypeScript DI Container & Registry Pattern Example

This project demonstrates a basic implementation of Dependency Injection (DI) Container and Registry/Factory patterns in TypeScript, structured using a layered architecture.

## Architecture

The codebase follows a clean architecture approach with distinct layers:

-   **`src/domain`**: Contains the core business logic and abstractions (interfaces like `IContainer`, `IRegistry`, `IFactory`, `ILogger`) and shared enums (`EServiceToken`). This layer has no dependencies on other layers.
-   **`src/infrastructure`**: Provides concrete implementations of the interfaces defined in the `domain` layer (e.g., `Container`, `Registry`, `Factory`, `ConsoleLogger`). This layer depends only on the `domain` layer.
-   **`src/presentation`**: Contains UI-related logic or, in this case, helpers (`ContainerHelper`) that simplify interaction with the application's core services for the outermost layer. This layer depends on `domain` and the `composition-root`.
-   **`src/composition-root.ts`**: The central point where the application's object graph is composed. It creates instances of infrastructure components, wires them together according to domain interfaces, and configures the main DI container (`appContainer`). This is the only place (ideally) that should have knowledge of both `domain` and `infrastructure`.

## Core Concepts

-   **`IContainer`**: A simple Dependency Injection container responsible for managing the lifecycle and providing instances of registered dependencies (services, components) identified by string tokens.
-   **`IRegistry<T>`**: A generic registry for managing collections of named items (`T`, where `T` must have a `name: string` property). Useful for storing configurations, templates, or strategies.
-   **`IFactory<T>`**: A generic factory that typically uses an `IRegistry<T>` as a source to create instances of `T` based on a name/template.

## Setup

1.  **Prerequisites**: Node.js and npm/yarn installed.
2.  **Install Dependencies**: (Assuming a `package.json` exists or will be created)
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Build**: (Assuming a build script in `package.json`)
    ```bash
    npm run build
    # or
    yarn build
    ```

## Usage

### 1. Accessing Pre-configured Dependencies

The `composition-root.ts` configures and exports a singleton instance of the DI container: `appContainer`.
You can access pre-registered services (like the default logger) using the `ContainerHelper`:

```typescript
import { ContainerHelper } from "./presentation/helper"; // Adjust path as needed
import type { ILogger } from "./domain/interface";

const logger: ILogger = ContainerHelper.getLogger();
logger.info("Application started using the default logger.");

// Access other dependencies registered in composition-root
// Assuming a 'NotificationService' was registered with token 'notification'
// const notifier = ContainerHelper.getRequiredDependency<INotificationService>('notification');
// notifier.send("Hello!");
```

### 2. Creating New Registries and Factories On-Demand

If you need to create instances of `IRegistry` or `IFactory` dynamically (not just use pre-configured ones), you can use the `ContainerHelper` methods that leverage the registered `IInfrastructureFactory`:

```typescript
import { ContainerHelper } from "./presentation/helper";
import type { IRegistry, IFactory, IFactoryOptions } from "./domain/interface";

interface MyItem { name: string; id: number }

// Create a new Registry
const myDynamicRegistry: IRegistry<MyItem> = ContainerHelper.createNewRegistry<MyItem>();
myDynamicRegistry.register({ name: "dynamicItem1", id: 1 });

// Create a new Factory using the dynamic registry
const factoryOptions: Omit<IFactoryOptions<MyItem>, 'logger'> = {
    registry: myDynamicRegistry,
    // transformer: (item) => ({ ...item, name: item.name + "_transformed" }) // Optional transformer
};
const myDynamicFactory: IFactory<MyItem> = ContainerHelper.createNewFactory<MyItem>(factoryOptions);

const createdItem: MyItem = myDynamicFactory.create("dynamicItem1");
console.log("Created item:", createdItem);
```

### 3. Registering Custom Dependencies

The primary place to register application-wide dependencies is within the `configureContainer` function in `src/composition-root.ts`:

```typescript
// src/composition-root.ts
import type { IContainer, ILogger, IRegistry, IFactory } from "@domain/interface";
import { EServiceToken } from "@domain/interface";
import {
	ConsoleLogger,
	Container,
	Registry,
	Factory,
} from "@infrastructure/implementation";

// Example custom type
interface IMyService { name: string; doWork(): void; }
class MyServiceImpl implements IMyService { 
    name = 'MyService'; 
    doWork() { console.log('Working...'); } 
}

function configureContainer(): IContainer {
	const container: IContainer = new Container();

	// Register essential services
	const logger = new ConsoleLogger();
	container.register<ILogger>(EServiceToken.LOGGER, logger);

	// Register custom service
	container.register<IMyService>("MyServiceToken", new MyServiceImpl());

	// Register a registry and factory
	const myRegistry = new Registry<{ name: string; value: number }>(logger);
	myRegistry.register({ name: "config1", value: 100 });
	container.register<IRegistry<{ name: string; value: number }>>(
		EServiceToken.REGISTRY + ":MyConfig", // Use specific tokens
		myRegistry,
	);

	const myFactory = new Factory<{ name: string; value: number }>({
		registry: myRegistry,
		logger: logger,
	});
	container.register<IFactory<{ name: string; value: number }>>(
		EServiceToken.FACTORY + ":MyConfig",
		myFactory,
	);

	return container;
}

export const appContainer: IContainer = configureContainer();
```

### 4. Dynamic Registration/Access (Use Sparingly)

While most dependencies should be configured centrally, the `ContainerHelper` allows dynamic interaction with the *container itself* if needed:

```typescript
import { ContainerHelper } from "./presentation/helper";

// Check if a dependency exists
if (!ContainerHelper.hasDependency("DynamicService")) {
	console.log("Registering DynamicService...");
	ContainerHelper.registerDependency("DynamicService", { 
        message: "I was registered dynamically" 
    });
}

const dynamicService = ContainerHelper.getDependency<{ message: string }>("DynamicService");
console.log(dynamicService?.message);

// Clean up
ContainerHelper.removeDependency("DynamicService");
```

## Key Files

-   `src/index.ts`: Main entry point, exporting key modules.
-   `src/composition-root.ts`: Configures and exports the main `appContainer`, including the `IInfrastructureFactory`.
-   `src/domain/interface/`: Contains all core interfaces (`IContainer`, `IRegistry`, `IInfrastructureFactory`, etc.).
-   `src/infrastructure/implementation/`: Contains concrete implementations (`Container`, `Registry`, `InfrastructureFactory`, etc.).
-   `src/presentation/helper/container.helper.ts`: Provides static methods for easy access to the `appContainer` and for creating new registries/factories. 