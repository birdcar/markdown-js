import type { Root } from 'mdast'
import type { DirectiveBlockNode } from '../types.js'
import type { DirectiveDefinition } from './registry.js'

export const BUILTIN_DIRECTIVES: Record<string, DirectiveDefinition> = {
  details: {
    kind: 'container',
    transform: (n) => {
      n.data = {
        hName: 'details',
        hProperties: n.params.open ? { open: true } : {},
      }
      if (n.params.summary) {
        const summaryNode = {
          type: 'paragraph',
          children: [{ type: 'text', value: String(n.params.summary) }],
          data: { hName: 'summary' },
        }
        n.children = [summaryNode as any, ...(n.children || [])]
      }
    },
  },

  figure: {
    kind: 'container',
    transform: (n) => {
      n.data = {
        hName: 'figure',
        hProperties: n.params.id ? { id: String(n.params.id) } : {},
      }
      if (n.params.src) {
        const imgNode = {
          type: 'image',
          url: String(n.params.src),
          alt: n.params.alt ? String(n.params.alt) : '',
        }
        if (n.children && n.children.length > 0) {
          const figcaptionNode = {
            type: 'paragraph',
            children: n.children,
            data: { hName: 'figcaption' },
          }
          n.children = [imgNode as any, figcaptionNode as any]
        } else {
          n.children = [imgNode as any]
        }
      }
    },
  },

  aside: {
    kind: 'container',
    transform: (n) => {
      n.data = {
        hName: 'aside',
        hProperties: { class: 'aside' },
      }
      if (n.params.title) {
        const titleNode = {
          type: 'paragraph',
          children: [{ type: 'text', value: String(n.params.title) }],
          data: { hName: 'p', hProperties: { class: 'aside__title' } },
        }
        n.children = [titleNode as any, ...(n.children || [])]
      }
    },
  },

  tabs: {
    kind: 'container',
    transform: (n) => {
      const props: Record<string, string> = { class: 'tabs' }
      if (n.params.id) props['data-sync-id'] = String(n.params.id)
      n.data = { hName: 'div', hProperties: props }

      const tabChildren = (n.children || []).filter(
        (c: any) => c.type === 'directiveBlock' && c.name === 'tab',
      )
      const hasActive = tabChildren.some((t: any) => t.params.active === true)

      const navButtons = tabChildren.map((tab: any, i: number) => {
        const isActive = tab.params.active === true || (!hasActive && i === 0)
        return {
          type: 'text',
          value: String(tab.params.label || ''),
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

      n.children = [navNode as any, ...(n.children || [])]
    },
  },

  tab: {
    kind: 'container',
    toHast: (n) => {
      const isActive = n.params.active === true
      const props: Record<string, string> = {
        class: isActive ? 'tabs__panel tabs__panel--active' : 'tabs__panel',
        role: 'tabpanel',
      }
      if (n.params.label) props['aria-label'] = String(n.params.label)
      return { hName: 'div', hProperties: props }
    },
  },

  toc: {
    kind: 'leaf',
    transform: (n, ctx) => {
      n.data = {
        hName: 'nav',
        hProperties: { class: 'toc', 'aria-label': 'Table of contents' },
      }
      buildToc(ctx.tree, n)
    },
  },

  include: {
    kind: 'leaf',
    toHast: (n) => {
      const path = (n.params._positional as unknown as string[] | undefined)?.[0] || n.params.path || ''
      const props: Record<string, string> = { class: 'include' }
      if (path) props['data-path'] = String(path)
      if (n.params.heading) props['data-heading'] = String(n.params.heading)
      return { hName: 'div', hProperties: props }
    },
  },

  query: {
    kind: 'leaf',
    toHast: (n) => {
      const props: Record<string, string> = { class: 'query' }
      if (n.params.type) props['data-query-type'] = String(n.params.type)
      if (n.params.state) props['data-query-state'] = String(n.params.state)
      if (n.params.tag) props['data-query-tag'] = String(n.params.tag)
      if (n.params.limit) props['data-query-limit'] = String(n.params.limit)
      if (n.params.sort) props['data-query-sort'] = String(n.params.sort)
      return { hName: 'div', hProperties: props }
    },
  },

  math: {
    kind: 'leaf',
    transform: (n) => {
      const content = n.meta?.body || ''
      const props: Record<string, string> = {
        class: 'math',
        role: 'math',
        'aria-label': content,
      }
      if (n.params.label) props.id = String(n.params.label)
      n.data = {
        hName: 'div',
        hProperties: props,
        hChildren: [{ type: 'text', value: content }],
      }
    },
  },

  endnotes: {
    kind: 'leaf',
    transform: (n) => {
      n.data = {
        hName: 'section',
        hProperties: { class: 'endnotes', role: 'doc-endnotes' },
      }
      if (n.params.title) {
        const heading = {
          type: 'heading',
          depth: 2,
          children: [{ type: 'text', value: String(n.params.title) }],
        }
        n.children = [heading as any, ...(n.children || [])]
      }
    },
  },

  callout: {
    kind: 'container',
    transform: (n) => {
      n.data = {
        hName: 'aside',
        hProperties: {
          class: `callout callout--${String(n.params.type ?? 'info')}`,
        },
      }
      if (n.params.title) {
        const headerNode = {
          type: 'paragraph',
          children: [{ type: 'text', value: String(n.params.title) }],
          data: { hName: 'div', hProperties: { class: 'callout__header' } },
        }
        n.children = [headerNode as any, ...(n.children || [])]
      }
    },
  },

  embed: {
    kind: 'leaf',
    transform: (n) => {
      const url = String((n.params._positional as unknown as string[] | undefined)?.[0] ?? n.params.url ?? '')
      const caption = n.meta?.body ?? ''
      n.data = {
        hName: 'figure',
        hProperties: { class: 'embed', 'data-url': url },
      }
      if (caption) {
        n.children = [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: caption }],
            data: { hName: 'figcaption' },
          } as any,
        ]
      }
    },
  },
}

function buildToc(tree: Root, tocNode: DirectiveBlockNode): void {
  const maxDepth = tocNode.params.depth ? Number(tocNode.params.depth) : 3
  const ordered = tocNode.params.ordered === true

  const headings: Array<{ depth: number; text: string; id: string }> = []

  const tocIndex = tree.children.indexOf(tocNode as any)

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i] as any
    if (node.type !== 'heading') continue
    if (node.depth > maxDepth) continue

    if (i === tocIndex - 1) continue
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

    let j = i + 1
    while (j < end && headings[j].depth > h.depth) j++

    const item: any = {
      type: 'listItem',
      children: [linkNode],
    }

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
