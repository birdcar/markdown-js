# @birdcar/markdown

[unified][] / [remark][] plugin suite for **Birdcar Flavored Markdown** (BFM) — a superset of CommonMark and GFM that adds directive blocks, extended task lists, task modifiers, and mentions.

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
- [>] Call the dentist //due:2025-03-01
- [!] File taxes //due:2025-04-15 //hard
- [x] Buy groceries

@callout type=warning title="Heads Up"
Don't forget to bring your **insurance card**.
@endcallout

Hey @sarah, can you review this?
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

Available sub-plugins:

| Import path | Plugin | Description |
|---|---|---|
| `@birdcar/markdown` | `remarkBfm` | All features combined |
| `@birdcar/markdown/tasks` | `remarkBfmTasks` | `[x]`, `[>]`, `[!]`, etc. in list items |
| `@birdcar/markdown/modifiers` | `remarkBfmModifiers` | `//due:2025-03-01`, `//hard` |
| `@birdcar/markdown/mentions` | `remarkBfmMentions` | `@username` inline references |
| `@birdcar/markdown/directives` | `remarkBfmDirectives` | `@callout`/`@embed` blocks |

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

## Syntax Reference

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

## Types

All AST node types are exported for use with TypeScript:

```ts
import type {
  TaskState,          // 'open' | 'done' | 'scheduled' | 'migrated' | 'irrelevant' | 'event' | 'priority'
  TaskMarkerNode,     // { type: 'taskMarker', state: TaskState }
  TaskModifierNode,   // { type: 'taskModifier', key: string, value: string | null }
  MentionNode,        // { type: 'mention', identifier: string }
  DirectiveBlockNode, // { type: 'directiveBlock', name: string, params: Record<string, string> }
  EmbedResolver,
  MentionResolver,
} from '@birdcar/markdown'
```

## License

MIT

[unified]: https://unifiedjs.com
[remark]: https://github.com/remarkjs/remark
