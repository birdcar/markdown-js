import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { footnoteRefSyntax, footnoteDefSyntax } from './syntax.js'
import { footnoteFromMarkdown } from './from-markdown.js'
import { footnoteToMarkdown } from './to-markdown.js'

export function remarkBfmFootnotes(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(footnoteRefSyntax())
  micromarkExtensions.push(footnoteDefSyntax())
  fromMarkdownExtensions.push(footnoteFromMarkdown())
  toMarkdownExtensions.push(footnoteToMarkdown())

  return function transform(tree: Root) {
    transformFootnotes(tree)
  }
}

function transformFootnotes(tree: Root): void {
  // Collect all footnote refs (in order of appearance) and defs
  const refs: Array<{ node: any; label: string }> = []
  const defs = new Map<string, any>()

  walkTree(tree, (node: any) => {
    if (node.type === 'footnoteRef') {
      refs.push({ node, label: node.label })
    }
    if (node.type === 'footnoteDef') {
      defs.set(node.label, node)
    }
  })

  if (refs.length === 0) return

  // Assign auto-numbered indices in order of first appearance
  const labelToIndex = new Map<string, number>()
  let counter = 0
  for (const ref of refs) {
    if (!labelToIndex.has(ref.label)) {
      counter++
      labelToIndex.set(ref.label, counter)
    }
    const index = labelToIndex.get(ref.label)!
    ref.node.data = {
      hName: 'sup',
      hProperties: { class: 'footnote-ref', id: `fnref-${ref.label}` },
      hChildren: [{
        type: 'element',
        tagName: 'a',
        properties: { href: `#fn-${ref.label}`, role: 'doc-noteref' },
        children: [{ type: 'text', value: `[${index}]` }],
      }],
    }
  }

  // Find @endnotes node or create one at end of document
  let endnotesNode: any = null
  for (const node of tree.children) {
    if ((node as any).type === 'directiveBlock' && (node as any).name === 'endnotes') {
      endnotesNode = node
      break
    }
  }

  if (!endnotesNode) {
    endnotesNode = {
      type: 'directiveBlock',
      name: 'endnotes',
      params: {},
      children: [],
      data: {
        hName: 'section',
        hProperties: { class: 'endnotes', role: 'doc-endnotes' },
      },
    } as any
    ;(tree.children as any[]).push(endnotesNode)
  }

  // Build ordered list of footnote definitions
  const listItems: any[] = []
  for (const [label, index] of labelToIndex) {
    const def = defs.get(label)
    const contentChildren = def
      ? (def.children && def.children.length > 0
          ? def.children
          : def._rawContent
            ? [{ type: 'paragraph', children: [{ type: 'text', value: def._rawContent }] }]
            : [])
      : [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }]

    const backlink = {
      type: 'link',
      url: `#fnref-${label}`,
      data: {
        hProperties: { class: 'footnote-backref', role: 'doc-backlink' },
      },
      children: [{ type: 'text', value: '\u21a9' }],
    }

    // Append backlink to last paragraph's children
    const items = [...contentChildren]
    if (items.length > 0) {
      const last = items[items.length - 1]
      if (last.type === 'paragraph') {
        last.children = [...(last.children || []), { type: 'text', value: ' ' }, backlink]
      } else {
        items.push({ type: 'paragraph', children: [backlink] })
      }
    } else {
      items.push({ type: 'paragraph', children: [backlink] })
    }

    listItems.push({
      type: 'listItem',
      data: {
        hProperties: { id: `fn-${label}` },
      },
      children: items,
    })
  }

  const list = {
    type: 'list',
    ordered: true,
    start: 1,
    spread: false,
    children: listItems,
  }

  endnotesNode.children = [list]

  // Remove footnoteDef nodes from tree (they've been moved to endnotes)
  tree.children = tree.children.filter(
    (node: any) => node.type !== 'footnoteDef',
  ) as typeof tree.children
}

function walkTree(node: any, visitor: (node: any) => void): void {
  visitor(node)
  if (node.children) {
    for (const child of node.children) {
      walkTree(child, visitor)
    }
  }
}

export type { FootnoteRefNode, FootnoteDefNode } from '../../types.js'
