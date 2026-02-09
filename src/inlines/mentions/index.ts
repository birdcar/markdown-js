import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { mentionSyntax } from './syntax.js'
import { mentionFromMarkdown } from './from-markdown.js'
import { mentionToMarkdown } from './to-markdown.js'

export function remarkBfmMentions(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(mentionSyntax())
  fromMarkdownExtensions.push(mentionFromMarkdown())
  toMarkdownExtensions.push(mentionToMarkdown())
}

export type { MentionNode } from '../../types.js'
