import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeBfm } from '../src/analysis/index.js'
import { BUILTIN_TASK_MODIFIERS } from '../src/inlines/modifiers/index.js'
import { parseAndTransform, findNodes, stringify } from './helpers.js'

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

  it('parses //after: modifier key', () => {
    const md = '- [ ] Check in after launch //after:2025-06-01\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(1)
    expect(mods[0].key).toBe('after')
    expect(mods[0].value).toBe('2025-06-01')
  })

  it('roundtrip: //after: modifier is preserved after parse and serialize', () => {
    const md = '- [ ] Check in after launch //after:2025-06-01\n'
    const result = stringify(md)
    expect(result).toContain('//after:2025-06-01')
  })

  it('does not parse // in URLs', () => {
    const md = 'Visit https://example.com for more info\n'
    const tree = parseAndTransform(md)

    const mods = findNodes(tree, 'taskModifier')
    expect(mods).toHaveLength(0)
  })

  it('keeps modifier-like prose literal outside task items', () => {
    const source = 'Prose //due:2025-03-01 and //unknown:value\n'
    const tree = parseAndTransform(source)

    expect(findNodes(tree, 'taskModifier')).toHaveLength(0)
    expect(findNodes(tree, 'text').map((node) => node.value).join('')).toBe(
      'Prose //due:2025-03-01 and //unknown:value',
    )
    expect(stringify(source)).toContain(source.trim())
  })

  it('requires whitespace before a modifier and preserves unknown task keys', () => {
    const source = '- [ ] word//due:2025-01-01 //unknown:value\n'
    const tree = parseAndTransform(source)
    const modifiers = findNodes(tree, 'taskModifier')

    expect(modifiers).toHaveLength(1)
    expect(modifiers[0]).toMatchObject({ key: 'unknown', value: 'value' })
  })

  it('reports exact CRLF modifier ranges', () => {
    const source = '- [ ] First\r\n- [!] Second //hard //cron:0 9 * * 1\r\n'
    const modifier = analyzeBfm(source).symbols.tasks[1].modifiers[1]

    expect(source.slice(modifier.range.start.offset, modifier.range.end.offset)).toBe(
      '//cron:0 9 * * 1',
    )
    expect(modifier.range.start.line).toBe(2)
  })

  it('exports every built-in modifier definition', () => {
    expect(Object.keys(BUILTIN_TASK_MODIFIERS)).toEqual([
      'due',
      'around',
      'after',
      'every',
      'cron',
      'hard',
      'wait',
    ])
    expect(BUILTIN_TASK_MODIFIERS.hard.value).toBe('flag')
    expect(BUILTIN_TASK_MODIFIERS.due.value).toBe('required')
  })
})
