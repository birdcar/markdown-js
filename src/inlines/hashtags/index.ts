import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { hashtagSyntax } from './syntax.js'
import { hashtagFromMarkdown } from './from-markdown.js'
import { hashtagToMarkdown } from './to-markdown.js'

export function remarkBfmHashtags(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(hashtagSyntax())
  fromMarkdownExtensions.push(hashtagFromMarkdown())
  toMarkdownExtensions.push(hashtagToMarkdown())
}

export type { HashtagNode } from '../../types.js'
