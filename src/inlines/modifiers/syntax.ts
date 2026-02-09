import type { Extension, Tokenizer } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

const tokenizeModifier: Tokenizer = function (effects, ok, nok) {
  const self = this
  let key = ''

  return start

  function start(code: number | null) {
    // Must be `/` (47)
    if (code !== 47) return nok(code)

    // Check preceding character is whitespace or start of content
    const previous = self.previous
    if (previous !== null && !markdownSpace(previous) && !markdownLineEnding(previous)) {
      return nok(code)
    }

    effects.enter('taskModifier')
    effects.enter('taskModifierPrefix')
    effects.consume(code)
    return secondSlash
  }

  function secondSlash(code: number | null) {
    if (code !== 47) return nok(code)
    effects.consume(code)
    effects.exit('taskModifierPrefix')
    return keyStart
  }

  function keyStart(code: number | null) {
    // Key must start with [a-z]
    if (code === null || code < 97 || code > 122) return nok(code)
    effects.enter('taskModifierKey')
    effects.consume(code)
    key = String.fromCharCode(code)
    return keyRest
  }

  function keyRest(code: number | null) {
    // Key continues with [a-z0-9]
    if (code !== null && ((code >= 97 && code <= 122) || (code >= 48 && code <= 57))) {
      effects.consume(code)
      key += String.fromCharCode(code)
      return keyRest
    }
    effects.exit('taskModifierKey')

    // If `:` follows, parse value
    if (code === 58) {
      effects.enter('taskModifierSeparator')
      effects.consume(code)
      effects.exit('taskModifierSeparator')
      return valueStart
    }

    // Boolean flag (no value)
    effects.exit('taskModifier')
    return ok(code)
  }

  function valueStart(code: number | null) {
    if (code === null || markdownLineEnding(code)) {
      // Empty value
      effects.exit('taskModifier')
      return ok(code)
    }
    effects.enter('taskModifierValue')
    return valueContent(code)
  }

  function valueContent(code: number | null): any {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('taskModifierValue')
      effects.exit('taskModifier')
      return ok(code)
    }

    // Look ahead for ` //` which starts a new modifier
    if (code === 32) {
      return checkNextModifier(code)
    }

    effects.consume(code)
    return valueContent
  }

  function checkNextModifier(code: number | null) {
    // We're at a space. Peek ahead for `//` followed by [a-z]
    return effects.check(
      {
        tokenize: tokenizePeekNextModifier,
        partial: true,
      },
      // If next modifier found, end this value (don't consume the space)
      endValue,
      // Otherwise, consume space and continue
      consumeSpaceAndContinue,
    )(code)
  }

  function endValue(code: number | null) {
    effects.exit('taskModifierValue')
    effects.exit('taskModifier')
    return ok(code)
  }

  function consumeSpaceAndContinue(code: number | null) {
    effects.consume(code)
    return valueContent
  }
}

const tokenizePeekNextModifier: Tokenizer = function (effects, ok, nok) {
  return start

  function start(code: number | null) {
    // Consume space
    if (code !== 32) return nok(code)
    effects.enter('_peek')
    effects.consume(code)
    return slash1
  }

  function slash1(code: number | null) {
    if (code !== 47) return nok(code)
    effects.consume(code)
    return slash2
  }

  function slash2(code: number | null) {
    if (code !== 47) return nok(code)
    effects.consume(code)
    return keyCheck
  }

  function keyCheck(code: number | null) {
    effects.exit('_peek')
    // Must be followed by [a-z]
    if (code !== null && code >= 97 && code <= 122) return ok(code)
    return nok(code)
  }
}

export function taskModifierSyntax(): Extension {
  return {
    text: {
      47: {
        name: 'taskModifier',
        tokenize: tokenizeModifier,
      },
    },
  }
}
