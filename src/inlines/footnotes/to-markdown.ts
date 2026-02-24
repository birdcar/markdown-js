export function footnoteToMarkdown() {
  return {
    handlers: {
      footnoteRef: handleFootnoteRef,
      footnoteDef: handleFootnoteDef,
    },
  }
}

function handleFootnoteRef(node: any): string {
  return `[^${node.label}]`
}

function handleFootnoteDef(node: any, _parent: any, state: any, info: any): string {
  let content = ''
  if (node.children && node.children.length > 0) {
    content = state.containerFlow(node, info)
  } else if (node._rawContent) {
    content = node._rawContent
  }
  return `[^${node.label}]: ${content}\n`
}
