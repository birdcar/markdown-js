import type { CompileContext, Token } from 'mdast-util-from-markdown'

export function taskModifierFromMarkdown() {
  return {
    enter: {
      taskModifier: enterTaskModifier,
    },
    exit: {
      taskModifierKey: exitTaskModifierKey,
      taskModifierValue: exitTaskModifierValue,
      taskModifier: exitTaskModifier,
    },
  }
}

function enterTaskModifier(this: CompileContext, token: Token) {
  this.enter(
    { type: 'taskModifier' as any, key: '', value: null, data: {} } as any,
    token,
  )
}

function exitTaskModifierKey(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  node.key = this.sliceSerialize(token)
}

function exitTaskModifierValue(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as any
  const raw = this.sliceSerialize(token)
  node.value = raw.trimEnd()
}

function exitTaskModifier(this: CompileContext, token: Token) {
  this.exit(token)
}
