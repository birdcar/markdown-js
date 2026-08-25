import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/inlines/tasks/index.ts',
    'src/inlines/modifiers/index.ts',
    'src/inlines/mentions/index.ts',
    'src/blocks/index.ts',
    'src/blocks/frontmatter/index.ts',
    'src/inlines/hashtags/index.ts',
    'src/inlines/footnotes/index.ts',
    'src/analysis/index.ts',
    'src/metadata/index.ts',
    'src/merge/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
