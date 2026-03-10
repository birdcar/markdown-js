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

        // Build nav from tab children
        const tabChildren = (directive.children || []).filter(
          (c: any) => c.type === 'directiveBlock' && c.name === 'tab'
        )
        const hasActive = tabChildren.some((t: any) => t.params.active === true)

        const navButtons = tabChildren.map((tab: any, i: number) => {
          const isActive = tab.params.active === true || (!hasActive && i === 0)
          return {
            type: 'text', value: String(tab.params.label || ''),
            data: {
              hName: 'button',
              hProperties: {
                class: isActive ? 'tabs__tab tabs__tab--active' : 'tabs__tab',
                role: 'tab',
                'aria-selected': isActive ? 'true' : 'false',
              },
            },
          }
        })

        const navNode = {
          type: 'paragraph',
          children: navButtons,
          data: { hName: 'div', hProperties: { class: 'tabs__nav', role: 'tablist' } },
        }

        directive.children = [navNode, ...(directive.children || [])]
        break
      }
      case 'tab': {
        const isActive = directive.params.active === true
        const props: Record<string, string> = {
          class: isActive ? 'tabs__panel tabs__panel--active' : 'tabs__panel',
          role: 'tabpanel',
        }
        if (directive.params.label) props['aria-label'] = String(directive.params.label)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'math': {
        const content = directive.meta?.content || ''
        const props: Record<string, string> = {
          class: 'math',
          role: 'math',
          'aria-label': content,
        }
        if (directive.params.label) props.id = String(directive.params.label)
        directive.data = {
          hName: 'div',
          hProperties: props,
          hChildren: [{ type: 'text', value: content }],
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
        const path = directive.params._positional?.[0] || directive.params.path || ''
        const props: Record<string, string> = { class: 'include' }
        if (path) props['data-path'] = String(path)
        if (directive.params.heading) props['data-heading'] = String(directive.params.heading)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'query': {
        const props: Record<string, string> = { class: 'query' }
        if (directive.params.type) props['data-query-type'] = String(directive.params.type)
        if (directive.params.state) props['data-query-state'] = String(directive.params.state)
        if (directive.params.tag) props['data-query-tag'] = String(directive.params.tag)
        if (directive.params.limit) props['data-query-limit'] = String(directive.params.limit)
        if (directive.params.sort) props['data-query-sort'] = String(directive.params.sort)
        directive.data = { hName: 'div', hProperties: props }
        break
      }
      case 'endnotes': {
        directive.data = {
          hName: 'section',
          hProperties: { class: 'endnotes', role: 'doc-endnotes' },
        }
        if (directive.params.title) {
          const heading = {
            type: 'heading',
            depth: 2,
            children: [{ type: 'text', value: String(directive.params.title) }],
          }
          directive.children = [heading, ...(directive.children || [])]
        }
        break
      }
    }
}

function buildToc(tree: Root, tocNode: any): void {
  const maxDepth = tocNode.params.depth ? Number(tocNode.params.depth) : 3
  const ordered = tocNode.params.ordered === true

  const headings: Array<{ depth: number; text: string; id: string }> = []

  // Find the index of the tocNode in tree.children
  const tocIndex = tree.children.indexOf(tocNode as any)

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i] as any
    if (node.type !== 'heading') continue
    if (node.depth > maxDepth) continue

    // Exclude the heading immediately preceding the @toc directive
    if (i === tocIndex - 1) continue
    // Skip the toc node itself (shouldn't be a heading, but defensive)
    if (i === tocIndex) continue

    const text = extractText(node)
    const id = slugify(text)
    headings.push({ depth: node.depth, text, id })

    if (!node.data) node.data = {}
    if (!node.data.hProperties) node.data.hProperties = {}
    node.data.hProperties.id = id
  }

  if (headings.length === 0) return
  tocNode.children = [buildNestedList(headings, 0, headings.length, ordered)]
}

function buildNestedList(
  headings: Array<{ depth: number; text: string; id: string }>,
  start: number,
  end: number,
  ordered: boolean,
): any {
  const items: any[] = []
  let i = start

  while (i < end) {
    const h = headings[i]
    const linkNode = {
      type: 'paragraph',
      children: [{
        type: 'link',
        url: `#${h.id}`,
        children: [{ type: 'text', value: h.text }],
      }],
    }

    // Find child headings (deeper than current)
    let j = i + 1
    while (j < end && headings[j].depth > h.depth) j++

    const item: any = {
      type: 'listItem',
      children: [linkNode],
    }

    // If there are child headings, nest them
    if (j > i + 1) {
      item.children.push(buildNestedList(headings, i + 1, j, ordered))
    }

    items.push(item)
    i = j
  }

  return {
    type: 'list',
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
