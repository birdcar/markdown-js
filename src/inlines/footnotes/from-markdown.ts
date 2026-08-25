import type { CompileContext, Token } from 'mdast-util-from-markdown'
import {
  advancePoint,
  sourcePoint,
  type SourceLine,
} from '../../analysis/rebase-position.js'

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
  const start = sourcePoint(token.start)
  if (!start) return
  const lines = (node._contentLines ??= []) as SourceLine[]
  const value = this.sliceSerialize(token)
  const previous = lines[lines.length - 1]
  if (previous?.start.line === start.line) {
    previous.value += value
  } else {
    lines.push({ value, start })
  }
}

function exitFootnoteDef(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const contentLines = (node._contentLines ?? []) as SourceLine[]
  node._contentLines = contentLines.map((line) => {
    const indentation = line.value.match(/^[ \t]*/)?.[0] ?? ''
    return {
      value: line.value.slice(indentation.length),
      start: advancePoint(line.start, indentation),
    }
  })
  node._rawContent = node._contentLines.map((line: SourceLine) => line.value).join('\n')
  this.exit(token)
}
