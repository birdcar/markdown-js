import type { MergeOptions, MergeStrategy, MergeResolver, BfmDocument } from './types.js'

export function mergeDocuments(
  docs: BfmDocument[],
  options?: MergeOptions,
): BfmDocument {
  if (docs.length === 0) {
    return { frontmatter: {}, body: '' }
  }

  const strategy = options?.strategy ?? 'last-wins'
  const separator = options?.separator ?? '\n\n'

  return docs.reduce((acc, doc) => ({
    frontmatter: deepMerge(acc.frontmatter, doc.frontmatter, strategy),
    body: acc.body ? `${acc.body}${separator}${doc.body}` : doc.body,
  }))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  strategy: MergeStrategy | MergeResolver,
): Record<string, unknown> {
  const result = { ...target }

  for (const [key, value] of Object.entries(source)) {
    if (!(key in result)) {
      result[key] = value
      continue
    }

    const existing = result[key]

    if (Array.isArray(existing) && Array.isArray(value)) {
      result[key] = [...existing, ...value]
    } else if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value, strategy)
    } else {
      // Scalar conflict (or type mismatch)
      if (typeof strategy === 'function') {
        result[key] = strategy(key, existing, value)
      } else if (strategy === 'last-wins') {
        result[key] = value
      } else if (strategy === 'first-wins') {
        // keep existing
      } else if (strategy === 'error') {
        throw new Error(
          `Merge conflict on key "${key}": ${JSON.stringify(existing)} vs ${JSON.stringify(value)}`,
        )
      }
    }
  }

  return result
}
