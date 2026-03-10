import { describe, it, expect } from 'vitest'
import { mergeDocuments, mergeAndExtract } from '../src/merge/merge.js'
import type { BfmDocument } from '../src/merge/types.js'
import { parse } from './helpers.js'

describe('mergeDocuments', () => {
  it('merges two documents with non-overlapping keys', () => {
    const a: BfmDocument = { frontmatter: { key1: 'value1' }, body: 'Body A' }
    const b: BfmDocument = { frontmatter: { keyA: 'valueB' }, body: 'Body B' }
    const result = mergeDocuments([a, b])
    expect(result.frontmatter).toEqual({ key1: 'value1', keyA: 'valueB' })
    expect(result.body).toBe('Body A\n\nBody B')
  })

  it('concatenates arrays', () => {
    const a: BfmDocument = { frontmatter: { tags: ['a1', 'a2'] }, body: '' }
    const b: BfmDocument = { frontmatter: { tags: ['b1', 'b2'] }, body: '' }
    const result = mergeDocuments([a, b])
    expect(result.frontmatter.tags).toEqual(['a1', 'a2', 'b1', 'b2'])
  })

  it('deep merges nested objects', () => {
    const a: BfmDocument = {
      frontmatter: { author: { name: 'Nick', role: 'dev' } },
      body: '',
    }
    const b: BfmDocument = {
      frontmatter: { author: { email: 'nick@birdcar.dev' } },
      body: '',
    }
    const result = mergeDocuments([a, b])
    expect(result.frontmatter.author).toEqual({
      name: 'Nick',
      role: 'dev',
      email: 'nick@birdcar.dev',
    })
  })

  it('uses last-wins for scalar conflicts by default', () => {
    const a: BfmDocument = { frontmatter: { title: 'A' }, body: '' }
    const b: BfmDocument = { frontmatter: { title: 'B' }, body: '' }
    const result = mergeDocuments([a, b])
    expect(result.frontmatter.title).toBe('B')
  })

  it('uses first-wins strategy', () => {
    const a: BfmDocument = { frontmatter: { title: 'A' }, body: '' }
    const b: BfmDocument = { frontmatter: { title: 'B' }, body: '' }
    const result = mergeDocuments([a, b], { strategy: 'first-wins' })
    expect(result.frontmatter.title).toBe('A')
  })

  it('throws on error strategy with conflict', () => {
    const a: BfmDocument = { frontmatter: { title: 'A' }, body: '' }
    const b: BfmDocument = { frontmatter: { title: 'B' }, body: '' }
    expect(() => mergeDocuments([a, b], { strategy: 'error' })).toThrow(
      'Merge conflict',
    )
  })

  it('uses custom resolver for conflicts', () => {
    const a: BfmDocument = { frontmatter: { count: 1 }, body: '' }
    const b: BfmDocument = { frontmatter: { count: 2 }, body: '' }
    const result = mergeDocuments([a, b], {
      strategy: (_key, existing, incoming) =>
        (existing as number) + (incoming as number),
    })
    expect(result.frontmatter.count).toBe(3)
  })

  it('merges three documents', () => {
    const docs: BfmDocument[] = [
      { frontmatter: { tags: ['a'] }, body: 'A' },
      { frontmatter: { tags: ['b'] }, body: 'B' },
      { frontmatter: { tags: ['c'] }, body: 'C' },
    ]
    const result = mergeDocuments(docs)
    expect(result.frontmatter.tags).toEqual(['a', 'b', 'c'])
    expect(result.body).toBe('A\n\nB\n\nC')
  })

  it('handles empty documents array', () => {
    const result = mergeDocuments([])
    expect(result.frontmatter).toEqual({})
    expect(result.body).toBe('')
  })

  it('uses custom separator', () => {
    const a: BfmDocument = { frontmatter: {}, body: 'A' }
    const b: BfmDocument = { frontmatter: {}, body: 'B' }
    const result = mergeDocuments([a, b], { separator: '\n---\n' })
    expect(result.body).toBe('A\n---\nB')
  })
})

describe('mergeAndExtract', () => {
  it('recomputes wordCount for merged documents', () => {
    const tenWords = 'one two three four five six seven eight nine ten'
    const twentyWords = Array(20).fill('word').join(' ')
    const a: BfmDocument = { frontmatter: {}, body: tenWords }
    const b: BfmDocument = { frontmatter: {}, body: twentyWords }
    const { metadata } = mergeAndExtract([a, b], parse)
    expect(metadata.computed.wordCount).toBe(30)
  })

  it('extracts inline tags from merged body', () => {
    const a: BfmDocument = { frontmatter: {}, body: 'Doc A #beta' }
    const b: BfmDocument = { frontmatter: {}, body: 'Doc B #delta' }
    const { metadata } = mergeAndExtract([a, b], parse)
    expect(metadata.computed.tags).toContain('beta')
    expect(metadata.computed.tags).toContain('delta')
  })

  it('merges frontmatter into returned metadata', () => {
    const a: BfmDocument = { frontmatter: { title: 'A' }, body: 'Body A' }
    const b: BfmDocument = { frontmatter: { author: 'B' }, body: 'Body B' }
    const { metadata } = mergeAndExtract([a, b], parse)
    expect(metadata.frontmatter).toEqual({ title: 'A', author: 'B' })
  })

  it('returns the merged document', () => {
    const a: BfmDocument = { frontmatter: {}, body: 'A' }
    const b: BfmDocument = { frontmatter: {}, body: 'B' }
    const { document } = mergeAndExtract([a, b], parse)
    expect(document.body).toBe('A\n\nB')
  })
})
