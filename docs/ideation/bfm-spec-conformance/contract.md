# BFM Spec Conformance Contract

**Created**: 2026-03-10
**Confidence Score**: 96/100
**Status**: Draft

## Problem Statement

The markdown-js parser implements BFM (Birdcar Flavored Markdown) as a remark/micromark plugin, but a spec audit reveals significant gaps between the implementation and the BFM 0.1.0-draft specification. Several built-in directives are stubs (`@include`, `@query`), others have incorrect behavior (`@toc` flat list, `@tabs` missing `active`), and the footnotes system is missing core spec requirements (auto-numbering indices, multi-reference backlinks, BFM body re-parsing, `root.footnotes` array).

These gaps mean the library cannot claim spec conformance, and consumers relying on spec-defined behavior will encounter silent failures or incorrect output.

## Goals

1. **Achieve BFM Full conformance** for all AST structures, node types, and param mappings defined in the spec
2. **Fix all broken directive implementations** so `@toc`, `@tabs`, `@endnotes`, and `@math` produce spec-compliant AST and HTML
3. **Bring footnotes to full spec compliance** including `index` fields, `root.footnotes` array, multi-ref backlinks, BFM body parsing, and proper continuation indent
4. **Add `computed.footnotes` to metadata extraction** so the DocumentMetadata model matches spec section 7.2
5. **Correct `@include` and `@query` AST structures** with proper params (resolution deferred to consumers)
6. **Eliminate dead code and fill test gaps** for complete coverage of all spec features

## Success Criteria

- [ ] All 11 built-in directives produce correct AST node structures with spec-defined params
- [ ] `@toc` generates nested list hierarchy respecting heading depth, `ordered` flag works, excludes preceding heading
- [ ] `@tabs`/`@tab` handles `active` param and produces nav/tablist HTML structure
- [ ] `@endnotes` renders `title` as `<h2>`, multiple `@endnotes` detected as parse error
- [ ] `@math` includes `aria-label` on rendered HTML
- [ ] `@include` AST has correct params (`path` positional, `heading` named) — resolution not required
- [ ] `@query` AST has correct params (`type`, `state`, `tag`, `limit`, `sort`) — execution not required
- [ ] `FootnoteRefNode` and `FootnoteDefNode` carry `index` field
- [ ] Footnote definitions collected into `root.footnotes` array
- [ ] Multi-reference footnotes produce unique IDs (`fnref-{label}-{n}`) and multiple backlinks
- [ ] Footnote body content is re-parsed as BFM markdown (inline formatting, mentions, hashtags preserved)
- [ ] Footnote continuation lines require 4-space/1-tab indent per spec
- [ ] Undefined footnote labels produce parse error
- [ ] `BuiltinMetadata.footnotes` field exists and is populated by `extractMetadata`
- [ ] `mergeDocuments` recomputes metadata on merged result
- [ ] Dead `callout/from-markdown.ts` removed
- [ ] `after` modifier key has test coverage
- [ ] All existing tests continue to pass
- [ ] `bun run build` succeeds with no type errors

## Scope Boundaries

### In Scope

- Fix all 11 built-in directive AST structures and param mappings
- Fix `@toc` nested list generation and `ordered` flag bug
- Fix `@tabs`/`@tab` `active` param and HTML structure
- Fix `@endnotes` title rendering and duplicate detection
- Fix `@math` aria-label
- Fix `@include` and `@query` param mappings (AST-only, no runtime resolution)
- Complete footnotes overhaul: index fields, root.footnotes, multi-ref, body parsing, continuation indent, undefined label error
- Add `computed.footnotes` to metadata extraction
- Add post-merge metadata recomputation to `mergeDocuments`
- Remove dead `callout/from-markdown.ts`
- Add missing test for `after` modifier
- Update all affected test files

### Out of Scope

- `@include` file resolution (file I/O, heading extraction, circular detection) — deferred to consumer-side resolver
- `@query` execution against document metadata — deferred to consumer-side helper
- HTML rendering pipeline (rehype plugins) — only AST and to-markdown roundtrip
- New fixture files in the spec submodule — spec repo is read-only
- Collection-level features (backlinks across documents)

### Future Considerations

- `resolveIncludes()` transform utility for consumers who want build-time include resolution
- `executeQuery()` helper for consumers who want runtime query evaluation
- Fixture-based conformance test runner that validates against spec/fixtures/

## Execution Plan

### Dependency Graph

```
Phase 1: Footnotes Overhaul
  ├── Phase 2: Directive Fixes  (blocked by Phase 1 — @endnotes title rendering depends on footnote transform)
  ├── Phase 3: Metadata & Merge (blocked by Phase 1 — needs footnote types and root.footnotes)
  └── Phase 4: Cleanup & Test Gaps (independent — can run anytime)
```

### Execution Steps

**Strategy**: Hybrid — Phase 1 first, then Phases 2–4 in parallel

1. **Phase 1 — Footnotes Overhaul** _(blocking)_
   ```
   /execute-spec docs/ideation/bfm-spec-conformance/spec-phase-1.md
   ```

2. **Phases 2, 3 & 4** — parallel after Phase 1

   Start one Claude Code session, enter delegate mode (Shift+Tab), paste:

   ```
   Phase 1 (Footnotes Overhaul) is complete. Create an agent team to
   implement 3 remaining phases in parallel. Each phase is independent
   after Phase 1.

   Spawn 3 teammates with plan approval required. Each teammate should:
   1. Read their assigned spec file
   2. Explore the codebase for relevant patterns before planning
   3. Plan their implementation approach and wait for approval
   4. Implement following spec and codebase patterns
   5. Run validation commands from their spec after implementation

   Teammates:

   1. "Directive Fixes" — docs/ideation/bfm-spec-conformance/spec-phase-2.md
      Fix @toc nesting, @tabs active param, @endnotes title, @math aria-label,
      @include and @query param mappings

   2. "Metadata & Merge" — docs/ideation/bfm-spec-conformance/spec-phase-3.md
      Add computed.footnotes to BuiltinMetadata, add mergeAndExtract convenience function

   3. "Cleanup & Test Gaps" — docs/ideation/bfm-spec-conformance/spec-phase-4.md
      Remove dead callout/from-markdown.ts, add //after: modifier test

   Coordinate on shared files: src/index.ts is modified by phases 2 and 3
   (type exports only) — only one teammate should modify it at a time.
   ```

---

_This contract was generated from a spec audit brain dump. Approved and ready for execution._
