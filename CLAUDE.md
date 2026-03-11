# @birdcar/markdown

Birdcar Flavored Markdown (BFM) parser and renderer built on unified/remark.

## Commands

```bash
bun install          # Install dependencies
bun run typecheck    # Type check (tsc --noEmit)
bun test             # Run tests (vitest)
bun test:watch       # Run tests in watch mode
bun run build        # Build (tsup → dist/)
```

Always run `bun run typecheck && bun test` before committing.

## Architecture

This is a unified/remark plugin ecosystem. The codebase is organized by syntax extension type:

- `src/inlines/` — Inline syntax extensions (mentions, hashtags, tasks, modifiers, footnotes)
- `src/blocks/` — Block-level syntax extensions (directives, frontmatter, callout, embed)
- `src/metadata/` — Metadata extraction from parsed trees (word count, tags, footnotes)
- `src/merge/` — Multi-document merge utilities
- `src/plugin.ts` — Main remark plugin that composes all extensions
- `src/index.ts` — Public API surface (re-exports types and functions)

Each extension follows the micromark/mdast pattern:
1. **Tokenizer** (`syntax.ts`) — micromark extension that tokenizes raw markdown
2. **From-markdown** (`from-markdown.ts`) — mdast-util extension that builds AST nodes from tokens
3. **To-markdown** (`to-markdown.ts`) — mdast-util extension that serializes AST nodes back to markdown

The package exposes multiple entry points via `package.json` exports — each subpath maps to a `src/*/index.ts` barrel file compiled by tsup.

## Spec Submodule

The `spec/` directory is a git submodule pointing to the BFM specification repo. Test fixtures live in `spec/fixtures/`.

**Before implementing any spec-related changes**, ensure the submodule is current:

```bash
git submodule update --remote spec
```

If the submodule is behind, tests may reference fixtures that don't exist locally.

## Testing

Tests use vitest and live in `tests/`. Patterns:

- Import `parseAndTransform` from `tests/helpers.ts` for tree-level assertions
- Import `toHtml` from `tests/helpers.ts` for HTML output assertions
- Use `findNodes(tree, type)` to locate specific node types in parsed trees
- Fixture files are loaded from `spec/fixtures/` via `readFileSync`

When adding new syntax extensions, add corresponding test files in `tests/` following the existing naming convention (`{feature}.test.ts`).

## Release Process

Releases are fully automated via [release-please](https://github.com/googleapis/release-please):

1. Use [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `feat!:` etc.
2. On push to `main`, release-please opens/updates a release PR with changelog and version bump
3. Merging the release PR creates a GitHub release
4. The GitHub release triggers the publish workflow: build with bun, publish to npm with OIDC trusted publishing

**Do not manually edit the version in `package.json`** — release-please manages it.

Commit types that appear in the changelog: `feat` (Features), `fix` (Bug Fixes), `perf` (Performance), `revert` (Reverts). All other types (`docs`, `chore`, `refactor`, `test`, `ci`, `style`, `build`) are hidden from the changelog but still tracked.

## Conventions

- TypeScript strict mode, ES2022 target, NodeNext module resolution
- ESM only (`"type": "module"`)
- No comments unless handling a non-obvious edge case
- Delete unused code — no `_unused` prefixes or compatibility shims
- Match existing patterns when adding new extensions
- `src/index.ts` is the shared public API surface — coordinate when multiple changes touch it
