import type { Root, Text, Link, Image, ListItem } from 'mdast'
import type { Node, Parent } from 'unist'
import { visit } from 'unist-util-visit'
import type { ComputedFieldResolver } from '../contracts/computed-field-resolver.js'
import { sourceRange } from '../analysis/rebase-position.js'
import type { SourcePoint, SourceRange } from '../analysis/types.js'
import type { TaskState } from '../types.js'
import type {
  DocumentMetadata,
  BuiltinMetadata,
  TaskCollection,
  ExtractedTask,
  LinkReference,
  FootnoteReference,
} from './types.js'

export interface ExtractMetadataOptions {
  wpm?: number
  computedFields?: ComputedFieldResolver[]
}

export function extractMetadata(
  tree: Root,
  options?: ExtractMetadataOptions,
): DocumentMetadata {
  const frontmatter = extractFrontmatter(tree)
  const computed = computeBuiltins(tree, frontmatter, options?.wpm ?? 200)
  const custom = runCustomResolvers(
    tree,
    frontmatter,
    computed,
    options?.computedFields ?? [],
  )
  return { frontmatter, computed, custom }
}

function extractFrontmatter(tree: Root): Record<string, unknown> {
  for (const node of tree.children) {
    if ((node as any).type === 'yaml') {
      return (node as any).data ?? {}
    }
  }
  return {}
}

function computeBuiltins(
  tree: Root,
  frontmatter: Record<string, unknown>,
  wpm: number,
): BuiltinMetadata {
  const wordCount = computeWordCount(tree)
  const readingTime = Math.ceil(wordCount / wpm) || 1
  const tasks = extractTasks(tree)
  const tags = extractTags(tree, frontmatter)
  const links = extractLinks(tree)
  const footnotes = extractFootnotes(tree)

  return { wordCount, readingTime, tasks, tags, links, footnotes }
}

function computeWordCount(tree: Root): number {
  let count = 0
  visit(tree, 'text', (node: Text) => {
    const words = node.value.trim().split(/\s+/).filter(Boolean)
    count += words.length
  })
  // Also count words in inline code
  visit(tree, 'inlineCode', (node: any) => {
    const words = node.value.trim().split(/\s+/).filter(Boolean)
    count += words.length
  })
  // Count words in code blocks
  visit(tree, 'code', (node: any) => {
    if (node.value) {
      const words = node.value.trim().split(/\s+/).filter(Boolean)
      count += words.length
    }
  })
  return count
}

function extractTasks(tree: Root): TaskCollection {
  const collection: TaskCollection = {
    all: [],
    open: [],
    done: [],
    scheduled: [],
    migrated: [],
    irrelevant: [],
    event: [],
    priority: [],
  }

  visit(tree, 'listItem', (node: ListItem) => {
    const taskState = node.taskState as TaskState | undefined
    if (!taskState) return

    const paragraphs = node.children.filter((child) => child.type === 'paragraph')
    const marker = findFirst(paragraphs, 'taskMarker')
    const markerNodeRange = sourceRange(marker?.position) ?? emptyRange()
    const modifiers = findAll(paragraphs, 'taskModifier').map((modifier) => {
      const candidate = modifier as Node & { key: string; value: string | null }
      return {
        key: candidate.key,
        value: candidate.value,
        range: sourceRange(candidate.position) ?? emptyRange(),
      }
    })
    const contentNodes = paragraphs.flatMap((paragraph) => (
      paragraph.children.filter((child) => (
        child.type !== 'taskMarker' && child.type !== 'taskModifier'
      ))
    ))
    const textRange = rangeForNodes(contentNodes)
      ?? collapsedRange(markerNodeRange.end)

    const task: ExtractedTask = {
      text: paragraphs.map(extractTaskText).join(' ').replace(/\s+/g, ' ').trim(),
      state: taskState,
      modifiers,
      line: node.position?.start.line ?? 0,
      range: sourceRange(node.position) ?? emptyRange(),
      markerRange: markerCharacterRange(markerNodeRange),
      textRange,
    }

    collection.all.push(task)
    collection[taskState].push(task)
  })

  return collection
}

function extractTaskText(node: Node): string {
  const candidate = node as Node & {
    value?: string
    alt?: string
    identifier?: string
    platform?: string
  }
  if (node.type === 'taskMarker' || node.type === 'taskModifier') return ''
  if (node.type === 'mention') {
    return `@${candidate.platform ? `${candidate.platform}:` : ''}${candidate.identifier ?? ''}`
  }
  if (node.type === 'hashtag') return `#${candidate.identifier ?? ''}`
  if (node.type === 'image') return candidate.alt ?? ''
  if (node.type === 'break') return '\n'
  if (typeof candidate.value === 'string') return candidate.value
  if (isParent(node)) return node.children.map(extractTaskText).join('')
  return ''
}

function findFirst(nodes: Node[], type: string): Node | undefined {
  for (const node of nodes) {
    if (node.type === type) return node
    if (isParent(node)) {
      const found = findFirst(node.children, type)
      if (found) return found
    }
  }
  return undefined
}

function findAll(nodes: Node[], type: string): Node[] {
  const matches: Node[] = []
  for (const node of nodes) {
    if (node.type === type) matches.push(node)
    if (isParent(node)) matches.push(...findAll(node.children, type))
  }
  return matches
}

function rangeForNodes(nodes: Node[]): SourceRange | undefined {
  const ranges = nodes
    .map((node) => sourceRange(node.position))
    .filter((range): range is SourceRange => Boolean(range))
  if (ranges.length === 0) return undefined
  return {
    start: ranges[0].start,
    end: ranges[ranges.length - 1].end,
  }
}

function markerCharacterRange(range: SourceRange): SourceRange {
  return {
    start: advanceColumn(range.start, 1),
    end: advanceColumn(range.start, 2),
  }
}

function advanceColumn(point: SourcePoint, amount: number): SourcePoint {
  return {
    line: point.line,
    column: point.column + amount,
    offset: point.offset + amount,
  }
}

function collapsedRange(point: SourcePoint): SourceRange {
  return { start: point, end: point }
}

function emptyRange(): SourceRange {
  const point = { line: 0, column: 0, offset: 0 }
  return { start: point, end: point }
}

function isParent(node: Node): node is Parent {
  return 'children' in node && Array.isArray(node.children)
}

function extractTags(
  tree: Root,
  frontmatter: Record<string, unknown>,
): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  // Front-matter tags first
  const fmTags = frontmatter.tags
  if (Array.isArray(fmTags)) {
    for (const tag of fmTags) {
      const normalized = String(tag).toLowerCase()
      if (!seen.has(normalized)) {
        seen.add(normalized)
        tags.push(normalized)
      }
    }
  }

  // Inline hashtag nodes
  visit(tree, 'hashtag' as any, (node: any) => {
    const normalized = node.identifier.toLowerCase()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      tags.push(normalized)
    }
  })

  return tags
}

function extractLinks(tree: Root): LinkReference[] {
  const links: LinkReference[] = []

  visit(tree, 'link', (node: Link) => {
    links.push({
      url: node.url,
      title: node.title ?? null,
      line: node.position?.start.line ?? 0,
    })
  })

  visit(tree, 'image', (node: Image) => {
    links.push({
      url: node.url,
      title: node.title ?? null,
      line: node.position?.start.line ?? 0,
    })
  })

  return links
}

function extractFootnotes(tree: Root): FootnoteReference[] {
  const footnotes: FootnoteReference[] = []
  const seen = new Set<string>()
  let counter = 0

  visit(tree, 'footnoteRef' as any, (node: any) => {
    if (!seen.has(node.label)) {
      seen.add(node.label)
      counter++
      footnotes.push({
        label: node.label,
        index: counter,
        line: node.position?.start.line ?? 0,
      })
    }
  })

  return footnotes
}

function runCustomResolvers(
  tree: Root,
  frontmatter: Record<string, unknown>,
  builtins: BuiltinMetadata,
  resolvers: ComputedFieldResolver[],
): Record<string, unknown> {
  let custom: Record<string, unknown> = {}
  for (const resolver of resolvers) {
    const result = resolver(tree, frontmatter, builtins)
    custom = { ...custom, ...result }
  }
  return custom
}
