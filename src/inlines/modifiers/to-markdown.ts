import type { TaskModifierNode } from '../../types.js'

export function taskModifierToMarkdown() {
  return {
    handlers: {
      taskModifier: handleTaskModifier,
    },
  }
}

function handleTaskModifier(node: TaskModifierNode): string {
  if (node.value === null || node.value === undefined) {
    return `//${node.key}`
  }
  return `//${node.key}:${node.value}`
}
