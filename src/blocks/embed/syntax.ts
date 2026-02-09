import type { Extension, Tokenizer, State, Construct } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

const nonLazyContinuation: Construct = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation,
}

function tokenizeCodeFencedEmbed(this: any, effects: any, ok: any, nok: any) {
  const self = this

  const closeStart: Construct = {
    partial: true,
    tokenize: tokenizeCloseStart,
  }

  return start

  function start(code: number | null): State | undefined {
    if (code !== 64) return nok(code)
    effects.enter('embedBlock')
    effects.enter('embedBlockFence')
    effects.enter('embedBlockName')
    effects.consume(code) // consume @
    return matchE
  }

  // Match 'embed' character by character
  function matchE(code: number | null): State | undefined {
    if (code === 101) { effects.consume(code); return matchM }
    return nok(code)
  }
  function matchM(code: number | null): State | undefined {
    if (code === 109) { effects.consume(code); return matchB }
    return nok(code)
  }
  function matchB(code: number | null): State | undefined {
    if (code === 98) { effects.consume(code); return matchE2 }
    return nok(code)
  }
  function matchE2(code: number | null): State | undefined {
    if (code === 101) { effects.consume(code); return matchD }
    return nok(code)
  }
  function matchD(code: number | null): State | undefined {
    if (code === 100) { effects.consume(code); return afterName }
    return nok(code)
  }

  function afterName(code: number | null): State | undefined {
    effects.exit('embedBlockName')

    // Embed requires a space followed by URL
    if (markdownSpace(code)) {
      effects.enter('embedBlockUrl')
      effects.enter('chunkString', { contentType: 'string' })
      return url(code)
    }

    return nok(code)
  }

  function url(code: number | null): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('chunkString')
      effects.exit('embedBlockUrl')
      effects.exit('embedBlockFence')
      return self.interrupt
        ? ok(code)
        : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code)
    }
    effects.consume(code)
    return url
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
    effects.enter('embedBlockBody')
    return contentChunk(code)
  }

  function contentChunk(code: number | null): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('embedBlockBody')
      return beforeContentChunk(code)
    }
    effects.consume(code)
    return contentChunk
  }

  function after(code: number | null): State | undefined {
    effects.exit('embedBlock')
    return ok(code)
  }

  // Nested closing fence tokenizer
  function tokenizeCloseStart(this: any, effects: any, ok: any, nok: any) {
    let index = 0
    const endTag = '@endembed'

    return startBefore

    function startBefore(code: number | null): State | undefined {
      effects.enter('lineEnding')
      effects.consume(code)
      effects.exit('lineEnding')
      return start
    }

    function start(code: number | null): State | undefined {
      effects.enter('embedBlockCloseFence')
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
        effects.exit('embedBlockCloseFence')
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

export function embedSyntax(): Extension {
  return {
    flow: {
      64: {
        name: 'embed',
        tokenize: tokenizeCodeFencedEmbed as Tokenizer,
        concrete: true,
      },
    },
  }
}
