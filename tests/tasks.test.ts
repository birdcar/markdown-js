import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeBfm } from '../src/analysis/index.js'
import {
  TASK_MARKER_CHARS,
  TASK_STATE_MARKERS,
  TASK_STATES,
} from '../src/types.js'
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

  it('exports complete marker and inverse state constants', () => {
    expect([...TASK_MARKER_CHARS]).toEqual(Object.keys(TASK_STATES))
    expect(TASK_STATE_MARKERS).toEqual({
      open: ' ',
      done: 'x',
      scheduled: '>',
      migrated: '<',
      irrelevant: '-',
      event: 'o',
      priority: '!',
    })
  })

  it('reports nested, multiline, and ordered list-item ranges', () => {
    const source = [
      '1. [ ] Parent line',
      '   continued',
      '   - [x] Nested',
      '',
    ].join('\n')
    const tasks = analyzeBfm(source).symbols.tasks

    expect(tasks).toHaveLength(2)
    expect(source.slice(tasks[0].range.start.offset, tasks[0].range.end.offset)).toContain(
      '1. [ ] Parent line',
    )
    expect(source.slice(tasks[1].markerRange.start.offset, tasks[1].markerRange.end.offset)).toBe('x')
    expect(tasks[1].line).toBe(3)
  })
})
