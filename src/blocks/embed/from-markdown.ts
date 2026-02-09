import type { CompileContext, Token } from 'mdast-util-from-markdown'

export function embedFromMarkdown() {
  return {
    enter: {
      embedBlock: enterEmbedBlock,
    },
    exit: {
      embedBlockUrl: exitEmbedBlockUrl,
      embedBlockBody: exitEmbedBlockBody,
      embedBlock: exitEmbedBlock,
    },
  }
}

function enterEmbedBlock(this: CompileContext, token: Token) {
  const node = {
    type: 'directiveBlock',
    name: 'embed',
    params: { url: '' },
    meta: {} as Record<string, string>,
    children: [],
    _bodyLines: [] as string[],
  } as any
  this.enter(node, token)
}

function exitEmbedBlockUrl(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  node.params.url = this.sliceSerialize(token).trim()
}

function exitEmbedBlockBody(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const line = this.sliceSerialize(token)
  if (!node._bodyLines) node._bodyLines = []
  node._bodyLines.push(line)
}

function exitEmbedBlock(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any

  // Extract caption from body lines
  const bodyText = (node._bodyLines || []).join('\n').trim()
  if (bodyText) {
    if (!node.meta) node.meta = {}
    node.meta.caption = bodyText
  }

  // Clean up internal property
  delete node._bodyLines
  // Embed is a leaf — no children
  node.children = []

  this.exit(token)
}
