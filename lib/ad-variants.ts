export const adVariants = {
  'talking-cat': {
    title: "내 이야기를 들어주는<br>나만의 고양이 친구",
    image: 'winter-friends',
    mobileImage: 'winter-friends',
    alt: '별똥별이 내리는 겨울밤 눈길을 달리는 집사와 리티',
  },
  'cozy-life': {
    title: '어느 날 갑자기<br>하늘에서 고양이가 떨어졌다!',
    image: 'winter-friends',
    mobileImage: 'winter-friends',
    alt: '별똥별이 내리는 겨울밤 눈길을 달리는 집사와 리티',
  },
} as const

export type AdVariant = keyof typeof adVariants
export function isAdVariant(value: string): value is AdVariant {
  return Object.prototype.hasOwnProperty.call(adVariants, value)
}
