// Existing slider copy. These panels are delivered in HTML and revealed by the
// same controls for every visitor, including visitors without a rendering bot.
export const lifeScenes = [
  ['harvest', '01 / GARDEN', '오늘은 무얼 수확할까?', '씨앗을 심고 물을 줘서 작물을 길러요. 텃밭을 넓히면 더 많이 심을 수 있어요.'],
  ['cooking', '02 / COOKING', '뭘 만들어 줄까?', '수확한 재료로 요리를 만들어 리티에게 줘보세요. 어떤 음식을 좋아할까요?'],
  ['home', '03 / OUR HOME', '직접 만들어 꾸미는 집', '재료를 모아 가구를 만들고 원하는 곳에 놓아요. 집을 넓혀 더 많은 가구를 배치할 수도 있어요.'],
  ["fishing-friends","04 / FISHING","호숫가에서 낚시하는 날","리티와 함께 커다란 물고기를 낚았어요."],
  ["village-friends","05 / VILLAGE","마을에서 만나는 친구들","햇살 가득한 광장에서 새로운 친구와 인사해요."],
] as const

export function lifePanelsMarkup() {
  return lifeScenes.map(([scene, number, title, description], index) => {
    const active = index === 0
    return `<div class="life-panel-copy" data-life-copy="${scene}"${active ? '' : ' hidden'} aria-live="polite" aria-atomic="true"><span${active ? ' id="life-number"' : ''}>${number}</span><h3${active ? ' id="life-title"' : ''}>${title}</h3><p${active ? ' id="life-description"' : ''}>${description}</p></div>`
  }).join('')
}
