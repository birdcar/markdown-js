import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAndTransform, findNodes } from './helpers.js'

const fixturesDir = join(import.meta.dirname, '..', 'spec', 'fixtures')

describe('callout directive', () => {
  it('parses a basic callout with params', () => {
    const md = readFileSync(join(fixturesDir, 'blocks', 'callout-basic.md'), 'utf-8')
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('callout')
    expect(directives[0].params.type).toBe('warning')
    expect(directives[0].params.title).toBe('Watch Out')
  })

  it('parses callout with no params', () => {
    const md = '@callout\nSome content here.\n@endcallout\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('callout')
    expect(Object.keys(directives[0].params)).toHaveLength(0)
  })
})

describe('embed directive', () => {
  it('parses an embed with URL', () => {
    const md = '@embed https://www.youtube.com/watch?v=dQw4w9WgXcQ\nA classic.\n@endembed\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('embed')
    expect(directives[0].params.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  it('extracts caption from embed body', () => {
    const md = '@embed https://example.com/video\nThis is the caption.\n@endembed\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].meta?.caption).toBe('This is the caption.')
  })

  it('handles embed with no caption', () => {
    const md = '@embed https://example.com/video\n@endembed\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].params.url).toBe('https://example.com/video')
  })
})
