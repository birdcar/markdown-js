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
    // Indent continuation lines with 4 spaces
    const lines = content.split('\n')
    content = lines.map((line: string, i: number) => {
      if (i === 0) return line
      if (line.trim() === '') return ''
      return `    ${line}`
    }).join('\n')
  }
  return `[^${node.label}]: ${content}\n`
}
