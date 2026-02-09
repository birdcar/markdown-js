import type { TaskMarkerNode } from '../../types.js'

const STATE_TO_CHAR: Record<string, string> = {
  open: ' ',
  done: 'x',
  scheduled: '>',
  migrated: '<',
  irrelevant: '-',
  event: 'o',
  priority: '!',
}

export function taskMarkerToMarkdown() {
  return {
    handlers: {
      taskMarker: handleTaskMarker,
    },
  }
}

function handleTaskMarker(node: TaskMarkerNode): string {
  const char = STATE_TO_CHAR[node.state] ?? ' '
  return `[${char}] `
}
