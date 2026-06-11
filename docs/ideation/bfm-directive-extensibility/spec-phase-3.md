# Implementation Spec: BFM Directive Extensibility - Phase 3

**Contract**: ./contract.md
**Estimated Effort**: L

## Technical Approach

Phase 3 collapses the three competing code-64 tokenizers into one. With Phase 1's open `genericDirectiveSyntax` accepting any name and Phase 2's registry driving container/leaf + render, the bespoke `calloutSyntax` and `embedSyntax` tokenizers are pure redundancy — `callout` is a near-exact duplicate of generic, and `embed`'s only real differences (a positional URL and a literal/leaf body) are now expressible through the registry plus Phase 1's positional-param parsing.

The plan: delete `calloutSyntax`, `embedSyntax`, and `embedFromMarkdown`; register `callout` and `embed` as ordinary built-in entries; and make the directive serializer positional-param aware so `@embed <url>` round-trips without special-casing. `callout` gains the wrapper element it never had (today it has no render case, so it emits nothing). `click`/`steps` are removed as built-ins entirely — thanks to Phase 1+2 they still parse as unregistered container `directiveBlock`s, which is exactly what the deck consumer needs.

This is the highest-risk phase (it removes code paths with their own tests), so it is sequenced last among the implementation phases and gated on the full suite staying green, plus an explicit deck-parity test asserting `@click`/`@steps` produce the node shape deck's `remarkClick` consumes.

## Feedback Strategy

**Inner-loop command**: `npx vitest run tests/directives.test.ts tests/custom-directives.test.ts`

**Playground**: vitest. `tests/directives.test.ts` (callout/embed parse + render + round-trip) is the oracle; add a "deck parity" describe to `tests/custom-directives.test.ts`.

**Why this approach**: Deleting tokenizers risks silent parse regressions; the existing callout/embed suite plus round-trip (`stringify`) assertions catch them immediately, and a scoped run keeps the loop fast.

## File Changes

### Modified Files

| File Path                          | Changes                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/blocks/index.ts`              | Drop `calloutSyntax`/`embedSyntax`/`embedFromMarkdown` from the extension list; register only `genericDirectiveSyntax` at code 64 |
| `src/blocks/builtins.ts`           | Add `callout` (container, wrapper render) and `embed` (leaf, positional URL + caption) entries |
| `src/blocks/generic/to-markdown.ts` (moved/renamed from `callout/to-markdown.ts`) | Positional-param-aware `serializeParams`; leaf body from `meta.body`; remove embed/math special-cases |
| `src/types.ts`                     | Remove `embedBlock*` entries from `TokenTypeMap`                                               |

### Deleted Files

| File Path                              | Reason                                                            |
| -------------------------------------- | ---------------------------------------------------------------- |
| `src/blocks/callout/syntax.ts`         | Duplicate of generic tokenizer; callout now uses generic         |
| `src/blocks/embed/syntax.ts`           | Embed now uses generic tokenizer + registry (leaf, positional)   |
| `src/blocks/embed/from-markdown.ts`    | `embedBlock*` tokens no longer produced; generic from-markdown handles all directiveBlocks |

## Implementation Details

### Register `callout`

**Overview**: callout becomes a container entry that finally emits a wrapper element.

```typescript
callout: {
  kind: 'container',
  toHast: (n) => ({
    hName: 'div',
    hProperties: {
      class: `callout callout--${String(n.params.type ?? 'info')}`,
      ...(n.params.title ? { 'data-title': String(n.params.title) } : {}),
    },
  }),
}
```

**Key decisions**:

- This is a **new** render (callout had none). Pick a wrapper consistent with the other built-ins' class conventions (`aside`, `query` use `class`/`data-*`). Confirm against the spec's §1.4 HTML expectations and any `spec/fixtures/blocks/*callout*` fixture; match the fixture if one exists.
- `title` handling: surface via `data-title` (or prepend a titled child via `transform` if a fixture requires markup) — let the fixture decide.

**Feedback loop**:

- **Playground**: `tests/directives.test.ts` callout cases + any callout fixture.
- **Experiment**: `@callout type=warning title="Heads up"\n**body**\n@endcallout` → wrapper element with type class, body re-parsed (strong present).
- **Check command**: `npx vitest run tests/directives.test.ts`

### Register `embed`

**Overview**: embed is a leaf; its URL is a positional param, its caption is the literal body.

```typescript
embed: {
  kind: 'leaf',
  transform: (n) => {
    const url = String(n.params._positional?.[0] ?? n.params.url ?? '')
    const caption = n.meta?.body ?? ''
    n.data = { hName: 'figure', hProperties: { class: 'embed', 'data-url': url } }
    // optional: build figcaption child from caption
  },
}
```

**Key decisions**:

- Phase 1's parser puts the URL in `params._positional[0]`. Keep `params.url` as a fallback for any tree built programmatically.
- The caption (leaf body) arrives in `meta.body` (Phase 2 standardization). Match whatever `embedFromMarkdown` produced before (it stored caption in `meta.caption`) — reconcile to `meta.body` and update the embed render + any embed fixture/test accordingly.
- Verify against `spec/fixtures` and `tests/directives.test.ts` embed cases; the **observable AST/HTML must match** what the bespoke path produced (modulo the meta key rename, which tests should be updated to reflect).

**Feedback loop**:

- **Playground**: `tests/directives.test.ts` embed cases.
- **Experiment**: `@embed https://youtu.be/x\nA caption\n@endembed` → `directiveBlock{name:'embed', params:{_positional:['https://youtu.be/x']}, meta:{body:'A caption'}}`, render carries the URL.
- **Check command**: `npx vitest run tests/directives.test.ts`

### Positional-aware serializer

**Pattern to follow**: `handleDirectiveBlock`/`serializeParams` in today's `callout/to-markdown.ts`

**Overview**: One generic serializer for all directiveBlocks; no per-name branches.

**Implementation steps**:

1. Move `callout/to-markdown.ts` → `generic/to-markdown.ts`, export `directiveToMarkdown` (update `blocks/index.ts` import; the function already handles every `directiveBlock`).
2. `serializeParams`: emit `_positional` tokens first (space-joined, quote if they contain spaces), then `key=value`/boolean pairs; **skip the `_positional` key itself**.
3. Body: `kind === 'leaf'` (or `meta.body` present) → emit `meta.body`; else `state.containerFlow(node, info)`.
4. Remove the `node.name === 'embed'` and `node.name === 'math'` special-cases — both now fall out of the generic positional+leaf logic.

**Feedback loop**:

- **Playground**: `tests/directives.test.ts` round-trip (`stringify`) assertions.
- **Experiment**: parse → stringify → parse for `@embed <url>\ncaption\n@endembed`, `@math\nx^2\n@endmath`, `@callout type=info\nhi\n@endcallout` — all idempotent.
- **Check command**: `npx vitest run tests/directives.test.ts`

### Remove `click`/`steps`; prove deck parity

**Key decisions**:

- Remove every remaining reference to `click`/`steps` (they were only in Phase 1's deleted allowlist and Phase 2's deleted container set — confirm none linger). They are **not** added to `builtins.ts`.
- Because unregistered names default to container with parsed children (Phase 2), `@click`/`@steps` still produce the `directiveBlock` shape deck's `remarkClick` walks. No markdown-js code is needed for them.

**Feedback loop**:

- **Playground**: `tests/custom-directives.test.ts`, describe "deck parity".
- **Experiment**: `@click at=2\nReveal me\n@endclick` → `directiveBlock{name:'click', params:{at:'2'}, children:[paragraph], data: undefined}`; `@steps\n\n- a\n- b\n\n@endsteps` → child is a `list` with two items (deck annotates each item). Assert no `data` is set.
- **Check command**: `npx vitest run tests/custom-directives.test.ts`

## Testing Requirements

### Unit Tests

| Test File                         | Coverage                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| `tests/directives.test.ts` (existing) | callout/embed parse + render + round-trip after unification; update embed meta key + add callout render assertions |
| `tests/custom-directives.test.ts` | deck-parity: `@click`/`@steps` parse as unregistered container directiveBlocks with no render data |
| spec fixtures (`spec/fixtures/blocks`) | callout/embed/math fixtures still match                                  |

### Manual Testing

- [ ] `grep -rn "click\|steps\|calloutSyntax\|embedSyntax\|embedBlock" src/` returns no stragglers.
- [ ] Build (`bun run build`) emits the `./directives` entry point without the deleted files.

## Failure Modes

| Component            | Failure Mode                | Trigger                              | Impact                              | Mitigation                                                  |
| -------------------- | --------------------------- | ------------------------------------ | ----------------------------------- | ---------------------------------------------------------- |
| Tokenizer deletion   | Lost parse path             | A callout/embed edge case only the bespoke tokenizer handled | Specific inputs stop parsing        | Run full `directives.test.ts` + fixtures before/after      |
| embed meta rename    | Caption dropped             | `meta.caption` readers not updated   | Embed caption disappears            | Grep for `meta.caption`; update render + tests in lockstep  |
| Serializer positional| Param order / quoting       | URL or spaced positional             | Non-idempotent round-trip           | Round-trip experiments for embed/math/callout              |
| click/steps removal  | Body not parsed             | Default flips to leaf somewhere      | deck's `remarkClick` sees no children | Deck-parity test asserts `children` is the parsed list      |
| callout new render   | Fixture mismatch            | Chosen wrapper ≠ spec fixture        | Conformance fixture fails           | Read the callout fixture first; match its HTML exactly      |

## Validation Commands

```bash
npx vitest run tests/directives.test.ts tests/custom-directives.test.ts
bun run test          # full suite incl. fixtures
bun run typecheck
bun run build         # confirm deleted files don't break the ./directives bundle
```

## Open Items

- [ ] Confirm the exact callout wrapper HTML against `spec/fixtures` / §1.4 before finalizing its `toHast`.
- [ ] Confirm embed's expected AST (caption key) against fixtures; update tests to the standardized `meta.body`.

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
