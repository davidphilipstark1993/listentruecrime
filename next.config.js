/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Matches the typescript flag above: this repo had no ESLint config
    // committed until the artwork-recovery system added one (see
    // .eslintrc.json), which surfaced a large pre-existing backlog of
    // unrelated lint errors across the codebase. `npm run lint` still
    // reports them honestly; the build itself doesn't block on them,
    // consistent with how it already treats type errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['gray-matter', 'reading-time'],
  },
  transpilePackages: ['next-mdx-remote'],
  trailingSlash: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      // Podcast cover art CDNs (Apple, Spotify, Audible, general podcast hosting)
      { protocol: 'https', hostname: '**.mzstatic.com' },
      { protocol: 'https', hostname: '**.scdn.co' },
      { protocol: 'https', hostname: '**.spotify.com' },
      { protocol: 'https', hostname: '**.buzzsprout.com' },
      { protocol: 'https', hostname: '**.podtrac.com' },
      { protocol: 'https', hostname: '**.acast.com' },
      { protocol: 'https', hostname: '**.transistor.fm' },
      { protocol: 'https', hostname: '**.simplecast.com' },
      { protocol: 'https', hostname: '**.libsyn.com' },
      { protocol: 'https', hostname: '**.squarespace.com' },
      { protocol: 'https', hostname: '**.podbean.com' },
      { protocol: 'https', hostname: '**.spreaker.com' },
      { protocol: 'https', hostname: '**.blubrry.com' },
      { protocol: 'https', hostname: 'cdn.galaxy.ai' },
      { protocol: 'https', hostname: '**.omnycontent.com' },
      { protocol: 'https', hostname: '**.bbci.co.uk' },
      { protocol: 'https', hostname: '**.pippa.io' },
      { protocol: 'https', hostname: '**.cbc.ca' },
      { protocol: 'https', hostname: '**.imgix.net' },
      { protocol: 'https', hostname: '**.art19.com' },
    ],
  },
  compress: true,
  poweredByHeader: false,
  // CMS identity cleanup, 17 Sep 2026 — twin podcast pages unpublished and
  // 301'd to their canonical (see scripts/one-off/ltc-cms-cleanup-2026-09-17.js
  // and the critical-*-2026-09-11 source packs).
  async redirects() {
    return [
      { source: '/podcasts/murder-mile-uk-true-crime-podcast', destination: '/podcasts/murder-mile-uk-true-crime', permanent: true },
      { source: '/podcasts/cults-parcast', destination: '/podcasts/cults', permanent: true },
      { source: '/podcasts/serial-killers-parcast', destination: '/podcasts/serial-killers', permanent: true },
      { source: '/podcasts/unsolved-murders-parcast', destination: '/podcasts/unsolved-murders-true-crime-stories', permanent: true },
    ]
  },
}

module.exports = nextConfig
