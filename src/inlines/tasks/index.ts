import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { taskMarkerSyntax } from './syntax.js'
import { taskMarkerFromMarkdown } from './from-markdown.js'
import { taskMarkerToMarkdown } from './to-markdown.js'

export function remarkBfmTasks(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(taskMarkerSyntax())
  fromMarkdownExtensions.push(taskMarkerFromMarkdown())
  toMarkdownExtensions.push(taskMarkerToMarkdown())
}

export type { TaskState, TaskMarkerNode } from '../../types.js'
