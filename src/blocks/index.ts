import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { genericDirectiveSyntax } from './generic/syntax.js'
import { genericDirectiveFromMarkdown } from './generic/from-markdown.js'
import { directiveToMarkdown } from './generic/to-markdown.js'
import { BUILTIN_DIRECTIVES } from './builtins.js'
import { resolveToHast } from './registry.js'
import type { RemarkBfmOptions, DirectiveDefinition } from './registry.js'
import {
  rebaseTreePositions,
  type SourceLine,
} from '../analysis/rebase-position.js'
import type { SourcePoint } from '../analysis/types.js'

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

  micromarkExtensions.push(genericDirectiveSyntax())
  fromMarkdownExtensions.push(genericDirectiveFromMarkdown())
  toMarkdownExtensions.push(directiveToMarkdown())

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
  walkChildDirectives(tree, (directive) => {
    parseDirectiveBody(directive, processor, registry)
  })
}

function parseDirectiveBody(
  directive: any,
  processor: Processor<Root>,
  registry: Record<string, DirectiveDefinition>,
): void {
  const bodyLines = buildBodyLines(directive)
  delete directive._bodyLines
  delete directive._closeStart

  const def = registry[directive.name]
  const kind = def?.kind ?? 'container'
  const bodyText = bodyLines.map((line) => line.value).join('\n')

  if (kind === 'container') {
    if (bodyText.length === 0) {
      directive.children = []
      return
    }

    const data = processor.data()
    const bodyTree = fromMarkdown(bodyText, {
      extensions: (data.micromarkExtensions || []) as any[],
      mdastExtensions: (data.fromMarkdownExtensions || []) as any[],
    })
    walkChildDirectives(bodyTree, (child) => {
      parseDirectiveBody(child, processor, registry)
    })
    rebaseTreePositions(bodyTree, bodyLines)
    directive.children = bodyTree.children
    return
  }

  if (bodyText.length > 0) {
    if (!directive.meta) directive.meta = {}
    directive.meta.body = bodyText
  }
  directive.children = []
}

function buildBodyLines(directive: any): SourceLine[] {
  const records = (directive._bodyLines ?? []) as SourceLine[]
  if (records.length === 0) return []

  const firstLine = (directive.position?.start.line ?? records[0].start.line - 1) + 1
  const closeStart = directive._closeStart as SourcePoint | undefined
  const lastLine = closeStart?.line
    ? closeStart.line - 1
    : records[records.length - 1].start.line
  const byLine = new Map(records.map((record) => [record.start.line, record]))
  const lines: SourceLine[] = []

  for (let line = firstLine; line <= lastLine; line++) {
    const record = byLine.get(line)
    if (record) {
      lines.push(record)
      continue
    }
    const next = records.find((candidate) => candidate.start.line > line)
    lines.push({
      value: '',
      start: {
        line,
        column: 1,
        offset: next?.start.offset ?? closeStart?.offset ?? records[records.length - 1].start.offset,
      },
    })
  }
  return lines
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
  walkChildDirectives(node, (directive) => {
    visitor(directive)
    walkDirectives(directive, visitor)
  })
}

function walkChildDirectives(
  node: any,
  visitor: (directive: any) => void,
): void {
  if (!node.children) return
  for (const child of node.children) {
    if (child.type === 'directiveBlock') {
      visitor(child)
    } else {
      walkChildDirectives(child, visitor)
    }
  }
}

export type { DirectiveBlockNode } from '../types.js'
