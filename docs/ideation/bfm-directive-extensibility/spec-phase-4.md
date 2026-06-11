# Implementation Spec: BFM Directive Extensibility - Phase 4

**Contract**: ./contract.md
**Estimated Effort**: S

## Technical Approach

Phase 4 is documentation, with one cross-repo artifact. Three deliverables: **(1)** a "Custom Directives" section in the README documenting the registration API, anchored by the deck recipe as the worked example; **(2)** a drafted addition to `spec/bfm-spec.md` §11.3 documenting the extension mechanism as a reference-implementation note — staged in the submodule for a *separate* spec-repo PR; and **(3)** a conventional-commit `feat` whose body carries the API explanation and a `BREAKING CHANGE:` footer (so release-please surfaces the click/steps-no-longer-built-in change in the changelog and GitHub release notes).

This phase only starts once Phase 3 lands, since the docs must reflect the final API shape and file layout. Per project convention, `package.json`'s version is **not** edited by hand — release-please derives it from the commit type.

## Feedback Strategy

**Inner-loop command**: `bun run build && bun run typecheck` (validates README code samples compile when copied into a scratch file; ensures the documented exports actually exist)

**Playground**: A scratch `scratch/registry-demo.ts` importing from `../src/index.js`, used to confirm every code sample in the README type-checks against the real exports. Delete it before finishing.

**Why this approach**: Docs rot when samples drift from the API; type-checking the documented snippets against the actual exports is the only check that matters here.

## File Changes

### Modified Files

| File Path                | Changes                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `README.md`              | New "Custom Directives" section; update the entry-point table (line ~88) and "Types" list (line ~388); fix any "9 new directive blocks" / click/steps mentions |
| `spec/bfm-spec.md`       | (submodule) Drafted §11.3 extension subsection — committed in the submodule, PR'd separately  |

### New (ephemeral) Files

| File Path                   | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `scratch/registry-demo.ts`  | Type-check README snippets against real exports; deleted before commit |

## Implementation Details

### README "Custom Directives" section

**Overview**: Add after the existing "Directive Blocks" section (README ~line 270).

**Content checklist**:

1. **`remarkBfm(options)` signature** + that calling it with no options is unchanged behavior.
2. **`DirectiveDefinition` shape**: `kind` (`'container' | 'leaf'`), optional `toHast` (static or `(node) => HastData`), optional `transform(node, ctx)`.
3. **Shorthand example** (the 80% case):

   ```ts
   import { remarkBfm } from '@birdcar/markdown'

   unified().use(remarkParse).use(remarkBfm, {
     directives: {
       spoiler: { kind: 'container', toHast: { hName: 'details', hProperties: { class: 'spoiler' } } },
     },
   })
   ```

4. **Transform escape hatch** (children rewriting) — a short `transform(node, ctx)` example.
5. **The deck recipe** (the canonical real-world example): register parse-only container directives and render them with your own transform/renderer:

   ```ts
   unified()
     .use(remarkParse).use(remarkGfm)
     .use(remarkBfm, { directives: { click: { kind: 'container' }, steps: { kind: 'container' } } })
     .use(remarkClick)   // your own transform reads the directiveBlock nodes
   ```

6. **Behavior notes**: unregistered well-formed directives parse as **container** `directiveBlock`s with no render data; a directive **requires a matching `@endname`** or it falls back to a paragraph; custom defs **override** built-ins of the same name.

**Key decisions**:

- Lead with the shorthand; keep `transform` second. Mirror the README's existing example tone (`### Parse and render all BFM features`).
- Update the entry-point table row for `./directives` and the `DirectiveBlockNode` line in "Types"; add `RemarkBfmOptions`, `DirectiveDefinition`, `DirectiveContext` to the exported-types list.

**Feedback loop**:

- **Playground**: `scratch/registry-demo.ts` — paste each README snippet, import from `../src/index.js`.
- **Experiment**: snippets compile; `RemarkBfmOptions`/`DirectiveDefinition` import cleanly; `.use(remarkBfm)` and `.use(remarkBfm, {...})` both type-check.
- **Check command**: `bun run typecheck`

### Spec §11.3 draft (submodule)

**Overview**: A subsection under §11.3 "Extension" describing the registration mechanism as a reference-implementation note (not a normative grammar change — §1.1/§11.3 already permit it).

**Key decisions**:

- Frame as informative: "A conforming implementation MAY expose directive registration; the reference implementation does so via …". Keep it implementation-flavored, not a new MUST.
- This edits the **submodule** working tree. Commit inside `spec/`, push to a branch on the spec repo, open the PR there — do **not** bump the submodule pointer in markdown-js as part of the feature commit unless the user wants the pointer moved.

**Feedback loop**: None (prose). Verify it renders and the section numbering is consistent.

### Conventional commit for release-please

**Overview**: The changelog/release-notes deliverable is the commit message itself (project uses release-please; do not hand-edit CHANGELOG or version).

```
feat(directives): open parser to any name and add directive registration API

Directives now tokenize for any [a-z][a-z0-9]* name (spec §1.1) and a
matching @endname is required, fixing the EOF-swallow on unclosed blocks.
Adds remarkBfm({ directives }) so consumers register custom directives
(container/leaf + toHast shorthand or transform hook). Built-ins are now
ordinary registry entries; callout/embed gain unified handling.

BREAKING CHANGE: @click and @steps are no longer built-in directives.
They still parse as container directiveBlocks, but consumers that relied
on them being registered should register them via the new directives
option. See README "Custom Directives".
```

**Key decisions**:

- Use the `/commit` skill per user preference; no Co-Authored-By trailer.
- `BREAKING CHANGE:` footer ensures release-please notes the click/steps change even though parsing still works.

## Testing Requirements

### Manual Testing

- [ ] Every README code sample compiles in `scratch/registry-demo.ts` (`bun run typecheck`), then scratch deleted.
- [ ] `bun run build` succeeds; documented exports are present in `dist/`.
- [ ] Spec §11.3 draft committed inside the `spec/` submodule on a branch; markdown-js submodule pointer left as-is (unless user requests the bump).

## Failure Modes

| Component       | Failure Mode            | Trigger                                  | Impact                          | Mitigation                                        |
| --------------- | ----------------------- | ---------------------------------------- | ------------------------------- | ------------------------------------------------- |
| README snippets | Sample drift            | API renamed after docs written           | Copy-paste fails for users      | Type-check snippets via scratch file before commit |
| Submodule edit  | Accidental pointer bump | `git add spec` in the parent repo        | Unintended submodule commit     | Commit inside `spec/`; verify `git status` in parent shows no submodule change |
| Commit footer   | Missed breaking note    | Plain `feat` without footer              | Release notes omit click/steps  | Include `BREAKING CHANGE:` footer explicitly       |

## Validation Commands

```bash
bun run typecheck          # README snippets via scratch file
bun run build
bun run test               # sanity: nothing regressed
git -C spec status         # confirm spec draft staged in submodule
git status                 # confirm parent repo has no stray submodule pointer change
```

## Open Items

- [ ] Confirm with the user whether to bump the `spec` submodule pointer in this repo after the spec PR merges, or leave it for a follow-up.

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
