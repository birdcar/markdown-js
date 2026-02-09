import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAndTransform, findNodes } from './helpers.js'

const fixturesDir = join(import.meta.dirname, '..', 'spec', 'fixtures')

describe('task modifiers', () => {
  it('parses key:value modifiers', () => {
    const md = '- [>] Call the dentist //due:2025-03-01\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(1)
    expect(mods[0].key).toBe('due')
    expect(mods[0].value).toBe('2025-03-01')
  })

  it('parses boolean flag modifiers (no value)', () => {
    const md = '- [!] Urgent //hard\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(1)
    expect(mods[0].key).toBe('hard')
    expect(mods[0].value).toBeNull()
  })

  it('parses multiple modifiers on one line', () => {
    const md = '- [>] Follow up //around:2025-03 //wait\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(2)
    expect(mods[0].key).toBe('around')
    expect(mods[0].value).toBe('2025-03')
    expect(mods[1].key).toBe('wait')
    expect(mods[1].value).toBeNull()
  })

  it('parses values with spaces (cron expressions)', () => {
    const md = '- [ ] Run backups //cron:0 9 * * 1\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(1)
    expect(mods[0].key).toBe('cron')
    expect(mods[0].value).toBe('0 9 * * 1')
  })

  it('parses fixture: tasks-modifiers.md', () => {
    const md = readFileSync(join(fixturesDir, 'inlines', 'tasks-modifiers.md'), 'utf-8')
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    // 6 items: due, every, around+wait, due+every, cron, due+hard
    expect(mods.length).toBeGreaterThanOrEqual(8)

    const keys = mods.map((m) => m.key)
    expect(keys).toContain('due')
    expect(keys).toContain('every')
    expect(keys).toContain('around')
    expect(keys).toContain('wait')
    expect(keys).toContain('cron')
    expect(keys).toContain('hard')
  })

  it('does not parse // in URLs', () => {
    const md = 'Visit https://example.com for more info\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(0)
  })
})
