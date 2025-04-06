import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@application": "/home/ubuntu/registry-factory-lib/src/application",
			"@domain": "/home/ubuntu/registry-factory-lib/src/domain",
			"@infrastructure": "/home/ubuntu/registry-factory-lib/src/infrastructure",
			"@presentation": "/home/ubuntu/registry-factory-lib/src/presentation",
		},
	},
	test: {
		environment: "node",
		globals: true,
	},
});
