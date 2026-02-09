import type { Extension, Tokenizer, State, Construct } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

const nonLazyContinuation: Construct = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation,
}

function tokenizeCodeFencedCallout(this: any, effects: any, ok: any, nok: any) {
  const self = this

  const closeStart: Construct = {
    partial: true,
    tokenize: tokenizeCloseStart,
  }

  return start

  function start(code: number | null): State | undefined {
    // Must be `@` (64)
    if (code !== 64) return nok(code)
    effects.enter('directiveBlock')
    effects.enter('directiveBlockFence')
    effects.enter('directiveBlockName')
    effects.consume(code) // consume @
    return matchC
  }

  // Match 'callout' character by character
  function matchC(code: number | null): State | undefined {
    if (code === 99) { effects.consume(code); return matchA }
    return nok(code)
  }
  function matchA(code: number | null): State | undefined {
    if (code === 97) { effects.consume(code); return matchL1 }
    return nok(code)
  }
  function matchL1(code: number | null): State | undefined {
    if (code === 108) { effects.consume(code); return matchL2 }
    return nok(code)
  }
  function matchL2(code: number | null): State | undefined {
    if (code === 108) { effects.consume(code); return matchO }
    return nok(code)
  }
  function matchO(code: number | null): State | undefined {
    if (code === 111) { effects.consume(code); return matchU }
    return nok(code)
  }
  function matchU(code: number | null): State | undefined {
    if (code === 117) { effects.consume(code); return matchT }
    return nok(code)
  }
  function matchT(code: number | null): State | undefined {
    if (code === 116) { effects.consume(code); return afterName }
    return nok(code)
  }

  function afterName(code: number | null): State | undefined {
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

    // Not valid (e.g., @calloutfoo)
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

  // Nested closing fence tokenizer
  function tokenizeCloseStart(this: any, effects: any, ok: any, nok: any) {
    let index = 0
    const endTag = '@endcallout'

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

export function calloutSyntax(): Extension {
  return {
    flow: {
      64: {
        name: 'callout',
        tokenize: tokenizeCodeFencedCallout as Tokenizer,
        concrete: true,
      },
    },
  }
}
