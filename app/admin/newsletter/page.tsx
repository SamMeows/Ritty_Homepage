import type { Metadata } from 'next'
import NewsletterAdmin from '@/components/admin/NewsletterAdmin'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: '개발일지 메일 · Ritty',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default function NewsletterAdminPage() {
  return <NewsletterAdmin />
}
