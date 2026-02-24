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

// Container directives whose bodies get re-parsed as markdown
const CONTAINER_DIRECTIVES = new Set([
  'callout', 'details', 'tabs', 'tab', 'figure', 'aside',
])

// Leaf directives whose bodies are NOT re-parsed
const LEAF_DIRECTIVES = new Set([
  'include', 'query', 'toc', 'math', 'endnotes',
])

export function remarkBfmDirectives(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  // Callout and embed have their own tokenizers; generic handles the 9 new directives.
  // Order matters: callout/embed registered first get priority at code 64.
  micromarkExtensions.push(
    combineExtensions([calloutSyntax(), embedSyntax(), genericDirectiveSyntax()]),
  )
  // Generic from-markdown handles ALL directiveBlock tokens (including callout)
  // by reading the name from the directiveBlockName token.
  fromMarkdownExtensions.push(genericDirectiveFromMarkdown())
  fromMarkdownExtensions.push(embedFromMarkdown())
  toMarkdownExtensions.push(calloutToMarkdown())

  const self = this
  return function transform(tree: Root) {
    parseDirectiveBodies(tree, self)
    applyDirectiveData(tree)
  }
}

function parseDirectiveBodies(tree: Root, processor: Processor<Root>): void {
  // walkDirectives visits parent then recurses into children,
  // so nested directives created by body re-parsing are processed automatically.
  walkDirectives(tree, (directive: any) => {
    const bodyLines: string[] = directive._bodyLines || []
    delete directive._bodyLines

    if (CONTAINER_DIRECTIVES.has(directive.name)) {
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
    } else if (directive.name === 'math') {
      if (!directive.meta) directive.meta = {}
      directive.meta.content = bodyLines.join('\n')
      directive.children = []
    } else if (LEAF_DIRECTIVES.has(directive.name)) {
      if (bodyLines.length > 0) {
        if (!directive.meta) directive.meta = {}
        directive.meta.body = bodyLines.join('\n')
      }
      directive.children = []
    }
  })
}

function applyDirectiveData(tree: Root): void {
  walkDirectives(tree, (directive) => applyDataToDirective(directive, tree))
}

function walkDirectives(node: any, visitor: (directive: any) => void): void {
  if (!node.children) return
  for (const child of node.children) {
    if (child.type === 'directiveBlock') {
      visitor(child)
      // Also walk into children for nested directives
      walkDirectives(child, visitor)
    }
  }
}

function applyDataToDirective(directive: any, tree: Root): void {

    switch (directive.name) {
      case 'details': {
        directive.data = {
          hName: 'details',
          hProperties: directive.params.open ? { open: true } : {},
        }
        // If summary param exists, prepend a summary element as first child
        if (directive.params.summary) {
          const summaryNode = {
            type: 'paragraph',
            children: [{ type: 'text', value: String(directive.params.summary) }],
            data: { hName: 'summary' },
          }
          directive.children = [summaryNode, ...(directive.children || [])]
        }
        break
      }
      case 'figure': {
        directive.data = {
          hName: 'figure',
          hProperties: directive.params.id ? { id: String(directive.params.id) } : {},
        }
        // If src param, prepend image node; wrap remaining in figcaption
        if (directive.params.src) {
          const imgNode = {
            type: 'image',
            url: String(directive.params.src),
            alt: directive.params.alt ? String(directive.params.alt) : '',
          }
          if (directive.children && directive.children.length > 0) {
            const figcaptionNode = {
              type: 'paragraph',
              children: directive.children,
              data: { hName: 'figcaption' },
            }
            directive.children = [imgNode, figcaptionNode]
          } else {
            directive.children = [imgNode]
          }
        }
        break
      }
      case 'aside': {
        directive.data = {
          hName: 'aside',
          hProperties: { class: 'aside' },
        }
        if (directive.params.title) {
          const titleNode = {
            type: 'paragraph',
            children: [{ type: 'text', value: String(directive.params.title) }],
            data: { hName: 'p', hProperties: { class: 'aside__title' } },
          }
          directive.children = [titleNode, ...(directive.children || [])]
        }
        break
      }
      case 'tabs': {
        const props: Record<string, string> = { class: 'tabs' }
        if (directive.params.id) props['data-sync-id'] = String(directive.params.id)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'tab': {
        const props: Record<string, string> = { class: 'tabs__panel', role: 'tabpanel' }
        if (directive.params.label) props['aria-label'] = String(directive.params.label)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'math': {
        const props: Record<string, string> = { class: 'math', role: 'math' }
        if (directive.params.label) props.id = String(directive.params.label)
        directive.data = {
          hName: 'div',
          hProperties: props,
          hChildren: [{ type: 'text', value: directive.meta?.content || '' }],
        }
        break
      }
      case 'toc': {
        directive.data = {
          hName: 'nav',
          hProperties: { class: 'toc', 'aria-label': 'Table of contents' },
        }
        // Build TOC from headings in the document
        buildToc(tree, directive)
        break
      }
      case 'include': {
        const props: Record<string, string> = { class: 'include' }
        if (directive.params.src) props['data-src'] = String(directive.params.src)
        if (directive.params.heading) props['data-heading'] = String(directive.params.heading)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'query': {
        const props: Record<string, string> = { class: 'query' }
        if (directive.params.type) props['data-query-type'] = String(directive.params.type)
        if (directive.params.from) props['data-query-from'] = String(directive.params.from)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'endnotes': {
        directive.data = {
          hName: 'section',
          hProperties: { class: 'endnotes', role: 'doc-endnotes' },
        }
        break
      }
    }
}

function buildToc(tree: Root, tocNode: any): void {
  const maxDepth = tocNode.params.depth ? Number(tocNode.params.depth) : 3
  const ordered = tocNode.params.ordered === true

  const headings: Array<{ depth: number; text: string; id: string }> = []

  for (const node of tree.children) {
    if ((node as any).type === 'heading') {
      const heading = node as any
      if (heading.depth <= maxDepth) {
        const text = extractText(heading)
        const id = slugify(text)
        headings.push({ depth: heading.depth, text, id })
        // Set id on heading for anchor linking
        if (!heading.data) heading.data = {}
        if (!heading.data.hProperties) heading.data.hProperties = {}
        heading.data.hProperties.id = id
      }
    }
  }

  if (headings.length === 0) return

  // Build nested list
  tocNode.children = [buildListFromHeadings(headings, ordered)]
}

function buildListFromHeadings(
  headings: Array<{ depth: number; text: string; id: string }>,
  ordered: boolean,
): any {
  const listType = ordered ? 'list' : 'list'
  const items: any[] = []

  for (const h of headings) {
    items.push({
      type: 'listItem',
      children: [{
        type: 'paragraph',
        children: [{
          type: 'link',
          url: `#${h.id}`,
          children: [{ type: 'text', value: h.text }],
        }],
      }],
    })
  }

  return {
    type: listType,
    ordered,
    spread: false,
    children: items,
  }
}

function extractText(node: any): string {
  if (node.type === 'text') return node.value || ''
  if (node.children) return node.children.map(extractText).join('')
  return ''
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export type { DirectiveBlockNode } from '../types.js'
