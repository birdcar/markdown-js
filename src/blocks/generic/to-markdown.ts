import type { DirectiveBlockNode } from '../../types.js'

export function directiveToMarkdown() {
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
  const params = serializeParams(node.params)
  const opening = params ? `@${node.name} ${params}` : `@${node.name}`
  const closing = `@end${node.name}`

  let body = ''
  if (node.meta?.body !== undefined) {
    body = node.meta.body
  } else if (node.children && node.children.length > 0) {
    body = state.containerFlow(node, info)
  }

  return `${opening}\n${body}\n${closing}\n`
}

function serializeParams(params: Record<string, string | boolean>): string {
  const positional = (params._positional as unknown as string[] | undefined) ?? []
  const positionalStr = positional
    .map((v) => (v.includes(' ') ? `"${v}"` : v))
    .join(' ')

  const namedStr = Object.entries(params)
    .filter(([key]) => key !== '_positional')
    .map(([key, value]) => {
      if (value === true) return key
      if (typeof value === 'string' && value.includes(' ')) return `${key}="${value}"`
      return `${key}=${value}`
    })
    .join(' ')

  return [positionalStr, namedStr].filter(Boolean).join(' ')
}
