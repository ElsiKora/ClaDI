import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dtsPathAlias from "rollup-plugin-dts-path-alias";
import generatePackageJson from "rollup-plugin-generate-package-json";

const external = [];

export default [
	{
		external,
		input: "src/index.ts",
		output: {
			dir: "dist/esm",
			entryFileNames: (chunkInfo) => {
				if (chunkInfo.name.includes("node_modules")) {
					return chunkInfo.name.replace("node_modules", "external") + ".js";
				}

				return "[name].js";
			},
			format: "esm",
			preserveModules: true,
			preserveModulesRoot: "src",
			sourcemap: true,
		},
		plugins: [
			resolve({
				include: ["node_modules/tslib/**"],
			}),
			dtsPathAlias(),
			typescript({
				declaration: true,
				declarationDir: "dist/esm",
				outDir: "dist/esm",
				sourceMap: true,
				tsconfig: "./tsconfig.build.json",
			}),
			generatePackageJson({
				baseContents: { type: "module" },
				outputFolder: "dist/esm",
			}),
		],
	},
];
