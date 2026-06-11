import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { combineExtensions } from 'micromark-util-combine-extensions'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { calloutSyntax } from './callout/syntax.js'
import { calloutToMarkdown } from './callout/to-markdown.js'
import { embedSyntax } from './embed/syntax.js'
import { embedFromMarkdown } from './embed/from-markdown.js'
import { genericDirectiveSyntax } from './generic/syntax.js'
import { genericDirectiveFromMarkdown } from './generic/from-markdown.js'
import { BUILTIN_DIRECTIVES } from './builtins.js'
import { resolveToHast } from './registry.js'
import type { RemarkBfmOptions, DirectiveDefinition } from './registry.js'

export function remarkBfmDirectives(this: Processor<Root>, options?: RemarkBfmOptions) {
  const registry: Record<string, DirectiveDefinition> = Object.assign(
    Object.create(null) as Record<string, DirectiveDefinition>,
    BUILTIN_DIRECTIVES,
    options?.directives ?? {},
  )

  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(
    combineExtensions([genericDirectiveSyntax(), calloutSyntax(), embedSyntax()]),
  )
  fromMarkdownExtensions.push(genericDirectiveFromMarkdown())
  fromMarkdownExtensions.push(embedFromMarkdown())
  toMarkdownExtensions.push(calloutToMarkdown())

  const self = this
  return function transform(tree: Root) {
    parseDirectiveBodies(tree, self, registry)
    applyDirectiveData(tree, registry)
  }
}

function parseDirectiveBodies(
  tree: Root,
  processor: Processor<Root>,
  registry: Record<string, DirectiveDefinition>,
): void {
  walkDirectives(tree, (directive: any) => {
    const bodyLines: string[] = directive._bodyLines || []
    delete directive._bodyLines

    const def = registry[directive.name]
    const kind = def?.kind ?? 'container'

    if (kind === 'container') {
      if (bodyLines.length > 0) {
        const bodyText = bodyLines.join('\n')
        const data = processor.data()
        const bodyTree = fromMarkdown(bodyText, {
          extensions: (data.micromarkExtensions || []) as any[],
          mdastExtensions: (data.fromMarkdownExtensions || []) as any[],
        })
        directive.children = bodyTree.children
      } else {
        directive.children = []
      }
    } else {
      if (bodyLines.length > 0) {
        if (!directive.meta) directive.meta = {}
        directive.meta.body = bodyLines.join('\n')
      }
      directive.children = []
    }
  })
}

function applyDirectiveData(
  tree: Root,
  registry: Record<string, DirectiveDefinition>,
): void {
  walkDirectives(tree, (directive) => {
    const def = registry[directive.name]
    if (!def) return

    if (def.transform) {
      def.transform(directive, { tree })
    } else if (def.toHast !== undefined) {
      directive.data = resolveToHast(def.toHast, directive)
    }
  })
}

function walkDirectives(node: any, visitor: (directive: any) => void): void {
  if (!node.children) return
  for (const child of node.children) {
    if (child.type === 'directiveBlock') {
      visitor(child)
      walkDirectives(child, visitor)
    }
  }
}

export type { DirectiveBlockNode } from '../types.js'
