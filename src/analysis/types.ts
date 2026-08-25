import type { Root } from 'mdast'
import type { RemarkBfmOptions } from '../blocks/registry.js'
import type { DocumentMetadata } from '../metadata/types.js'
import type { TaskState } from '../types.js'

/** A 1-based line/column and UTF-16 offset into the exact source string. */
export interface SourcePoint {
  line: number
  column: number
  offset: number
}

/** A half-open source range compatible with JavaScript slice and CodeMirror. */
export interface SourceRange {
  start: SourcePoint
  end: SourcePoint
}

export interface AnalyzedTaskModifier {
  key: string
  value: string | null
  range: SourceRange
}

export interface AnalyzedTask {
  state: TaskState
  text: string
  line: number
  range: SourceRange
  markerRange: SourceRange
  textRange: SourceRange
  modifiers: AnalyzedTaskModifier[]
}

export interface AnalyzedMention {
  identifier: string
  platform?: string
  range: SourceRange
}

export interface AnalyzedHashtag {
  identifier: string
  range: SourceRange
}

export interface AnalyzedFootnote {
  kind: 'reference' | 'definition'
  label: string
  index: number
  range: SourceRange
}

export interface AnalyzedDirective {
  name: string
  params: Record<string, string | boolean | string[]>
  meta?: Record<string, string>
  range: SourceRange
}

export interface BfmSymbols {
  tasks: AnalyzedTask[]
  mentions: AnalyzedMention[]
  hashtags: AnalyzedHashtag[]
  footnotes: AnalyzedFootnote[]
  directives: AnalyzedDirective[]
}

export interface BfmDiagnostic {
  code: string
  message: string
  severity: 'error' | 'warning'
  range?: SourceRange
}

export interface BfmAnalysis {
  tree: Root | null
  metadata: DocumentMetadata
  symbols: BfmSymbols
  diagnostics: BfmDiagnostic[]
}

export class BfmSourceError extends Error {
  readonly code: string
  readonly range?: SourceRange

  constructor(code: string, message: string, range?: SourceRange) {
    super(message)
    this.name = 'BfmSourceError'
    this.code = code
    this.range = range
  }
}

export type AnalyzeBfmOptions = RemarkBfmOptions
