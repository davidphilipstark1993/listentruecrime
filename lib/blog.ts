import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export interface BlogFAQ {
  q: string
  a: string
}

export interface BlogPost {
  slug: string
  title: string
  date: string
  updated?: string
  description: string
  category: string
  tags: string[]
  featured?: boolean
  image?: string
  relatedPodcasts?: string[]
  faqs?: BlogFAQ[]
  content: string
  readingTime: string
  wordCount: number
}

function ensureBlogDir() {
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true })
}

export function getAllPosts(): BlogPost[] {
  ensureBlogDir()
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'))
  return files
    .map(file => {
      const slug = file.replace('.mdx', '')
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
      const { data, content } = matter(raw)
      const rt = readingTime(content)
      return {
        slug,
        title: data.title ?? '',
        date: data.date ?? '',
        updated: data.updated,
        description: data.description ?? '',
        category: data.category ?? 'Uncategorised',
        tags: data.tags ?? [],
        featured: data.featured ?? false,
        image: data.image,
        relatedPodcasts: data.relatedPodcasts ?? [],
        faqs: data.faqs ?? [],
        content,
        readingTime: rt.text,
        wordCount: rt.words,
      } as BlogPost
    })
    .filter(p => p.title)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  ensureBlogDir()
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const rt = readingTime(content)
  return {
    slug,
    title: data.title ?? '',
    date: data.date ?? '',
    updated: data.updated,
    description: data.description ?? '',
    category: data.category ?? 'Uncategorised',
    tags: data.tags ?? [],
    featured: data.featured ?? false,
    image: data.image,
    relatedPodcasts: data.relatedPodcasts ?? [],
    faqs: data.faqs ?? [],
    content,
    readingTime: rt.text,
    wordCount: rt.words,
  }
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter(
    p => p.category.toLowerCase() === category.toLowerCase()
  )
}

export function getPostsByTag(tag: string): BlogPost[] {
  return getAllPosts().filter(p =>
    p.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  )
}

export function getAllCategories(): { name: string; slug: string; count: number }[] {
  const posts = getAllPosts()
  const counts: Record<string, number> = {}
  posts.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      slug: slugifyCategory(name),
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export function getAllTags(): { name: string; slug: string; count: number }[] {
  const posts = getAllPosts()
  const counts: Record<string, number> = {}
  posts.forEach(p => {
    p.tags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1
    })
  })
  return Object.entries(counts)
    .map(([name, count]) => ({ name, slug: slugifyCategory(name), count }))
    .sort((a, b) => b.count - a.count)
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const all = getAllPosts().filter(p => p.slug !== post.slug)
  return all
    .map(p => {
      let score = 0
      if (p.category === post.category) score += 3
      p.tags.forEach(tag => {
        if (post.tags.includes(tag)) score++
      })
      return { post: p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post: p }) => p)
}

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface TOCEntry {
  id: string
  text: string
  level: number
}

export function extractTOC(content: string): TOCEntry[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const entries: TOCEntry[] = []
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const rawText = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_]/g, '')
    const id = rawText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    entries.push({ id, text: rawText, level })
  }
  return entries
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
