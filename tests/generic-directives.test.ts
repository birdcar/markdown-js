import { describe, it, expect } from 'vitest'
import { parseAndTransform, findNodes, toHtml } from './helpers.js'

describe('details directive', () => {
  it('parses a basic details block', () => {
    const md = '@details\nHidden content here.\n@enddetails\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('details')
    expect(directives[0].data.hName).toBe('details')
  })

  it('parses details with summary param', () => {
    const md = '@details summary="Click to expand"\nHidden content here.\n@enddetails\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('details')
    // Summary should be prepended as first child
    expect(directives[0].children[0].data.hName).toBe('summary')
    expect(directives[0].children[0].children[0].value).toBe('Click to expand')
  })

  it('parses details with open flag', () => {
    const md = '@details open summary="Info"\nVisible by default.\n@enddetails\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].params.open).toBe(true)
    expect(directives[0].data.hProperties.open).toBe(true)
  })

  it('parses details with nested markdown', () => {
    const md = '@details summary="More"\n**Bold** and *italic*.\n@enddetails\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    // summary + paragraph with styled text
    expect(directives[0].children.length).toBeGreaterThanOrEqual(2)
  })

  it('renders details to HTML', async () => {
    const md = '@details summary="Click me"\nSome hidden content.\n@enddetails\n'
    const html = await toHtml(md)
    expect(html).toContain('<details>')
    expect(html).toContain('<summary>')
    expect(html).toContain('Click me')
    expect(html).toContain('</details>')
  })
})

describe('figure directive', () => {
  it('parses a basic figure with src', () => {
    const md = '@figure src=image.png alt="A photo"\nCaption text.\n@endfigure\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('figure')
    expect(directives[0].data.hName).toBe('figure')
  })

  it('prepends image node from src param', () => {
    const md = '@figure src=photo.jpg alt="Nice photo"\nThis is the caption.\n@endfigure\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].children[0].type).toBe('image')
    expect(directives[0].children[0].url).toBe('photo.jpg')
    expect(directives[0].children[0].alt).toBe('Nice photo')
  })

  it('wraps body in figcaption', () => {
    const md = '@figure src=photo.jpg\nCaption goes here.\n@endfigure\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    // children[0] = image, children[1] = figcaption wrapper
    expect(directives[0].children[1].data.hName).toBe('figcaption')
  })

  it('handles figure with id param', () => {
    const md = '@figure src=photo.jpg id=fig-1\nCaption.\n@endfigure\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data.hProperties.id).toBe('fig-1')
  })

  it('handles figure with no caption (empty body)', () => {
    const md = '@figure src=photo.jpg\n@endfigure\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    // Only image, no figcaption
    expect(directives[0].children).toHaveLength(1)
    expect(directives[0].children[0].type).toBe('image')
  })

  it('renders figure to HTML', async () => {
    const md = '@figure src=photo.jpg alt="test"\nCaption text.\n@endfigure\n'
    const html = await toHtml(md)
    expect(html).toContain('<figure>')
    expect(html).toContain('<img')
    expect(html).toContain('<figcaption>')
    expect(html).toContain('</figure>')
  })
})

describe('aside directive', () => {
  it('parses a basic aside', () => {
    const md = '@aside\nSide content.\n@endaside\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('aside')
    expect(directives[0].data.hName).toBe('aside')
    expect(directives[0].data.hProperties.class).toBe('aside')
  })

  it('parses aside with title param', () => {
    const md = '@aside title="Related"\nRelated information.\n@endaside\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].children[0].data.hProperties.class).toBe('aside__title')
    expect(directives[0].children[0].children[0].value).toBe('Related')
  })

  it('renders aside to HTML', async () => {
    const md = '@aside title="Note"\nImportant info.\n@endaside\n'
    const html = await toHtml(md)
    expect(html).toContain('<aside class="aside">')
    expect(html).toContain('</aside>')
  })
})

describe('tabs directive', () => {
  it('parses tabs container', () => {
    const md = '@tabs\n@tab label=JavaScript\nJS code here.\n@endtab\n@tab label=Python\nPython code here.\n@endtab\n@endtabs\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    const tabs = directives.filter((d: any) => d.name === 'tabs')
    expect(tabs).toHaveLength(1)
    expect(tabs[0].data.hName).toBe('div')
    expect(tabs[0].data.hProperties.class).toBe('tabs')
  })

  it('parses tabs with sync id', () => {
    const md = '@tabs id=lang\n@tab label=JS\nCode.\n@endtab\n@endtabs\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    const tabs = directives.filter((d: any) => d.name === 'tabs')
    expect(tabs[0].data.hProperties['data-sync-id']).toBe('lang')
  })

  it('parses tab panels', () => {
    const md = '@tab label=JavaScript\nJS content.\n@endtab\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].name).toBe('tab')
    expect(directives[0].data.hName).toBe('div')
    expect(directives[0].data.hProperties.role).toBe('tabpanel')
  })
})

describe('math directive', () => {
  it('parses a math block with LaTeX body', () => {
    const md = '@math\nE = mc^2\n@endmath\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('math')
    expect(directives[0].meta.content).toBe('E = mc^2')
    expect(directives[0].data.hName).toBe('div')
    expect(directives[0].data.hProperties.class).toBe('math')
    expect(directives[0].data.hProperties.role).toBe('math')
  })

  it('stores raw LaTeX without parsing as markdown', () => {
    const md = '@math\n\\frac{a}{b} + \\sqrt{c}\n@endmath\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].meta.content).toBe('\\frac{a}{b} + \\sqrt{c}')
    // Should have no markdown children
    expect(directives[0].children).toHaveLength(0)
  })

  it('handles math with label param', () => {
    const md = '@math label=eq-1\nx^2 + y^2 = z^2\n@endmath\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data.hProperties.id).toBe('eq-1')
  })

  it('renders math to HTML with raw text content', async () => {
    const md = '@math\nE = mc^2\n@endmath\n'
    const html = await toHtml(md)
    expect(html).toContain('E = mc^2')
    expect(html).toContain('class="math"')
  })
})

describe('toc directive', () => {
  it('parses a toc directive', () => {
    const md = '# Title\n\n@toc\n@endtoc\n\n## Section One\n\n## Section Two\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('toc')
    expect(directives[0].data.hName).toBe('nav')
    expect(directives[0].data.hProperties['aria-label']).toBe('Table of contents')
  })

  it('builds list from document headings', () => {
    const md = '# Title\n\n@toc\n@endtoc\n\n## Section A\n\n## Section B\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    const lists = findNodes(directives[0], 'list')
    expect(lists).toHaveLength(1)
    const links = findNodes(directives[0], 'link')
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('respects depth param', () => {
    const md = '# H1\n\n@toc depth=1\n@endtoc\n\n## H2\n\n### H3\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    const links = findNodes(directives[0], 'link')
    // depth=1 means only h1 headings
    expect(links).toHaveLength(1)
  })
})

describe('include directive', () => {
  it('parses include as placeholder', () => {
    const md = '@include src=other-doc.md\n@endinclude\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('include')
    expect(directives[0].data.hName).toBe('div')
    expect(directives[0].data.hProperties['data-src']).toBe('other-doc.md')
  })

  it('handles include with heading param', () => {
    const md = '@include src=doc.md heading="Section 1"\n@endinclude\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data.hProperties['data-heading']).toBe('Section 1')
  })
})

describe('query directive', () => {
  it('parses query as placeholder', () => {
    const md = '@query type=backlinks\n@endquery\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('query')
    expect(directives[0].data.hProperties['data-query-type']).toBe('backlinks')
  })

  it('handles query with from param', () => {
    const md = '@query type=tagged from=projects\n@endquery\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data.hProperties['data-query-from']).toBe('projects')
  })
})

describe('endnotes directive', () => {
  it('parses endnotes as placeholder', () => {
    const md = '@endnotes\n@endendnotes\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('endnotes')
    expect(directives[0].data.hName).toBe('section')
    expect(directives[0].data.hProperties.role).toBe('doc-endnotes')
  })
})

describe('generic directive edge cases', () => {
  it('does not match unknown directive names', () => {
    const md = '@foobar\nContent.\n@endfoobar\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('does not interfere with callout', () => {
    const md = '@callout type=info\nCallout content.\n@endcallout\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('callout')
  })

  it('does not interfere with embed', () => {
    const md = '@embed https://example.com\n@endembed\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('embed')
  })

  it('handles directive with no body', () => {
    const md = '@toc\n@endtoc\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('toc')
  })

  it('handles boolean and string params together', () => {
    const md = '@details open summary="Title" collapsible\nContent.\n@enddetails\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.open).toBe(true)
    expect(directives[0].params.summary).toBe('Title')
    expect(directives[0].params.collapsible).toBe(true)
  })
})
