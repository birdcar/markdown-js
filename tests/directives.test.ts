import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAndTransform, findNodes, toHtml, stringify } from './helpers.js'

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

  it('renders callout with type and title to correct HTML', async () => {
    const md = '@callout type=warning title="Watch Out"\nThis is a warning with **bold** text.\n@endcallout\n'
    const html = await toHtml(md)
    expect(html).toContain('<aside class="callout callout--warning">')
    expect(html).toContain('<div class="callout__header">Watch Out</div>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('renders callout with no type defaults to info class', async () => {
    const md = '@callout\nBody.\n@endcallout\n'
    const html = await toHtml(md)
    expect(html).toContain('<aside class="callout callout--info">')
  })

  it('round-trips callout: second stringify is stable', () => {
    const md = '@callout type=warning\nBody text.\n@endcallout\n'
    const out = stringify(md)
    expect(out).toContain('@callout')
    expect(out).toContain('@endcallout')
    const out2 = stringify(out)
    expect(out2).toBe(out)
  })
})

describe('embed directive', () => {
  it('parses an embed with URL as positional param', () => {
    const md = '@embed https://www.youtube.com/watch?v=dQw4w9WgXcQ\nA classic.\n@endembed\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('embed')
    expect((directives[0].params._positional as string[])[0]).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  it('extracts caption from embed body as meta.body', () => {
    const md = '@embed https://example.com/video\nThis is the caption.\n@endembed\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].meta?.body).toBe('This is the caption.')
  })

  it('handles embed with no caption', () => {
    const md = '@embed https://example.com/video\n@endembed\n'
    const tree = parseAndTransform(md)

    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect((directives[0].params._positional as string[])[0]).toBe('https://example.com/video')
  })

  it('renders embed with data-url and figure wrapper', async () => {
    const md = '@embed https://example.com/video\nA caption.\n@endembed\n'
    const html = await toHtml(md)
    expect(html).toContain('<figure class="embed" data-url="https://example.com/video">')
    expect(html).toContain('A caption.')
  })

  it('round-trips embed without data loss', () => {
    const md = '@embed https://example.com/video\nA caption.\n@endembed\n'
    const out = stringify(md)
    expect(out).toContain('@embed')
    expect(out).toContain('https://example.com/video')
    expect(out).toContain('@endembed')
    const out2 = stringify(out)
    expect(out2).toBe(out)
  })
})
