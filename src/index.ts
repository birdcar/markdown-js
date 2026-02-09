export { remarkBfm } from './plugin.js'

export { remarkBfmTasks } from './inlines/tasks/index.js'
export { remarkBfmModifiers } from './inlines/modifiers/index.js'
export { remarkBfmMentions } from './inlines/mentions/index.js'
export { remarkBfmDirectives } from './blocks/index.js'

export type { TaskState, TaskMarkerNode } from './inlines/tasks/index.js'
export type { TaskModifierNode } from './inlines/modifiers/index.js'
export type { MentionNode } from './inlines/mentions/index.js'
export type { DirectiveBlockNode } from './blocks/index.js'

export type { EmbedResolver } from './contracts/embed-resolver.js'
export type { MentionResolver } from './contracts/mention-resolver.js'
