# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test/Lint Commands
- Build: `npm run build` (rollup bundler)
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`  
- Run single test: `npx vitest run test/path/to/file.test.ts`
- Lint: `npm run lint` (ESLint)
- Type check: `npm run lint:types` (TypeScript)
- Format: `npm run format:fix` (Prettier)

## Code Style
- Clean architecture with domain/application/infrastructure/presentation layers
- Path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`
- File naming: kebab-case with descriptive suffixes (.class.ts, .interface.ts, .enum.ts)
- Format: 2-space tabs, double quotes, 480 char line width, trailing commas, semicolons
- TypeScript: strict mode with all strict flags enabled
- Classes: PascalCase, Interfaces: IInterface pattern, methods/variables: camelCase
- Error handling: Custom BaseError class with detailed messages
- Testing: Vitest with vi.fn() for mocks, clear test descriptions
- Commits: Conventional commits format with commitlint