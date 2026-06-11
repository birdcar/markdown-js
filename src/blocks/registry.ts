import type { Root } from 'mdast'
import type { DirectiveBlockNode } from '../types.js'

export type HastData = {
  hName?: string
  hProperties?: Record<string, unknown>
  hChildren?: unknown[]
}

export type DirectiveContext = { tree: Root }

export interface DirectiveDefinition {
  kind: 'container' | 'leaf'
  toHast?: HastData | ((node: DirectiveBlockNode) => HastData)
  transform?: (node: DirectiveBlockNode, ctx: DirectiveContext) => void
}

export interface RemarkBfmOptions {
  directives?: Record<string, DirectiveDefinition>
}

export function resolveToHast(
  toHast: HastData | ((node: DirectiveBlockNode) => HastData),
  node: DirectiveBlockNode,
): HastData {
  if (typeof toHast === 'function') return toHast(node)
  return toHast
}
