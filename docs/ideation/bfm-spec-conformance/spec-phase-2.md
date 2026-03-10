# Implementation Spec: BFM Spec Conformance - Phase 2 (Directive Fixes)

**Contract**: ./contract.md
**Estimated Effort**: M

## Technical Approach

Phase 2 fixes all built-in directive implementations in `src/blocks/index.ts`. The changes are concentrated in `applyDataToDirective` and `buildListFromHeadings`/`buildToc`. Each directive fix is independent — they share no state. The fixes range from trivial (add `aria-label` to `@math`) to moderate (`@toc` nested list algorithm, `@tabs` nav structure).

All changes are in the `applyDataToDirective` switch cases and the `buildToc`/`buildListFromHeadings` helper functions.

## Feedback Strategy

**Inner-loop command**: `bun run test -- --reporter=verbose tests/directives.test.ts tests/generic-directives.test.ts`

**Playground**: Test suite — directive behavior is validated by asserting AST structure and rendered HTML.

**Why this approach**: All changes are to transform logic best validated by output assertions.

## File Changes

### Modified Files

| File Path | Changes |
|-----------|---------|
| `src/blocks/index.ts` | Fix `@toc` (nested list, ordered flag, exclude preceding heading), `@tabs`/`@tab` (active param, nav structure), `@endnotes` (title param), `@math` (aria-label), `@include` (fix param from `src` to positional `path`), `@query` (fix params to `state`/`tag`/`limit`/`sort`) |
| `tests/directives.test.ts` | Update existing tests, add new cases for fixed behaviors |
| `tests/generic-directives.test.ts` | Update tests for @include, @query, @toc, @math, @endnotes |

## Implementation Details

### 1. `@toc` — Nested List Generation

**Pattern to follow**: `src/blocks/index.ts` lines 208–262

**Overview**: Replace the flat `buildListFromHeadings` with a proper nested list builder that respects heading depth. Also fix the `ordered ? 'list' : 'list'` bug and add heading exclusion.

```typescript
function buildToc(tree: Root, tocNode: any): void {
  const maxDepth = tocNode.params.depth ? Number(tocNode.params.depth) : 3
  const ordered = tocNode.params.ordered === true

  const headings: Array<{ depth: number; text: string; id: string }> = []

  // Find the index of the tocNode in tree.children
  const tocIndex = tree.children.indexOf(tocNode as any)

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i] as any
    if (node.type !== 'heading') continue
    if (node.depth > maxDepth) continue

    // Exclude the heading immediately preceding the @toc directive
    if (i === tocIndex - 1) continue
    // Skip the toc node itself (shouldn't be a heading, but defensive)
    if (i === tocIndex) continue

    const text = extractText(node)
    const id = slugify(text)
    headings.push({ depth: node.depth, text, id })

    if (!node.data) node.data = {}
    if (!node.data.hProperties) node.data.hProperties = {}
    node.data.hProperties.id = id
  }

  if (headings.length === 0) return
  tocNode.children = [buildNestedList(headings, 0, headings.length, ordered)]
}

function buildNestedList(
  headings: Array<{ depth: number; text: string; id: string }>,
  start: number,
  end: number,
  ordered: boolean,
): any {
  const items: any[] = []
  let i = start

  while (i < end) {
    const h = headings[i]
    const linkNode = {
      type: 'paragraph',
      children: [{
        type: 'link',
        url: `#${h.id}`,
        children: [{ type: 'text', value: h.text }],
      }],
    }

    // Find child headings (deeper than current)
    let j = i + 1
    while (j < end && headings[j].depth > h.depth) j++

    const item: any = {
      type: 'listItem',
      children: [linkNode],
    }

    // If there are child headings, nest them
    if (j > i + 1) {
      item.children.push(buildNestedList(headings, i + 1, j, ordered))
    }

    items.push(item)
    i = j
  }

  return {
    type: 'list',
    ordered,
    spread: false,
    children: items,
  }
}
```

**Key decisions**:
- Recursive approach groups headings by depth naturally
- The `ordered` flag now correctly sets `ordered: true` on the list node (fixing the `'list' : 'list'` bug)
- Heading exclusion uses index comparison — the heading at `tocIndex - 1` is skipped

**Feedback loop**:
- **Playground**: Add tests with h1 > h2 > h3 hierarchy, verify nested output
- **Experiment**: Test with `depth=2` (h3 excluded), `ordered` flag, heading right before `@toc`
- **Check command**: `bun run test -- --reporter=verbose tests/generic-directives.test.ts`

### 2. `@tabs`/`@tab` — Active Param and Nav Structure

**Pattern to follow**: `src/blocks/index.ts` lines 153–164

**Overview**: Spec requires a `tabs__nav` div with `role="tablist"` containing `button` elements, plus `active` flag support on `@tab`. The current implementation only outputs `tabs__panel` divs.

The nav structure needs to be built at the `@tabs` level by inspecting its `@tab` children.

```typescript
case 'tabs': {
  const props: Record<string, string> = { class: 'tabs' }
  if (directive.params.id) props['data-sync-id'] = String(directive.params.id)
  directive.data = { hName: 'div', hProperties: props }

  // Build nav from tab children
  const tabChildren = (directive.children || []).filter(
    (c: any) => c.type === 'directiveBlock' && c.name === 'tab'
  )
  const hasActive = tabChildren.some((t: any) => t.params.active === true)

  const navButtons = tabChildren.map((tab: any, i: number) => {
    const isActive = tab.params.active === true || (!hasActive && i === 0)
    return {
      type: 'text', value: String(tab.params.label || ''),
      data: {
        hName: 'button',
        hProperties: {
          class: isActive ? 'tabs__tab tabs__tab--active' : 'tabs__tab',
          role: 'tab',
          'aria-selected': isActive ? 'true' : 'false',
        },
      },
    }
  })

  const navNode = {
    type: 'paragraph',
    children: navButtons,
    data: { hName: 'div', hProperties: { class: 'tabs__nav', role: 'tablist' } },
  }

  directive.children = [navNode, ...(directive.children || [])]
  break
}

case 'tab': {
  const isActive = directive.params.active === true
  const props: Record<string, string> = {
    class: isActive ? 'tabs__panel tabs__panel--active' : 'tabs__panel',
    role: 'tabpanel',
  }
  if (directive.params.label) props['aria-label'] = String(directive.params.label)
  directive.data = { hName: 'div', hProperties: props }
  break
}
```

**Implementation steps**:
1. In `@tabs` case: filter children for `@tab` directives, determine which is active
2. Build nav buttons from tab labels with proper ARIA attributes
3. Prepend nav node to `@tabs` children
4. In `@tab` case: read `active` param, set `--active` CSS class accordingly
5. Default: if no tab has `active`, first tab is active

**Feedback loop**:
- **Playground**: Add test with `@tab label="A" active` and `@tab label="B"`
- **Experiment**: Test default active (first tab), explicit active (second tab), no tabs (empty)
- **Check command**: `bun run test -- --reporter=verbose tests/generic-directives.test.ts`

### 3. `@endnotes` — Title Param

**Pattern to follow**: `src/blocks/index.ts` lines 198–204

**Overview**: When `title` param is present, prepend a heading node as first child.

```typescript
case 'endnotes': {
  directive.data = {
    hName: 'section',
    hProperties: { class: 'endnotes', role: 'doc-endnotes' },
  }
  if (directive.params.title) {
    const heading = {
      type: 'heading',
      depth: 2,
      children: [{ type: 'text', value: String(directive.params.title) }],
    }
    directive.children = [heading, ...(directive.children || [])]
  }
  break
}
```

**Implementation steps**:
1. Check `directive.params.title`
2. If present, create heading node with `depth: 2` and prepend to children

### 4. `@math` — Aria Label

**Pattern to follow**: `src/blocks/index.ts` lines 165–174

**Overview**: Add `aria-label` with the raw LaTeX content.

```typescript
case 'math': {
  const content = directive.meta?.content || ''
  const props: Record<string, string> = {
    class: 'math',
    role: 'math',
    'aria-label': content,
  }
  if (directive.params.label) props.id = String(directive.params.label)
  directive.data = {
    hName: 'div',
    hProperties: props,
    hChildren: [{ type: 'text', value: content }],
  }
  break
}
```

### 5. `@include` — Fix Param Mapping

**Pattern to follow**: `src/blocks/index.ts` lines 184–189

**Overview**: Spec says `@include` takes a positional path and optional `heading` param. Current code reads `directive.params.src` but the generic parser stores the positional arg differently. The positional arg from `@include ./path.md` is stored in `directive.params` by the generic from-markdown handler — need to verify which key. Fix to read the correct positional param and map to `data-path`.

```typescript
case 'include': {
  // The generic parser stores positional args — the first non-key=value
  // token on the opening line. For @include, this is the file path.
  const path = directive.params._positional?.[0] || directive.params.src || ''
  const props: Record<string, string> = { class: 'include' }
  if (path) props['data-path'] = String(path)
  if (directive.params.heading) props['data-heading'] = String(directive.params.heading)
  directive.data = { hName: 'div', hProperties: props }
  break
}
```

**Note**: Need to verify how the generic from-markdown handler stores positional params. Check `src/blocks/generic/from-markdown.ts`.

### 6. `@query` — Fix Param Mapping

**Pattern to follow**: `src/blocks/index.ts` lines 191–196

**Overview**: Replace `from` with the spec-defined params: `state`, `tag`, `limit`, `sort`.

```typescript
case 'query': {
  const props: Record<string, string> = { class: 'query' }
  if (directive.params.type) props['data-query-type'] = String(directive.params.type)
  if (directive.params.state) props['data-query-state'] = String(directive.params.state)
  if (directive.params.tag) props['data-query-tag'] = String(directive.params.tag)
  if (directive.params.limit) props['data-query-limit'] = String(directive.params.limit)
  if (directive.params.sort) props['data-query-sort'] = String(directive.params.sort)
  directive.data = { hName: 'div', hProperties: props }
  break
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|---------|
| `tests/generic-directives.test.ts` | @toc nesting, @tabs active, @endnotes title, @math aria-label, @include params, @query params |
| `tests/directives.test.ts` | Regression tests for @callout, @embed, @details, @figure, @aside |

**Key test cases**:
- `@toc`: nested h1>h2>h3 produces nested `<ol>`/`<ul>`, `ordered` flag works, `depth=2` excludes h3, heading before `@toc` is excluded
- `@tabs`: nav bar with buttons rendered, `active` on second tab, default active is first tab
- `@endnotes title="Notes"`: `<h2>Notes</h2>` rendered inside section
- `@math`: `aria-label` attribute matches body content
- `@include`: `data-path` attribute (not `data-src`), `data-heading` when present
- `@query`: `data-query-state`, `data-query-tag`, `data-query-limit`, `data-query-sort` attributes; no `data-query-from`

## Validation Commands

```bash
bun run test -- --reporter=verbose tests/directives.test.ts tests/generic-directives.test.ts
bun run test
bun run build
```

---

_This spec is ready for implementation. Follow the patterns and validate at each step._
