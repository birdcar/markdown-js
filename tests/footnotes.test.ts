import { describe, it, expect } from 'vitest'
import { parseAndTransform, findNodes, toHtml } from './helpers.js'

describe('footnote references', () => {
  it('parses inline footnote ref [^label]', () => {
    const md = 'Some text[^note1] here.\n\n[^note1]: Definition.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs).toHaveLength(1)
    expect(refs[0].label).toBe('note1')
  })

  it('parses multiple footnote refs', () => {
    const md = 'First[^a] and second[^b] refs.\n\n[^a]: A def.\n[^b]: B def.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs).toHaveLength(2)
    expect(refs[0].label).toBe('a')
    expect(refs[1].label).toBe('b')
  })

  it('handles labels with numbers and hyphens', () => {
    const md = 'Reference[^note-1] here.\n\n[^note-1]: Definition.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs).toHaveLength(1)
    expect(refs[0].label).toBe('note-1')
  })

  it('sets hast data for footnote ref rendering', () => {
    const md = 'Text[^abc] more.\n\n[^abc]: Definition.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs[0].data.hName).toBe('sup')
    expect(refs[0].data.hProperties.class).toBe('footnote-ref')
    expect(refs[0].data.hProperties.id).toBe('fnref-abc')
  })

  it('auto-numbers refs in order of first appearance', () => {
    const md = 'A[^z] B[^a] C[^z] D[^m]\n\n[^z]: Z def.\n[^a]: A def.\n[^m]: M def.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs[0].data.hChildren[0].children[0].value).toBe('[1]')
    expect(refs[1].data.hChildren[0].children[0].value).toBe('[2]')
    expect(refs[2].data.hChildren[0].children[0].value).toBe('[1]')
    expect(refs[3].data.hChildren[0].children[0].value).toBe('[3]')
  })

  it('assigns index field on ref nodes', () => {
    const md = 'A[^x] B[^y]\n\n[^x]: X.\n[^y]: Y.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs[0].index).toBe(1)
    expect(refs[1].index).toBe(2)
  })

  it('throws for undefined footnote label', () => {
    const md = 'Text[^missing] here.\n'
    expect(() => parseAndTransform(md)).toThrow(
      'Footnote reference [^missing] has no corresponding definition'
    )
  })

  it('generates unique IDs for multi-reference', () => {
    const md = 'First[^a] and second[^a] ref.\n\n[^a]: A def.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs[0].data.hProperties.id).toBe('fnref-a')
    expect(refs[1].data.hProperties.id).toBe('fnref-a-2')
  })
})

describe('footnote definitions', () => {
  it('collects defs into root.footnotes array', () => {
    const md = 'Text[^a] and[^b].\n\n[^a]: First.\n[^b]: Second.\n'
    const tree = parseAndTransform(md)
    const footnotes = (tree as any).footnotes
    expect(footnotes).toHaveLength(2)
    expect(footnotes[0].label).toBe('a')
    expect(footnotes[1].label).toBe('b')
  })

  it('assigns index field on def nodes', () => {
    const md = 'A[^x] B[^y]\n\n[^x]: X.\n[^y]: Y.\n'
    const tree = parseAndTransform(md)
    const footnotes = (tree as any).footnotes
    expect(footnotes[0].index).toBe(1)
    expect(footnotes[1].index).toBe(2)
  })

  it('removes footnoteDef from tree.children after transform', () => {
    const md = 'Text[^a] here.\n\n[^a]: Definition content.\n'
    const tree = parseAndTransform(md)
    const rootDefs = tree.children.filter((n: any) => n.type === 'footnoteDef')
    expect(rootDefs).toHaveLength(0)
  })

  it('re-parses def body as BFM markdown', () => {
    const md = 'Text[^a].\n\n[^a]: This is **bold** text.\n'
    const tree = parseAndTransform(md)
    const footnotes = (tree as any).footnotes
    expect(footnotes[0].children).toHaveLength(1)
    const para = footnotes[0].children[0]
    expect(para.type).toBe('paragraph')
    const strong = para.children.find((c: any) => c.type === 'strong')
    expect(strong).toBeDefined()
  })
})

describe('footnote endnotes integration', () => {
  it('creates endnotes section when footnotes exist', () => {
    const md = 'Text[^a] here.\n\n[^a]: A footnote.\n'
    const tree = parseAndTransform(md)
    const endnotes = findNodes(tree, 'directiveBlock').filter((n: any) => n.name === 'endnotes')
    expect(endnotes).toHaveLength(1)
    expect(endnotes[0].data.hName).toBe('section')
    expect(endnotes[0].data.hProperties.role).toBe('doc-endnotes')
  })

  it('uses existing @endnotes node when present', () => {
    const md = 'Text[^a] here.\n\n@endnotes\n@endendnotes\n\n[^a]: A footnote.\n'
    const tree = parseAndTransform(md)
    const endnotes = findNodes(tree, 'directiveBlock').filter((n: any) => n.name === 'endnotes')
    expect(endnotes).toHaveLength(1)
  })

  it('endnotes contain ordered list of definitions', () => {
    const md = 'A[^a] B[^b]\n\n[^a]: First note.\n[^b]: Second note.\n'
    const tree = parseAndTransform(md)
    const endnotes = findNodes(tree, 'directiveBlock').filter((n: any) => n.name === 'endnotes')
    const lists = findNodes(endnotes[0], 'list')
    expect(lists).toHaveLength(1)
    expect(lists[0].ordered).toBe(true)
    expect(lists[0].children).toHaveLength(2)
  })

  it('endnotes items have backlinks', () => {
    const md = 'Text[^x] here.\n\n[^x]: Note content.\n'
    const tree = parseAndTransform(md)
    const endnotes = findNodes(tree, 'directiveBlock').filter((n: any) => n.name === 'endnotes')
    const links = findNodes(endnotes[0], 'link')
    const backlink = links.find((l: any) => l.url === '#fnref-x')
    expect(backlink).toBeDefined()
  })

  it('multi-ref produces multiple backlinks', () => {
    const md = 'First[^a] and second[^a].\n\n[^a]: Note.\n'
    const tree = parseAndTransform(md)
    const endnotes = findNodes(tree, 'directiveBlock').filter((n: any) => n.name === 'endnotes')
    const links = findNodes(endnotes[0], 'link')
    const backlinks = links.filter((l: any) =>
      l.url === '#fnref-a' || l.url === '#fnref-a-2'
    )
    expect(backlinks).toHaveLength(2)
  })

  it('throws for multiple @endnotes directives', () => {
    const md = 'Text[^a].\n\n@endnotes\n@endendnotes\n\n@endnotes\n@endendnotes\n\n[^a]: Def.\n'
    expect(() => parseAndTransform(md)).toThrow(
      'Multiple @endnotes directives found; only one is allowed per document'
    )
  })

  it('renders footnotes to HTML', async () => {
    const md = 'Text[^a] here.\n\n[^a]: The footnote.\n'
    const html = await toHtml(md)
    expect(html).toContain('fnref-a')
    expect(html).toContain('fn-a')
    expect(html).toContain('doc-endnotes')
  })
})

describe('footnote continuation lines', () => {
  it('requires 4-space indent for continuation', () => {
    const md = 'Text[^a].\n\n[^a]: First line.\n    Continuation line.\n'
    const tree = parseAndTransform(md)
    const footnotes = (tree as any).footnotes
    expect(footnotes).toHaveLength(1)
    // Body should contain text from both lines
    const text = findNodes(footnotes[0], 'text').map((t: any) => t.value).join('')
    expect(text).toContain('Continuation')
  })

  it('does not treat 2-space indent as continuation', () => {
    const md = 'Text[^a].\n\n[^a]: First line.\n  Not continuation.\n'
    const tree = parseAndTransform(md)
    const footnotes = (tree as any).footnotes
    // The "Not continuation" should NOT be part of the footnote
    const text = findNodes(footnotes[0], 'text').map((t: any) => t.value).join('')
    expect(text).not.toContain('Not continuation')
  })
})
