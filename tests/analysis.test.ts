import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Root } from 'mdast'
import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { analyzeBfm } from '../src/analysis/index.js'
import { createBfmProcessor, parseBfm } from '../src/processor.js'
import { remarkBfm } from '../src/plugin.js'
import { findNodes } from './helpers.js'

const fixturesDir = join(import.meta.dirname, '..', 'spec', 'fixtures')

function parseManually(source: string): Root {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBfm)
  return processor.runSync(processor.parse(source)) as Root
}

describe('BFM processor boundary', () => {
  it('returns the same transformed kitchen-sink tree as supported manual composition', () => {
    const source = readFileSync(join(fixturesDir, 'blocks', 'kitchen-sink.md'), 'utf8')
    expect(parseBfm(source)).toEqual(parseManually(source))
  })

  it('makes BFM task markers win over GFM task markers', () => {
    const tree = parseBfm('- [ ] Open\n- [x] Done\n- [>] Later\n')
    const markers = findNodes(tree, 'taskMarker')

    expect(markers.map((marker) => marker.state)).toEqual([
      'open',
      'done',
      'scheduled',
    ])
    expect(findNodes(tree, 'listItem').map((item) => item.checked)).toEqual([
      null,
      null,
      null,
    ])
  })

  it('creates a reusable processor with the supported GFM composition', () => {
    const processor = createBfmProcessor()
    const tree = processor.runSync(processor.parse('~~done~~ and #tag\n')) as Root

    expect(findNodes(tree, 'delete')).toHaveLength(1)
    expect(findNodes(tree, 'hashtag')).toHaveLength(1)
  })
})

describe('BFM analysis', () => {
  it('returns transformed metadata and complete built-in source symbols', () => {
    const source = [
      '- [>] **Call** @sam about #health //due:2025-03-01',
      '',
      '@callout type=info',
      'See @github:birdcar and #docs.',
      '@endcallout',
      '',
      'Reference[^note].',
      '',
      '[^note]: Footnote body.',
      '',
    ].join('\n')
    const result = analyzeBfm(source)

    expect(result.tree).not.toBeNull()
    expect(result.diagnostics).toEqual([])
    expect(result.metadata.computed.tasks.scheduled[0].text).toBe(
      'Call @sam about #health',
    )
    expect(result.symbols.tasks).toHaveLength(1)
    expect(result.symbols.tasks[0].modifiers[0]).toMatchObject({
      key: 'due',
      value: '2025-03-01',
    })
    expect(result.symbols.mentions.map((mention) => mention.identifier)).toEqual([
      'sam',
      'birdcar',
    ])
    expect(result.symbols.hashtags.map((hashtag) => hashtag.identifier)).toEqual([
      'health',
      'docs',
    ])
    expect(result.symbols.footnotes.map((footnote) => footnote.kind)).toEqual([
      'reference',
      'definition',
    ])
    expect(result.symbols.directives.map((directive) => directive.name)).toEqual([
      'callout',
    ])
  })

  it('converts source-caused transform failures into diagnostics', () => {
    const result = analyzeBfm('Missing[^note].\n')

    expect(result.tree).toBeNull()
    expect(result.symbols).toEqual({
      tasks: [],
      mentions: [],
      hashtags: [],
      footnotes: [],
      directives: [],
    })
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0]).toMatchObject({
      code: 'undefined-footnote',
      severity: 'error',
    })
    expect(result.diagnostics[0].range).toBeDefined()
  })

  it('rethrows programming and configuration errors', () => {
    expect(() => analyzeBfm('@broken\nbody\n@endbroken\n', {
      directives: {
        broken: {
          kind: 'container',
          transform: () => {
            throw new TypeError('programmer error')
          },
        },
      },
    })).toThrow(TypeError)
  })
})
