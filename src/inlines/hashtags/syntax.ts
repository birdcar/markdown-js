import type { Extension, Tokenizer } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

function isAlpha(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

function isAlphaNum(code: number): boolean {
  return isAlpha(code) || (code >= 48 && code <= 57)
}

const tokenizeHashtag: Tokenizer = function (effects, ok, nok) {
  const self = this

  return start

  function start(code: number | null) {
    // Must be `#` (35)
    if (code !== 35) return nok(code)

    // Must be preceded by whitespace, punctuation, or start of content
    const previous = self.previous
    if (previous !== null && !markdownSpace(previous) && !markdownLineEnding(previous)) {
      // If previous is alphanumeric, it's mid-word — not a hashtag
      if (isAlphaNum(previous)) return nok(code)
    }

    effects.enter('hashtag')
    effects.enter('hashtagMarker')
    effects.consume(code)
    effects.exit('hashtagMarker')
    return identStart
  }

  function identStart(code: number | null) {
    // Identifier must start with [a-zA-Z]
    if (code === null || !isAlpha(code)) return nok(code)
    effects.enter('hashtagIdentifier')
    effects.consume(code)
    return identCore
  }

  function identCore(code: number | null) {
    // Consume alphanumeric characters (these are always valid)
    if (code !== null && isAlphaNum(code)) {
      effects.consume(code)
      return identCore
    }
    // For `_`, `-`: only valid if followed by more identifier chars
    // (no dots, unlike mentions)
    if (code !== null && (code === 95 || code === 45)) {
      return effects.check(
        { tokenize: tokenizeHashtagContinuation, partial: true },
        consumeConnector,
        endIdent,
      )(code)
    }
    return endIdent(code)
  }

  function consumeConnector(code: number | null) {
    effects.consume(code)
    return identCore
  }

  function endIdent(code: number | null) {
    effects.exit('hashtagIdentifier')
    effects.exit('hashtag')
    return ok(code)
  }
}

const tokenizeHashtagContinuation: Tokenizer = function (effects, ok, nok) {
  return start

  function start(code: number | null) {
    // Must be `_` or `-`
    if (code !== 95 && code !== 45) return nok(code)
    effects.enter('_hashtagPeek' as any)
    effects.consume(code)
    return after
  }

  function after(code: number | null) {
    effects.exit('_hashtagPeek' as any)
    // Must be followed by alphanumeric
    if (code !== null && isAlphaNum(code)) return ok(code)
    return nok(code)
  }
}

export function hashtagSyntax(): Extension {
  return {
    text: {
      35: {
        name: 'hashtag',
        tokenize: tokenizeHashtag,
      },
    },
  }
}
