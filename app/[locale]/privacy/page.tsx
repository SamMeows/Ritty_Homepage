import { notFound } from 'next/navigation'
import { registrationPrivacy } from '@/lib/i18n/registration-privacy'
export const metadata = { title: 'Ritty | Pre-registration privacy', robots: { index: false, follow: true }, alternates: { canonical: null, languages: {} } }
export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (locale !== 'kr' && locale !== 'en' && locale !== 'ja') notFound()
  const t = registrationPrivacy[locale]
  const full = locale === 'en' ? 'https://project-meow.notion.site/Privacy-Policy-1be423ba89b680218e81d5956212eade' : 'https://project-meow.notion.site/1bd423ba89b680f4b37dcb1ec02aa36c'
  return <main lang={locale === 'kr' ? 'ko' : locale} style={{maxWidth:760,margin:'0 auto',padding:'40px 24px',lineHeight:1.9,overflowWrap:'anywhere'}}>
    <a href={locale === 'kr' ? '/' : '/' + locale}>{t.home}</a><h1 style={{fontSize:28,marginTop:24}}>{t.title}</h1><p>{t.version}</p><p>{t.intro}</p>
    {t.sections.map(([title,body]) => <section key={title} style={{marginTop:24}}><h2 style={{fontSize:20}}>{title}</h2><p>{body}</p></section>)}
    <hr style={{margin:'32px 0'}}/><p>{t.scope}</p><a href={full} target="_blank" rel="noopener noreferrer">{t.full}</a>
  </main>
}
