import type { Root, Text, Link, Image, ListItem } from 'mdast'
import { visit } from 'unist-util-visit'
import type { ComputedFieldResolver } from '../contracts/computed-field-resolver.js'
import type { TaskState } from '../types.js'
import type {
  DocumentMetadata,
  BuiltinMetadata,
  TaskCollection,
  ExtractedTask,
  LinkReference,
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

  return { wordCount, readingTime, tasks, tags, links }
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
    const taskState = (node as any).taskState as TaskState | undefined
    if (!taskState) return

    // Extract text and modifiers from the paragraph children
    const paragraph = node.children[0]
    if (!paragraph || paragraph.type !== 'paragraph') return

    let text = ''
    const modifiers: Array<{ key: string; value: string | null }> = []

    for (const child of paragraph.children) {
      if ((child as any).type === 'taskMarker') continue
      if ((child as any).type === 'taskModifier') {
        modifiers.push({
          key: (child as any).key,
          value: (child as any).value,
        })
        continue
      }
      if ((child as any).type === 'text') {
        text += (child as any).value
      }
    }

    const task: ExtractedTask = {
      text: text.trim(),
      state: taskState,
      modifiers,
      line: node.position?.start.line ?? 0,
    }

    collection.all.push(task)
    collection[taskState].push(task)
  })

  return collection
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
