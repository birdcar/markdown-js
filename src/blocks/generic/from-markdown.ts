import type { CompileContext, Token } from 'mdast-util-from-markdown'

function tokenizeParams(raw: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < raw.length) {
    while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i++
    if (i >= raw.length) break
    if (raw[i] === '"') {
      let tok = '"'
      i++
      while (i < raw.length && raw[i] !== '"') {
        if (raw[i] === '\\' && i + 1 < raw.length) {
          tok += raw[i + 1]
          i += 2
        } else {
          tok += raw[i]
          i++
        }
      }
      tok += '"'
      if (i < raw.length) i++
      tokens.push(tok)
    } else {
      let tok = ''
      while (i < raw.length && raw[i] !== ' ' && raw[i] !== '\t') {
        if (raw[i] === '"') {
          i++
          while (i < raw.length && raw[i] !== '"') {
            if (raw[i] === '\\' && i + 1 < raw.length) {
              tok += raw[i + 1]
              i += 2
            } else {
              tok += raw[i]
              i++
            }
          }
          if (i < raw.length) i++
        } else {
          tok += raw[i]
          i++
        }
      }
      tokens.push(tok)
    }
  }
  return tokens
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    return s.slice(1, -1).replace(/\\"/g, '"')
  }
  return s
}

function parseParams(raw: string): Record<string, string | boolean | string[]> {
  const params: Record<string, string | boolean | string[]> = {}
  const positional: string[] = []
  for (const tok of tokenizeParams(raw)) {
    const eq = tok.indexOf('=')
    if (eq > 0 && /^[a-z][a-z0-9_]*$/.test(tok.slice(0, eq))) {
      params[tok.slice(0, eq)] = unquote(tok.slice(eq + 1))
    } else if (/^[a-z][a-z0-9_]*$/.test(tok)) {
      params[tok] = true
    } else {
      positional.push(unquote(tok))
    }
  }
  if (positional.length) params._positional = positional
  return params
}

function enterDirectiveBlock(this: CompileContext, token: Token) {
  const node = {
    type: 'directiveBlock',
    name: '',
    params: {} as Record<string, string | boolean | string[]>,
    children: [],
    _bodyLines: [] as string[],
  } as any
  this.enter(node, token)
}

function exitDirectiveBlockName(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
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
