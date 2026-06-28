import { defineConfig } from 'vitest/config';

// Dedicated test config so vitest doesn't load vite.config.js (and its React
// plugin) for our Node-side unit tests. Keeps test output clean.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
  },
});
