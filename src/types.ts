import type { Literal, Parent } from 'mdast'
import type { Extension as MicromarkExtension } from 'micromark-util-types'
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import type { Options as ToMarkdownExtension } from 'mdast-util-to-markdown'

export const TASK_STATES = {
  ' ': 'open',
  'x': 'done',
  '>': 'scheduled',
  '<': 'migrated',
  '-': 'irrelevant',
  'o': 'event',
  '!': 'priority',
} as const

export type TaskMarkerChar = keyof typeof TASK_STATES
export type TaskState = (typeof TASK_STATES)[TaskMarkerChar]

export const TASK_MARKER_CHARS = new Set(Object.keys(TASK_STATES))

export type TaskMarkerNode = Literal & {
  type: 'taskMarker'
  state: TaskState
}

export type TaskModifierNode = Literal & {
  type: 'taskModifier'
  key: string
  value: string | null
}

export type MentionNode = Literal & {
  type: 'mention'
  identifier: string
}

export type HashtagNode = Literal & {
  type: 'hashtag'
  identifier: string
}

/** Yaml front-matter node with parsed data. Extends mdast-util-frontmatter's Yaml. */
export type YamlNode = Literal & {
  type: 'yaml'
  data: Record<string, unknown>
}

export type DirectiveBlockNode = Parent & {
  type: 'directiveBlock'
  name: string
  params: Record<string, string>
  meta?: Record<string, string>
}

declare module 'mdast' {
  interface PhrasingContentMap {
    taskMarker: TaskMarkerNode
    taskModifier: TaskModifierNode
    mention: MentionNode
    hashtag: HashtagNode
  }

  interface BlockContentMap {
    directiveBlock: DirectiveBlockNode
  }

  interface ListItem {
    taskState?: TaskState
  }
}

declare module 'unified' {
  interface Data {
    micromarkExtensions?: MicromarkExtension[]
    fromMarkdownExtensions?: (FromMarkdownExtension | FromMarkdownExtension[])[]
    toMarkdownExtensions?: ToMarkdownExtension[]
  }
}

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    taskMarker: 'taskMarker'
    taskMarkerOpen: 'taskMarkerOpen'
    taskMarkerValue: 'taskMarkerValue'
    taskMarkerClose: 'taskMarkerClose'
    taskMarkerSpace: 'taskMarkerSpace'
    taskModifier: 'taskModifier'
    taskModifierPrefix: 'taskModifierPrefix'
    taskModifierKey: 'taskModifierKey'
    taskModifierSeparator: 'taskModifierSeparator'
    taskModifierValue: 'taskModifierValue'
    mention: 'mention'
    mentionMarker: 'mentionMarker'
    mentionIdentifier: 'mentionIdentifier'
    directiveBlock: 'directiveBlock'
    directiveBlockFence: 'directiveBlockFence'
    directiveBlockName: 'directiveBlockName'
    directiveBlockParams: 'directiveBlockParams'
    directiveBlockBody: 'directiveBlockBody'
    directiveBlockCloseFence: 'directiveBlockCloseFence'
    embedBlock: 'embedBlock'
    embedBlockFence: 'embedBlockFence'
    embedBlockName: 'embedBlockName'
    embedBlockUrl: 'embedBlockUrl'
    embedBlockBody: 'embedBlockBody'
    embedBlockCloseFence: 'embedBlockCloseFence'
    hashtag: 'hashtag'
    hashtagMarker: 'hashtagMarker'
    hashtagIdentifier: 'hashtagIdentifier'
    _peek: '_peek'
    _mentionPeek: '_mentionPeek'
    _hashtagPeek: '_hashtagPeek'
  }
}
