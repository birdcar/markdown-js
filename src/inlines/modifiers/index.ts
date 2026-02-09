import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { taskModifierSyntax } from './syntax.js'
import { taskModifierFromMarkdown } from './from-markdown.js'
import { taskModifierToMarkdown } from './to-markdown.js'

export function remarkBfmModifiers(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(taskModifierSyntax())
  fromMarkdownExtensions.push(taskModifierFromMarkdown())
  toMarkdownExtensions.push(taskModifierToMarkdown())
}

export type { TaskModifierNode } from '../../types.js'
