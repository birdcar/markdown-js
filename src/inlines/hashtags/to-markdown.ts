import type { HashtagNode } from '../../types.js'

export function hashtagToMarkdown() {
  return {
    handlers: {
      hashtag: handleHashtag,
    },
  }
}

function handleHashtag(node: HashtagNode): string {
  return `#${node.identifier}`
}
