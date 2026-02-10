import type { CompileContext, Token } from 'mdast-util-from-markdown'

export function hashtagFromMarkdown() {
  return {
    enter: {
      hashtag: enterHashtag,
    },
    exit: {
      hashtagIdentifier: exitHashtagIdentifier,
      hashtag: exitHashtag,
    },
  }
}

function enterHashtag(this: CompileContext, token: Token) {
  this.enter(
    { type: 'hashtag' as any, identifier: '', data: {} } as any,
    token,
  )
}

function exitHashtagIdentifier(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  node.identifier = this.sliceSerialize(token)
}

function exitHashtag(this: CompileContext, token: Token) {
  this.exit(token)
}
