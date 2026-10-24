export const adVariants = {
  'talking-cat': {
    title: "내 이야기를 들어주는<br>나만의 고양이 친구",
    image: 'hero-island-v3',
    mobileImage: 'hero-island-mobile-v3',
    alt: '별똥별이 내려오는 섬에서 앞걸음을 내딛는 회색 리티, 몸을 낮춘 주황 리티와 장난치는 삼색 리티',
  },
  'cozy-life': {
    title: '어느 날 갑자기<br>하늘에서 고양이가 떨어졌다!',
    image: 'hero-island-v3',
    mobileImage: 'hero-island-mobile-v3',
    alt: '별똥별이 내려오는 섬에서 앞걸음을 내딛는 회색 리티, 몸을 낮춘 주황 리티와 장난치는 삼색 리티',
  },
} as const

export type AdVariant = keyof typeof adVariants
export function isAdVariant(value: string): value is AdVariant {
  return Object.prototype.hasOwnProperty.call(adVariants, value)
}
