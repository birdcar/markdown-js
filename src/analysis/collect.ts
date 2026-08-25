import type { ListItem, Node, Parent, Root } from 'mdast'
import type {
  AnalyzedDirective,
  AnalyzedFootnote,
  AnalyzedHashtag,
  AnalyzedMention,
  AnalyzedTask,
  AnalyzedTaskModifier,
  BfmSymbols,
  SourcePoint,
  SourceRange,
} from './types.js'
import { sourceRange } from './rebase-position.js'
import type { TaskState } from '../types.js'

export function collectBfmSymbols(tree: Root, source: string): BfmSymbols {
  const symbols: BfmSymbols = {
    tasks: [],
    mentions: [],
    hashtags: [],
    footnotes: [],
    directives: [],
  }

  walk(tree, (node) => {
    if (node.type === 'listItem') collectTask(node as ListItem, symbols.tasks, source)
    if (node.type === 'mention') collectMention(node, symbols.mentions)
    if (node.type === 'hashtag') collectHashtag(node, symbols.hashtags)
    if (node.type === 'footnoteRef') {
      collectFootnote(node, 'reference', symbols.footnotes)
    }
    if (node.type === 'directiveBlock') {
      collectDirective(node, symbols.directives)
    }
  })

  const definitions = (tree as Root & { footnotes?: Node[] }).footnotes ?? []
  for (const definition of definitions) {
    collectFootnote(definition, 'definition', symbols.footnotes)
  }

  symbols.footnotes.sort((left, right) => (
    left.range.start.offset - right.range.start.offset
  ))

  return symbols
}

function collectTask(
  node: ListItem,
  tasks: AnalyzedTask[],
  source: string,
): void {
  const state = node.taskState as TaskState | undefined
  const range = sourceRange(node.position)
  if (!state || !range) return

  const paragraphs = node.children.filter((child) => child.type === 'paragraph')
  const marker = findFirst(paragraphs, 'taskMarker')
  const markerNodeRange = sourceRange(marker?.position)
  if (!markerNodeRange) return

  const modifiers = findAll(paragraphs, 'taskModifier')
    .map(toModifier)
    .filter((modifier): modifier is AnalyzedTaskModifier => Boolean(modifier))
  const contentNodes = paragraphs.flatMap((paragraph) => (
    paragraph.children.filter((child) => (
      child.type !== 'taskMarker' && child.type !== 'taskModifier'
    ))
  ))
  const textRange = rangeForNodes(contentNodes)
    ?? collapsedRange(markerNodeRange.end)

  tasks.push({
    state,
    text: paragraphs.map(extractText).join(' ').replace(/\s+/g, ' ').trim(),
    line: node.position?.start.line ?? 0,
    range,
    markerRange: markerCharacterRange(markerNodeRange),
    textRange: trimTrailingWhitespace(textRange, source),
    modifiers,
  })
}

function collectMention(node: Node, mentions: AnalyzedMention[]): void {
  const candidate = node as Node & { identifier?: string; platform?: string }
  const range = sourceRange(node.position)
  if (!candidate.identifier || !range) return
  mentions.push({
    identifier: candidate.identifier,
    ...(candidate.platform ? { platform: candidate.platform } : {}),
    range,
  })
}

function collectHashtag(node: Node, hashtags: AnalyzedHashtag[]): void {
  const candidate = node as Node & { identifier?: string }
  const range = sourceRange(node.position)
  if (!candidate.identifier || !range) return
  hashtags.push({ identifier: candidate.identifier, range })
}

function collectFootnote(
  node: Node,
  kind: AnalyzedFootnote['kind'],
  footnotes: AnalyzedFootnote[],
): void {
  const candidate = node as Node & { label?: string; index?: number }
  const range = sourceRange(node.position)
  if (!candidate.label || !range) return
  footnotes.push({
    kind,
    label: candidate.label,
    index: candidate.index ?? 0,
    range,
  })
}

function collectDirective(node: Node, directives: AnalyzedDirective[]): void {
  const candidate = node as Node & {
    name?: string
    params?: Record<string, string | boolean | string[]>
    meta?: Record<string, string>
  }
  const range = sourceRange(node.position)
  if (!candidate.name || !range) return
  directives.push({
    name: candidate.name,
    params: candidate.params ?? {},
    ...(candidate.meta ? { meta: candidate.meta } : {}),
    range,
  })
}

function toModifier(node: Node): AnalyzedTaskModifier | undefined {
  const candidate = node as Node & { key?: string; value?: string | null }
  const range = sourceRange(node.position)
  if (!candidate.key || !range) return undefined
  return {
    key: candidate.key,
    value: candidate.value ?? null,
    range,
  }
}

function extractText(node: Node): string {
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
  if (isParent(node)) return node.children.map(extractText).join('')
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

function trimTrailingWhitespace(
  range: SourceRange,
  source: string,
): SourceRange {
  let end = range.end
  while (end.offset > range.start.offset) {
    const character = source[end.offset - 1]
    if (character !== ' ' && character !== '\t') break
    end = {
      line: end.line,
      column: end.column - 1,
      offset: end.offset - 1,
    }
  }
  return { start: range.start, end }
}

function collapsedRange(point: SourcePoint): SourceRange {
  return { start: point, end: point }
}

function advanceColumn(point: SourcePoint, amount: number): SourcePoint {
  return {
    line: point.line,
    column: point.column + amount,
    offset: point.offset + amount,
  }
}

function walk(node: Node, visitor: (node: Node) => void): void {
  visitor(node)
  if (!isParent(node)) return
  for (const child of node.children) walk(child, visitor)
}

function isParent(node: Node): node is Parent {
  return 'children' in node && Array.isArray(node.children)
}
