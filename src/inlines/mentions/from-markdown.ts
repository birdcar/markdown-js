import type { CompileContext, Token } from 'mdast-util-from-markdown'
import { resolvePlatformUrl, isKnownPlatform, PLATFORM_LABELS } from './platforms.js'

export function mentionFromMarkdown() {
  return {
    enter: {
      mention: enterMention,
    },
    exit: {
      mentionIdentifier: exitMentionIdentifier,
      mention: exitMention,
    },
  }
}

function enterMention(this: CompileContext, token: Token) {
  this.enter(
    { type: 'mention' as any, identifier: '', data: {} } as any,
    token,
  )
}

function exitMentionIdentifier(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const raw = this.sliceSerialize(token)

  const colonIndex = raw.indexOf(':')
  if (colonIndex !== -1) {
    const platform = raw.slice(0, colonIndex)
    const identifier = raw.slice(colonIndex + 1)
    node.platform = platform
    node.identifier = identifier

    const url = resolvePlatformUrl(platform, identifier)
    if (url && isKnownPlatform(platform)) {
      const label = PLATFORM_LABELS[platform] || platform
      node.data.hName = 'a'
      node.data.hProperties = {
        href: url,
        class: `mention mention--${platform}`,
        title: `${label}: ${identifier}`,
        rel: 'noopener noreferrer',
      }
      node.data.hChildren = [{ type: 'text', value: `@${platform}:${identifier}` }]
    } else {
      // Unknown platform — render as span
      node.data.hName = 'span'
      node.data.hProperties = { class: 'mention' }
      node.data.hChildren = [{ type: 'text', value: `@${platform}:${identifier}` }]
    }
  } else {
    node.identifier = raw
    // Plain mention — render as span
    node.data.hName = 'span'
    node.data.hProperties = { class: 'mention' }
    node.data.hChildren = [{ type: 'text', value: `@${raw}` }]
  }
}

function exitMention(this: CompileContext, token: Token) {
  this.exit(token)
}
