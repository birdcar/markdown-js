import type { Extension, Tokenizer, State, Construct } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

const DIRECTIVE_NAMES = new Set([
  'details', 'tabs', 'tab', 'figure', 'aside',
  'include', 'query', 'toc', 'math', 'endnotes',
])

function isLowerAlpha(code: number): boolean {
  return code >= 97 && code <= 122
}

const nonLazyContinuation: Construct = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation,
}

function tokenizeGenericDirective(this: any, effects: any, ok: any, nok: any) {
  const self = this
  let nameBuffer = ''

  const closeStart: Construct = {
    partial: true,
    tokenize: tokenizeCloseStart,
  }

  return start

  function start(code: number | null): State | undefined {
    if (code !== 64) return nok(code)
    effects.enter('directiveBlock')
    effects.enter('directiveBlockFence')
    effects.enter('directiveBlockName')
    effects.consume(code) // consume @
    return bufferName
  }

  function bufferName(code: number | null): State | undefined {
    if (code !== null && isLowerAlpha(code)) {
      nameBuffer += String.fromCharCode(code)
      effects.consume(code)
      return bufferName
    }
    return afterName(code)
  }

  function afterName(code: number | null): State | undefined {
    if (!DIRECTIVE_NAMES.has(nameBuffer)) {
      return nok(code)
    }

    effects.exit('directiveBlockName')

    if (code === null || markdownLineEnding(code)) {
      effects.exit('directiveBlockFence')
      return self.interrupt
        ? ok(code)
        : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code)
    }

    if (markdownSpace(code)) {
      effects.enter('directiveBlockParams')
      effects.enter('chunkString', { contentType: 'string' })
      return params(code)
    }

    // Not valid (e.g., @detailsfoo)
    return nok(code)
  }

  function params(code: number | null): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('chunkString')
      effects.exit('directiveBlockParams')
      effects.exit('directiveBlockFence')
      return self.interrupt
        ? ok(code)
        : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code)
    }
    effects.consume(code)
    return params
  }

  function atNonLazyBreak(code: number | null): State | undefined {
    return effects.attempt(closeStart, after, contentBefore)(code)
  }

  function contentBefore(code: number | null): State | undefined {
    effects.enter('lineEnding')
    effects.consume(code)
    effects.exit('lineEnding')
    return beforeContentChunk
  }

  function beforeContentChunk(code: number | null): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code)
    }
    effects.enter('directiveBlockBody')
    return contentChunk(code)
  }

  function contentChunk(code: number | null): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('directiveBlockBody')
      return beforeContentChunk(code)
    }
    effects.consume(code)
    return contentChunk
  }

  function after(code: number | null): State | undefined {
    effects.exit('directiveBlock')
    return ok(code)
  }

  function tokenizeCloseStart(this: any, effects: any, ok: any, nok: any) {
    let index = 0
    const endTag = `@end${nameBuffer}`

    return startBefore

    function startBefore(code: number | null): State | undefined {
      effects.enter('lineEnding')
      effects.consume(code)
      effects.exit('lineEnding')
      return start
    }

    function start(code: number | null): State | undefined {
      effects.enter('directiveBlockCloseFence')
      return matchSequence(code)
    }

    function matchSequence(code: number | null): State | undefined {
      if (index < endTag.length) {
        if (code === endTag.charCodeAt(index)) {
          effects.consume(code)
          index++
          return matchSequence
        }
        return nok(code)
      }
      return sequenceAfter(code)
    }

    function sequenceAfter(code: number | null): State | undefined {
      if (code === null || markdownLineEnding(code)) {
        effects.exit('directiveBlockCloseFence')
        return ok(code)
      }
      if (markdownSpace(code)) {
        effects.consume(code)
        return sequenceAfter
      }
      return nok(code)
    }
  }
}

function tokenizeNonLazyContinuation(this: any, effects: any, ok: any, nok: any) {
  const self = this
  return start

  function start(code: number | null): State | undefined {
    if (code === null) return nok(code)
    effects.enter('lineEnding')
    effects.consume(code)
    effects.exit('lineEnding')
    return lineStart
  }

  function lineStart(code: number | null): State | undefined {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code)
  }
}

export function genericDirectiveSyntax(): Extension {
  return {
    flow: {
      64: {
        name: 'genericDirective',
        tokenize: tokenizeGenericDirective as Tokenizer,
        concrete: true,
      },
    },
  }
}
