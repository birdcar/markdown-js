import type { CompileContext, Token } from 'mdast-util-from-markdown'

export function calloutFromMarkdown() {
  return {
    enter: {
      directiveBlock: enterDirectiveBlock,
    },
    exit: {
      directiveBlockParams: exitDirectiveBlockParams,
      directiveBlockBody: exitDirectiveBlockBody,
      directiveBlock: exitDirectiveBlock,
    },
  }
}

function parseParams(raw: string): Record<string, string> {
  const params: Record<string, string> = {}
  const re = /([a-z][a-z0-9_]*)=(?:"((?:[^"\\]|\\.)*)"|(\S+))/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    params[match[1]] = match[2] !== undefined ? match[2] : match[3]
  }
  return params
}

function enterDirectiveBlock(this: CompileContext, token: Token) {
  const node = {
    type: 'directiveBlock',
    name: 'callout',
    params: {} as Record<string, string>,
    children: [],
    _bodyLines: [] as string[],
  } as any
  this.enter(node, token)
}

function exitDirectiveBlockParams(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const raw = this.sliceSerialize(token).trim()
  node.params = parseParams(raw)
}

function exitDirectiveBlockBody(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const line = this.sliceSerialize(token)
  if (!node._bodyLines) node._bodyLines = []
  node._bodyLines.push(line)
}

function exitDirectiveBlock(this: CompileContext, token: Token) {
  this.exit(token)
}
