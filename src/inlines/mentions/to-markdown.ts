import type { MentionNode } from '../../types.js'

export function mentionToMarkdown() {
  return {
    handlers: {
      mention: handleMention,
    },
  }
}

function handleMention(node: MentionNode): string {
  if (node.platform) {
    return `@${node.platform}:${node.identifier}`
  }
  return `@${node.identifier}`
}
