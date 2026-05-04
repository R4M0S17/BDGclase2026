import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'development',
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgres://mock-never-connected',
    },
  },
  plugins: [
    {
      // TypeScript NodeNext writes '.js' in import paths; resolve them to '.ts' for Vitest.
      name: 'resolve-ts-from-js',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source.startsWith('.') && source.endsWith('.js') && importer) {
          const dir = dirname(importer.replace(/^file:\/\//, ''))
          const tsPath = resolve(dir, source.replace(/\.js$/, '.ts'))
          if (existsSync(tsPath)) return tsPath
        }
      },
    },
  ],
})
