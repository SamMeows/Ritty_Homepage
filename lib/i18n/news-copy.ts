import type { Locale } from './dictionaries'

const english: Record<string, string> = {
  '전체': 'All',
  '공지사항': 'Announcements',
  '개발 소식': 'Development Updates',
  '팀 레터': 'From the Team',
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
const japanese: Record<string, string> = {
  '전체': 'すべて', '공지사항': 'お知らせ', '개발 소식': '開発便り', '팀 레터': '運営だより', '소식 분류': 'お知らせのカテゴリ',
  '읽어보기 →': '続きを読む →', '이 분류의 최신 소식입니다.': 'このカテゴリのお知らせは以上です。', '소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.': 'お知らせを読み込めませんでした。しばらくしてから再度お試しください。',
  '등록된 소식이 아직 없어요.': 'お知らせはまだありません。', '불러오는 중…': '読み込み中…', '다시 시도': '再試行', '소식 더 보기 ↓': 'もっと見る ↓',
  '소식을 불러오지 못했어요. 다시 시도해 주세요.': 'お知らせを読み込めませんでした。もう一度お試しください。', '이 소식은 공개되지 않았거나 삭제되었어요.': 'この記事は非公開または削除されています。',
  '소식을 불러오지 못했어요.': 'お知らせを読み込めませんでした。', '리티 소식': 'Rittyのお知らせ', 'Ritty 소식': 'Rittyのお知らせ', '소식 닫기': 'お知らせを閉じる', '다시 불러오기': '再読み込み', '소식을 불러오는 중이에요…': 'お知らせを読み込んでいます…',
}
const traditionalChinese: Record<string, string> = {
  '전체': '全部', '공지사항': '公告', '개발 소식': '開發消息', '팀 레터': '營運團隊來信', '소식 분류': '消息分類',
  '읽어보기 →': '閱讀更多 →', '이 분류의 최신 소식입니다.': '目前沒有更多這個分類的消息了。', '소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.': '無法載入消息，請稍後再試。',
  '등록된 소식이 아직 없어요.': '目前還沒有消息，請稍後再來看看。', '불러오는 중…': '載入中…', '다시 시도': '再試一次', '소식 더 보기 ↓': '查看更多 ↓',
  '소식을 불러오지 못했어요. 다시 시도해 주세요.': '無法載入消息，請再試一次。', '이 소식은 공개되지 않았거나 삭제되었어요.': '這篇文章尚未公開或已經刪除。',
  '소식을 불러오지 못했어요.': '無法載入消息。', '리티 소식': 'Ritty 最新消息', 'Ritty 소식': 'Ritty 最新消息', '소식 닫기': '關閉消息', '다시 불러오기': '重新載入', '소식을 불러오는 중이에요…': '正在載入消息…',
}

export const newsCopy = (locale: Locale, text: string) => locale === 'en' ? english[text] || text : locale === 'ja' ? japanese[text] || text : locale === 'zh-tw' ? traditionalChinese[text] || text : text
