export type MentionResolver = {
  resolve(identifier: string): Promise<{
    label: string
    url: string | null
  } | null>
}
