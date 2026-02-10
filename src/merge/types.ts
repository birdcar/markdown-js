export type MergeStrategy = 'last-wins' | 'first-wins' | 'error'

export type MergeResolver = (
  key: string,
  existing: unknown,
  incoming: unknown,
) => unknown

export interface MergeOptions {
  strategy?: MergeStrategy | MergeResolver
  separator?: string
}

export interface BfmDocument {
  frontmatter: Record<string, unknown>
  body: string
}
