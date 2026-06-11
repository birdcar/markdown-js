import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { remarkBfmFrontmatter } from './blocks/frontmatter/index.js'
import { remarkBfmTasks } from './inlines/tasks/index.js'
import { remarkBfmModifiers } from './inlines/modifiers/index.js'
import { remarkBfmMentions } from './inlines/mentions/index.js'
import { remarkBfmHashtags } from './inlines/hashtags/index.js'
import { remarkBfmDirectives } from './blocks/index.js'
import { remarkBfmFootnotes } from './inlines/footnotes/index.js'
import type { RemarkBfmOptions } from './blocks/registry.js'

export function remarkBfm(this: Processor<Root>, options?: RemarkBfmOptions) {
  remarkBfmFrontmatter.call(this)
  const directivesTransform = remarkBfmDirectives.call(this, options)
  remarkBfmTasks.call(this)
  remarkBfmModifiers.call(this)
  remarkBfmMentions.call(this)
  remarkBfmHashtags.call(this)
  const footnotesTransform = remarkBfmFootnotes.call(this)

  return function transform(tree: Root) {
    if (directivesTransform) directivesTransform(tree)
    if (footnotesTransform) footnotesTransform(tree)
  }
}
