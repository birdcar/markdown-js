import type { Root } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified, type Processor } from 'unified'
import type { RemarkBfmOptions } from './blocks/registry.js'
import { remarkBfm } from './plugin.js'

export function createBfmProcessor(
  options?: RemarkBfmOptions,
): Processor<Root> {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(preferBfmFootnotes as any)
    .use(remarkBfm as any, options) as Processor<Root>
}

function preferBfmFootnotes(this: Processor<Root>): void {
  const data = this.data()
  const syntaxExtensions = (data.micromarkExtensions ?? []) as any[]
  for (const extension of syntaxExtensions) {
    removeNamedConstruct(extension.document, 'gfmFootnoteDefinition')
    removeNamedConstruct(extension.text, 'gfmFootnoteCall')
    removeNamedConstruct(extension.text, 'gfmPotentialFootnoteCall')
  }

  data.fromMarkdownExtensions = (data.fromMarkdownExtensions ?? []).map((extension) => {
    if (!Array.isArray(extension)) return extension
    return extension.filter((item: any) => !(
      item.enter?.gfmFootnoteCall
      || item.enter?.gfmFootnoteDefinition
    ))
  })
}

function removeNamedConstruct(
  constructs: Record<string, any> | undefined,
  name: string,
): void {
  if (!constructs) return
  for (const [code, construct] of Object.entries(constructs)) {
    if (Array.isArray(construct)) {
      constructs[code] = construct.filter((item) => item.name !== name)
    } else if (construct?.name === name) {
      delete constructs[code]
    }
  }
}

export function parseBfm(
  source: string,
  options?: RemarkBfmOptions,
): Root {
  const processor = createBfmProcessor(options)
  return processor.runSync(processor.parse(source)) as Root
}
