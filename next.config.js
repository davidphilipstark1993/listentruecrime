/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
    ],
  },
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig
