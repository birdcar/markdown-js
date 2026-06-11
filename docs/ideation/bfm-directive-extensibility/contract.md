# BFM Directive Extensibility Contract

**Created**: 2026-06-10
**Confidence Score**: 91/100
**Status**: Approved
**Supersedes**: None

## Problem Statement

The BFM spec defines directives as open-ended: §1.1 says any `[a-z][a-z0-9]*` name is syntactically a directive, §11.3 says implementations MAY add custom directive types, and Appendix A lists built-in names as "non-exhaustive." The current parser violates this. `src/blocks/generic/syntax.ts` hard-codes a `DIRECTIVE_NAMES` allowlist and returns `nok` for any name not in it, so `@mydirective…@endmydirective` is never tokenized as a directive — it silently degrades to a plain paragraph. There is no public API for third parties to register their own directives, even though every other extension surface in the package (computed fields, merge strategies) already accepts resolvers via an options object.

The closed model has already forced workarounds. `click`/`steps` were bolted into the core allowlist purely so the parser would recognize them — even though they are owned by a separate app (deck), are absent from the spec, and have no render behavior in markdown-js (deck renders them itself via React, reading the parsed directiveBlock nodes). A latent bug also lurks behind the allowlist: an unclosed directive consumes the rest of the document to EOF, harmless today only because so few names tokenize, but a footgun the moment the parser accepts any name.

## Goals

1. Restore §1.1/§11.3 conformance: the parser tokenizes any well-formed `[a-z][a-z0-9]*` directive regardless of whether it is registered.
2. Add a first-class registration API on `remarkBfm(options)` so consumers add custom directives (container/leaf classification + render behavior) without forking, consistent with the existing `extractMetadata`/`mergeDocuments` options pattern.
3. Collapse the three competing tokenizers (callout, embed, generic) into one and turn every built-in into an ordinary registry entry.
4. Remove `click`/`steps` from markdown-js so deck registers them via the new API; verify all of deck's click/steps features remain expressible.
5. Document the registration API (README + release notes via a conventional-commit feat) and draft a `bfm-spec.md` §11.3 extension addition.

## Success Criteria

- [ ] Any well-formed `@x…@endx` with a valid name parses to a `directiveBlock` node even when `x` is unregistered: container default, body parsed as children, no render data.
- [ ] An unclosed directive (`@x` with no matching `@endx`) falls back to a plain paragraph — no EOF-swallowing.
- [ ] A consumer can register a custom directive through `remarkBfm(options)` using either the `toHast` shorthand or a `transform(node, ctx)` hook; both produce correct output; the render hook is optional (registration may declare `kind` only).
- [ ] All built-ins (callout, details, tabs/tab, figure, aside, include, query, toc, math, endnotes, embed) are registry entries; the bespoke callout and embed tokenizers are deleted; callout now emits a wrapper element it previously lacked.
- [ ] `click`/`steps` are removed from markdown-js yet still parse as container directiveBlocks via the open parser; deck's full feature set (auto-index, `@click at=N`, `@steps` list-item indexing) remains achievable by registering `{ kind: 'container' }` and using deck's own transform/renderer.
- [ ] Existing suites (`tests/directives.test.ts`, `tests/generic-directives.test.ts`, spec fixtures) stay green; new tests cover open-parser acceptance, unclosed fallback, unregistered directives, positional params, and custom registration.
- [ ] README has a "Custom Directives" section with the deck registration recipe; a `feat` commit body documents the API for release-please; `bfm-spec.md` §11.3 has a drafted extension note staged in the submodule.

## Scope Boundaries

### In Scope

- Open the generic tokenizer to any `[a-z][a-z0-9]*` name + require a matching close fence (unclosed → paragraph fallback).
- `remarkBfm(options)` directive registry: `kind` (container/leaf) + `toHast` shorthand + `transform(node, ctx)` escape hatch.
- Refactor the switch-based built-ins into registry entries; unregistered names default to container.
- Unify callout & embed into the single tokenizer; delete their bespoke tokenizers; add positional-param parsing (fix the never-populated `_positional`); fix callout's missing render.
- Remove click/steps built-ins and validate deck's full feature set is expressible via registration.
- README "Custom Directives" section + deck registration recipe + a release-please `feat` commit body.
- Draft a `bfm-spec.md` §11.3 extension addition, staged in the spec submodule.

### Out of Scope

- Rewriting deck's `parse-deck.ts` / `remarkClick` — separate repo the user owns; we provide the registration recipe instead.
- Opening a PR against the spec repo — the submodule is a separate repo; we only stage the draft addition.
- A rehype/HTML renderer for custom directives beyond `hName`/`hProperties` data — rendering is the downstream pipeline's job; markdown-js only sets mdast data.

### Future Considerations

- Custom inline directives (current scope is block directives only).
- Per-directive serialization (`toMarkdown`) hooks for custom round-tripping.
- Promote click/steps into the spec if they generalize beyond deck.
- (Stretch) Proper `unified` `Plugin<[RemarkBfmOptions?], Root>` typing so deck can drop its `as unknown as` coercion.
- (Stretch) A core-only mode that disables specific built-ins.

## Execution Plan

_Pick up this contract cold and know exactly how to execute._

### Dependency Graph

```
Phase 1: Open the parser (conformance + safety)
  └── Phase 2: Directive registry + render API   (blocked by Phase 1)
        └── Phase 3: Unify callout & embed; remove click/steps   (blocked by Phase 2)
              └── Phase 4: Docs + spec draft   (blocked by Phase 3)
```

### Execution Steps

**Strategy**: Sequential

1. **Phase 1** — Open the parser (conformance + safety) _(blocking)_

   ```bash
   /ideation:execute-spec docs/ideation/bfm-directive-extensibility/spec-phase-1.md
   ```

2. **Phase 2** — Directive registry + render API _(blocked by Phase 1)_

   ```bash
   /ideation:execute-spec docs/ideation/bfm-directive-extensibility/spec-phase-2.md
   ```

3. **Phase 3** — Unify callout & embed; remove click/steps _(blocked by Phase 2)_

   ```bash
   /ideation:execute-spec docs/ideation/bfm-directive-extensibility/spec-phase-3.md
   ```

4. **Phase 4** — Docs + spec draft _(blocked by Phase 3)_

   ```bash
   /ideation:execute-spec docs/ideation/bfm-directive-extensibility/spec-phase-4.md
   ```

---

_This contract was generated through a structured ideation interview. Approved at full scope._
