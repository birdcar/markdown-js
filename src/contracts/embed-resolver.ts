export type EmbedResolver = {
  resolve(url: string): Promise<{
    type: string
    html?: string
    title?: string
    description?: string
    thumbnailUrl?: string
    providerName?: string
    url?: string
  } | null>
}
