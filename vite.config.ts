import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build works at https://<user>.github.io/<repo>/
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
