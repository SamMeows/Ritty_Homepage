'use client'
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="p-12 text-center"><h1>소식을 불러오지 못했어요.</h1><p>잠시 후 다시 시도해 주세요.</p><button onClick={reset}>다시 시도</button><p><a href="/news">소식 목록으로</a></p></main>}
