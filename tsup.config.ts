import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/inlines/tasks/index.ts',
    'src/inlines/modifiers/index.ts',
    'src/inlines/mentions/index.ts',
    'src/blocks/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
