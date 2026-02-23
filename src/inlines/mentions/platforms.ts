const PLATFORM_URL_MAP: Record<string, string> = {
  github: 'https://github.com/{id}',
  twitter: 'https://twitter.com/{id}',
  bluesky: 'https://bsky.app/profile/{id}',
  mastodon: 'mastodon', // special handling
  npm: 'https://www.npmjs.com/package/{id}',
  linkedin: 'https://www.linkedin.com/in/{id}',
}

export const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  twitter: 'Twitter',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  npm: 'npm',
  linkedin: 'LinkedIn',
}

export function resolvePlatformUrl(
  platform: string,
  identifier: string,
): string | null {
  const template = PLATFORM_URL_MAP[platform]
  if (!template) return null

  if (platform === 'mastodon') {
    // identifier is user@instance
    const atIndex = identifier.indexOf('@')
    if (atIndex === -1) return null
    const user = identifier.slice(0, atIndex)
    const instance = identifier.slice(atIndex + 1)
    return `https://${instance}/@${user}`
  }

  return template.replace('{id}', identifier)
}

export function isKnownPlatform(platform: string): boolean {
  return platform in PLATFORM_URL_MAP
}
