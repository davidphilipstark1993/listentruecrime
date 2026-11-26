import Image from 'next/image'

// In-article artwork. Sizes match what scripts/blog-art/generate.mjs renders,
// so next/image can reserve the space and there is no layout shift.
const SIZES = {
  cover: { width: 1600, height: 900 },
  scene: { width: 1600, height: 640 },
  banner: { width: 1600, height: 520 },
} as const

export function ArticleImage({
  src,
  alt,
  caption,
  variant = 'scene',
}: {
  src: string
  /** Use "" for purely decorative art (e.g. the shared section banners). */
  alt: string
  caption?: string
  variant?: keyof typeof SIZES
}) {
  const { width, height } = SIZES[variant]
  return (
    <figure className="not-prose my-8">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 760px, 100vw"
        className="w-full h-auto rounded-xl border border-white/[0.07]"
      />
      {caption && (
        <figcaption className="mt-2 text-xs text-stone-subtle text-center">{caption}</figcaption>
      )}
    </figure>
  )
}
