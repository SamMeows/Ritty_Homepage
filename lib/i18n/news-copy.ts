import type { Locale } from './dictionaries'

const english: Record<string, string> = {
  '전체': 'All',
  '공지사항': 'Announcements',
  '개발 소식': 'Development Updates',
  '팀 레터': 'Team Letters',
  '소식 분류': 'News categories',
  '읽어보기 →': 'Read more →',
  '이 분류의 최신 소식입니다.': 'You’re all caught up in this category.',
  '소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.': 'Could not load the news. Please try again shortly.',
  '등록된 소식이 아직 없어요.': 'No news just yet. Check back soon!',
  '불러오는 중…': 'Loading…',
  '다시 시도': 'Try again',
  '소식 더 보기 ↓': 'More news ↓',
  '소식을 불러오지 못했어요. 다시 시도해 주세요.': 'Could not load the news. Please try again.',
  '이 소식은 공개되지 않았거나 삭제되었어요.': 'This article is unavailable or has been removed.',
  '소식을 불러오지 못했어요.': 'Could not load the news.',
  '리티 소식': 'Ritty News',
  'Ritty 소식': 'Ritty News',
  '소식 닫기': 'Close news',
  '다시 불러오기': 'Reload',
  '소식을 불러오는 중이에요…': 'Loading the news…',
}

export const newsCopy = (locale: Locale, text: string) => locale === 'en' ? english[text] || text : text
