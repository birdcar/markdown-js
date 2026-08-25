export { remarkBfm } from './plugin.js'
export { createBfmProcessor, parseBfm } from './processor.js'
export { analyzeBfm } from './analysis/index.js'

export { remarkBfmFrontmatter } from './blocks/frontmatter/index.js'
export { remarkBfmTasks } from './inlines/tasks/index.js'
export {
  remarkBfmModifiers,
  BUILTIN_TASK_MODIFIERS,
} from './inlines/modifiers/index.js'
export { remarkBfmMentions } from './inlines/mentions/index.js'
export { remarkBfmHashtags } from './inlines/hashtags/index.js'
export { remarkBfmDirectives } from './blocks/index.js'
export { remarkBfmFootnotes } from './inlines/footnotes/index.js'

export { extractMetadata } from './metadata/index.js'
export { mergeDocuments, mergeAndExtract } from './merge/index.js'
export {
  TASK_STATES,
  TASK_MARKER_CHARS,
  TASK_STATE_MARKERS,
} from './types.js'

export type {
  TaskState,
  TaskMarkerChar,
  TaskMarkerNode,
  HashtagNode,
  YamlNode,
  FootnoteRefNode,
  FootnoteDefNode,
} from './types.js'
export type {
  TaskModifierNode,
  TaskModifierDefinition,
  BuiltinTaskModifierKey,
} from './inlines/modifiers/index.js'
export type { MentionNode } from './inlines/mentions/index.js'
export type { DirectiveBlockNode } from './blocks/index.js'

export type { RemarkBfmOptions, DirectiveDefinition, DirectiveContext } from './blocks/registry.js'

export type { EmbedResolver } from './contracts/embed-resolver.js'
export type { MentionResolver } from './contracts/mention-resolver.js'
export type { ComputedFieldResolver } from './contracts/computed-field-resolver.js'

export type {
  DocumentMetadata,
  BuiltinMetadata,
  TaskCollection,
  ExtractedTask,
  ExtractedTaskModifier,
  LinkReference,
  FootnoteReference,
} from './metadata/index.js'

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
} from './analysis/index.js'

export type {
  MergeStrategy,
  MergeResolver,
  MergeOptions,
  BfmDocument,
} from './merge/index.js'
