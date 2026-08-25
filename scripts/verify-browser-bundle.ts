import { builtinModules } from 'node:module'
import { build } from 'esbuild'

const result = await build({
  entryPoints: ['tests/fixtures/browser-consumer.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'BfmBrowserConsumer',
  logLevel: 'silent',
  metafile: true,
  platform: 'browser',
  write: false,
})

const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
])
const nodeImports = Object.values(result.metafile.inputs)
  .flatMap((input) => input.imports)
  .map((item) => item.path)
  .filter((path) => builtins.has(path) || path.startsWith('node:'))

if (nodeImports.length > 0) {
  throw new Error(`Browser bundle contains Node built-ins: ${nodeImports.join(', ')}`)
}

const output = result.outputFiles[0]
if (!output) throw new Error('Browser bundle produced no JavaScript output')
const element = {
  innerHTML: '',
  get textContent() {
    return this.innerHTML
  },
}
new Function('document', output.text)({
  createElement: () => element,
})

console.log(`Browser bundle verified (${output.contents.byteLength} bytes)`)
