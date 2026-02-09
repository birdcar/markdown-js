import type { CompileContext, Token } from 'mdast-util-from-markdown'
import { TASK_STATES, type TaskMarkerChar, type TaskState } from '../../types.js'

export function taskMarkerFromMarkdown() {
  return {
    enter: {
      taskMarker: enterTaskMarker,
    },
    exit: {
      taskMarkerValue: exitTaskMarkerValue,
      taskMarker: exitTaskMarker,
    },
  }
}

function enterTaskMarker(this: CompileContext, _token: Token) {
  const node = { type: 'taskMarker', state: 'open' as TaskState, value: '' } as any
  this.enter(node, _token)
}

function exitTaskMarkerValue(this: CompileContext, token: Token) {
  const char = this.sliceSerialize(token) as TaskMarkerChar
  const state = TASK_STATES[char]
  const node = this.stack[this.stack.length - 1] as any
  if (state) {
    node.state = state
  }
}

function exitTaskMarker(this: CompileContext, token: Token) {
  // Set taskState on the parent listItem
  const node = this.stack[this.stack.length - 1] as any
  const state = node.state as TaskState

  // Walk up to find the listItem
  const listItem = this.stack.find((n: any) => n.type === 'listItem') as any
  if (listItem) {
    listItem.taskState = state
    if (!listItem.data) listItem.data = {}
    if (!listItem.data.hProperties) listItem.data.hProperties = {}
    listItem.data.hProperties['data-task'] = state
    listItem.data.hProperties.class = `task-item task-item--${state}`
  }

  this.exit(token)
}
