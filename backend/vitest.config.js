import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MYSQL_DATABASE: 'rehome_test'
    }
  }
});
