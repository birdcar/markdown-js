# @birdcar/markdown

[unified][] / [remark][] plugin suite for **Birdcar Flavored Markdown** (BFM) — a superset of CommonMark and GFM that adds YAML front-matter, directive blocks, extended task lists, task modifiers, mentions, hashtags, metadata extraction, and document merging.

See the [BFM spec](https://github.com/birdcar/markdown-spec) for the full syntax definition.

## Install

```bash
npm install @birdcar/markdown remark-parse remark-gfm unified
# or
bun add @birdcar/markdown remark-parse remark-gfm unified
```

For HTML output, also install:

```bash
npm install remark-rehype rehype-stringify
```

## Usage

### Parse and render all BFM features

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { remarkBfm } from '@birdcar/markdown'

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBfm)
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(`
---
title: Sprint Planning
tags:
  - engineering
---

- [>] Call the dentist //due:2025-03-01
- [!] File taxes //due:2025-04-15 //hard
- [x] Buy groceries

@callout type=warning title="Heads Up"
Don't forget to bring your **insurance card**.
@endcallout

Hey @sarah, can you review this? #urgent
  `)

console.log(String(file))
```

### Use individual plugins

Each feature is a standalone remark plugin. Use only what you need:

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { remarkBfmTasks } from '@birdcar/markdown/tasks'
import { remarkBfmModifiers } from '@birdcar/markdown/modifiers'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBfmTasks)
  .use(remarkBfmModifiers)
```

Available sub-plugins and utilities:

| Import path | Plugin / Export | Description |
|---|---|---|
| `@birdcar/markdown` | `remarkBfm` | All features combined |
| `@birdcar/markdown/frontmatter` | `remarkBfmFrontmatter` | YAML front-matter (`---` blocks) |
| `@birdcar/markdown/tasks` | `remarkBfmTasks` | `[x]`, `[>]`, `[!]`, etc. in list items |
| `@birdcar/markdown/modifiers` | `remarkBfmModifiers` | `//due:2025-03-01`, `//hard` |
| `@birdcar/markdown/mentions` | `remarkBfmMentions` | `@username` inline references |
| `@birdcar/markdown/hashtags` | `remarkBfmHashtags` | `#project` inline tags |
| `@birdcar/markdown/directives` | `remarkBfmDirectives` | `@callout`/`@embed` + 9 new directive blocks |
| `@birdcar/markdown/footnotes` | `remarkBfmFootnotes` | `[^label]` references and definitions |
| `@birdcar/markdown/metadata` | `extractMetadata` | Computed fields from parsed documents |
| `@birdcar/markdown/merge` | `mergeDocuments` | Deep merge of front-matter + body |

### Work with the AST directly

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { remarkBfm } from '@birdcar/markdown'
import type { TaskMarkerNode, TaskModifierNode, MentionNode } from '@birdcar/markdown'
import { visit } from 'unist-util-visit'

const tree = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBfm)
  .parse('- [>] Call dentist //due:2025-03-01')

// Transform runs after parse
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBfm)

const mdast = processor.runSync(processor.parse('- [>] Call dentist //due:2025-03-01'))

visit(mdast, 'taskModifier', (node: TaskModifierNode) => {
  console.log(node.key, node.value) // "due", "2025-03-01"
})
```

### Serialize back to markdown

The plugins include `toMarkdown` extensions, so round-tripping works:

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import { remarkBfm } from '@birdcar/markdown'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBfm)
  .use(remarkStringify)

const result = processor.processSync('- [>] Call dentist //due:2025-03-01')
console.log(String(result))
// - [>] Call dentist //due:2025-03-01
```

### Extract metadata

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkBfm, extractMetadata } from '@birdcar/markdown'

const processor = unified().use(remarkParse).use(remarkBfm)
const tree = processor.parse(`
---
title: My Post
tags:
  - bfm
---

A post about #typescript with a [link](https://example.com).

- [x] Write draft
- [ ] Publish //due:2025-06-01
`)

const meta = extractMetadata(tree)

meta.frontmatter          // { title: 'My Post', tags: ['bfm'] }
meta.computed.wordCount   // 9
meta.computed.readingTime  // 1
meta.computed.tags         // ['bfm', 'typescript']
meta.computed.tasks.done   // [{ text: 'Write draft', state: 'done', ... }]
meta.computed.tasks.open   // [{ text: 'Publish', state: 'open', modifiers: [{ key: 'due', value: '2025-06-01' }] }]
meta.computed.links        // [{ url: 'https://example.com', title: null }]
```

Custom computed fields via resolvers:

```ts
const meta = extractMetadata(tree, {
  computedFields: [
    (tree, frontmatter, builtins) => ({
      isLongRead: builtins.wordCount > 1000,
    }),
  ],
})
meta.custom.isLongRead // false
```

### Merge documents

```ts
import { mergeDocuments } from '@birdcar/markdown'
import type { BfmDocument } from '@birdcar/markdown'

const a: BfmDocument = { frontmatter: { tags: ['a'] }, body: 'Content A' }
const b: BfmDocument = { frontmatter: { tags: ['b'], title: 'B' }, body: 'Content B' }

const merged = mergeDocuments([a, b])
// merged.frontmatter = { tags: ['a', 'b'], title: 'B' }
// merged.body = 'Content A\n\nContent B'

// Configurable strategies
mergeDocuments([a, b], { strategy: 'first-wins' })
mergeDocuments([a, b], { strategy: 'error' })          // throws on scalar conflicts
mergeDocuments([a, b], { strategy: (key, existing, incoming) => existing + incoming })
mergeDocuments([a, b], { separator: '\n---\n' })        // custom body separator
```

## Syntax Reference

### YAML Front-matter

```markdown
---
title: My Document
tags:
  - bfm
  - markdown
author:
  name: Nick
  email: nick@birdcar.dev
---

Document content starts here.
```

Front-matter must appear at the very start of the document. The YAML content is parsed and available on the AST node's `data` property.

### Extended Task Lists

Seven states, inspired by Bullet Journal:

```markdown
- [ ] Open task
- [x] Completed
- [>] Scheduled for later
- [<] Migrated elsewhere
- [-] No longer relevant
- [o] Calendar event
- [!] High priority
```

### Task Modifiers

Inline metadata on task items using `//key:value` syntax:

```markdown
- [>] Call dentist //due:2025-03-01
- [ ] Weekly review //every:weekly
- [o] Team retro //due:2025-02-07 //every:2-weeks
- [ ] Run backups //cron:0 9 * * 1
- [!] File taxes //due:2025-04-15 //hard
- [>] Wait for response //wait
```

### Mentions

```markdown
Hey @sarah, can you review this? Also cc @john.doe and @dev-team.
```

### Hashtags

```markdown
Discussing #typescript and #react-hooks in this post.
```

Identifiers follow the pattern `[a-zA-Z][a-zA-Z0-9_-]*`. The `#` must not be preceded by an alphanumeric character. Hashtags inside code spans are not parsed.

### Directive Blocks

**Callouts** (container — body is parsed as markdown):

```markdown
@callout type=warning title="Watch Out"
This is a warning with **bold** text and [links](https://example.com).
@endcallout
```

**Embeds** (leaf — body is treated as caption text):

```markdown
@embed https://www.youtube.com/watch?v=dQw4w9WgXcQ
A classic internet moment.
@endembed
```

**Details** (container — collapsible section):

```markdown
@details summary="Click to expand" open
Hidden content with **markdown** support.
@enddetails
```

**Tabs** (container — tabbed content groups):

```markdown
@tabs
@tab label="JavaScript" active
console.log('hello')
@endtab
@tab label="Python"
print('hello')
@endtab
@endtabs
```

**Figure** (container — image with caption):

```markdown
@figure src="photo.jpg" alt="A photo" id="fig-1"
Caption text with **markdown**.
@endfigure
```

**Aside** (container — sidebar content):

```markdown
@aside title="Fun Fact"
Something tangential but interesting.
@endaside
```

**TOC** (leaf — auto-generated table of contents):

```markdown
@toc depth=2 ordered
@endtoc
```

**Math** (leaf — LaTeX display block):

```markdown
@math label="eq-1"
E = mc^2
@endmath
```

**Include** (leaf — file transclusion, resolver-dependent):

```markdown
@include src="./snippets/example.md" type=markdown
@endinclude
```

**Query** (leaf — dynamic content, resolver-dependent):

```markdown
@query state=open tag=engineering limit=5
@endquery
```

**Endnotes** (leaf — footnote rendering location):

```markdown
@endnotes title="References"
@endendnotes
```

### Footnotes

Pandoc-style footnote references and definitions:

```markdown
Some text with a footnote[^1] and another[^note].

[^1]: First footnote content.
[^note]: Named footnote with longer content
    that continues on indented lines.
```

Footnotes are auto-numbered in order of first reference. If no `@endnotes` directive is present, the endnotes section is appended at the end of the document.

## Types

All AST node types, metadata types, and contracts are exported:

```ts
import type {
  // AST nodes
  TaskState,          // 'open' | 'done' | 'scheduled' | 'migrated' | 'irrelevant' | 'event' | 'priority'
  TaskMarkerNode,     // { type: 'taskMarker', state: TaskState }
  TaskModifierNode,   // { type: 'taskModifier', key: string, value: string | null }
  MentionNode,        // { type: 'mention', identifier: string }
  HashtagNode,        // { type: 'hashtag', identifier: string }
  YamlNode,           // { type: 'yaml', data: Record<string, unknown> }
  DirectiveBlockNode, // { type: 'directiveBlock', name: string, params: Record<string, string | boolean> }
  FootnoteRefNode,    // { type: 'footnoteRef', label: string }
  FootnoteDefNode,    // { type: 'footnoteDef', label: string }

  // Metadata
  DocumentMetadata,   // { frontmatter, computed: BuiltinMetadata, custom }
  BuiltinMetadata,    // { wordCount, readingTime, tasks, tags, links }
  TaskCollection,     // { all, open, done, scheduled, ... }
  ExtractedTask,      // { text, state, modifiers, line }
  LinkReference,      // { url, title, line }

  // Merge
  BfmDocument,        // { frontmatter, body }
  MergeOptions,       // { strategy, separator }
  MergeStrategy,      // 'last-wins' | 'first-wins' | 'error'
  MergeResolver,      // (key, existing, incoming) => value

  // Contracts
  EmbedResolver,
  MentionResolver,
  ComputedFieldResolver,
} from '@birdcar/markdown'
```

## License

MIT

[unified]: https://unifiedjs.com
[remark]: https://github.com/remarkjs/remark
