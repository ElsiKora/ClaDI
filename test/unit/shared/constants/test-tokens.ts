/**
 * Common symbols used as dependency injection tokens in tests.
 */
export const TEST_TOKENS = {
	ApiService: Symbol.for("TestApiService"),
	// Example service/dependency tokens
	ConfigService: Symbol.for("TestConfigService"),
	// Core components
	Container: Symbol.for("TestContainer"),
	Factory: Symbol.for("TestFactory"),

	Logger: Symbol.for("TestLogger"),
	MockData: Symbol.for("TestMockData"),
	Registry: Symbol.for("TestRegistry"),
};
