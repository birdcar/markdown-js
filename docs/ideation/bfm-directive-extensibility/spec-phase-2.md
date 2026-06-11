# Implementation Spec: BFM Directive Extensibility - Phase 2

**Contract**: ./contract.md
**Estimated Effort**: L

## Technical Approach

Phase 2 introduces the registration API and converts the existing switch-based built-ins into registry entries. The tokenizer (Phase 1) already emits a `directiveBlock` for any well-formed name; this phase decides, per name, **(a)** whether the body is re-parsed as markdown (container) or kept literal (leaf), and **(b)** what render data the node carries. Both decisions are driven by a single registry: `{ ...BUILTIN_DIRECTIVES, ...options.directives }` (custom wins on collision).

The public surface is an options object on `remarkBfm`, consistent with the existing `extractMetadata(tree, { computedFields })` and `mergeDocuments(docs, { strategy })` patterns. A directive definition declares its `kind` and *optionally* a render hook — either a declarative `toHast` shorthand (static object or `(node) => data`) for the common "wrap in an element" case, or a `transform(node, ctx)` escape hatch for directives that rewrite children (figure, tabs, details, endnotes). The render hook is **optional**: a consumer like deck can register `{ kind: 'container' }` with no render and consume the parsed nodes itself.

`remarkBfmDirectives` builds the registry once and threads it into both the body-parsing pass (`parseDirectiveBodies`) and the render pass (`applyDirectiveData`). The 10 switch cases in today's `applyDataToDirective` move verbatim into built-in entries; `callout` and `embed` are deliberately *not* added here (they still have bespoke tokenizers until Phase 3).

## Feedback Strategy

**Inner-loop command**: `npx vitest run tests/generic-directives.test.ts tests/custom-directives.test.ts`

**Playground**: vitest. Extend `tests/custom-directives.test.ts` with registration cases; keep `generic-directives.test.ts` as the regression oracle for built-in render parity.

**Why this approach**: The registry refactor must produce byte-identical built-in output; a scoped run against the existing built-in suite is the fastest way to prove no behavior drift while iterating.

## File Changes

### New Files

| File Path                          | Purpose                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `src/blocks/registry.ts`           | `DirectiveDefinition`, `RemarkBfmOptions`, `DirectiveContext`, `HastData` types + `resolveToHast` helper |
| `src/blocks/builtins.ts`           | `BUILTIN_DIRECTIVES` map — the 10 switch cases (details, tabs, tab, figure, aside, include, query, toc, math, endnotes) as entries |

### Modified Files

| File Path                  | Changes                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/blocks/index.ts`      | Accept `options`; build registry; make `parseDirectiveBodies` + `applyDirectiveData` registry-driven; remove `CONTAINER_DIRECTIVES`/`LEAF_DIRECTIVES`/per-name switch |
| `src/plugin.ts`            | `remarkBfm(this, options?)` threads `options` into `remarkBfmDirectives.call(this, options)`             |
| `src/index.ts`             | Export `RemarkBfmOptions`, `DirectiveDefinition`, `DirectiveContext`                                     |
| `tests/helpers.ts`         | Add `parseAndTransformWith(md, options)` + `toHtmlWith(md, options)` for registration tests              |

## Implementation Details

### Registry types

**Overview**: The contract a directive (built-in or custom) fulfills.

```typescript
import type { Root } from 'mdast'
import type { DirectiveBlockNode } from './types.js'

export type HastData = {
  hName?: string
  hProperties?: Record<string, unknown>
  hChildren?: unknown[]
}

export type DirectiveContext = { tree: Root }   // toc needs the whole tree

export interface DirectiveDefinition {
  kind: 'container' | 'leaf'
  toHast?: HastData | ((node: DirectiveBlockNode) => HastData)
  transform?: (node: DirectiveBlockNode, ctx: DirectiveContext) => void
}

export interface RemarkBfmOptions {
  directives?: Record<string, DirectiveDefinition>
}
```

**Key decisions**:

- `transform` takes precedence over `toHast` if both are present (transform is the superset).
- `toHast` may be static or a function of the node (e.g. props derived from params).
- `DirectiveContext` carries `tree` so built-ins like `toc` (which scans document headings) become ordinary entries with no special-casing.

### `builtins.ts` — the 10 switch cases as entries

**Pattern to follow**: each `case` body in today's `applyDataToDirective` (`src/blocks/index.ts:97-256`) maps 1:1 to an entry.

```typescript
export const BUILTIN_DIRECTIVES: Record<string, DirectiveDefinition> = {
  details:  { kind: 'container', transform: (n) => { /* open prop + prepend summary */ } },
  figure:   { kind: 'container', transform: (n) => { /* img + figcaption children */ } },
  aside:    { kind: 'container', transform: (n) => { /* aside + optional title */ } },
  tabs:     { kind: 'container', transform: (n) => { /* build nav from tab children */ } },
  tab:      { kind: 'container', toHast: (n) => ({ hName: 'div', hProperties: tabProps(n) }) },
  toc:      { kind: 'container', transform: (n, ctx) => { /* buildToc(ctx.tree, n) */ } },
  include:  { kind: 'leaf',      toHast: (n) => ({ hName: 'div', hProperties: includeProps(n) }) },
  query:    { kind: 'leaf',      toHast: (n) => ({ hName: 'div', hProperties: queryProps(n) }) },
  math:     { kind: 'leaf',      transform: (n) => { /* div role=math from n.meta.body */ } },
  endnotes: { kind: 'container', transform: (n) => { /* section + optional heading */ } },
}
```

**Key decisions**:

- **`kind` per built-in** preserves today's body handling: container-set members → `container`; `include`/`query`/`endnotes`... note `endnotes` body *was* re-parsed (container) per `CONTAINER_DIRECTIVES`? It is **not** — today only callout/details/tabs/tab/figure/aside/click/steps are containers; include/query/toc/math/endnotes are leaves. Replicate exactly: `details, figure, aside, tabs, tab → container`; `include, query, toc, math, endnotes → leaf`. (`toc`/`endnotes` build children in their transform regardless of body, so leaf is correct — their literal body is discarded today.)
- **`math`**: today the leaf body is stored in `meta.content`; standardize leaf bodies to `meta.body` (Phase 1 groundwork). Math's transform reads `node.meta?.body`. Update the to-markdown serializer accordingly in Phase 3.
- Keep helper fns (`buildToc`, `buildNestedList`, `slugify`, `extractText`) — move them alongside `builtins.ts` or keep in `index.ts` and import.

**Implementation steps**:

1. Copy each switch case body into the matching entry, replacing `directive` → `n` and `tree` → `ctx.tree`.
2. Assign `kind` from today's `CONTAINER_DIRECTIVES`/`LEAF_DIRECTIVES` membership.
3. Delete the `switch` and the two `*_DIRECTIVES` sets from `index.ts`.

**Feedback loop**:

- **Playground**: `tests/generic-directives.test.ts` (unchanged) is the parity oracle.
- **Experiment**: run the existing suite — every assertion on `data.hName`, prepended summary/nav/heading children must still pass unchanged.
- **Check command**: `npx vitest run tests/generic-directives.test.ts`

### Registry-driven transform in `index.ts`

```typescript
export function remarkBfmDirectives(this: Processor<Root>, options?: RemarkBfmOptions) {
  const registry = { ...BUILTIN_DIRECTIVES, ...(options?.directives ?? {}) }
  // ... register micromark/from-markdown extensions (unchanged) ...
  return function transform(tree: Root) {
    parseDirectiveBodies(tree, self, registry)
    applyDirectiveData(tree, registry)
  }
}
```

- `parseDirectiveBodies`: `const def = registry[name]; const kind = def?.kind ?? 'container'` → container re-parses body to children; leaf stores `meta.body` and sets `children = []`.
- `applyDirectiveData`: `const def = registry[name]; if (!def) return;` (unregistered → no render data, per contract); else `def.transform ? def.transform(node, { tree }) : node.data = resolveToHast(def.toHast, node)`.

**Key decisions**:

- **Unregistered default = container** (Phase 1/contract): a name absent from the registry still re-parses its body and emits a `directiveBlock` with parsed children and no `data`. This is what lets deck consume `@click`/`@steps` without registering them.
- Custom defs spread last → override built-ins by name (lets a consumer re-skin `callout`).

**Feedback loop**:

- **Playground**: `tests/custom-directives.test.ts`, describe "registration".
- **Experiment**: register `spoiler: { kind:'container', toHast:{ hName:'details', hProperties:{ class:'spoiler' } } }` → `toHtmlWith` yields `<details class="spoiler">`; register `box: { kind:'container', transform:(n)=>{ n.data={hName:'section'}; n.children.unshift(headingNode) } }` → heading present; register `raw: { kind:'leaf' }` → `meta.body` set, `children` empty; unregistered `@mystery` → `directiveBlock` with parsed children, no `data`.
- **Check command**: `npx vitest run tests/custom-directives.test.ts`

### `remarkBfm(options)` + backward compatibility

**Key decisions**:

- `remarkBfm(this: Processor<Root>, options?: RemarkBfmOptions)` — options optional, so existing `.use(remarkBfm)` (no args) keeps working. `tests/helpers.ts` `parse`/`parseAndTransform` (which call `.use(remarkBfm)`) must remain valid.
- Thread options only to `remarkBfmDirectives`; other sub-plugins are unaffected this phase.

**Feedback loop**:

- **Playground**: `tests/helpers.ts` + existing suites.
- **Experiment**: `.use(remarkBfm)` and `.use(remarkBfm, {})` and `.use(remarkBfm, { directives: {...} })` all parse without type or runtime error.
- **Check command**: `bun run typecheck && npx vitest run`

## Testing Requirements

### Unit Tests

| Test File                         | Coverage                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `tests/custom-directives.test.ts` | toHast shorthand (static + functional), transform escape hatch, leaf registration, unregistered → container no-data, custom overrides built-in |
| `tests/generic-directives.test.ts` (existing) | Parity: all 10 built-ins render identically post-refactor                            |

**Key edge cases**:

- Registering a name that collides with a built-in overrides it.
- A definition with neither `toHast` nor `transform` → node parsed, `kind` honored, no `data`.
- `toc` still builds nav from `ctx.tree` headings (proves `DirectiveContext` plumbing).

## Failure Modes

| Component            | Failure Mode               | Trigger                                  | Impact                                | Mitigation                                                  |
| -------------------- | -------------------------- | ---------------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Built-in refactor    | Render drift               | A switch case copied imperfectly         | Built-in HTML changes silently        | `generic-directives.test.ts` parity suite must stay green   |
| `kind` assignment    | Container/leaf flip        | Mis-mapping a built-in's kind            | Body parsed when it shouldn't (or v.v.) | Cross-check against today's `CONTAINER_DIRECTIVES` set      |
| Registry merge       | Prototype pollution        | Custom key like `__proto__`              | Registry corruption                   | Build registry with `Object.assign(Object.create(null), …)` or guard keys |
| Options threading    | `this` typing break        | unified `.use()` generic inference       | Type error in consumers               | Keep `this: Processor<Root>`; deck already coerces (Phase: stretch fixes typing) |

## Validation Commands

```bash
npx vitest run tests/custom-directives.test.ts tests/generic-directives.test.ts
bun run test
bun run typecheck
bun run build
```

## Open Items

- [ ] Decide whether `buildToc`/helpers live in `builtins.ts` or stay in `index.ts` (cosmetic; either is fine).

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
