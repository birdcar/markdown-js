import { describe, expect, it } from 'vitest'

const describeDist = process.env.BFM_TEST_DIST === '1' ? describe : describe.skip

describeDist('built package exports', () => {
  it('loads every root and subpath entry from dist', async () => {
    const [
      root,
      tasks,
      modifiers,
      mentions,
      directives,
      frontmatter,
      hashtags,
      footnotes,
      analysis,
      metadata,
      merge,
    ] = await Promise.all([
      import('../dist/index.js'),
      import('../dist/inlines/tasks/index.js'),
      import('../dist/inlines/modifiers/index.js'),
      import('../dist/inlines/mentions/index.js'),
      import('../dist/blocks/index.js'),
      import('../dist/blocks/frontmatter/index.js'),
      import('../dist/inlines/hashtags/index.js'),
      import('../dist/inlines/footnotes/index.js'),
      import('../dist/analysis/index.js'),
      import('../dist/metadata/index.js'),
      import('../dist/merge/index.js'),
    ])

    expect(root.parseBfm).toBeTypeOf('function')
    expect(root.analyzeBfm).toBeTypeOf('function')
    expect(tasks.remarkBfmTasks).toBeTypeOf('function')
    expect(modifiers.remarkBfmModifiers).toBeTypeOf('function')
    expect(mentions.remarkBfmMentions).toBeTypeOf('function')
    expect(directives.remarkBfmDirectives).toBeTypeOf('function')
    expect(frontmatter.remarkBfmFrontmatter).toBeTypeOf('function')
    expect(hashtags.remarkBfmHashtags).toBeTypeOf('function')
    expect(footnotes.remarkBfmFootnotes).toBeTypeOf('function')
    expect(analysis.analyzeBfm).toBeTypeOf('function')
    expect(metadata.extractMetadata).toBeTypeOf('function')
    expect(merge.mergeDocuments).toBeTypeOf('function')
  })
})
