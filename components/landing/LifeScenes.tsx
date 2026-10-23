'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import FloatingParticles from '@/components/effects/FloatingParticles'
import { usePreRegister } from '@/lib/contexts/PreRegisterContext'

const scenes = [
  { id: 'ritty-intro', art: 'harvest', title: ['쏙! 오늘의 수확을', '리티에게 보여줘요'], text: '씨앗을 심고, 물을 주고, 직접 수확해요.\n함께 가꾼 하루가 리티와의 이야기가 됩니다.', growth: '한 뼘씩 넓어지는 텃밭, 더 풍성해지는 우리 하루.', alt: '수확하는 손과 당근을 네 발로 서서 바라보는 회색 리티' },
  { id: 'cooking', art: 'cooking', title: ['내가 만든 한 끼,', '너와 나누는 기쁨'], text: '수확한 재료로 요리하고, 리티에게 건네보세요.\n직접 준비한 선물로 마음도 나누어요.', growth: '수확하고 → 요리하고 → 나누고', alt: '식탁에 자연스럽게 앉아 요리를 기다리는 회색 리티' },
  { id: 'our-home', art: 'home', title: ['하나씩 만들고,', '조금씩 우리다운 집'], text: '모은 재료로 가구를 만들고, 원하는 곳에 놓아요.\n새 가구를 살피는 리티도 우리 집 풍경의 일부예요.', growth: '아담하게 시작한 집을 넓히며, 함께 지낼 공간을 채워요.', alt: '가구를 만드는 손 옆에서 네 발 자세로 부품을 살피는 회색 리티' },
  { id: 'outside', art: 'fishing', title: ['가끔은 바람 따라,', '리티와 나들이'], text: '낚싯대를 드리우고 찌를 바라보는 시간.\n돌아오는 길에는 마을에도 잠깐 들러요.', growth: '바다에서 마을까지, 함께 보내는 하루.', alt: '부두에 네 발로 서서 낚시 찌를 살펴보는 회색 리티' },
]

export default function LifeScenes() {
  const { openPreRegister } = usePreRegister()
  return <>
    {scenes.map((scene, index) => <section key={scene.id} id={scene.id} className="relative min-h-screen snap-start overflow-hidden bg-[#564596] font-paperlogy text-white flex items-center justify-center px-6 pt-36 pb-28 lg:px-24">
      <FloatingParticles count={12} color="rgba(255,255,255,.4)" />
      <div className="absolute -top-20 -right-16 w-72 h-72 opacity-30 pointer-events-none"><Image src="/images/star-decoration.svg" alt="" fill /></div>
      <div className="absolute bottom-4 -left-12 w-52 h-52 opacity-20 pointer-events-none"><Image src="/images/star-decoration.svg" alt="" fill /></div>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} className="relative w-full max-w-6xl flex flex-col items-center text-center gap-5">
        <p className="text-sm tracking-[.15em] text-white/70">리티와 함께하는 하루 · 0{index + 1}</p>
        <h2 className="text-[clamp(28px,4vw,54px)] font-extrabold leading-snug">{scene.title[0]}<br />{scene.title[1]}</h2>
        <p className="whitespace-pre-line text-[clamp(15px,1.5vw,20px)] leading-relaxed text-white/90">{scene.text}</p>
        <figure className="relative w-full max-w-4xl overflow-hidden rounded-[24px] border-2 border-white/35 shadow-2xl">
          <img src={'/ritty/' + scene.art + '.webp'} alt={scene.alt} width="1672" height="941" loading="lazy" className="w-full h-auto" />
          <figcaption className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-[10px] sm:text-xs">콘셉트 아트 · 실제 플레이 화면 아님</figcaption>
        </figure>
        <p className="text-sm sm:text-base text-[#fffbc0] leading-relaxed">✦ {scene.growth}</p>
      </motion.div>
    </section>)}
    <section id="together" className="relative min-h-screen snap-start flex flex-col items-center justify-center gap-7 bg-[#423475] text-white text-center px-6 py-28 font-paperlogy">
      <FloatingParticles count={18} color="rgba(255,255,255,.4)" />
      <h2 className="relative text-3xl lg:text-5xl font-extrabold leading-snug">같이 보낸 하루가<br />우리의 이야기가 되니까</h2>
      <p className="relative text-base lg:text-xl leading-loose">오늘 거둔 채소, 새로 놓은 가구, 마음을 담은 선물.<br />함께한 일에서 리티와의 대화가 이어져요.<br />서로 다른 성격과 취향을 천천히 알아가세요.</p>
      <div className="relative flex gap-3 sm:gap-6 max-w-3xl">{['gray','orange','calico','white'].map((cat, i) => <img key={cat} src={'/ritty/cat-' + cat + '.webp'} alt={['회색 리티','치즈 리티','삼색 리티','흰색 리티'][i]} width="160" height="240" className="w-[20vw] max-w-40 rounded-3xl" />)}</div>
      <button onClick={() => openPreRegister('hero')} className="relative rounded-2xl border-2 border-white/70 bg-gradient-to-r from-purple-start to-purple-end px-12 py-4 text-xl font-extrabold shadow-lg">사전등록 안내</button>
      <p className="relative text-xs text-white/60 leading-relaxed">개발 중인 게임을 소개하는 콘셉트 시안입니다.<br />최종 화면과 콘텐츠는 달라질 수 있습니다.</p>
    </section>
  </>
}
