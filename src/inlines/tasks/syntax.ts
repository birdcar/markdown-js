import type { Extension, Tokenizer } from 'micromark-util-types'
import { TASK_MARKER_CHARS } from '../../types.js'

const tokenizeTaskMarker: Tokenizer = function (effects, ok, nok) {
  const self = this
  return open

  function open(code: number | null) {
    // Must be `[` (91)
    if (code !== 91) return nok(code)
    // Must be at start of content (no previous character)
    if (self.previous !== null) return nok(code)
    // Must be in first content of a list item
    if (!(self as any)._gfmTasklistFirstContentOfListItem) return nok(code)

    effects.enter('taskMarker')
    effects.enter('taskMarkerOpen')
    effects.consume(code)
    effects.exit('taskMarkerOpen')
    return inside
  }

  function inside(code: number | null) {
    if (code === null) return nok(code)
    const char = String.fromCharCode(code)
    if (!TASK_MARKER_CHARS.has(char)) return nok(code)
    effects.enter('taskMarkerValue')
    effects.consume(code)
    effects.exit('taskMarkerValue')
    return close
  }

  function close(code: number | null) {
    // Must be `]` (93)
    if (code !== 93) return nok(code)
    effects.enter('taskMarkerClose')
    effects.consume(code)
    effects.exit('taskMarkerClose')
    return after
  }

  function after(code: number | null) {
    // Must be followed by a space (32)
    if (code !== 32) return nok(code)
    effects.enter('taskMarkerSpace')
    effects.consume(code)
    effects.exit('taskMarkerSpace')
    effects.exit('taskMarker')
    return ok(code)
  }
}

export function taskMarkerSyntax(): Extension {
  return {
    text: {
      91: {
        name: 'taskMarker',
        tokenize: tokenizeTaskMarker,
      },
    },
  }
}
