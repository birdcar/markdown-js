# Implementation Spec: BFM Spec Conformance - Phase 3 (Metadata & Merge)

**Contract**: ./contract.md
**Estimated Effort**: S
**Depends on**: Phase 1 (footnote types and `root.footnotes` must exist)

## Technical Approach

Phase 3 adds the `computed.footnotes` field to `BuiltinMetadata` and wires up post-merge metadata recomputation. Both changes are small and isolated: a new type field, a new extraction function, and a convenience wrapper on `mergeDocuments`.

## Feedback Strategy

**Inner-loop command**: `bun run test -- --reporter=verbose tests/metadata.test.ts tests/merge.test.ts`

**Playground**: Test suite.

**Why this approach**: Pure data extraction logic — tests are the tightest loop.

## File Changes

### Modified Files

| File Path | Changes |
|-----------|---------|
| `src/metadata/types.ts` | Add `FootnoteReference` type and `footnotes` field to `BuiltinMetadata` |
| `src/metadata/extract.ts` | Add `extractFootnotes` function, wire into `computeBuiltins` |
| `src/metadata/index.ts` | Export new `FootnoteReference` type |
| `src/index.ts` | Export `FootnoteReference` type |
| `src/merge/merge.ts` | Add `mergeAndRecompute` or update `mergeDocuments` to accept optional recompute callback |
| `src/merge/types.ts` | Add `recompute` option to `MergeOptions` |
| `src/merge/index.ts` | Export updated types |
| `tests/metadata.test.ts` | Add footnote extraction tests |
| `tests/merge.test.ts` | Add post-merge recomputation test |

## Implementation Details

### 1. Footnote Metadata Extraction

**Pattern to follow**: `extractLinks` in `src/metadata/extract.ts` lines 159–178

**Overview**: Walk the tree for `footnoteRef` nodes, collect into `FootnoteReference[]` ordered by first appearance.

```typescript
// In src/metadata/types.ts:
export interface FootnoteReference {
  label: string
  index: number
  line: number
}

export interface BuiltinMetadata {
  wordCount: number
  readingTime: number
  tasks: TaskCollection
  tags: string[]
  links: LinkReference[]
  footnotes: FootnoteReference[]  // NEW
}

// In src/metadata/extract.ts:
function extractFootnotes(tree: Root): FootnoteReference[] {
  const footnotes: FootnoteReference[] = []
  const seen = new Set<string>()

  visit(tree, 'footnoteRef' as any, (node: any) => {
    if (!seen.has(node.label)) {
      seen.add(node.label)
      footnotes.push({
        label: node.label,
        index: node.index ?? 0,
        line: node.position?.start.line ?? 0,
      })
    }
  })

  return footnotes
}
```

**Implementation steps**:
1. Add `FootnoteReference` interface to `src/metadata/types.ts`
2. Add `footnotes: FootnoteReference[]` to `BuiltinMetadata`
3. Add `extractFootnotes` function to `src/metadata/extract.ts`
4. Wire into `computeBuiltins` return value
5. Export `FootnoteReference` from `src/metadata/index.ts` and `src/index.ts`

**Feedback loop**:
- **Playground**: Add test with a document containing `[^1]` and `[^note]` refs
- **Experiment**: Verify labels, indices, and line numbers match. Verify deduplication (same label referenced twice appears once).
- **Check command**: `bun run test -- --reporter=verbose tests/metadata.test.ts`

### 2. Post-Merge Metadata Recomputation

**Pattern to follow**: `mergeDocuments` in `src/merge/merge.ts`

**Overview**: Spec §9.4 says computed fields must be recomputed after merging. The simplest approach: add an optional `recompute` callback to `MergeOptions` that receives the merged `BfmDocument` and returns `DocumentMetadata`. This keeps merge decoupled from the parser while enabling the spec-required behavior.

```typescript
// In src/merge/types.ts:
export interface MergeOptions {
  strategy?: MergeStrategy | MergeResolver
  separator?: string
  recompute?: (merged: BfmDocument) => unknown  // NEW — caller provides metadata extractor
}

// In src/merge/merge.ts:
export interface MergeResult {
  document: BfmDocument
  metadata?: unknown
}

export function mergeDocuments(
  docs: BfmDocument[],
  options?: MergeOptions,
): MergeResult {
  if (docs.length === 0) {
    return { document: { frontmatter: {}, body: '' } }
  }

  const strategy = options?.strategy ?? 'last-wins'
  const separator = options?.separator ?? '\n\n'

  const document = docs.reduce((acc, doc) => ({
    frontmatter: deepMerge(acc.frontmatter, doc.frontmatter, strategy),
    body: acc.body ? `${acc.body}${separator}${doc.body}` : doc.body,
  }))

  const metadata = options?.recompute ? options.recompute(document) : undefined

  return { document, metadata }
}
```

**Key decisions**:
- Return type changes from `BfmDocument` to `MergeResult` — this is a breaking change but necessary for spec conformance. The old signature can be preserved via overload or by keeping `document` as the primary return with `metadata` as optional.
- Alternative: keep the return type as `BfmDocument` and add a `metadata` field to it. Simpler but muddies the type.
- Simplest approach that avoids breaking: just add the `recompute` callback that mutates nothing — caller does `const merged = mergeDocuments(docs); const meta = extractMetadata(parse(merged.body))`. Document this pattern instead of changing the API.

**Recommended**: Keep the existing return type. Add a `mergeAndExtract` convenience export that wraps merge + parse + extract. This avoids breaking changes.

```typescript
// New convenience function in src/merge/merge.ts:
export function mergeAndExtract(
  docs: BfmDocument[],
  parse: (markdown: string) => Root,
  options?: MergeOptions & { extractOptions?: ExtractMetadataOptions },
): { document: BfmDocument; metadata: DocumentMetadata } {
  const document = mergeDocuments(docs, options)
  const tree = parse(document.body)
  const metadata = extractMetadata(tree, options?.extractOptions)
  // Merge frontmatter into metadata
  metadata.frontmatter = document.frontmatter
  return { document, metadata }
}
```

**Implementation steps**:
1. Add `mergeAndExtract` to `src/merge/merge.ts`
2. Export from `src/merge/index.ts` and `src/index.ts`
3. Keep existing `mergeDocuments` unchanged (no breaking change)

**Feedback loop**:
- **Playground**: Add test in `tests/merge.test.ts` that merges two docs and verifies recomputed wordCount
- **Experiment**: Merge doc A (10 words) + doc B (20 words), verify metadata.computed.wordCount ≈ 30
- **Check command**: `bun run test -- --reporter=verbose tests/merge.test.ts`

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|---------|
| `tests/metadata.test.ts` | Footnote extraction from parsed documents |
| `tests/merge.test.ts` | Post-merge metadata recomputation |

**Key test cases**:
- Metadata includes `footnotes` array with correct labels, indices, and lines
- Multi-ref same label appears once in footnotes array
- Document with no footnotes has empty `footnotes` array
- `mergeAndExtract` produces correct wordCount for merged docs
- `mergeAndExtract` produces correct tags (union of both docs)

## Validation Commands

```bash
bun run test -- --reporter=verbose tests/metadata.test.ts tests/merge.test.ts
bun run test
bun run build
```

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
