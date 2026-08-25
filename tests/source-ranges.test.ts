import type { Node, Root } from 'mdast'
import { describe, expect, it } from 'vitest'
import { analyzeBfm } from '../src/analysis/index.js'
import { parseBfm } from '../src/processor.js'
import type { SourceRange } from '../src/analysis/types.js'
import { findNodes } from './helpers.js'

function slice(source: string, range: SourceRange): string {
  return source.slice(range.start.offset, range.end.offset)
}

function nodeSlice(source: string, node: Node): string {
  const position = node.position
  if (position?.start.offset === undefined || position.end.offset === undefined) {
    throw new Error('Expected positioned node')
  }
  return source.slice(position.start.offset, position.end.offset)
}

describe('source ranges', () => {
  it('uses UTF-16 offsets for tasks, markers, text, and modifiers across CRLF', () => {
    const source = '😀 heading\r\n- [>] **Call** @sam #health //due:2025-03-01\r\n'
    const analysis = analyzeBfm(source)
    const task = analysis.symbols.tasks[0]

    expect(task.range.start.offset).toBe(source.indexOf('- [>]'))
    expect(slice(source, task.markerRange)).toBe('>')
    expect(slice(source, task.textRange)).toBe('**Call** @sam #health')
    expect(slice(source, task.modifiers[0].range)).toBe('//due:2025-03-01')
    expect(task.range.start.line).toBe(2)
  })

  it('keeps nested task ranges independent and document-relative', () => {
    const source = [
      '- [ ] Parent task',
      '  - [x] Nested task //hard',
      '',
    ].join('\n')
    const tasks = analyzeBfm(source).symbols.tasks

    expect(tasks).toHaveLength(2)
    expect(slice(source, tasks[0].markerRange)).toBe(' ')
    expect(slice(source, tasks[1].markerRange)).toBe('x')
    expect(slice(source, tasks[1].textRange)).toBe('Nested task')
    expect(slice(source, tasks[1].modifiers[0].range)).toBe('//hard')
  })

  it('keeps mention and hashtag ranges aligned after an astral character', () => {
    const source = '😀 @sam #topic\n'
    const analysis = analyzeBfm(source)

    expect(analysis.symbols.mentions[0].range.start.offset).toBe(3)
    expect(slice(source, analysis.symbols.mentions[0].range)).toBe('@sam')
    expect(slice(source, analysis.symbols.hashtags[0].range)).toBe('#topic')
  })

  it('rebases nested directive child positions to the original document', () => {
    const source = [
      'Before',
      '',
      '@callout',
      'Outer text.',
      '',
      '@details summary="More"',
      'Inner **bold** text.',
      '@enddetails',
      '@endcallout',
      '',
    ].join('\n')
    const tree = parseBfm(source)
    const directives = findNodes(tree, 'directiveBlock')
    const strong = findNodes(tree, 'strong')[0]

    expect(directives.map((node) => node.name)).toEqual(['callout', 'details'])
    expect(nodeSlice(source, strong)).toBe('**bold**')
    expect(strong.position?.start.line).toBe(7)
  })

  it('rebases indented footnote definition children across CRLF', () => {
    const source = [
      '😀 Text[^note].',
      '',
      '[^note]: First **bold** line.',
      '    Continuation with `code`.',
      '',
    ].join('\r\n')
    const tree = parseBfm(source) as Root & { footnotes: Node[] }
    const definition = tree.footnotes[0]
    const strong = findNodes(definition as Root, 'strong')[0]
    const inlineCode = findNodes(definition as Root, 'inlineCode')[0]

    expect(nodeSlice(source, strong)).toBe('**bold**')
    expect(nodeSlice(source, inlineCode)).toBe('`code`')
    expect(strong.position?.start.line).toBe(3)
    expect(inlineCode.position?.start.line).toBe(4)
  })
})
