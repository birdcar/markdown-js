# Context Map: Phase 1 — Footnotes Overhaul

**Phase**: 1
**Verdict**: GO (91/100)
**Generated**: 2026-03-10

## Dimensions

| Dimension | Score | Notes |
|---|---|---|
| Scope clarity | 20/20 | All 6 files identified, changes fully specified |
| Pattern familiarity | 18/20 | Sync `fromMarkdown` re-parsing pattern in blocks/index.ts; spec pseudocode incorrectly uses async import |
| Dependency awareness | 17/20 | `remarkBfmFootnotes` consumed by plugin.ts; types exported from index.ts; transform order matters |
| Edge case coverage | 16/20 | Multi-ref IDs, undefined labels, orphaned defs, multiple @endnotes, indent thresholds |
| Test strategy | 20/20 | vitest with helpers.ts (parseAndTransform, toHtml, findNodes) |

## Key Patterns

- `src/blocks/index.ts:4,57-60` — Synchronous `fromMarkdown` re-parsing with processor extensions (USE THIS, not async import)
- `src/blocks/index.ts:39,41` — Processor reference threading via `const self = this`
- `src/inlines/footnotes/syntax.ts:165-187` — Continuation indent tokenizer (change threshold 2→4, add tab)
- `src/inlines/footnotes/index.ts:142-149` — Existing `walkTree` utility (reuse)
- `tests/helpers.ts` — `parseAndTransform(md)`, `toHtml(md)`, `findNodes(tree, type)`

## Dependencies

- `remarkBfmFootnotes` → `src/plugin.ts:9,18` and `src/index.ts:9`
- `FootnoteRefNode/FootnoteDefNode` → `src/index.ts:14` (type-only, additive change safe)
- Transform execution order: directives first, then footnotes (plugin.ts:22-23) — do not change

## Conventions

- No async in transforms — unified pipeline is synchronous
- `(tree as any).footnotes` for non-typed properties
- Node `data` pattern: `{ hName, hProperties, hChildren }`
- `_rawContent` is transient — delete after consuming
- No comments unless handling non-obvious edge cases

## Risks

- **HIGH**: Spec pseudocode uses `await import()` — must use static import instead
- **MEDIUM**: Mutation of shared `def.children` during backlink insertion — clone or create new nodes
- **LOW**: Unused `let spaces = 0` in `continuationIndent` — remove it
- **LOW**: Must preserve `footnoteDef` removal from `tree.children` after building `root.footnotes`
