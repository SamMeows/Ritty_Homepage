# 리티 광고 랜딩 운영

## 주소

- `/`: 기존 공식 홈페이지. 광고 랜딩으로 이동하는 메뉴는 추가하지 않음.
- `/ad/talking-cat`: 현재 시안, 대화 중심 첫 화면.
- `/ad/cozy-life`: 생활 중심 첫 화면. 나머지 구성과 신청 폼은 동일.
- `/en`: 현재 한국어 홈페이지와 같은 구성의 영문 홈페이지. 캐릭터·생활 장면과 사전등록 UI를 영어로 제공하며, 소식 글 본문은 한국어로 표시한다.

광고 페이지는 noindex이며 사이트맵에 포함하지 않는다. 자동 무작위 배정은 하지 않는다. 광고 관리자에서 각 시안 URL로 트래픽을 분배한다. 첫 화면의 이미지와 카피를 함께 비교하는 시안 테스트이며 개별 요소의 효과를 분리하는 실험은 아니다.

배포 후 광고 URL 예시:

```
https://ritty.sam-meows.com/ad/talking-cat?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch_test&utm_content=video_a
https://ritty.sam-meows.com/ad/cozy-life?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch_test&utm_content=video_a
```

같은 광고 소재로 랜딩만 비교하려면 `utm_content`는 같게 유지한다. 광고 소재를 바꿀 때는 `utm_content`를 다르게 지정한다. 시안은 URL 경로로 자동 식별한다. UTM 값에 이메일 등 개인정보를 넣지 않는다.

## 신청 및 유입 정보

기존 `/api/pre-register`와 기존 Notion DB를 재사용한다. Vercel의 `NOTION_TOKEN`, `NOTION_PRE_REGISTER_DB_ID`를 그대로 사용한다. 토큰은 클라이언트에 전달하지 않는다.

기존 열 `UTM Source`, `UTM Medium`, `UTM Campaign`은 그대로 채운다. 신청자 페이지 본문에 시안, 진입 경로, 유입 도메인, UTM source/medium/campaign/content/term을 함께 남긴다. 원본 쿼리 문자열과 referrer의 경로·쿼리는 저장하지 않는다.

DB에 아래 **텍스트** 열이 존재하면 표에서도 필터/그룹화할 수 있도록 자동으로 채운다. 없어도 본문 저장은 동작한다. 이 작업에서 실제 DB 열은 변경하지 않았다.

| 열 | 값 |
|---|---|
| Landing Variant | talking-cat / cozy-life / main |
| Landing Path | 유입 페이지 경로 |
| UTM Content | 광고 소재 이름 |
| UTM Term | 광고 키워드 |
| Referrer | 직전 사이트 도메인 |

유입 정보는 sessionStorage에 저장한다. 같은 탭에서 내부 페이지를 이동해도 유지하며, 다른 광고 시안 또는 새로운 UTM 링크로 들어오면 교체한다. 저장소를 사용할 수 없으면 현재 URL 정보만 사용한다. 브라우저 종료 후 재방문까지 연결하는 사용자 추적은 하지 않는다.

동일 이메일 재신청은 기존 행을 덮어쓰지 않고 duplicate로 처리한다. GA4 `generate_lead`는 신규 신청에서만 전송하고 `landing_variant`, `landing_path`, UTM 정보를 포함한다. 방문 수는 GA4의 기존 page_view를 페이지 경로로 구분한다. GA4에서 추가 매개변수를 보고서에 쓰려면 이벤트 범위 맞춤 측정기준을 등록한다. Notion 신청 건수만으로 방문 대비 전환율을 계산할 수는 없다.

## 새 시안과 배포

`lib/ad-variants.ts`에 새로운 slug·제목·설명·이미지를 추가하면 `/ad/<slug>`로 열린다. 현재는 첫 화면을 비교하며, 섹션 구성이 다른 실험은 광고 페이지 템플릿에서 분기한다.

기존 Vercel 프로젝트로 이 소스를 배포해야 위 주소가 운영 사이트에 생긴다. `chatgpt.site`의 비공개 정적 디자인 미리보기는 운영 API와 별개이며 광고 집행 주소로 쓰지 않는다.

검증 명령:

```
node scripts/check-ad-registration.cjs
npm run build
```

API 검증은 가짜 Notion 응답으로 실행하며 실제 신청자 행을 만들지 않는다. 운영 배포 후 실제 DB 저장 확인은 별도로 필요하다.

## 리티 소식 (새 Notion DB)

- 기존 공지를 사용하지 않는다. 사용자가 새 DB를 만든 후 연결한다. 설정 전에는 빈 목록을 표시한다.
- 속성: 제목(제목), 분류(선택: 공지사항/패치노트/팀 레터), 게시일(날짜), 공개(체크박스). 본문은 각 항목 페이지에 작성한다.
- 공개 체크 + 게시일이 오늘 또는 과거인 글만 목록/상세에 표시한다.
- Vercel의 NOTION_NEWS_DATA_SOURCE_ID에 새 data source ID를 설정하고 기존 integration에 DB 읽기 권한을 준다. 신청자 DB와 별개다.
- 기존 NOTION_TOKEN 또는 별도 NOTION_NEWS_TOKEN을 서버에서만 사용한다.
- /news 목록, /news/<글 ID> 본문과 광고 페이지에 표시한다. Notion으로 이동하지 않는다.
- 검증: node scripts/check-news.cjs. 실제 DB 연결 확인은 새 DB 생성 및 설정 후 진행한다.
