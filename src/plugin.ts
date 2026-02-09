import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { remarkBfmTasks } from './inlines/tasks/index.js'
import { remarkBfmModifiers } from './inlines/modifiers/index.js'
import { remarkBfmMentions } from './inlines/mentions/index.js'
import { remarkBfmDirectives } from './blocks/index.js'

export function remarkBfm(this: Processor<Root>) {
  remarkBfmTasks.call(this)
  remarkBfmModifiers.call(this)
  remarkBfmMentions.call(this)
  remarkBfmDirectives.call(this)
}
