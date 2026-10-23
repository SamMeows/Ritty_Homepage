'use client'
import { useEffect, useRef } from 'react'

export default function PreviewRegistration({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    return () => previous?.focus()
  }, [])
  return <dialog ref={dialog} onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose() }} className="m-auto w-[calc(100%-32px)] max-w-lg rounded-3xl border border-white/40 bg-[#564596] p-7 text-white shadow-2xl backdrop:bg-black/60 font-paperlogy">
    <button onClick={onClose} autoFocus aria-label="닫기" className="absolute right-5 top-4 text-3xl">×</button>
    <p className="text-sm text-purple-200 mb-4">사전등록 미리보기</p>
    <h2 className="text-3xl font-extrabold mb-4">우리의 첫날을 기다려요</h2>
    <p className="leading-relaxed text-white/85">말하는 고양이와 함께 살아갈 새로운 하루.<br />출시 소식을 전할 준비를 하고 있어요.</p>
    <label className="block mt-6 mb-2" htmlFor="preview-email">이메일 주소</label>
    <input id="preview-email" disabled value="hello@example.com" className="w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white/70" />
    <fieldset className="mt-4 flex gap-6"><legend className="mb-2">사용 기기</legend><label><input type="radio" name="device-preview" defaultChecked /> iOS</label><label><input type="radio" name="device-preview" /> Android</label></fieldset>
    <p className="mt-5 text-sm leading-relaxed text-white/75">현재는 디자인 미리보기로 이메일을 수집하거나 신청을 접수하지 않습니다. 출시일·보상·베타 일정은 추후 안내합니다.</p>
    <button onClick={onClose} className="mt-6 w-full rounded-2xl border border-white/60 bg-gradient-to-r from-purple-start to-purple-end py-3 font-bold">계속 둘러보기</button>
  </dialog>
}
