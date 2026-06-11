import { describe, it, expect } from 'vitest'
import { parseAndTransform, findNodes } from './helpers.js'

describe('open parser', () => {
  it('parses an arbitrary lowercase name', () => {
    const md = '@spoiler\nhi\n@endspoiler\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('spoiler')
  })

  it('parses a name containing digits', () => {
    const md = '@h2box\nhi\n@endh2box\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('h2box')
  })

  it('does not parse a name starting with a digit', () => {
    const md = '@2box\nhi\n@end2box\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('does not parse a bare @ with no name', () => {
    const md = '@\nhi\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('parses a longer arbitrary name', () => {
    const md = '@customblock\ncontent here\n@endcustomblock\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('customblock')
  })
})

describe('close fence required', () => {
  it('unclosed directive falls back to paragraph', () => {
    const md = '@note\nbody\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('closed directive produces one directiveBlock node', () => {
    const md = '@note\nbody\n@endnote\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('note')
  })

  it('mismatched close fence falls back to paragraph', () => {
    const md = '@note\nbody\n@endother\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('directive with params but no close fence falls back', () => {
    const md = '@note title="test"\nbody\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })
})

describe('positional + quoted params', () => {
  it('bare valid identifier becomes boolean flag', () => {
    const md = '@x open\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.open).toBe(true)
  })

  it('key=value pair is parsed correctly', () => {
    const md = '@x a=1\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.a).toBe('1')
  })

  it('quoted value preserves spaces', () => {
    const md = '@x title="two words"\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.title).toBe('two words')
  })

  it('bare non-identifier token goes to _positional', () => {
    const md = '@x https://example.com\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params._positional).toEqual(['https://example.com'])
  })

  it('path-like token goes to _positional', () => {
    const md = '@x path/to/file\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params._positional).toEqual(['path/to/file'])
  })

  it('mixed params: key=value, flag, positional', () => {
    const md = '@x a=1 open title="two words" https://e.com path/to/f\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.a).toBe('1')
    expect(directives[0].params.open).toBe(true)
    expect(directives[0].params.title).toBe('two words')
    expect(directives[0].params._positional).toEqual(['https://e.com', 'path/to/f'])
  })

  it('escaped quote inside quoted value', () => {
    const md = '@x title="say \\"hello\\""\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.title).toBe('say "hello"')
  })
})
