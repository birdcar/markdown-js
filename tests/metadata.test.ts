import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkBfm } from '../src/plugin.js'
import { extractMetadata } from '../src/metadata/extract.js'
import type { Root } from 'mdast'

function parse(input: string): Root {
  const processor = unified().use(remarkParse).use(remarkBfm)
  return processor.parse(input) as Root
}

describe('metadata extraction', () => {
  describe('wordCount', () => {
    it('counts words in body text', () => {
      const tree = parse('Hello world, this is four words more.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.wordCount).toBe(7)
    })

    it('excludes front-matter from word count', () => {
      const tree = parse('---\ntitle: Test\n---\n\nTwo words.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.wordCount).toBe(2)
    })

    it('returns 0 for empty document', () => {
      const tree = parse('')
      const meta = extractMetadata(tree)
      expect(meta.computed.wordCount).toBe(0)
    })
  })

  describe('readingTime', () => {
    it('computes reading time with default WPM', () => {
      // 200 words = 1 minute
      const words = Array(200).fill('word').join(' ')
      const tree = parse(words + '\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.readingTime).toBe(1)
    })

    it('accepts custom WPM', () => {
      const words = Array(100).fill('word').join(' ')
      const tree = parse(words + '\n')
      const meta = extractMetadata(tree, { wpm: 100 })
      expect(meta.computed.readingTime).toBe(1)
    })
  })

  describe('tasks', () => {
    it('extracts tasks grouped by state', () => {
      const input = [
        '- [ ] Open task',
        '- [x] Done task',
        '- [>] Scheduled //due:2025-03-01',
        '- [!] Priority task',
      ].join('\n') + '\n'
      const tree = parse(input)
      const meta = extractMetadata(tree)

      expect(meta.computed.tasks.all).toHaveLength(4)
      expect(meta.computed.tasks.open).toHaveLength(1)
      expect(meta.computed.tasks.done).toHaveLength(1)
      expect(meta.computed.tasks.scheduled).toHaveLength(1)
      expect(meta.computed.tasks.priority).toHaveLength(1)
    })

    it('captures task modifiers', () => {
      const tree = parse('- [>] Meeting //due:2025-03-01 //hard\n')
      const meta = extractMetadata(tree)
      const task = meta.computed.tasks.scheduled[0]
      expect(task.modifiers).toHaveLength(2)
      expect(task.modifiers[0]).toEqual({ key: 'due', value: '2025-03-01' })
      expect(task.modifiers[1]).toEqual({ key: 'hard', value: null })
    })

    it('returns empty collections when no tasks', () => {
      const tree = parse('Just a paragraph.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.tasks.all).toHaveLength(0)
    })
  })

  describe('tags', () => {
    it('extracts tags from front-matter', () => {
      const tree = parse('---\ntags:\n  - bfm\n  - markdown\n---\n\nContent.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.tags).toEqual(['bfm', 'markdown'])
    })

    it('extracts tags from inline hashtags', () => {
      const tree = parse('Discussion about #typescript and #react.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.tags).toEqual(['typescript', 'react'])
    })

    it('deduplicates tags from both sources', () => {
      const tree = parse('---\ntags:\n  - bfm\n  - markdown\n---\n\nAbout #bfm and #typescript.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.tags).toEqual(['bfm', 'markdown', 'typescript'])
    })

    it('normalizes tags to lowercase', () => {
      const tree = parse('---\ntags:\n  - BFM\n---\n\nAbout #TypeScript.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.tags).toEqual(['bfm', 'typescript'])
    })
  })

  describe('links', () => {
    it('extracts links from body', () => {
      const tree = parse('See [example](https://example.com "Title") for more.\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.links).toHaveLength(1)
      expect(meta.computed.links[0].url).toBe('https://example.com')
      expect(meta.computed.links[0].title).toBe('Title')
    })

    it('extracts image links', () => {
      const tree = parse('![alt](https://img.example.com/photo.jpg)\n')
      const meta = extractMetadata(tree)
      expect(meta.computed.links).toHaveLength(1)
      expect(meta.computed.links[0].url).toBe('https://img.example.com/photo.jpg')
    })
  })

  describe('custom computed fields', () => {
    it('runs custom resolvers', () => {
      const tree = parse('Hello world.\n')
      const meta = extractMetadata(tree, {
        computedFields: [
          (_tree, _fm, builtins) => ({
            doubleWordCount: builtins.wordCount * 2,
          }),
        ],
      })
      expect(meta.custom.doubleWordCount).toBe(4)
    })

    it('chains multiple resolvers', () => {
      const tree = parse('Hello.\n')
      const meta = extractMetadata(tree, {
        computedFields: [
          () => ({ first: 1 }),
          () => ({ second: 2 }),
        ],
      })
      expect(meta.custom).toEqual({ first: 1, second: 2 })
    })
  })

  describe('frontmatter', () => {
    it('returns parsed front-matter', () => {
      const tree = parse('---\ntitle: Test\ncount: 42\n---\n\nContent.\n')
      const meta = extractMetadata(tree)
      expect(meta.frontmatter).toEqual({ title: 'Test', count: 42 })
    })

    it('returns empty object when no front-matter', () => {
      const tree = parse('Just content.\n')
      const meta = extractMetadata(tree)
      expect(meta.frontmatter).toEqual({})
    })
  })
})
