export const adVariants = {
  'talking-cat': {
    title: '오늘은 리티랑<br>뭐 하고 놀까?',
    description: '밥도 해주고, 집도 꾸며주고.<br>오늘 한 일로 고양이와 수다도 떨어요.',
    image: 'hero',
    alt: '나와 눈을 맞추는 회색 리티',
  },
  'cozy-life': {
    title: '오늘은 리티랑<br>뭐 하고 놀까?',
    description: '텃밭을 가꾸고, 요리하고, 집을 넓혀요.<br>같이 사는 리티와 이야기도 나누고요.',
    image: 'home',
    alt: '가구를 만드는 곁에서 부품을 살피는 회색 리티',
  },
} as const

export type AdVariant = keyof typeof adVariants
export function isAdVariant(value: string): value is AdVariant {
  return Object.prototype.hasOwnProperty.call(adVariants, value)
}
