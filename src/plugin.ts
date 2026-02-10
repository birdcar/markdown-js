import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { remarkBfmFrontmatter } from './blocks/frontmatter/index.js'
import { remarkBfmTasks } from './inlines/tasks/index.js'
import { remarkBfmModifiers } from './inlines/modifiers/index.js'
import { remarkBfmMentions } from './inlines/mentions/index.js'
import { remarkBfmHashtags } from './inlines/hashtags/index.js'
import { remarkBfmDirectives } from './blocks/index.js'

export function remarkBfm(this: Processor<Root>) {
  remarkBfmFrontmatter.call(this)
  remarkBfmTasks.call(this)
  remarkBfmModifiers.call(this)
  remarkBfmMentions.call(this)
  remarkBfmHashtags.call(this)
  remarkBfmDirectives.call(this)
}
