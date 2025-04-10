<p align="center">
  <img src="https://6jft62zmy9nx2oea.public.blob.vercel-storage.com/cladi-eBDDJPOc5fj21RO45PzAwrdkkqGCHi.png" width="500" alt="project-logo">
</p>

<h1 align="center">ClaDI 🧩</h1>
<p align="center"><em>ClaDI is a library for creating and managing classes in TypeScript</em></p>

<p align="center">
    <a aria-label="ElsiKora logo" href="https://elsikora.com">
  <img src="https://img.shields.io/badge/MADE%20BY%20ElsiKora-333333.svg?style=for-the-badge" alt="ElsiKora">
</a> <img src="https://img.shields.io/badge/typescript-blue.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript"> <img src="https://img.shields.io/badge/npm-red.svg?style=for-the-badge&logo=npm&logoColor=white" alt="npm"> <img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=for-the-badge&logo=license&logoColor=white" alt="license-MIT"> <img src="https://img.shields.io/badge/Node.js-green.svg?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"> <img src="https://img.shields.io/badge/ESM-orange.svg?style=for-the-badge&logo=javascript&logoColor=white" alt="ESM"> <img src="https://img.shields.io/badge/CJS-teal.svg?style=for-the-badge&logo=javascript&logoColor=white" alt="CJS"> <img src="https://img.shields.io/badge/zero-deps-brightgreen.svg?style=for-the-badge&logo=checkmarx&logoColor=white" alt="zero-deps">
</p>


## 📚 Table of Contents
- [Description](#-description)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [License](#-license)


## 📖 Description
ClaDI is a powerful TypeScript library that provides a robust foundation for building scalable applications through class-based dependency injection. With ClaDI, you can easily create, manage, and organize your application's classes and dependencies with a clean, modular architecture. The library offers a comprehensive set of tools for class instantiation, dependency registration, and lifecycle management, making it ideal for both small projects and enterprise-level applications. Whether you're building a simple utility or a complex system, ClaDI helps establish a solid architectural foundation with minimal overhead.

## 🚀 Features
- ✨ **🚀 Zero dependencies - Lightweight footprint with no external runtime dependencies**
- ✨ **📦 Registry system - Store, retrieve, and manage class templates efficiently**
- ✨ **🏭 Factory pattern - Create class instances with intelligent object cloning**
- ✨ **💉 Dependency injection - Simple yet powerful container for managing application services**
- ✨ **🔄 Caching mechanism - Performance optimization for frequently used classes**
- ✨ **🧩 Modular architecture - Clean separation of concerns with domain, infrastructure, and presentation layers**
- ✨ **📝 Comprehensive logging - Built-in logging system with multiple log levels and context support**
- ✨ **🔌 Multiple format support - Works with both ESM and CommonJS module systems**
- ✨ **✅ Fully tested - Extensive unit and E2E test coverage ensures reliability**

## 🛠 Installation
```bash
# Using npm
npm install @elsikora/cladi

# Using yarn
yarn add @elsikora/cladi

# Using pnpm
pnpm add @elsikora/cladi

# Using bun
bun add @elsikora/cladi
```

## 💡 Usage
## Basic Usage with Class Instances (NEW)

The following example demonstrates how to properly create and use the core components of ClaDI with class instances:

```typescript
import { createContainer, createFactory, createRegistry, ELoggerLogLevel } from '@elsikora/cladi';

// Define a class with methods
class User {
  constructor(public id: number, public name: string, public email: string) {}
  
  getName() {
    return this.name;
  }
  
  greet() {
    return `Hello, ${this.name}!`;
  }
}

// Create a registry to store user templates
const userRegistry = createRegistry<User>();

// Register a user template
const adminTemplate = new User(1, "admin", "admin@example.com");
userRegistry.register(adminTemplate);

// Create a factory with proper class instantiation 
// THIS IS THE KEY IMPROVEMENT - use creator pattern for class instances!
const userFactory = createFactory<User>({
  registry: userRegistry,
  creator: (name, template) => {
    // Create a proper class instance, not just a clone
    return new User(template.id, template.name, template.email);
  }
});

// Create a user instance
const adminUser = userFactory.create('admin');
console.log(adminUser.greet()); // "Hello, admin!"
console.log(adminUser instanceof User); // true - prototype is preserved!

// Modify instance (won't affect the original template)
adminUser.email = 'new-admin@example.com';
```

## Working with Plain Objects

For simple data objects without methods, the standard approach works well:

```typescript
import { createFactory, createRegistry } from '@elsikora/cladi';

// Define a simple model with required getName method
interface Config {
  name: string;
  settings: {
    enabled: boolean;
    timeout: number;
  };
  getName(): string;
}

// Create registry and register a template
const configRegistry = createRegistry<Config>();
configRegistry.register({
  name: 'default',
  settings: { enabled: true, timeout: 5000 },
  getName() { return this.name; }
});

// Create factory (normal cloning works fine for simple objects)
const configFactory = createFactory<Config>({ registry: configRegistry });

// Create a config instance
const config = configFactory.create('default');
console.log(config); // { name: 'default', settings: { enabled: true, timeout: 5000 }, getName: [Function] }
```

## Dependency Injection Container

Use the container to manage application services:

```typescript
import { createContainer, ELoggerLogLevel, type ILogger } from '@elsikora/cladi';

// Create symbols for service identification
const LoggerToken = Symbol('Logger');
const DatabaseToken = Symbol('Database');

// Create a container
const container = createContainer({});

// Register services
container.register(LoggerToken, createLogger({ 
  level: ELoggerLogLevel.INFO,
  source: 'AppRoot' 
}));

container.register(DatabaseToken, {
  connect: () => console.log('Connected to database'),
  query: (sql: string) => console.log(`Executing query: ${sql}`)
});

// Retrieve services
const logger = container.get<ILogger>(LoggerToken);
const db = container.get(DatabaseToken);

logger?.info('Application started');
db?.connect();
db?.query('SELECT * FROM users');
```

## Advanced Logging

The built-in logger provides extensive capabilities:

```typescript
import { createLogger, ELoggerLogLevel } from '@elsikora/cladi';

const logger = createLogger({
  level: ELoggerLogLevel.TRACE,  // Most detailed logging level
  source: 'PaymentService'
});

// Basic logging
logger.info('Processing payment');

// Logging with context data
logger.debug('Payment details received', {
  context: {
    paymentId: '12345',
    amount: 99.99,
    currency: 'USD'
  }
});

// Method-specific source
logger.warn('Retry attempt required', {
  source: 'PaymentGateway',  // Will be combined with constructor source
  context: {
    attempt: 2,
    maxAttempts: 3
  }
});

// Sample output:
// [2023-07-15T12:34:56.789Z] INFO: [PaymentService] Processing payment
// [2023-07-15T12:34:56.790Z] DEBUG: [PaymentService] Payment details received {"paymentId":"12345","amount":99.99,"currency":"USD"}
// [2023-07-15T12:34:56.791Z] WARN: [PaymentService → PaymentGateway] Retry attempt required {"attempt":2,"maxAttempts":3}
```

## 🛣 Roadmap
| Task / Feature | Status |
|----------------|--------|
| Core Registry implementation | ✅ Done |
| Core Factory implementation | ✅ Done |
| Dependency Injection Container | ✅ Done |
| Logging System | ✅ Done |
| Support for ESM and CJS modules | ✅ Done |
| Registry caching mechanism | ✅ Done |
| Improved object cloning with method preservation | ✅ Done |
| Class instance creation via constructor | ✅ Done |
| Custom transformers | ✅ Done |
| API documentation | 🚧 In Progress |
| Type safety improvements | 🚧 In Progress |
| Async factory support | 🚧 In Progress |
| Schema validation | 🚧 In Progress |
| Event system | 🚧 In Progress |
| Circular dependency detection | 🚧 In Progress |
| Lifecycle hooks | 🚧 In Progress |
| Lazy loading | 🚧 In Progress |
| Serialization/deserialization utilities | 🚧 In Progress |
| Performance benchmarks | 🚧 In Progress |
| Web framework integrations | 🚧 In Progress |

## ❓ FAQ
## Frequently Asked Questions

### Why are my objects losing their methods after creation?
This problem has been fixed in the latest version! For class instances, use the `creator` option in your factory setup to ensure proper instantiation with preserved methods:

```typescript
const factory = createFactory<MyClass>({
  registry: myRegistry,
  creator: (name, template) => new MyClass(template.prop1, template.prop2)
});
```

### Is there a performance penalty for using the factory pattern?
The factory now uses a hybrid approach: `structuredClone()` for simple objects and a custom prototype-preserving clone for objects with methods. This provides better performance than the previous approach while ensuring your methods are properly preserved.

### Is ClaDI suitable for small projects?
Yes, ClaDI is designed to be scalable for projects of all sizes. For small projects, you can use just the components you need, such as the Registry and Factory, without implementing the full dependency injection system.

### How does ClaDI compare to other DI frameworks like InversifyJS or TypeDI?
ClaDI is more lightweight and focused, with zero external dependencies. It provides core building blocks rather than a full-featured DI framework. It's suitable for projects that need a clean, extensible foundation with minimal overhead.

### Does ClaDI work with browser environments?
Yes, ClaDI is designed to work in both Node.js and browser environments. It's built with ES modules and also provides CommonJS compatibility.

## 🔒 License
This project is licensed under **MIT License

Copyright (c) 2025 ElsiKora

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**.