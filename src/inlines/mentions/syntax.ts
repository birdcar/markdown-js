import type { Extension, Tokenizer } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

function isAlpha(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

function isLowerAlpha(code: number): boolean {
  return code >= 97 && code <= 122
}

function isAlphaNum(code: number): boolean {
  return isAlpha(code) || (code >= 48 && code <= 57)
}

function isIdentContinuation(code: number): boolean {
  // [a-zA-Z0-9._-]
  return isAlphaNum(code) || code === 46 || code === 95 || code === 45
}

const tokenizeMention: Tokenizer = function (effects, ok, nok) {
  const self = this
  let prefixAllLowerAlpha = true
  let hasConsumedAlphaNum = false

  return start

  function start(code: number | null) {
    // Must be `@` (64)
    if (code !== 64) return nok(code)

    // Must be preceded by whitespace, punctuation, or start of content
    const previous = self.previous
    if (previous !== null && !markdownSpace(previous) && !markdownLineEnding(previous)) {
      // If previous is alphanumeric, it's mid-word — not a mention
      if (isAlphaNum(previous)) return nok(code)
    }

    effects.enter('mention')
    effects.enter('mentionMarker')
    effects.consume(code)
    effects.exit('mentionMarker')
    return identStart
  }

  function identStart(code: number | null) {
    // Identifier must start with [a-zA-Z]
    if (code === null || !isAlpha(code)) return nok(code)
    effects.enter('mentionIdentifier')
    prefixAllLowerAlpha = isLowerAlpha(code)
    hasConsumedAlphaNum = true
    effects.consume(code)
    return identCore
  }

  function identCore(code: number | null) {
    // Consume alphanumeric characters (these are always valid)
    if (code !== null && isAlphaNum(code)) {
      if (!isLowerAlpha(code)) prefixAllLowerAlpha = false
      hasConsumedAlphaNum = true
      effects.consume(code)
      return identCore
    }
    // Check for `:` — potential platform separator
    // Only if everything so far has been lowercase alpha (a valid platform prefix)
    if (code === 58 && prefixAllLowerAlpha && hasConsumedAlphaNum) {
      // Consume the colon and enter platform identifier mode
      effects.consume(code)
      return platformIdentStart
    }
    // For `.`, `_`, `-`: only valid if followed by more identifier chars
    // (i.e., they can't be trailing)
    if (code !== null && (code === 46 || code === 95 || code === 45)) {
      return effects.check(
        { tokenize: tokenizeIdentContinuation, partial: true },
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

  // After the colon in platform:identifier — the identifier part must start with alpha
  function platformIdentStart(code: number | null) {
    if (code === null || !isAlpha(code)) {
      // Invalid platform identifier — but we already consumed the colon.
      // The full token including colon won't form a valid mention.
      // We need to fail the whole thing or accept what we have.
      // Actually we can't nok here because we already consumed chars.
      // We should end the identifier — the from-markdown layer will handle
      // a raw "platform:" as the identifier (which won't match a known platform).
      return endIdent(code)
    }
    effects.consume(code)
    return platformIdentCore
  }

  function platformIdentCore(code: number | null) {
    // Consume alphanumeric characters
    if (code !== null && isAlphaNum(code)) {
      effects.consume(code)
      return platformIdentCore
    }
    // For `.`, `_`, `-`, `@`: only valid if followed by more identifier chars
    if (code !== null && (code === 46 || code === 95 || code === 45 || code === 64)) {
      return effects.check(
        { tokenize: tokenizePlatformIdentContinuation, partial: true },
        consumePlatformConnector,
        endIdent,
      )(code)
    }
    return endIdent(code)
  }

  function consumePlatformConnector(code: number | null) {
    effects.consume(code)
    return platformIdentCore
  }

  function endIdent(code: number | null) {
    effects.exit('mentionIdentifier')
    effects.exit('mention')
    return ok(code)
  }
}

const tokenizeIdentContinuation: Tokenizer = function (effects, ok, nok) {
  return start

  function start(code: number | null) {
    // Must be `.`, `_`, or `-`
    if (code !== 46 && code !== 95 && code !== 45) return nok(code)
    effects.enter('_mentionPeek' as any)
    effects.consume(code)
    return after
  }

  function after(code: number | null) {
    effects.exit('_mentionPeek' as any)
    // Must be followed by alphanumeric
    if (code !== null && isAlphaNum(code)) return ok(code)
    return nok(code)
  }
}

const tokenizePlatformIdentContinuation: Tokenizer = function (effects, ok, nok) {
  return start

  function start(code: number | null) {
    // Must be `.`, `_`, `-`, or `@`
    if (code !== 46 && code !== 95 && code !== 45 && code !== 64) return nok(code)
    effects.enter('_mentionPeek' as any)
    effects.consume(code)
    return after
  }

  function after(code: number | null) {
    effects.exit('_mentionPeek' as any)
    // Must be followed by alphanumeric
    if (code !== null && isAlphaNum(code)) return ok(code)
    return nok(code)
  }
}

export function mentionSyntax(): Extension {
  return {
    text: {
      64: {
        name: 'mention',
        tokenize: tokenizeMention,
      },
    },
  }
}
