import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig(async (environment) => mergeConfig(
  await (typeof viteConfig === 'function' ? viteConfig(environment) : viteConfig),
  { test: { globals: true, environment: 'jsdom', setupFiles: './src/test/setup.ts' } },
))
