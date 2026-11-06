import type { Metadata } from 'next'
import { AdPreviewFrame } from './preview-frame'

// Rendered inside an iframe by the admin advert form so mobile/tablet
// breakpoints behave exactly as they do for visitors. It shows nothing
// unless the same-origin admin page posts it a draft, and contains no data.
export const metadata: Metadata = { title: 'Advert preview', robots: { index: false, follow: false } }

export default function AdPreviewPage() {
  return <AdPreviewFrame />
}
