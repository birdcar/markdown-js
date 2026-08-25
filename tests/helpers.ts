import remarkStringify from 'remark-stringify'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import type { Root } from 'mdast'
import { createBfmProcessor, parseBfm } from '../src/processor.js'
import type { RemarkBfmOptions } from '../src/blocks/registry.js'

export function parse(markdown: string): Root {
  return createBfmProcessor().parse(markdown) as Root
}

export function parseAndTransform(markdown: string): Root {
  return parseBfm(markdown)
}

export function parseAndTransformWith(markdown: string, options: RemarkBfmOptions): Root {
  return parseBfm(markdown, options)
}

export function stringify(markdown: string): string {
  const processor = createBfmProcessor().use(remarkStringify)
  return String(processor.processSync(markdown))
}

export async function toHtml(markdown: string): Promise<string> {
  const result = await createBfmProcessor()
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown)
  return String(result)
}

export async function toHtmlWith(
  markdown: string,
  options: RemarkBfmOptions,
): Promise<string> {
  const result = await createBfmProcessor(options)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown)
  return String(result)
}

export function findNodes(tree: Root, type: string): any[] {
  const nodes: any[] = []
  function walk(node: any) {
    if (node.type === type) nodes.push(node)
    if (node.children) {
      for (const child of node.children) walk(child)
    }
  }
  walk(tree)
  return nodes
}
