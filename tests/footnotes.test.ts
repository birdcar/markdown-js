import { describe, it, expect } from 'vitest'
import { parseAndTransform, findNodes, toHtml } from './helpers.js'

describe('footnote references', () => {
  it('parses inline footnote ref [^label]', () => {
    const md = 'Some text[^note1] here.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs).toHaveLength(1)
    expect(refs[0].label).toBe('note1')
  })

  it('parses multiple footnote refs', () => {
    const md = 'First[^a] and second[^b] refs.\n'
    const tree = parseAndTransform(md)
    const refs = findNodes(tree, 'footnoteRef')
    expect(refs).toHaveLength(2)
    expect(refs[0].label).toBe('a')
    expect(refs[1].label).toBe('b')
  })

  it('handles labels with numbers and hyphens', () => {
    const md = 'Reference[^note-1] here.\n'
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
    // z appears first -> 1, a second -> 2, z again -> still 1, m -> 3
    expect(refs[0].data.hChildren[0].children[0].value).toBe('[1]')
    expect(refs[1].data.hChildren[0].children[0].value).toBe('[2]')
    expect(refs[2].data.hChildren[0].children[0].value).toBe('[1]')
    expect(refs[3].data.hChildren[0].children[0].value).toBe('[3]')
  })
})

describe('footnote definitions', () => {
  it('parses a footnote definition', () => {
    const md = '[^note1]: This is the footnote content.\n'
    const tree = parseAndTransform(md)
    const defs = findNodes(tree, 'footnoteDef')
    expect(defs).toHaveLength(1)
    expect(defs[0].label).toBe('note1')
  })

  it('removes footnoteDef from tree after transform', () => {
    const md = 'Text[^a] here.\n\n[^a]: Definition content.\n'
    const tree = parseAndTransform(md)
    // footnoteDef should be moved to endnotes, not in tree root
    const rootDefs = tree.children.filter((n: any) => n.type === 'footnoteDef')
    expect(rootDefs).toHaveLength(0)
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
    // Should only be one endnotes section, not two
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

  it('renders footnotes to HTML', async () => {
    const md = 'Text[^a] here.\n\n[^a]: The footnote.\n'
    const html = await toHtml(md)
    expect(html).toContain('fnref-a')
    expect(html).toContain('fn-a')
    expect(html).toContain('doc-endnotes')
  })
})
