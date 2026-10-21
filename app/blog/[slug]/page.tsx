import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getAllPosts, getPostBySlug, getRelatedPosts, extractTOC } from '@/lib/blog'
import { getAuthor } from '@/lib/authors'
import { Breadcrumbs } from '@/components/blog/Breadcrumbs'
import { AuthorBox } from '@/components/blog/AuthorBox'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { FAQ } from '@/components/blog/FAQ'
import { RelatedPosts } from '@/components/blog/RelatedPosts'
import { ShareButtons } from '@/components/blog/ShareButtons'
import { Callout } from '@/components/blog/Callout'
import { PodcastRecommendation } from '@/components/blog/PodcastRecommendation'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BASE } from '@/lib/seo/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { autolinkPodcasts } from '@/lib/podcast-autolink'
import { disclosedProviders, getAffiliateProductsBySlugs, getAffiliateProductsForPage, type PublicAffiliateProduct } from '@/lib/affiliates/queries'
import { extractAffiliateSlugs, parseSlugList } from '@/lib/affiliates/mdx'
import { AffiliateProductCard } from '@/components/affiliates/affiliate-product-card'
import { FurtherReading } from '@/components/affiliates/further-reading'
import { AffiliateLink } from '@/components/affiliates/affiliate-link'
import { AffiliateDisclosure } from '@/components/affiliates/affiliate-disclosure'

function slugifyText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getHeadingText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getHeadingText).join('')
  return ''
}

const MDX_COMPONENTS = {
  Callout,
  PodcastRecommendation,
  h2: ({ children }: { children?: ReactNode }) => {
    const id = slugifyText(getHeadingText(children))
    return <h2 id={id} className="scroll-mt-24">{children}</h2>
  },
  h3: ({ children }: { children?: ReactNode }) => {
    const id = slugifyText(getHeadingText(children))
    return <h3 id={id} className="scroll-mt-24">{children}</h3>
  },
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith('/')) {
      return <Link href={href} {...props}>{children}</Link>
    }
    // Amazon/Audible links are affiliate links: mark them as paid. noopener
    // without noreferrer, matching AffiliateLink, so Amazon sees the referrer.
    if (isAmazonHref(href)) {
      return <a {...props} href={href} target="_blank" rel="sponsored nofollow noopener">{children}</a>
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  },
}

function isAmazonHref(href?: string): boolean {
  if (!href) return false
  try {
    const host = new URL(href).hostname
    return /(^|\.)amazon\.(co\.uk|com|ie|ca|com\.au)$/.test(host) || host === 'link.amazon' || /(^|\.)amzn\.(to|eu)$/.test(host)
  } catch {
    return false
  }
}

// Affiliate components available in MDX, bound to the live products this
// article references. Unknown, inactive or URL-less products render nothing.
//   <AffiliateProduct slug="..." />            a single product card
//   <AffiliateProduct slug="..." variant="link">text</AffiliateProduct>
//   <FurtherReading slugs="a, b" note="..." />  a short related-reading list
function makeAffiliateMdxComponents(products: Map<string, PublicAffiliateProduct>) {
  function FurtherReadingMdx({ slugs, heading, note }: { slugs: string; heading?: string; note?: string }) {
    const items = parseSlugList(slugs).map(s => products.get(s)).filter((p): p is PublicAffiliateProduct => Boolean(p))
    return <FurtherReading products={items} placement="article-further-reading" heading={heading} note={note} />
  }
  return { AffiliateProduct: makeAffiliateProduct(products), FurtherReading: FurtherReadingMdx }
}

function makeAffiliateProduct(products: Map<string, PublicAffiliateProduct>) {
  return function AffiliateProduct({ slug, variant = 'card', label, children }: { slug: string; variant?: 'card' | 'link'; label?: string; children?: ReactNode }) {
    const product = products.get(slug)
    if (!product) return null
    if (variant === 'link') {
      return (
        <AffiliateLink provider={product.provider} href={product.affiliate_url} product={product.slug} placement="article-inline-link" variant="text" className="text-[length:inherit]">
          {children ?? product.link_text ?? undefined}
        </AffiliateLink>
      )
    }
    return <AffiliateProductCard product={product} placement="article-inline" label={label} />
  }
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  const author = getAuthor(post.author ?? 'david-stark')
  const ogParams = new URLSearchParams({ title: post.title })
  ogParams.set('sub', post.category)
  const ogImage = `${BASE}/og?${ogParams.toString()}`

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${BASE}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [`${BASE}/authors/${author.slug}`],
      tags: post.tags,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImage],
      creator: author.twitter,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const author = getAuthor(post.author ?? 'david-stark')
  const related = getRelatedPosts(post, 3)
  const toc = extractTOC(post.content)
  const postUrl = `${BASE}/blog/${slug}`

  // Fetch related podcasts and all podcast titles for auto-linking
  const supabase = createAdminClient()
  const [relatedPodcastsRes, allPodcastTitlesRes, inlineAffiliates, pageAffiliates] = await Promise.all([
    post.relatedPodcasts?.length
      ? supabase
          .from('podcasts')
          .select('*, rating_stats:podcast_rating_stats(*)')
          .in('slug', post.relatedPodcasts)
          .eq('is_published', true)
      : Promise.resolve({ data: [] }),
    supabase.from('podcasts').select('slug, title').eq('is_published', true),
    getAffiliateProductsBySlugs(extractAffiliateSlugs(post.content)),
    getAffiliateProductsForPage('blog', slug),
  ])

  // Products placed inline in the MDX aren't repeated in the end-of-article section
  const sectionAffiliates = pageAffiliates.products.filter(p => !inlineAffiliates.has(p.slug))
  const affiliateProviders = disclosedProviders([...Array.from(inlineAffiliates.values()), ...sectionAffiliates])

  const relatedPodcastData = relatedPodcastsRes.data ?? []
  const allTitles = (allPodcastTitlesRes.data ?? []) as Array<{ slug: string; title: string }>

  // Pre-process MDX content to auto-link podcast names
  const linkedContent = autolinkPodcasts(post.content, allTitles)

  // Same branded OG image generateMetadata() builds for openGraph.images —
  // recomputed here since Article/BlogPosting rich results require `image`.
  const schemaImageParams = new URLSearchParams({ title: post.title })
  schemaImageParams.set('sub', post.category)
  const schemaImage = `${BASE}/og?${schemaImageParams.toString()}`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: schemaImage,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    url: postUrl,
    author: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.role,
      url: `${BASE}/authors/${author.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ListenTrueCrime',
      url: BASE,
      logo: { '@type': 'ImageObject', url: `${BASE}/og` },
    },
    keywords: post.tags.join(', '),
    articleSection: post.category,
    wordCount: post.wordCount,
  }

  // Reading-list articles (frontmatter `books`) also describe their books
  const booksSchema = post.books?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: post.title,
        url: postUrl,
        itemListElement: post.books.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Book', name: b.title, author: { '@type': 'Person', name: b.author } },
        })),
      }
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {booksSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(booksSchema) }}
        />
      )}
      <Header />
      <main id="main-content" className="min-h-screen bg-ink-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
            {/* Article */}
            <article>
              <Breadcrumbs
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Blog', href: '/blog' },
                  { label: post.category, href: `/blog/category/${post.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
                  { label: post.title },
                ]}
              />

              <header className="mt-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Link
                    href={`/blog/category/${post.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className="text-2xs font-semibold uppercase tracking-widest text-crimson hover:text-crimson/80 transition-colors"
                  >
                    {post.category}
                  </Link>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone leading-tight mb-4">
                  {post.title}
                </h1>
                <p className="text-base text-stone-muted leading-relaxed max-w-2xl mb-5">
                  {post.description}
                </p>
                <AuthorBox
                  date={post.date}
                  updated={post.updated}
                  readingTime={post.readingTime}
                  authorSlug={post.author}
                />
                {affiliateProviders.length > 0 && (
                  <AffiliateDisclosure providers={affiliateProviders} className="mt-4" />
                )}
              </header>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-8">
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      href={`/blog/tag/${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-white/[0.08] text-stone-subtle hover:text-stone hover:border-white/[0.15] transition-all"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Mobile TOC */}
              {toc.length > 2 && (
                <div className="lg:hidden mb-8">
                  <TableOfContents entries={toc} />
                </div>
              )}

              {/* MDX Content */}
              <div className="prose prose-invert prose-sm sm:prose-base max-w-none
                prose-headings:font-serif prose-headings:text-stone prose-headings:font-semibold
                prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:scroll-mt-24
                prose-h3:text-lg prose-h3:mt-7 prose-h3:mb-3 prose-h3:scroll-mt-24
                prose-p:text-stone-muted prose-p:leading-relaxed
                prose-strong:text-stone prose-strong:font-semibold
                prose-a:text-crimson prose-a:no-underline hover:prose-a:underline
                prose-ul:text-stone-muted prose-ol:text-stone-muted
                prose-li:leading-relaxed prose-li:my-1
                prose-blockquote:border-l-crimson prose-blockquote:text-stone-subtle prose-blockquote:not-italic
                prose-code:text-crimson prose-code:bg-ink-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal
                prose-hr:border-white/[0.07]
                prose-table:text-sm prose-thead:text-stone prose-tbody:text-stone-muted
                prose-th:border-white/[0.1] prose-td:border-white/[0.06]">
                <MDXRemote
                  source={linkedContent}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                    },
                  }}
                  components={{ ...MDX_COMPONENTS, ...makeAffiliateMdxComponents(inlineAffiliates) }}
                />
              </div>

              <FurtherReading
                products={sectionAffiliates}
                placement="article-end"
                note={pageAffiliates.note}
                headingAs="h2"
                className="mt-10"
              />

              <ShareButtons title={post.title} url={postUrl} />

              {/* FAQs */}
              {post.faqs && post.faqs.length > 0 && <FAQ faqs={post.faqs} />}

              {/* Related podcasts */}
              {relatedPodcastData.length > 0 && (
                <section className="mt-12">
                  <h2 className="font-serif text-xl font-semibold text-stone mb-5">
                    Podcasts mentioned in this article
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {relatedPodcastData.map((pod: any) => (
                      <PodcastCard key={pod.slug} podcast={pod} />
                    ))}
                  </div>
                </section>
              )}

              {/* Newsletter */}
              <div className="mt-12 rounded-xl border border-crimson/20 bg-crimson/[0.04] p-6">
                <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-2">
                  Newsletter
                </p>
                <h3 className="text-lg font-serif font-semibold text-stone mb-1">
                  Your weekly true crime briefing
                </h3>
                <p className="text-sm text-stone-muted mb-4">
                  New podcast reviews, hidden gems, and community picks. No filler.
                </p>
                <NewsletterForm source="blog-post" />
              </div>

              {/* Related posts */}
              <RelatedPosts posts={related} />
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block space-y-6 sticky top-24 self-start">
              {toc.length > 2 && <TableOfContents entries={toc} />}

              <div className="rounded-xl border border-white/[0.07] bg-ink-800/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-4">
                  Browse Podcasts
                </p>
                <ul className="space-y-2.5">
                  {[
                    { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
                    { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
                    { href: '/category/investigative', label: 'Investigative Podcasts' },
                    { href: '/country/UK', label: 'British True Crime' },
                    { href: '/country/AU', label: 'Australian True Crime' },
                    { href: '/browse', label: 'Browse All' },
                  ].map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-stone-subtle hover:text-stone transition-colors"
                      >
                        → {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
