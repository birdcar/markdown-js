# Implementation Spec: BFM Directive Extensibility - Phase 1

**Contract**: ./contract.md
**Estimated Effort**: M

## Technical Approach

Phase 1 restores §1.1/§11.3 grammar conformance at the tokenizer level and removes a latent footgun, without yet introducing the registration API (Phase 2) or touching the callout/embed tokenizers (Phase 3). Two coupled changes to `src/blocks/generic/syntax.ts`:

1. **Open the name gate.** Delete the `DIRECTIVE_NAMES` allowlist and the `afterName` rejection. Any name matching the spec grammar `[a-z][a-z0-9]*` becomes a candidate directive. Today `isLowerAlpha` only accepts `a-z` for *every* character, so digit-bearing names like `@h2section` silently fail — fix the name matcher so the **first** char is `[a-z]` and **subsequent** chars are `[a-z0-9]`.

2. **Require a close fence.** Today an unclosed `@foo` consumes the rest of the document to EOF and still emits a directive (the body loop's EOF branch routes to `after`/ok). Masked today by the small allowlist, this becomes a document-eating footgun the moment any name tokenizes. Change the tokenizer so reaching EOF *without* having matched a `@end<name>` close fence fails the construct (`nok`), causing micromark to discard the attempt and reparse the `@foo` line as ordinary paragraph text.

A third, smaller change lands in `src/blocks/generic/from-markdown.ts`: replace the regex-based `parseParams` with a quote-aware tokenizer that classifies each token as `key=value`, a boolean flag (`key`), or a **positional** value (pushed to `params._positional`). This fixes the latent `_positional` reference in the `@include` render case and lays the groundwork for unifying `@embed`'s positional URL in Phase 3.

Tokenization stays name-agnostic on purpose: the tokenizer recognizes *shape* (a `@name … @endname` block), and all per-directive semantics (container/leaf, render) are decided later in the transform. That separation is what makes Phase 2's registry possible without re-tokenizing.

## Feedback Strategy

**Inner-loop command**: `npx vitest run tests/generic-directives.test.ts tests/directives.test.ts`

**Playground**: vitest. Add failing cases to a new `tests/custom-directives.test.ts` (open-parser + unclosed-fence behavior) and run them in watch mode (`npx vitest tests/custom-directives.test.ts`) while editing the tokenizer.

**Why this approach**: All changes are pure parser logic with text in / AST out — a scoped vitest run is the tightest possible loop and exercises the exact micromark state machine being edited.

## File Changes

### New Files

| File Path                        | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `tests/custom-directives.test.ts` | New behaviors: arbitrary-name parsing, unclosed-fence fallback, positional params, digit names |

### Modified Files

| File Path                              | Changes                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/blocks/generic/syntax.ts`         | Remove `DIRECTIVE_NAMES` + `afterName` rejection; fix name matcher to `[a-z][a-z0-9]*`; require close fence (EOF-without-fence → `nok`) |
| `src/blocks/generic/from-markdown.ts`  | Replace regex `parseParams` with quote-aware tokenizer producing key=value, boolean flags, and `_positional` |

## Implementation Details

### Open the name gate

**Pattern to follow**: existing `tokenizeGenericDirective` in `src/blocks/generic/syntax.ts`

**Overview**: Accept any spec-valid name; remove the closed set.

**Key decisions**:

- Delete `DIRECTIVE_NAMES` entirely. The tokenizer no longer knows or cares which names are "real" — that is the registry's job in Phase 2.
- Name grammar: first char `[a-z]` (97–122), subsequent chars `[a-z]` **or** `[0-9]` (48–57). Reject empty names and names starting with a digit (those fall through to non-directive handling).
- Keep the existing `@detailsfoo` guard semantics: after the name, the next char must be EOL/EOF or a space — a non-space, non-newline char (other than a valid name char) means "not a directive."

**Implementation steps**:

1. Remove the `DIRECTIVE_NAMES` const and the `if (!DIRECTIVE_NAMES.has(nameBuffer)) return nok(code)` block in `afterName`.
2. Add `isNameStart(code) = [a-z]` and `isNameCont(code) = [a-z0-9]`; use `isNameStart` for the first buffered char and `isNameCont` thereafter.
3. Guard against empty name: if `nameBuffer.length === 0` at `afterName`, `nok`.

**Feedback loop**:

- **Playground**: `tests/custom-directives.test.ts` with a describe block "open parser".
- **Experiment**: parse `@spoiler\nhi\n@endspoiler\n`, `@h2box\nhi\n@endh2box\n`, `@123\nhi\n@end123\n` (must NOT parse — starts with digit), `@\nhi\n` (bare @, must not parse).
- **Check command**: `npx vitest run tests/custom-directives.test.ts`

### Require a close fence

**Overview**: A directive is only well-formed if its `@end<name>` is found; otherwise it is not a directive.

**Key decisions**:

- Track whether the close fence matched. The close fence is matched via `effects.attempt(closeStart, after, contentBefore)` in `atNonLazyBreak`; the `after` state is reached **both** when `closeStart` succeeds *and* via the EOF branch of `beforeContentChunk`'s `check(...)`. Distinguish them: route the close-fence success to a state that marks "closed", and route the EOF-without-close path to `nok`.
- Simplest wiring: introduce `function afterFence(code)` reached only from `closeStart` success → `exit('directiveBlock'); return ok(code)`. Change the EOF branches (in `afterName`/`params`/`beforeContentChunk` where `code === null`) so that an EOF that is *not* immediately preceded by a matched fence routes to `nok`.
- `self.interrupt` paths (used when this construct is being checked as an interrupt) keep returning `ok(code)` — interrupt checks must not require the full body.

**Implementation steps**:

1. Add an `afterFence` ok-terminal used only by the `closeStart` success branch.
2. In `beforeContentChunk`, when `code === null` (EOF) and no fence has matched, return `nok(code)` instead of `effects.check(...)→after`.
3. Re-run the full directive suite; fix any well-formed fixtures that regress (there should be none — all fixtures are closed).

**Feedback loop**:

- **Playground**: `tests/custom-directives.test.ts`, describe "close fence required".
- **Experiment**: `@note\nbody\n` (no `@endnote`, EOF) → expect **zero** `directiveBlock` nodes (it is a paragraph); `@note\nbody\n@endnote\n` → exactly one. Also `@note\nbody\n@endother\n` (mismatched) → zero.
- **Check command**: `npx vitest run tests/custom-directives.test.ts`

### Quote-aware param parser

**Pattern to follow**: the value-classification intent of the current regex in `from-markdown.ts`

**Overview**: Tokenize the raw params string respecting double quotes, then classify each token.

```typescript
function parseParams(raw: string): Record<string, string | boolean | string[]> {
  const params: Record<string, string | boolean | string[]> = {}
  const positional: string[] = []
  for (const tok of tokenizeParams(raw)) {            // splits on WS, keeps "quoted spans"
    const eq = tok.indexOf('=')
    if (eq > 0 && /^[a-z][a-z0-9_]*$/.test(tok.slice(0, eq))) {
      params[tok.slice(0, eq)] = unquote(tok.slice(eq + 1))
    } else if (/^[a-z][a-z0-9_]*$/.test(tok)) {
      params[tok] = true                               // boolean flag (preserves @details open, @tab active)
    } else {
      positional.push(unquote(tok))                    // URL, path, etc.
    }
  }
  if (positional.length) params._positional = positional
  return params
}
```

**Key decisions**:

- Bare valid-identifier token → boolean `true` (preserves existing `open`/`active` behavior). Bare non-identifier token (URL/path) → positional. This is backward compatible and fixes the `_positional` latent bug referenced in the `@include` render case.
- `_positional` is a reserved key; the boolean/`key=value` branches can never produce it (it is not a valid identifier shape for a user key — it begins with `_`, and the identifier regex requires `[a-z]` first).
- Escaped quotes `\"` inside quoted values unescape to `"` (per §1.2).

**Feedback loop**:

- **Playground**: `tests/custom-directives.test.ts`, describe "positional + quoted params".
- **Experiment**: `@x a=1 open title="two words" https://e.com path/to/f` → `{ a:'1', open:true, title:'two words', _positional:['https://e.com','path/to/f'] }`.
- **Check command**: `npx vitest run tests/custom-directives.test.ts`

## Testing Requirements

### Unit Tests

| Test File                         | Coverage                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| `tests/custom-directives.test.ts` | Arbitrary names parse; digit-bearing names; unclosed/mismatched fences fall back to paragraph; positional + quoted params |
| `tests/generic-directives.test.ts` (existing) | Must stay green — built-ins still parse and render identically          |
| `tests/directives.test.ts` (existing) | Must stay green — callout/embed unaffected in this phase                  |

**Key test cases**:

- `@spoiler\n…\n@endspoiler` → one `directiveBlock` `{ name: 'spoiler' }` (no render data yet — that is Phase 2/3).
- `@note\n…\n` with no close fence → no `directiveBlock`; the text appears in a paragraph.
- `@h2box` digit-in-name parses; `@2box` (leading digit) does not.
- Positional params populate `params._positional`.

### Manual Testing

- [ ] `git stash` the change, confirm `@spoiler` is a paragraph; unstash, confirm it is a directive.

## Failure Modes

| Component        | Failure Mode                | Trigger                                  | Impact                                  | Mitigation                                                        |
| ---------------- | --------------------------- | ---------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Close-fence req. | Over-greedy fallback        | A genuinely-closed directive misdetected | Valid directive becomes a paragraph     | Lock with explicit closed/unclosed test pairs; run full suite     |
| Close-fence req. | Interrupt regression        | Directive used as block interrupt        | Adjacent block parsing changes          | Preserve `self.interrupt ? ok(code)` branches unchanged           |
| Param parser     | Boolean vs positional clash | Bare token that *looks* like a flag      | Mis-typed param value                   | Identifier-shape test decides; documented; covered by experiment  |
| Param parser     | Reserved-key collision      | User writes `_positional=x`              | Positional array overwritten            | `_` prefix is not a valid user-key first char; ignore/again positional |

## Validation Commands

```bash
npx vitest run tests/custom-directives.test.ts   # new behaviors
bun run test                                      # full suite must be green
bun run typecheck
```

## Open Items

- [ ] Confirm no existing fixture relies on unclosed-directive EOF-swallow behavior (expected: none).

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
