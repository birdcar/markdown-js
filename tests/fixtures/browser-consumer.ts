import {
  TASK_STATE_MARKERS,
  analyzeBfm,
  extractMetadata,
  mergeDocuments,
  parseBfm,
} from '@birdcar/markdown'
import { analyzeBfm as analyzeFromSubpath } from '@birdcar/markdown/analysis'
import { remarkBfmDirectives } from '@birdcar/markdown/directives'
import { remarkBfmFootnotes } from '@birdcar/markdown/footnotes'
import { remarkBfmFrontmatter } from '@birdcar/markdown/frontmatter'
import { remarkBfmHashtags } from '@birdcar/markdown/hashtags'
import { mergeAndExtract } from '@birdcar/markdown/merge'
import { extractMetadata as extractFromSubpath } from '@birdcar/markdown/metadata'
import {
  BUILTIN_TASK_MODIFIERS,
  remarkBfmModifiers,
} from '@birdcar/markdown/modifiers'
import { remarkBfmMentions } from '@birdcar/markdown/mentions'
import { TASK_STATES, remarkBfmTasks } from '@birdcar/markdown/tasks'

const source = [
  '---',
  'title: Browser',
  '---',
  '',
  '- [>] **Ship** @sam #release //due:2026-09-01',
  '',
  '@callout type=info',
  'Browser-safe content.',
  '@endcallout',
  '',
  'Reference[^note].',
  '',
  '[^note]: Footnote.',
  '',
].join('\n')
const tree = parseBfm(source)
const analysis = analyzeBfm(source)
const subpathAnalysis = analyzeFromSubpath(source)
const metadata = extractMetadata(tree)
const subpathMetadata = extractFromSubpath(tree)
const merged = mergeDocuments([
  { frontmatter: { tags: ['a'] }, body: 'A' },
  { frontmatter: { tags: ['b'] }, body: 'B' },
])
const mergedMetadata = mergeAndExtract([
  { frontmatter: {}, body: '- [ ] Task' },
], parseBfm)

const plugins = [
  remarkBfmTasks,
  remarkBfmModifiers,
  remarkBfmMentions,
  remarkBfmHashtags,
  remarkBfmFootnotes,
  remarkBfmDirectives,
  remarkBfmFrontmatter,
]

if (
  !analysis.tree
  || !subpathAnalysis.tree
  || analysis.symbols.tasks.length !== 1
  || metadata.computed.tasks.all.length !== 1
  || subpathMetadata.computed.tasks.all.length !== 1
  || merged.frontmatter.tags?.length !== 2
  || !mergedMetadata.metadata
  || plugins.some((plugin) => typeof plugin !== 'function')
  || TASK_STATES['>'] !== 'scheduled'
  || TASK_STATE_MARKERS.scheduled !== '>'
  || BUILTIN_TASK_MODIFIERS.due.value !== 'required'
) {
  throw new Error('Browser package consumer smoke test failed')
}
