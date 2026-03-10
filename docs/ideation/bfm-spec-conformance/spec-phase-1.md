# Implementation Spec: BFM Spec Conformance - Phase 1 (Footnotes Overhaul)

**Contract**: ./contract.md
**Estimated Effort**: L

## Technical Approach

Phase 1 rewrites the footnotes subsystem to match BFM spec sections 10.1–10.6. The existing tokenizer, from-markdown handler, transform, and to-markdown handler all need changes. The core issues: missing `index` fields on AST nodes, no `root.footnotes` array, raw text instead of BFM-parsed body content, duplicate HTML IDs on multi-reference, wrong continuation indent threshold, and no parse error for undefined labels.

The approach is to fix layer by layer: types first, then syntax (continuation indent), then from-markdown (index assignment prep), then the transform (the heaviest changes), then to-markdown (roundtrip with parsed children).

## Feedback Strategy

**Inner-loop command**: `bun run test -- --reporter=verbose tests/footnotes.test.ts`

**Playground**: Test suite — footnotes is pure data transformation with no UI. Tests run in milliseconds.

**Why this approach**: Every change is to parsing/transform logic that is best validated by asserting AST structure and HTML output.

## File Changes

### Modified Files

| File Path | Changes |
|-----------|---------|
| `src/types.ts` | Add `index` field to `FootnoteRefNode` and `FootnoteDefNode` |
| `src/inlines/footnotes/syntax.ts` | Fix continuation indent to require 4 spaces (not 2) |
| `src/inlines/footnotes/from-markdown.ts` | No structural changes needed — index assigned in transform |
| `src/inlines/footnotes/index.ts` | Major rewrite of `transformFootnotes`: assign `index` to nodes, build `root.footnotes` array, re-parse body as BFM, multi-ref unique IDs and backlinks, undefined label error |
| `src/inlines/footnotes/to-markdown.ts` | Handle parsed children (not just `_rawContent`) for roundtrip |
| `tests/footnotes.test.ts` | Add tests for all new behaviors |

## Implementation Details

### 1. Type Updates

**Pattern to follow**: Existing `FootnoteRefNode` and `FootnoteDefNode` in `src/types.ts`

**Overview**: Add `index` field to both node types per spec §10.5.

```typescript
export type FootnoteRefNode = Literal & {
  type: 'footnoteRef'
  label: string
  index: number  // auto-assigned display number (1-based)
}

export type FootnoteDefNode = Parent & {
  type: 'footnoteDef'
  label: string
  index: number  // matches the ref index for this label
}
```

### 2. Continuation Indent Fix

**Pattern to follow**: `src/inlines/footnotes/syntax.ts` lines 165–187

**Overview**: The `tokenizeContinuation` partial tokenizer currently accepts 2+ spaces. Spec requires 4 spaces or 1 tab.

**Implementation steps**:
1. In `tokenizeContinuation`, change `if (spaces >= 2) return ok` to `if (spaces >= 4) return ok`
2. Add tab handling: if code is 9 (tab), immediately return `ok`
3. Fix the unused `let spaces = 0` in `continuationIndent` function — remove it or use it properly

**Feedback loop**:
- **Playground**: Add test case for 2-space indent (should NOT be continuation) and 4-space indent (should be continuation)
- **Experiment**: Test with `[^1]: First line\n  Not continuation` (2 spaces) vs `[^1]: First line\n    Continuation` (4 spaces)
- **Check command**: `bun run test -- --reporter=verbose tests/footnotes.test.ts`

### 3. Transform Rewrite

**Pattern to follow**: `src/inlines/footnotes/index.ts` `transformFootnotes` function

**Overview**: This is the bulk of the work. The transform needs to:

1. **Assign `index` to ref and def nodes** — first-appearance order, 1-based
2. **Build `root.footnotes` array** — collect defs into `(tree as any).footnotes`
3. **Re-parse body content as BFM** — use the processor's extensions to parse `_rawContent`
4. **Generate unique IDs for multi-reference** — `fnref-{label}` for first, `fnref-{label}-{n}` for subsequent
5. **Generate multiple backlinks** — one per reference location
6. **Detect undefined labels** — refs with no corresponding def produce a parse error (throw or add to vfile messages)
7. **Detect multiple `@endnotes`** — error if more than one found

```typescript
function transformFootnotes(tree: Root, processor: Processor<Root>): void {
  const refs: Array<{ node: any; label: string }> = []
  const defs = new Map<string, any>()

  walkTree(tree, (node: any) => {
    if (node.type === 'footnoteRef') refs.push({ node, label: node.label })
    if (node.type === 'footnoteDef') defs.set(node.label, node)
  })

  if (refs.length === 0 && defs.size === 0) return

  // Assign indices (first-appearance order)
  const labelToIndex = new Map<string, number>()
  const labelRefCounts = new Map<string, number>()
  let counter = 0

  for (const ref of refs) {
    if (!labelToIndex.has(ref.label)) {
      counter++
      labelToIndex.set(ref.label, counter)
    }
    const index = labelToIndex.get(ref.label)!
    ref.node.index = index

    // Track ref count for multi-reference ID assignment
    const count = (labelRefCounts.get(ref.label) ?? 0) + 1
    labelRefCounts.set(ref.label, count)

    // Generate unique ID: first ref = fnref-{label}, subsequent = fnref-{label}-{n}
    const refId = count === 1 ? `fnref-${ref.label}` : `fnref-${ref.label}-${count}`

    ref.node.data = {
      hName: 'sup',
      hProperties: { class: 'footnote-ref', id: refId },
      hChildren: [{
        type: 'element', tagName: 'a',
        properties: { href: `#fn-${ref.label}`, role: 'doc-noteref' },
        children: [{ type: 'text', value: `[${index}]` }],
      }],
    }
  }

  // Check for undefined labels
  for (const ref of refs) {
    if (!defs.has(ref.label)) {
      throw new Error(`Footnote reference [^${ref.label}] has no corresponding definition`)
    }
  }

  // Re-parse def bodies as BFM and assign indices
  const data = processor.data()
  for (const [label, def] of defs) {
    const index = labelToIndex.get(label)
    if (index != null) def.index = index

    if (def._rawContent && (!def.children || def.children.length === 0)) {
      const { fromMarkdown } = await import('mdast-util-from-markdown')
      const bodyTree = fromMarkdown(def._rawContent, {
        extensions: (data.micromarkExtensions || []) as any[],
        mdastExtensions: (data.fromMarkdownExtensions || []) as any[],
      })
      def.children = bodyTree.children
    }
    delete def._rawContent
  }

  // Build root.footnotes array (ordered by index)
  const footnoteEntries = [...defs.entries()]
    .filter(([label]) => labelToIndex.has(label))
    .sort(([a], [b]) => labelToIndex.get(a)! - labelToIndex.get(b)!)
  ;(tree as any).footnotes = footnoteEntries.map(([, def]) => def)

  // Build endnotes section with multi-ref backlinks
  // ... (find or create @endnotes node, build list with backlinks for ALL refs)
}
```

**Key decisions**:
- Throw on undefined label (spec says "parse error") — use vfile message if available, throw otherwise
- `root.footnotes` is set as a non-enumerable-ish property on the tree — just `(tree as any).footnotes`
- Re-parsing uses the same processor extensions so BFM inlines (mentions, hashtags) work inside footnotes
- The transform needs the processor reference — update `remarkBfmFootnotes` to pass `this` (the processor) through

**Implementation steps**:
1. Update `remarkBfmFootnotes` to pass processor to transform: `transformFootnotes(tree, self)`
2. In transform: assign `index` to both ref and def nodes
3. Track per-label ref counts for multi-ref ID generation
4. Generate unique `fnref-{label}-{n}` IDs for 2nd+ refs
5. Check for undefined labels after collecting refs and defs
6. Re-parse `_rawContent` using processor's registered extensions
7. Build `(tree as any).footnotes` array ordered by first-appearance index
8. Find `@endnotes` node — error if multiple found
9. Build endnotes list with backlinks pointing to ALL ref IDs for each label

**Feedback loop**:
- **Playground**: Extend `tests/footnotes.test.ts` with new describe blocks before implementing
- **Experiment**: Test single ref, multi-ref (same label twice), undefined label, BFM content in def body (bold, mentions, hashtags), 4-space continuation
- **Check command**: `bun run test -- --reporter=verbose tests/footnotes.test.ts`

### 4. Multi-Reference Backlinks

**Overview**: When `[^1]` appears 3 times, the endnote for footnote 1 should have 3 backlinks: `↩` linking to `#fnref-1`, `↩` linking to `#fnref-1-2`, `↩` linking to `#fnref-1-3`.

```typescript
// For each label, collect all ref IDs
const labelRefIds = new Map<string, string[]>()
// ... populated during ref processing ...

// When building the endnotes list item:
const backlinks = (labelRefIds.get(label) ?? []).map((refId, i) => ({
  type: 'link',
  url: `#${refId}`,
  data: { hProperties: { class: 'footnote-backref', role: 'doc-backlink' } },
  children: [{ type: 'text', value: i === 0 ? '↩' : `↩${superscript(i + 1)}` }],
}))
```

### 5. To-Markdown Update

**Pattern to follow**: `src/inlines/footnotes/to-markdown.ts`

**Overview**: The `handleFootnoteDef` handler currently falls back to `_rawContent`. After phase 1, defs always have parsed `children`. Update to always use `state.containerFlow` for serialization.

**Implementation steps**:
1. Remove `_rawContent` fallback — children will always be populated after transform
2. For multi-line content, indent continuation lines with 4 spaces

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|---------|
| `tests/footnotes.test.ts` | All footnote behaviors |

**Key test cases**:
- `footnoteRef` nodes have `index` field (1-based, first-appearance order)
- `footnoteDef` nodes have `index` field matching their ref's index
- `root.footnotes` array exists and is ordered by index
- Multi-ref: `[^1]` used twice produces unique IDs `fnref-1` and `fnref-1-2`
- Multi-ref: endnote has backlinks to all ref locations
- Undefined label `[^missing]` throws parse error
- Footnote body with `**bold**` and `@mention` is parsed as BFM
- Continuation lines require 4-space indent (2-space is not continuation)
- Tab indent is valid continuation
- Multiple `@endnotes` directives produce error
- `@endnotes title="References"` renders `<h2>References</h2>` (crosses into Phase 2 territory — defer title rendering to Phase 2, but ensure the data flow supports it)

## Error Handling

| Error Scenario | Handling Strategy |
|---|---|
| Undefined footnote label | Throw `Error('Footnote reference [^label] has no corresponding definition')` |
| Multiple `@endnotes` directives | Throw `Error('Multiple @endnotes directives found; only one is allowed per document')` |
| Orphaned definition (no ref) | Silently ignore per spec (not a parse error, just a warning) |

## Validation Commands

```bash
bun run test -- --reporter=verbose tests/footnotes.test.ts
bun run build
```

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
