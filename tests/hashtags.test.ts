import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkBfm } from '../src/plugin.js'

function parse(input: string) {
  const processor = unified().use(remarkParse).use(remarkBfm)
  return processor.parse(input)
}

function findNodes(tree: any, type: string): any[] {
  const found: any[] = []
  function walk(node: any) {
    if (node.type === type) found.push(node)
    if (node.children) node.children.forEach(walk)
  }
  walk(tree)
  return found
}

describe('hashtags', () => {
  it('parses inline hashtags', () => {
    const tree = parse('This is #typescript and #react.\n')
    const hashtags = findNodes(tree, 'hashtag')
    expect(hashtags).toHaveLength(2)
    expect(hashtags[0].identifier).toBe('typescript')
    expect(hashtags[1].identifier).toBe('react')
  })

  it('parses hashtags with hyphens and underscores', () => {
    const tree = parse('Tags: #multi-word and #with_underscores here.\n')
    const hashtags = findNodes(tree, 'hashtag')
    expect(hashtags).toHaveLength(2)
    expect(hashtags[0].identifier).toBe('multi-word')
    expect(hashtags[1].identifier).toBe('with_underscores')
  })

  it('does not parse hashtags mid-word', () => {
    const tree = parse('Not a tag: foo#bar.\n')
    const hashtags = findNodes(tree, 'hashtag')
    expect(hashtags).toHaveLength(0)
  })

  it('parses hashtags after punctuation', () => {
    const tree = parse('In parens (#tag) works.\n')
    const hashtags = findNodes(tree, 'hashtag')
    expect(hashtags).toHaveLength(1)
    expect(hashtags[0].identifier).toBe('tag')
  })

  it('does not parse hashtags inside code spans', () => {
    const tree = parse('Code: `#not-a-tag` should not parse.\n')
    const hashtags = findNodes(tree, 'hashtag')
    expect(hashtags).toHaveLength(0)
  })

  it('works alongside mentions', () => {
    const tree = parse('Mention @sarah and tag #project together.\n')
    const hashtags = findNodes(tree, 'hashtag')
    const mentions = findNodes(tree, 'mention')
    expect(hashtags).toHaveLength(1)
    expect(mentions).toHaveLength(1)
    expect(hashtags[0].identifier).toBe('project')
    expect(mentions[0].identifier).toBe('sarah')
  })
})
