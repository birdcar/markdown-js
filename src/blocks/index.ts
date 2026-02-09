import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { combineExtensions } from 'micromark-util-combine-extensions'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { calloutSyntax } from './callout/syntax.js'
import { calloutFromMarkdown } from './callout/from-markdown.js'
import { calloutToMarkdown } from './callout/to-markdown.js'
import { embedSyntax } from './embed/syntax.js'
import { embedFromMarkdown } from './embed/from-markdown.js'

export function remarkBfmDirectives(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(
    combineExtensions([calloutSyntax(), embedSyntax()]),
  )
  fromMarkdownExtensions.push(calloutFromMarkdown())
  fromMarkdownExtensions.push(embedFromMarkdown())
  toMarkdownExtensions.push(calloutToMarkdown())

  // Add transform to re-parse callout body text into markdown children
  const self = this
  return function transform(tree: Root) {
    parseDirectiveBodies(tree, self)
  }
}

function parseDirectiveBodies(tree: Root, processor: Processor<Root>): void {
  for (const node of tree.children) {
    if ((node as any).type === 'directiveBlock' && (node as any).name === 'callout') {
      const directive = node as any
      const bodyLines: string[] = directive._bodyLines || []
      delete directive._bodyLines

      if (bodyLines.length > 0) {
        const bodyText = bodyLines.join('\n')
        // Re-parse body using the same extensions
        const data = processor.data()
        const bodyTree = fromMarkdown(bodyText, {
          extensions: (data.micromarkExtensions || []) as any[],
          mdastExtensions: (data.fromMarkdownExtensions || []) as any[],
        })
        directive.children = bodyTree.children
      }
    }
  }
}

export type { DirectiveBlockNode } from '../types.js'
