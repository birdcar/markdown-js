import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { fromMarkdown } from 'mdast-util-from-markdown'
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

  const self = this
  return function transform(tree: Root) {
    transformFootnotes(tree, self)
  }
}

function transformFootnotes(tree: Root, processor: Processor<Root>): void {
  const refs: Array<{ node: any; label: string }> = []
  const defs = new Map<string, any>()

  walkTree(tree, (node: any) => {
    if (node.type === 'footnoteRef') refs.push({ node, label: node.label })
    if (node.type === 'footnoteDef') defs.set(node.label, node)
  })

  if (refs.length === 0 && defs.size === 0) return

  // Assign indices in first-appearance order
  const labelToIndex = new Map<string, number>()
  const labelRefCounts = new Map<string, number>()
  const labelRefIds = new Map<string, string[]>()
  let counter = 0

  for (const ref of refs) {
    if (!labelToIndex.has(ref.label)) {
      counter++
      labelToIndex.set(ref.label, counter)
    }
    const index = labelToIndex.get(ref.label)!
    ref.node.index = index

    const count = (labelRefCounts.get(ref.label) ?? 0) + 1
    labelRefCounts.set(ref.label, count)

    const refId = count === 1 ? `fnref-${ref.label}` : `fnref-${ref.label}-${count}`
    if (!labelRefIds.has(ref.label)) labelRefIds.set(ref.label, [])
    labelRefIds.get(ref.label)!.push(refId)

    ref.node.data = {
      hName: 'sup',
      hProperties: { class: 'footnote-ref', id: refId },
      hChildren: [{
        type: 'element',
        tagName: 'a',
        properties: { href: `#fn-${ref.label}`, role: 'doc-noteref' },
        children: [{ type: 'text', value: `[${index}]` }],
      }],
    }
  }

  // Check for undefined labels
  for (const ref of refs) {
    if (!defs.has(ref.label)) {
      throw new Error(`Footnote reference [^${ref.label}] has no corresponding definition`)
    }
  }

  // Re-parse def bodies as BFM and assign indices
  const data = processor.data()
  for (const [label, def] of defs) {
    const index = labelToIndex.get(label)
    if (index != null) def.index = index

    if (def._rawContent && (!def.children || def.children.length === 0)) {
      const bodyTree = fromMarkdown(def._rawContent, {
        extensions: (data.micromarkExtensions || []) as any[],
        mdastExtensions: (data.fromMarkdownExtensions || []) as any[],
      })
      def.children = bodyTree.children
    }
    delete def._rawContent
  }

  // Build root.footnotes array ordered by index
  const footnoteEntries = [...defs.entries()]
    .filter(([label]) => labelToIndex.has(label))
    .sort(([a], [b]) => labelToIndex.get(a)! - labelToIndex.get(b)!)
  ;(tree as any).footnotes = footnoteEntries.map(([, def]) => def)

  // Find @endnotes node — error if multiple
  let endnotesNode: any = null
  let endnotesCount = 0
  for (const node of tree.children) {
    if ((node as any).type === 'directiveBlock' && (node as any).name === 'endnotes') {
      endnotesCount++
      if (!endnotesNode) endnotesNode = node
    }
  }
  if (endnotesCount > 1) {
    throw new Error('Multiple @endnotes directives found; only one is allowed per document')
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

  // Build endnotes list with multi-ref backlinks
  const listItems: any[] = []
  for (const [label, index] of labelToIndex) {
    const def = defs.get(label)
    const contentChildren = def?.children?.length
      ? def.children.map((c: any) => JSON.parse(JSON.stringify(c)))
      : [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }]

    const refIds = labelRefIds.get(label) ?? []
    const backlinks = refIds.map((refId, i) => ({
      type: 'link',
      url: `#${refId}`,
      data: {
        hProperties: { class: 'footnote-backref', role: 'doc-backlink' },
      },
      children: [{ type: 'text', value: i === 0 ? '\u21a9' : `\u21a9\u{207D}${toSuperscript(i + 1)}\u{207E}` }],
    }))

    // Append backlinks to last paragraph
    const items = contentChildren
    if (items.length > 0) {
      const last = items[items.length - 1]
      if (last.type === 'paragraph') {
        const additions: any[] = []
        for (const bl of backlinks) {
          additions.push({ type: 'text', value: ' ' }, bl)
        }
        last.children = [...(last.children || []), ...additions]
      } else {
        const blNodes: any[] = []
        for (const bl of backlinks) {
          if (blNodes.length > 0) blNodes.push({ type: 'text', value: ' ' })
          blNodes.push(bl)
        }
        items.push({ type: 'paragraph', children: blNodes })
      }
    } else {
      const blNodes: any[] = []
      for (const bl of backlinks) {
        if (blNodes.length > 0) blNodes.push({ type: 'text', value: ' ' })
        blNodes.push(bl)
      }
      items.push({ type: 'paragraph', children: blNodes })
    }

    listItems.push({
      type: 'listItem',
      data: { hProperties: { id: `fn-${label}` } },
      children: items,
    })
  }

  endnotesNode.children = [{
    type: 'list',
    ordered: true,
    start: 1,
    spread: false,
    children: listItems,
  }]

  // Remove footnoteDef nodes from tree
  tree.children = tree.children.filter(
    (node: any) => node.type !== 'footnoteDef',
  ) as typeof tree.children
}

function toSuperscript(n: number): string {
  const superDigits = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079'
  return String(n).split('').map(d => superDigits[Number(d)]).join('')
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
