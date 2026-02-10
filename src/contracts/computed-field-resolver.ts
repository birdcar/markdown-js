import type { Root } from 'mdast'
import type { BuiltinMetadata } from '../metadata/types.js'

export type ComputedFieldResolver = (
  tree: Root,
  frontmatter: Record<string, unknown>,
  builtins: BuiltinMetadata,
) => Record<string, unknown>
