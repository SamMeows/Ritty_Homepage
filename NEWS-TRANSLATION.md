# 소식 관리: Notion 언어별 페이지

현재 운영 구조는 `NEWS-LOCALIZATION.md`를 따른다. 이전 웹 관리자·OpenAI 번역 방식은 폐기했다.

- 한국어·영어·일본어 각각 별도의 Notion 페이지 ID를 사용한다.
- 번역 생성·수정·검수·공개 여부는 Notion에서 관리한다.
- 홈페이지는 공개된 페이지와 번역 관계를 읽기만 한다.
- `/admin/news`는 404, 이전 `/api/admin/news` 및 번역 POST API는 410이다. 관리자 키·OpenAI 키가 필요하지 않다.
- 예전 번역 JSON 하위 페이지와 Translation Titles 속성은 읽거나 수정하지 않는다. 기존 Notion 데이터는 삭제하지 않았다.
- 이전 코드 기반 번역 테스트는 폐기된 API 검증으로 바꿨다. 현재 소식 검증은 `node scripts/check-news-locales.cjs`로 실행한다.
