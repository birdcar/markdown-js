import type { CompileContext, Token } from 'mdast-util-from-markdown'

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
  node.identifier = this.sliceSerialize(token)
}

function exitMention(this: CompileContext, token: Token) {
  this.exit(token)
}
