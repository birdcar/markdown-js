import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAndTransform, findNodes } from './helpers.js'

const fixturesDir = join(import.meta.dirname, '..', 'spec', 'fixtures')

describe('mentions', () => {
  it('parses basic @mentions', () => {
    const md = 'Hey @sarah, check this out\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0].identifier).toBe('sarah')
  })

  it('parses mentions with dots, hyphens, underscores', () => {
    const md = 'cc @john.doe and @dev-team and @user_name\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(3)
    expect(mentions[0].identifier).toBe('john.doe')
    expect(mentions[1].identifier).toBe('dev-team')
    expect(mentions[2].identifier).toBe('user_name')
  })

  it('parses fixture: mentions-basic.md', () => {
    const md = readFileSync(join(fixturesDir, 'inlines', 'mentions-basic.md'), 'utf-8')
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(3)
    expect(mentions[0].identifier).toBe('sarah')
    expect(mentions[1].identifier).toBe('john.doe')
    expect(mentions[2].identifier).toBe('dev-team')
  })

  it('does not parse @mention mid-word', () => {
    const md = 'email@example.com is not a mention\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(0)
  })

  it('parses mention after punctuation', () => {
    const md = 'Hey (@sarah) check this\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0].identifier).toBe('sarah')
  })

  it('does not parse @ followed by non-alpha', () => {
    const md = 'Contact @ 123 for info\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(0)
  })
})
