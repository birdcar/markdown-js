# Implementation Spec: BFM Spec Conformance - Phase 4 (Cleanup & Test Gaps)

**Contract**: ./contract.md
**Estimated Effort**: S
**Depends on**: None (can run in parallel with Phases 2 and 3)

## Technical Approach

Phase 4 handles housekeeping: remove the dead `callout/from-markdown.ts` handler that is exported but never registered, and add the missing test for the `after` modifier key. Both are independent, low-risk changes.

## Feedback Strategy

**Inner-loop command**: `bun run test -- --reporter=verbose tests/modifiers.test.ts`

**Playground**: Test suite.

**Why this approach**: One file deletion and one test addition — tests confirm nothing regresses.

## File Changes

### Modified Files

| File Path | Changes |
|-----------|---------|
| `tests/modifiers.test.ts` | Add test case for `//after:` modifier key |

### Deleted Files

| File Path | Reason |
|-----------|--------|
| `src/blocks/callout/from-markdown.ts` | Dead code — exported but never registered in `src/blocks/index.ts`. The `genericDirectiveFromMarkdown()` handles all directive tokens including callout. |

## Implementation Details

### 1. Remove Dead Callout From-Markdown Handler

**Overview**: `src/blocks/callout/from-markdown.ts` exports `calloutFromMarkdown()` but it is never imported or used in `src/blocks/index.ts`. The generic from-markdown handler at `src/blocks/generic/from-markdown.ts` handles all `directiveBlock` tokens. The dead file's `parseParams` function also has a stricter regex that doesn't handle boolean flags, making it spec-non-compliant anyway.

**Implementation steps**:
1. Delete `src/blocks/callout/from-markdown.ts`
2. Verify no imports reference it: grep for `calloutFromMarkdown` and `callout/from-markdown`
3. Run full test suite to confirm no regression

### 2. Add `//after:` Modifier Test

**Pattern to follow**: Existing modifier tests in `tests/modifiers.test.ts`

**Overview**: The `after` modifier key is spec-defined (§3.2) but has no test coverage. The parser handles it correctly (modifiers are generic `//key:value`), but we need explicit verification.

**Implementation steps**:
1. Add a test case with input `- [ ] Check in after launch //after:2025-06-01`
2. Assert the AST contains a `taskModifier` node with `key: 'after'` and `value: '2025-06-01'`
3. Assert roundtrip serialization preserves the modifier

**Feedback loop**:
- **Playground**: The existing test file
- **Experiment**: Parse `//after:2025-06-01`, verify key and value
- **Check command**: `bun run test -- --reporter=verbose tests/modifiers.test.ts`

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|---------|
| `tests/modifiers.test.ts` | `//after:` modifier key parsing and roundtrip |

**Key test cases**:
- `//after:2025-06-01` produces `{ key: 'after', value: '2025-06-01' }`
- Roundtrip: parse then serialize preserves `//after:2025-06-01`

## Validation Commands

```bash
# Verify no imports of deleted file
# (manual grep — the agent should do this before deleting)

bun run test -- --reporter=verbose tests/modifiers.test.ts
bun run test
bun run build
```

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
