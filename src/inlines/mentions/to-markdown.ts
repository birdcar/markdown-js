import type { MentionNode } from '../../types.js'

export function mentionToMarkdown() {
  return {
    handlers: {
      mention: handleMention,
    },
  }
}

function handleMention(node: MentionNode): string {
  return `@${node.identifier}`
}
