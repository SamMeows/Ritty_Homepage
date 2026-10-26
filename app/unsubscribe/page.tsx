import type { Metadata } from 'next'
import UnsubscribeForm from './unsubscribe-form'
export const metadata: Metadata = { title: 'Ritty | Email preferences', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function UnsubscribePage() { return <UnsubscribeForm /> }
