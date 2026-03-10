import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import type { Root } from 'mdast'
import { remarkBfm } from '../src/plugin.js'

export function parse(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkBfm)
  return processor.parse(markdown) as Root
}

export function parseAndTransform(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkBfm)
  const tree = processor.parse(markdown)
  return processor.runSync(tree) as Root
}

export function stringify(markdown: string): string {
  const processor = unified().use(remarkParse).use(remarkBfm).use(remarkStringify)
  return String(processor.processSync(markdown))
}

export async function toHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkBfm)
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
