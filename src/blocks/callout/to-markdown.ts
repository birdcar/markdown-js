import type { DirectiveBlockNode } from '../../types.js'

export function calloutToMarkdown() {
  return {
    handlers: {
      directiveBlock: handleDirectiveBlock,
    },
  }
}

function handleDirectiveBlock(
  node: DirectiveBlockNode,
  _parent: any,
  state: any,
  info: any,
): string {
  if (node.name === 'embed') {
    return handleEmbed(node)
  }

  const params = serializeParams(node.params)
  const opening = params ? `@${node.name} ${params}` : `@${node.name}`
  const closing = `@end${node.name}`

  let body = ''
  if (node.children && node.children.length > 0) {
    body = state.containerFlow(node, info)
  }

  return `${opening}\n${body}\n${closing}\n`
}

function handleEmbed(node: DirectiveBlockNode): string {
  const url = node.params.url || ''
  const caption = node.meta?.caption || ''
  if (caption) {
    return `@embed ${url}\n${caption}\n@endembed\n`
  }
  return `@embed ${url}\n@endembed\n`
}

function serializeParams(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => {
      if (value.includes(' ')) return `${key}="${value}"`
      return `${key}=${value}`
    })
    .join(' ')
}
