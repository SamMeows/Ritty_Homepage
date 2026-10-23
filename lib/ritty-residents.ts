// Public introductions adapted from the supplied character planning sheet.
// Artwork mapped by profession from the seven user-supplied illustrations.
export const rittyResidents = [
  { name: '리티', role: '탐사선 통신관', personality: 'ENFJ', likes: '노래 · 춤 · 물고기', art: 'explorer',
    story: '멀리 떨어진 탐사원들의 사연과 신청곡을 받아 라디오를 진행하던 통신관. 지구에서 보고 먹고 겪은 일을 모아, 고양이별에 들려줄 방송을 만들고 싶어 해요.', quote: '여기는 지구, 들리나요?' },
  { name: '코코', role: '천문학자', personality: 'INFP', likes: '별 보기 · 독서 · 야채', art: 'astronomer',
    story: '시골에서 별을 보며 자라, 수도 천문대의 천문학자가 된 코코. 푸르게 빛나는 지구를 처음 발견했어요. 망원경 너머로만 보던 세상을 직접 만나러 왔답니다.', quote: null },
  { name: '레오', role: '생활기기 수리점 주인', personality: 'ISTP', likes: '디저트 · 산책', art: 'repair',
    story: '고양이별 골목의 작은 수리점을 지키던 솜씨 좋은 수리공. 말은 짧아도 고장 난 물건은 그냥 지나치지 못해요. 무뚝뚝한 얼굴로 달콤한 디저트를 찾는답니다.', quote: '출장 수리. 기간 미정.' },
  { name: null, role: '꽃집 사장', personality: 'ESFP', likes: '낮잠 · 꽃 · 물고기', art: 'florist',
    story: '작은 골목 꽃집을 운영했어요. 꽃을 받아 가는 손님의 환한 표정이 좋아서요. 늘 밝고 다정하지만, 자기만의 단단한 기준도 가지고 있어요.', quote: null },
  { name: null, role: '전직 대표 운동선수', personality: 'ENTP', likes: '구기종목 · 게임 · 고기', art: 'athlete',
    story: '고양이별을 대표하던 운동선수. 부상으로 쉬는 동안 게임의 공략과 기록 경쟁에 푹 빠졌어요. 얼떨결에 지원한 탐사에서 지구까지 오게 됐답니다.', quote: null },
  { name: null, role: '패션 디자이너', personality: 'ENFP', likes: '패션 · 외모 가꾸기', art: 'designer',
    story: '예쁜 옷과 칭찬을 좋아하는 디자이너. 평소엔 애교가 많아도 디자인을 이야기할 땐 누구보다 진지해요. 지구에서는 아직 옷을 만들지 못하고 있답니다.', quote: null },
  { name: null, role: '작사가', personality: 'INFJ', likes: '요리 · 음악 · 영화', art: 'lyricist',
    story: '평범한 대화와 일상에서 노랫말을 찾던 작사가. 좋아하는 음식을 기억해 주고, 함께 음악 듣는 시간을 즐겨요. 다정한 말 사이에 자기만의 취향과 고집도 숨어 있어요.', quote: null },
  { name: null, role: '새로운 리티', personality: null, likes: null, art: null,
    story: '고양이별에서 또 어떤 리티가 찾아올까요?', quote: null, upcoming: true },
]

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function residentChapter() {
  const first = rittyResidents[0]
  const facePositions: Record<string,string> = {explorer:'44% 20%',astronomer:'53% 43%',repair:'40% 10%',florist:'61% 30%',athlete:'68% 40%',designer:'66% 21%',lyricist:'43% 41%'}
  const tabs = rittyResidents.map((cat, index) => {
    const label = cat.name || cat.role
    const face = cat.art ? `<span class="resident-face-art" style="background-image:url('/ritty/residents/${cat.art}-cutout.webp');background-position:${facePositions[cat.art]}"></span>` : `<span class="resident-silhouette" aria-hidden="true">${index === 7 ? '?' : ''}</span>`
    return `<button type="button" role="tab" id="cat-tab-${index}" aria-controls="cat-profile" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-cat="${index}" ${index >= 4 ? 'hidden' : ''} aria-label="${escapeHtml(label)}"><span class="cat-tab-face">${face}</span><span>${escapeHtml(label)}</span></button>`
  }).join('')
  return `<section class="cat-world" id="meet-ritty" aria-labelledby="meet-ritty-title"><div class="cat-world-heading"><p class="eyebrow">FROM THE CAT PLANET</p><h2 id="meet-ritty-title">고양이별에서 찾아온<br><em>다양한 리티들을 만나봐!</em></h2></div><div class="cat-profile" id="cat-profile" role="tabpanel" aria-labelledby="cat-tab-0" tabindex="0"><div class="cat-profile-copy"><h3 id="cat-name">${first.name}</h3><p class="cat-trait" id="cat-trait">${first.role} · ${first.personality}</p><div class="cat-story" tabindex="0" role="region" aria-label="리티 이야기"><span id="cat-likes">좋아하는 것: ${first.likes}</span><p id="cat-story">${first.story}</p><p class="resident-quote" id="cat-quote">“${first.quote}”</p></div><div class="resident-selector"><button class="resident-arrow" type="button" data-cat-step="-1" aria-controls="cat-profile" aria-label="이전 리티">‹</button><div class="cat-select" role="tablist" aria-label="만나보고 싶은 리티">${tabs}</div><button class="resident-arrow" type="button" data-cat-step="1" aria-controls="cat-profile" aria-label="다음 리티">›</button></div><span class="resident-status" id="resident-status" role="status" aria-live="polite" aria-atomic="true">리티</span></div><div class="cat-portrait-stage"><span class="cat-orbit-star" aria-hidden="true">✦</span><div class="cat-portrait-crop resident-illustration"><img id="cat-portrait" src="/ritty/residents/explorer-cutout.webp" alt="탐사선 통신관 리티 일러스트" width="1200" height="1200"><div id="cat-unknown" class="resident-unknown" hidden aria-label="외형 준비 중"><span class="resident-silhouette" aria-hidden="true"></span><span id="cat-unknown-label">어떤 모습일까요?</span></div></div><span class="cat-planet-label" aria-hidden="true">HELLO, RITTY!</span></div></div><script type="application/json" id="resident-data">${JSON.stringify(rittyResidents).replace(/</g, '\\u003c')}</script></section>`
}
