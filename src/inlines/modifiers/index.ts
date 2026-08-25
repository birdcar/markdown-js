import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { taskModifierSyntax } from './syntax.js'
import { taskModifierFromMarkdown } from './from-markdown.js'
import { taskModifierToMarkdown } from './to-markdown.js'

export interface TaskModifierDefinition {
  value: 'required' | 'flag'
  description: string
}

export const BUILTIN_TASK_MODIFIERS = {
  due: { value: 'required', description: 'Hard deadline' },
  around: { value: 'required', description: 'Approximate target date' },
  after: { value: 'required', description: 'Earliest date to surface' },
  every: { value: 'required', description: 'Recurrence descriptor' },
  cron: { value: 'required', description: 'Cron recurrence expression' },
  hard: { value: 'flag', description: 'Immovable deadline' },
  wait: { value: 'flag', description: 'Waiting on external input' },
} as const satisfies Record<string, TaskModifierDefinition>

export type BuiltinTaskModifierKey = keyof typeof BUILTIN_TASK_MODIFIERS

export function remarkBfmModifiers(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(taskModifierSyntax())
  fromMarkdownExtensions.push(taskModifierFromMarkdown())
  toMarkdownExtensions.push(taskModifierToMarkdown())

  return normalizeTaskModifiers
}

export function normalizeTaskModifiers(tree: Root): void {
  normalizeChildren(tree as any, false)
  const footnotes = (tree as Root & { footnotes?: any[] }).footnotes ?? []
  for (const footnote of footnotes) normalizeChildren(footnote, false)
}

function normalizeChildren(node: any, insideTask: boolean): void {
  if (!Array.isArray(node.children)) return
  const taskContext = insideTask || (
    node.type === 'listItem' && typeof node.taskState === 'string'
  )

  node.children = node.children.map((child: any) => {
    if (child.type === 'taskModifier' && !taskContext) {
      return {
        type: 'text',
        value: `//${child.key}${child.value === null ? '' : `:${child.value}`}`,
        position: child.position,
      }
    }
    normalizeChildren(child, taskContext)
    return child
  })
}

export type { TaskModifierNode } from '../../types.js'
