import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAndTransform, findNodes, toHtml } from './helpers.js'

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

describe('platform mentions', () => {
  it('parses @github:birdcar', () => {
    const md = 'Follow @github:birdcar\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0].platform).toBe('github')
    expect(mentions[0].identifier).toBe('birdcar')
  })

  it('parses @bluesky:birdcar.bsky.social with dots in identifier', () => {
    const md = 'Follow @bluesky:birdcar.bsky.social\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0].platform).toBe('bluesky')
    expect(mentions[0].identifier).toBe('birdcar.bsky.social')
  })

  it('parses @mastodon:user@mastodon.social with @ in identifier', () => {
    const md = 'Follow @mastodon:user@mastodon.social\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0].platform).toBe('mastodon')
    expect(mentions[0].identifier).toBe('user@mastodon.social')
  })

  it('parses unknown platform as plain mention', () => {
    const md = 'Check @unknown:foo\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0].platform).toBe('unknown')
    expect(mentions[0].identifier).toBe('foo')
  })

  it('plain @birdcar still works alongside platform mentions', () => {
    const md = 'Hey @birdcar and @github:birdcar\n'
    const tree = parseAndTransform(md)

    const mentions = findNodes(tree, 'mention')
    expect(mentions).toHaveLength(2)
    expect(mentions[0].identifier).toBe('birdcar')
    expect(mentions[0].platform).toBeUndefined()
    expect(mentions[1].platform).toBe('github')
    expect(mentions[1].identifier).toBe('birdcar')
  })

  it('renders known platforms as links', async () => {
    const html = await toHtml('Follow @github:birdcar\n')
    expect(html).toContain('<a href="https://github.com/birdcar"')
    expect(html).toContain('class="mention mention--github"')
    expect(html).toContain('title="GitHub: birdcar"')
    expect(html).toContain('>@github:birdcar</a>')
  })

  it('renders unknown platforms as spans', async () => {
    const html = await toHtml('Check @unknown:foo\n')
    expect(html).toContain('<span class="mention">@unknown:foo</span>')
  })

  it('renders plain mentions as spans', async () => {
    const html = await toHtml('Hey @birdcar\n')
    expect(html).toContain('<span class="mention">@birdcar</span>')
  })

  it('renders mastodon with correct URL', async () => {
    const html = await toHtml('Follow @mastodon:user@mastodon.social\n')
    expect(html).toContain('href="https://mastodon.social/@user"')
    expect(html).toContain('class="mention mention--mastodon"')
    expect(html).toContain('>@mastodon:user@mastodon.social</a>')
  })

  it('matches fixture: mentions-platform.md', async () => {
    const md = readFileSync(join(fixturesDir, 'inlines', 'mentions-platform.md'), 'utf-8')
    const expectedHtml = readFileSync(join(fixturesDir, 'inlines', 'mentions-platform.html'), 'utf-8').trim()
    const html = (await toHtml(md)).trim()
    expect(html).toBe(expectedHtml)
  })
})
