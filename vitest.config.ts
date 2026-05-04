import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/App.tsx',
        'src/views/**',
        'src/components/**',
        'src/hooks/**',
        'src/workers/**',
        'src/data/**',
      ],
    },
  },
});
