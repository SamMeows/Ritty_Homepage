'use client'
import { useEffect, useState } from 'react'
const copy = {
 kr: ['개발 소식 수신 거부', '개발 소식·업데이트·이벤트 이메일 수신을 중단합니다. 사전예약과 출시·보상 안내는 유지됩니다.', '개발 소식 수신 중단하기', '수신 거부가 완료되었습니다.', '유효하지 않은 링크입니다. 메일의 링크를 다시 열어주세요.', '처리하지 못했습니다. 다시 시도하거나 contact@sam-meows.com으로 요청해 주세요.', '처리 중…'],
 en: ['Unsubscribe from development news', 'Stop development news, update and event emails. Your pre-registration and launch/reward notices remain active.', 'Unsubscribe from development news', 'You have been unsubscribed.', 'Invalid link. Reopen the link in your email.', 'Unable to save. Retry or contact contact@sam-meows.com.', 'Saving…'],
 ja: ['開発情報メールの配信停止', '開発情報・アップデート・イベントのメールを停止します。事前登録と配信開始・特典のご案内は維持されます。', '開発情報メールを停止する', '配信停止が完了しました。', '無効なリンクです。メール内のリンクを開き直してください。', '処理できませんでした。再試行するか contact@sam-meows.com へご連絡ください。', '処理中…'],
 'zh-tw': ['取消開發消息訂閱', '停止接收開發消息、更新及活動郵件。事前登錄與上線、獎勵通知將保留。', '取消開發消息訂閱', '已取消訂閱。', '連結無效，請重新開啟郵件中的連結。', '處理失敗，請重試或聯絡 contact@sam-meows.com。', '處理中…'],
} as const
export default function UnsubscribeForm() {
 const [locale, setLocale] = useState<keyof typeof copy>('kr')
 const [token, setToken] = useState('')
 const [status, setStatus] = useState('loading')
 useEffect(() => {
  const lang = new URLSearchParams(location.search).get('lang')
  if (lang && Object.prototype.hasOwnProperty.call(copy, lang)) setLocale(lang as keyof typeof copy)
  const value = location.hash.slice(1)
  setToken(value)
  setStatus(/^[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(value) ? 'ready' : 'invalid')
 }, [])
 const t = copy[locale]
 async function submit() {
  setStatus('saving')
  try {
   const response = await fetch('/api/marketing/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
   setStatus(response.ok ? 'done' : response.status === 400 ? 'invalid' : 'error')
   if (response.ok) history.replaceState(null, '', location.pathname + location.search)
  } catch { setStatus('error') }
 }
 return <main lang={locale === 'kr' ? 'ko' : locale} className="min-h-screen flex items-center justify-center bg-[#fff8f5] p-6 text-gray-900">
  <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
   <h1 className="text-2xl font-bold">{status === 'done' ? t[3] : t[0]}</h1>
   <p role="status" aria-live="polite" className="my-6 leading-relaxed">{status === 'invalid' ? t[4] : t[1]}</p>
   {status === 'error' && <p role="alert" className="mb-4 text-red-700">{t[5]}</p>}
   {['ready', 'saving', 'error'].includes(status) && <button onClick={submit} disabled={status === 'saving'} className="rounded-xl bg-[#ff7979] px-5 py-3 font-bold text-black disabled:opacity-50">{status === 'saving' ? t[6] : t[2]}</button>}
  </section>
 </main>
}
