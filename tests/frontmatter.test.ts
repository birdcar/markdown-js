import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkBfm } from '../src/plugin.js'

function parse(input: string) {
  const processor = unified().use(remarkParse).use(remarkBfm)
  return processor.parse(input)
}

describe('front-matter', () => {
  it('parses basic front-matter with scalars and arrays', () => {
    const tree = parse(
      '---\ntitle: Hello World\nauthor: nick\ntags:\n  - bfm\n  - markdown\n---\n\nThis is body content.\n',
    )
    const yaml = tree.children[0] as any
    expect(yaml.type).toBe('yaml')
    expect(yaml.data.title).toBe('Hello World')
    expect(yaml.data.author).toBe('nick')
    expect(yaml.data.tags).toEqual(['bfm', 'markdown'])
  })

  it('parses empty front-matter', () => {
    const tree = parse('---\n---\n\nBody after empty front-matter.\n')
    const yaml = tree.children[0] as any
    expect(yaml.type).toBe('yaml')
    expect(yaml.data).toEqual({})
  })

  it('parses complex front-matter with nested objects', () => {
    const input = [
      '---',
      'title: Complex',
      'count: 42',
      'draft: true',
      'author:',
      '  name: Nick',
      '  email: nick@birdcar.dev',
      '---',
      '',
      'Content.',
    ].join('\n')
    const tree = parse(input)
    const yaml = tree.children[0] as any
    expect(yaml.data.count).toBe(42)
    expect(yaml.data.draft).toBe(true)
    expect(yaml.data.author).toEqual({
      name: 'Nick',
      email: 'nick@birdcar.dev',
    })
  })

  it('treats --- not on first line as thematic break', () => {
    const tree = parse('Some text\n\n---\n')
    // Should not have a yaml node
    const types = tree.children.map((c: any) => c.type)
    expect(types).not.toContain('yaml')
  })

  it('handles document with no front-matter', () => {
    const tree = parse('Just a paragraph.\n')
    const types = tree.children.map((c: any) => c.type)
    expect(types).not.toContain('yaml')
    expect(types).toContain('paragraph')
  })
})
