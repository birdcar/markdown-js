import type { CompileContext, Token } from 'mdast-util-from-markdown'

export function footnoteFromMarkdown() {
  return {
    enter: {
      footnoteRef: enterFootnoteRef,
      footnoteDef: enterFootnoteDef,
    },
    exit: {
      footnoteRefLabel: exitFootnoteRefLabel,
      footnoteRef: exitFootnoteRef,
      footnoteDefLabel: exitFootnoteDefLabel,
      footnoteDefContent: exitFootnoteDefContent,
      footnoteDef: exitFootnoteDef,
    },
  }
}

function enterFootnoteRef(this: CompileContext, token: Token) {
  this.enter({ type: 'footnoteRef', label: '', value: '' } as any, token)
}

function exitFootnoteRefLabel(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  node.label = this.sliceSerialize(token)
}

function exitFootnoteRef(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  node.value = `[^${node.label}]`
  this.exit(token)
}

function enterFootnoteDef(this: CompileContext, token: Token) {
  this.enter({ type: 'footnoteDef', label: '', children: [], _contentLines: [] } as any, token)
}

function exitFootnoteDefLabel(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  // Label token includes [^...]: — extract just the label part
  const raw = this.sliceSerialize(token)
  const match = raw.match(/\[\^([^\]]+)\]:?/)
  node.label = match ? match[1] : raw
}

function exitFootnoteDefContent(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const line = this.sliceSerialize(token)
  if (!node._contentLines) node._contentLines = []
  node._contentLines.push(line)
}

function exitFootnoteDef(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const contentLines: string[] = node._contentLines || []
  delete node._contentLines
  // Store raw content for later transform
  node._rawContent = contentLines.join('\n').trim()
  this.exit(token)
}
