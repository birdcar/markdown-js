import { describe, it, expect } from 'vitest'
import { parseAndTransform, findNodes, parseAndTransformWith, toHtmlWith } from './helpers.js'

describe('open parser', () => {
  it('parses an arbitrary lowercase name', () => {
    const md = '@spoiler\nhi\n@endspoiler\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('spoiler')
  })

  it('parses a name containing digits', () => {
    const md = '@h2box\nhi\n@endh2box\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('h2box')
  })

  it('does not parse a name starting with a digit', () => {
    const md = '@2box\nhi\n@end2box\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('does not parse a bare @ with no name', () => {
    const md = '@\nhi\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('parses a longer arbitrary name', () => {
    const md = '@customblock\ncontent here\n@endcustomblock\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('customblock')
  })
})

describe('close fence required', () => {
  it('unclosed directive falls back to paragraph', () => {
    const md = '@note\nbody\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('closed directive produces one directiveBlock node', () => {
    const md = '@note\nbody\n@endnote\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(1)
    expect(directives[0].name).toBe('note')
  })

  it('mismatched close fence falls back to paragraph', () => {
    const md = '@note\nbody\n@endother\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })

  it('directive with params but no close fence falls back', () => {
    const md = '@note title="test"\nbody\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives).toHaveLength(0)
  })
})

describe('positional + quoted params', () => {
  it('bare valid identifier becomes boolean flag', () => {
    const md = '@x open\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.open).toBe(true)
  })

  it('key=value pair is parsed correctly', () => {
    const md = '@x a=1\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.a).toBe('1')
  })

  it('quoted value preserves spaces', () => {
    const md = '@x title="two words"\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.title).toBe('two words')
  })

  it('bare non-identifier token goes to _positional', () => {
    const md = '@x https://example.com\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params._positional).toEqual(['https://example.com'])
  })

  it('path-like token goes to _positional', () => {
    const md = '@x path/to/file\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params._positional).toEqual(['path/to/file'])
  })

  it('mixed params: key=value, flag, positional', () => {
    const md = '@x a=1 open title="two words" https://e.com path/to/f\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.a).toBe('1')
    expect(directives[0].params.open).toBe(true)
    expect(directives[0].params.title).toBe('two words')
    expect(directives[0].params._positional).toEqual(['https://e.com', 'path/to/f'])
  })

  it('escaped quote inside quoted value', () => {
    const md = '@x title="say \\"hello\\""\n@endx\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].params.title).toBe('say "hello"')
  })
})

describe('registration API', () => {
  it('toHast static object sets node.data', async () => {
    const md = '@spoiler\nHidden content.\n@endspoiler\n'
    const html = await toHtmlWith(md, {
      directives: {
        spoiler: { kind: 'container', toHast: { hName: 'details', hProperties: { class: 'spoiler' } } },
      },
    })
    expect(html).toContain('<details class="spoiler">')
  })

  it('toHast function receives node and derives props from params', async () => {
    const md = '@box color=blue\nContent.\n@endbox\n'
    const html = await toHtmlWith(md, {
      directives: {
        box: {
          kind: 'container',
          toHast: (n) => ({ hName: 'div', hProperties: { class: `box box--${n.params.color}` } }),
        },
      },
    })
    expect(html).toContain('class="box box--blue"')
  })

  it('transform escape hatch can rewrite children', () => {
    const md = '@box\nBody text.\n@endbox\n'
    const tree = parseAndTransformWith(md, {
      directives: {
        box: {
          kind: 'container',
          transform: (n) => {
            n.data = { hName: 'section' }
            n.children = [
              { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Injected' }] } as any,
              ...n.children,
            ]
          },
        },
      },
    })
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data.hName).toBe('section')
    expect(directives[0].children[0].type).toBe('heading')
    expect(directives[0].children[0].children[0].value).toBe('Injected')
  })

  it('leaf registration stores body in meta.body without parsing', () => {
    const md = '@raw\n**not bold** just text\n@endraw\n'
    const tree = parseAndTransformWith(md, {
      directives: { raw: { kind: 'leaf' } },
    })
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].meta?.body).toBe('**not bold** just text')
    expect(directives[0].children).toHaveLength(0)
  })

  it('unregistered directive is treated as container with parsed children and no data', () => {
    const md = '@mystery\nParsed body.\n@endmystery\n'
    const tree = parseAndTransform(md)
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].name).toBe('mystery')
    expect(directives[0].data).toBeUndefined()
    expect(directives[0].children.length).toBeGreaterThan(0)
    expect(directives[0].children[0].type).toBe('paragraph')
  })

  it('custom definition overrides a built-in by name', async () => {
    const md = '@details\nOverridden.\n@enddetails\n'
    const html = await toHtmlWith(md, {
      directives: {
        details: { kind: 'container', toHast: { hName: 'div', hProperties: { class: 'custom-details' } } },
      },
    })
    expect(html).toContain('<div class="custom-details">')
    expect(html).not.toContain('<details')
  })

  it('definition with neither toHast nor transform emits node with no data', () => {
    const tree = parseAndTransformWith('@empty\nSome content.\n@endempty\n', {
      directives: { empty: { kind: 'container' } },
    })
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data).toBeUndefined()
    expect(directives[0].children.length).toBeGreaterThan(0)
  })

  it('prototype pollution guard: __proto__ key does not corrupt Object prototype', () => {
    expect(() => {
      parseAndTransformWith('@test\nBody.\n@endtest\n', {
        directives: { __proto__: { kind: 'leaf' } },
      })
    }).not.toThrow()
    expect(({} as any).kind).toBeUndefined()
  })

  it('ctx.tree is the full document tree in transform', () => {
    const md = '## My Heading\n\n@headingcounter\n@endheadingcounter\n'
    const tree = parseAndTransformWith(md, {
      directives: {
        headingcounter: {
          kind: 'leaf',
          transform: (n, ctx) => {
            const headings = ctx.tree.children.filter((c: any) => c.type === 'heading')
            n.data = { hName: 'div', hProperties: { 'data-count': String(headings.length) } }
          },
        },
      },
    })
    const directives = findNodes(tree, 'directiveBlock')
    expect(directives[0].data.hProperties['data-count']).toBe('1')
  })
})
