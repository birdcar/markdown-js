import YAML from 'yaml'
import type { Root } from 'mdast'
import type { Processor } from 'unified'
import { frontmatter } from 'micromark-extension-frontmatter'
import {
  frontmatterFromMarkdown,
  frontmatterToMarkdown,
} from 'mdast-util-frontmatter'

export function remarkBfmFrontmatter(this: Processor<Root>) {
  const data = this.data()
  const micromarkExtensions = (data.micromarkExtensions ??= []) as any[]
  const fromMarkdownExtensions = (data.fromMarkdownExtensions ??= []) as any[]
  const toMarkdownExtensions = (data.toMarkdownExtensions ??= []) as any[]

  micromarkExtensions.push(frontmatter())

  // Wrap the standard from-markdown extension to also parse YAML into node.data
  const base = frontmatterFromMarkdown() as any
  const originalExit = base.exit.yaml

  base.exit.yaml = function (this: any, token: any) {
    originalExit.call(this, token)
    const node = this.stack[this.stack.length - 1] as any
    // After the base exit, the node is already popped from stack.
    // We need to find the yaml node that was just added.
    const parent = this.stack[this.stack.length - 1] as any
    const children = parent?.children ?? this.stack
    // The yaml node is the last child just added
    const yamlNode = children[children.length - 1]
    if (yamlNode?.type === 'yaml') {
      try {
        yamlNode.data = YAML.parse(yamlNode.value) ?? {}
      } catch {
        yamlNode.data = {}
      }
    }
  }

  fromMarkdownExtensions.push(base)
  toMarkdownExtensions.push(frontmatterToMarkdown())
}

export type { YamlNode } from '../../types.js'
