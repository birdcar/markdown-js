import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAndTransform, findNodes } from './helpers.js'

const fixturesDir = join(import.meta.dirname, '..', 'spec', 'fixtures')

describe('task markers', () => {
  it('parses all 7 task states', () => {
    const md = readFileSync(join(fixturesDir, 'inlines', 'tasks-basic.md'), 'utf-8')
    const tree = parseAndTransform(md)

    const markers = findNodes(tree, 'taskMarker')
    expect(markers).toHaveLength(7)

    const states = markers.map((m) => m.state)
    expect(states).toEqual([
      'open', 'done', 'scheduled', 'migrated', 'irrelevant', 'event', 'priority',
    ])
  })

  it('sets taskState on parent listItem', () => {
    const md = '- [>] Scheduled thing\n'
    const tree = parseAndTransform(md)

    const listItems = findNodes(tree, 'listItem')
    expect(listItems).toHaveLength(1)
    expect(listItems[0].taskState).toBe('scheduled')
  })

  it('sets data-task hProperty on listItem', () => {
    const md = '- [!] Urgent\n'
    const tree = parseAndTransform(md)

    const listItems = findNodes(tree, 'listItem')
    expect(listItems[0].data?.hProperties?.['data-task']).toBe('priority')
  })

  it('does not parse task markers outside list items', () => {
    const md = '[x] This is not a task\n'
    const tree = parseAndTransform(md)

    const markers = findNodes(tree, 'taskMarker')
    expect(markers).toHaveLength(0)
  })

  it('does not parse invalid state characters', () => {
    const md = '- [z] Not a valid state\n'
    const tree = parseAndTransform(md)

    const markers = findNodes(tree, 'taskMarker')
    expect(markers).toHaveLength(0)
  })

  it('handles ordered list items with tasks', () => {
    const md = '1. [x] Done item\n2. [ ] Open item\n'
    const tree = parseAndTransform(md)

    const markers = findNodes(tree, 'taskMarker')
    expect(markers).toHaveLength(2)
    expect(markers[0].state).toBe('done')
    expect(markers[1].state).toBe('open')
  })
})
