import type { Extension, Tokenizer, State } from 'micromark-util-types'
import { markdownLineEnding, markdownSpace } from 'micromark-util-character'

function isLabelChar(code: number): boolean {
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) || // 0-9
    code === 95 || // _
    code === 45 // -
  )
}

/** Text-level tokenizer for `[^label]` footnote references. */
const tokenizeFootnoteRef: Tokenizer = function (effects, ok, nok) {
  return start

  function start(code: number | null): State | undefined {
    // Must be `[` (91)
    if (code !== 91) return nok(code)
    effects.enter('footnoteRef')
    effects.enter('footnoteRefMarker')
    effects.consume(code) // consume [
    return afterOpen
  }

  function afterOpen(code: number | null): State | undefined {
    // Must be `^` (94)
    if (code !== 94) return nok(code)
    effects.consume(code) // consume ^
    effects.exit('footnoteRefMarker')
    effects.enter('footnoteRefLabel')
    return labelStart
  }

  function labelStart(code: number | null): State | undefined {
    // Label must start with a label char
    if (code === null || !isLabelChar(code)) return nok(code)
    effects.consume(code)
    return labelContinue
  }

  function labelContinue(code: number | null): State | undefined {
    if (code === 93) {
      // `]` closes the ref
      effects.exit('footnoteRefLabel')
      effects.enter('footnoteRefMarker')
      effects.consume(code)
      effects.exit('footnoteRefMarker')
      effects.exit('footnoteRef')
      return ok
    }
    if (code !== null && isLabelChar(code)) {
      effects.consume(code)
      return labelContinue
    }
    return nok(code)
  }
}

/** Flow-level tokenizer for `[^label]: content` footnote definitions. */
const tokenizeFootnoteDef: Tokenizer = function (effects, ok, nok) {
  const self = this

  return start

  function start(code: number | null): State | undefined {
    // Must be `[` (91) at start of line
    if (code !== 91) return nok(code)
    effects.enter('footnoteDef')
    effects.enter('footnoteDefLabel')
    effects.consume(code) // consume [
    return caret
  }

  function caret(code: number | null): State | undefined {
    if (code !== 94) return nok(code) // ^
    effects.consume(code)
    return labelStart
  }

  function labelStart(code: number | null): State | undefined {
    if (code === null || !isLabelChar(code)) return nok(code)
    effects.consume(code)
    return labelContinue
  }

  function labelContinue(code: number | null): State | undefined {
    if (code === 93) {
      // `]`
      effects.consume(code)
      return afterLabel
    }
    if (code !== null && isLabelChar(code)) {
      effects.consume(code)
      return labelContinue
    }
    return nok(code)
  }

  function afterLabel(code: number | null): State | undefined {
    if (code !== 58) return nok(code) // :
    effects.consume(code)
    effects.exit('footnoteDefLabel')
    return beforeContent
  }

  function beforeContent(code: number | null): State | undefined {
    if (markdownSpace(code)) {
      effects.consume(code)
      return beforeContent
    }
    effects.enter('footnoteDefContent')
    return contentChunk(code)
  }

  function contentChunk(code: number | null): State | undefined {
    if (code === null || markdownLineEnding(code)) {
      effects.exit('footnoteDefContent')
      // Check for continuation lines (indented by 4+ spaces)
      if (code !== null) {
        return effects.check(
          { tokenize: tokenizeContinuation, partial: true },
          continuationBefore,
          end,
        )(code)
      }
      return end(code)
    }
    effects.consume(code)
    return contentChunk
  }

  function continuationBefore(code: number | null): State | undefined {
    effects.enter('lineEnding')
    effects.consume(code)
    effects.exit('lineEnding')
    return continuationIndent
  }

  function continuationIndent(code: number | null): State | undefined {
    // Consume leading spaces (up to 4)
    let spaces = 0
    if (markdownSpace(code)) {
      effects.enter('footnoteDefContent')
      return consumeIndent(code)
    }
    return end(code)
  }

  function consumeIndent(code: number | null): State | undefined {
    if (markdownSpace(code)) {
      effects.consume(code)
      return consumeIndent
    }
    return contentChunk(code)
  }

  function end(code: number | null): State | undefined {
    effects.exit('footnoteDef')
    return ok(code)
  }
}

const tokenizeContinuation: Tokenizer = function (effects, ok, nok) {
  let spaces = 0

  return start

  function start(code: number | null): State | undefined {
    if (code === null || !markdownLineEnding(code)) return nok(code)
    effects.enter('lineEnding')
    effects.consume(code)
    effects.exit('lineEnding')
    return checkIndent
  }

  function checkIndent(code: number | null): State | undefined {
    if (markdownSpace(code)) {
      spaces++
      effects.consume(code)
      if (spaces >= 2) return ok // At least 2 spaces = continuation
      return checkIndent
    }
    return nok(code)
  }
}

export function footnoteRefSyntax(): Extension {
  return {
    text: {
      91: {
        name: 'footnoteRef',
        tokenize: tokenizeFootnoteRef,
      },
    },
  }
}

export function footnoteDefSyntax(): Extension {
  return {
    flow: {
      91: {
        name: 'footnoteDef',
        tokenize: tokenizeFootnoteDef,
      },
    },
  }
}
