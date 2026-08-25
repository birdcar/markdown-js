import type { Root } from 'mdast'
import type { RemarkBfmOptions } from '../blocks/registry.js'
import { extractMetadata } from '../metadata/extract.js'
import type { DocumentMetadata, TaskCollection } from '../metadata/types.js'
import { createBfmProcessor } from '../processor.js'
import { collectBfmSymbols } from './collect.js'
import { BfmSourceError, type BfmAnalysis, type BfmSymbols } from './types.js'

export function analyzeBfm(
  source: string,
  options?: RemarkBfmOptions,
): BfmAnalysis {
  const processor = createBfmProcessor(options)
  try {
    const tree = processor.runSync(processor.parse(source)) as Root
    return {
      tree,
      metadata: extractMetadata(tree),
      symbols: collectBfmSymbols(tree, source),
      diagnostics: [],
    }
  } catch (error) {
    if (!(error instanceof BfmSourceError)) throw error
    return {
      tree: null,
      metadata: emptyMetadata(),
      symbols: emptySymbols(),
      diagnostics: [{
        code: error.code,
        message: error.message,
        severity: 'error',
        ...(error.range ? { range: error.range } : {}),
      }],
    }
  }
}

function emptyMetadata(): DocumentMetadata {
  return {
    frontmatter: {},
    computed: {
      wordCount: 0,
      readingTime: 1,
      tasks: emptyTasks(),
      tags: [],
      links: [],
      footnotes: [],
    },
    custom: {},
  }
}

function emptyTasks(): TaskCollection {
  return {
    all: [],
    open: [],
    done: [],
    scheduled: [],
    migrated: [],
    irrelevant: [],
    event: [],
    priority: [],
  }
}

function emptySymbols(): BfmSymbols {
  return {
    tasks: [],
    mentions: [],
    hashtags: [],
    footnotes: [],
    directives: [],
  }
}

export type {
  SourcePoint,
  SourceRange,
  AnalyzedTaskModifier,
  AnalyzedTask,
  AnalyzedMention,
  AnalyzedHashtag,
  AnalyzedFootnote,
  AnalyzedDirective,
  BfmSymbols,
  BfmDiagnostic,
  BfmAnalysis,
  AnalyzeBfmOptions,
} from './types.js'
