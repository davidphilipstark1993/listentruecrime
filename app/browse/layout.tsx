// Metadata now lives in page.tsx's generateMetadata — it needs to vary
// per-request (robots noindex on filtered/sorted views, see hasNonPageParams
// there), which a static layout export can't do.
export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
