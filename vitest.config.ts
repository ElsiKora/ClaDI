import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@domain': '/home/ubuntu/registry-factory-lib/src/domain',
      '@application': '/home/ubuntu/registry-factory-lib/src/application',
      '@infrastructure': '/home/ubuntu/registry-factory-lib/src/infrastructure',
      '@presentation': '/home/ubuntu/registry-factory-lib/src/presentation',
    },
  },
});
