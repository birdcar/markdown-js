import type { CompileContext, Token } from 'mdast-util-from-markdown'

function parseParams(raw: string): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {}
  const re = /([a-z][a-z0-9_]*)(?:=(?:"((?:[^"\\]|\\.)*)"|(\S+)))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    if (match[2] !== undefined) {
      params[match[1]] = match[2]
    } else if (match[3] !== undefined) {
      params[match[1]] = match[3]
    } else {
      params[match[1]] = true
    }
  }
  return params
}

function enterDirectiveBlock(this: CompileContext, token: Token) {
  const node = {
    type: 'directiveBlock',
    name: '',
    params: {} as Record<string, string | boolean>,
    children: [],
    _bodyLines: [] as string[],
  } as any
  this.enter(node, token)
}

function exitDirectiveBlockName(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  // The name token includes the leading @, strip it
  const raw = this.sliceSerialize(token)
  node.name = raw.startsWith('@') ? raw.slice(1) : raw
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

export function genericDirectiveFromMarkdown() {
  return {
    enter: {
      directiveBlock: enterDirectiveBlock,
    },
    exit: {
      directiveBlockName: exitDirectiveBlockName,
      directiveBlockParams: exitDirectiveBlockParams,
      directiveBlockBody: exitDirectiveBlockBody,
      directiveBlock: exitDirectiveBlock,
    },
  }
}
