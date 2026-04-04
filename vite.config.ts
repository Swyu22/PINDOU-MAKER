import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const runtimeEnv =
  typeof globalThis === 'object' && 'process' in globalThis
    ? ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {})
    : {};
const repositoryName = runtimeEnv.GITHUB_REPOSITORY?.split('/')[1];
const base = runtimeEnv.BASE_PATH ?? (runtimeEnv.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/');

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
