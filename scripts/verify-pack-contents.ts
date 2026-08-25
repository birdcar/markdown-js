import { readFile } from 'node:fs/promises'
import packageJson from '../package.json'

interface PackFile {
  path: string
}

interface PackReport {
  files?: PackFile[]
}

const reportPath = process.argv.find((argument, index) => (
  index > 1 && argument !== '--'
))
if (!reportPath) {
  throw new Error('Usage: verify-pack-contents <npm-pack-report.json>')
}

const reports = JSON.parse(await readFile(reportPath, 'utf8')) as PackReport[]
const files = new Set(reports[0]?.files?.map((file) => file.path) ?? [])
if (files.size === 0) throw new Error('npm pack report contains no files')

const exportTargets = collectExportTargets(packageJson.exports)
const missingTargets = exportTargets
  .map((target) => target.replace(/^\.\//, ''))
  .filter((target) => !files.has(target))
if (missingTargets.length > 0) {
  throw new Error(`Package is missing export targets: ${missingTargets.join(', ')}`)
}

const allowedRootFiles = /^(?:package\.json|README(?:\.[^/]+)?|LICENSE(?:\.[^/]+)?|CHANGELOG(?:\.[^/]+)?)$/i
const unintended = [...files].filter((file) => (
  !file.startsWith('dist/') && !allowedRootFiles.test(file)
))
if (unintended.length > 0) {
  throw new Error(`Package contains unintended files: ${unintended.join(', ')}`)
}

console.log(`Package contents verified (${files.size} files, ${exportTargets.length} export targets)`)

function collectExportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(collectExportTargets)
}
