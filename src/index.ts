export { remarkBfm } from './plugin.js'

export { remarkBfmFrontmatter } from './blocks/frontmatter/index.js'
export { remarkBfmTasks } from './inlines/tasks/index.js'
export { remarkBfmModifiers } from './inlines/modifiers/index.js'
export { remarkBfmMentions } from './inlines/mentions/index.js'
export { remarkBfmHashtags } from './inlines/hashtags/index.js'
export { remarkBfmDirectives } from './blocks/index.js'

export { extractMetadata } from './metadata/index.js'
export { mergeDocuments } from './merge/index.js'

export type { TaskState, TaskMarkerNode, HashtagNode, YamlNode } from './types.js'
export type { TaskModifierNode } from './inlines/modifiers/index.js'
export type { MentionNode } from './inlines/mentions/index.js'
export type { DirectiveBlockNode } from './blocks/index.js'

export type { EmbedResolver } from './contracts/embed-resolver.js'
export type { MentionResolver } from './contracts/mention-resolver.js'
export type { ComputedFieldResolver } from './contracts/computed-field-resolver.js'

export type {
  DocumentMetadata,
  BuiltinMetadata,
  TaskCollection,
  ExtractedTask,
  LinkReference,
} from './metadata/index.js'

export type {
  MergeStrategy,
  MergeResolver,
  MergeOptions,
  BfmDocument,
} from './merge/index.js'
