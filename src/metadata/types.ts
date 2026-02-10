import type { TaskState } from '../types.js'

export interface DocumentMetadata {
  frontmatter: Record<string, unknown>
  computed: BuiltinMetadata
  custom: Record<string, unknown>
}

export interface BuiltinMetadata {
  wordCount: number
  readingTime: number
  tasks: TaskCollection
  tags: string[]
  links: LinkReference[]
}

export interface TaskCollection {
  all: ExtractedTask[]
  open: ExtractedTask[]
  done: ExtractedTask[]
  scheduled: ExtractedTask[]
  migrated: ExtractedTask[]
  irrelevant: ExtractedTask[]
  event: ExtractedTask[]
  priority: ExtractedTask[]
}

export interface ExtractedTask {
  text: string
  state: TaskState
  modifiers: Array<{ key: string; value: string | null }>
  line: number
}

export interface LinkReference {
  url: string
  title: string | null
  line: number
}
