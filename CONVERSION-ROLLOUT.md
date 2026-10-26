# 해외 사전예약 전환 개선

작성: 2026-10-26 (KST). 코드 수정 완료, **미배포**. 배포 시각·커밋과 운영 검증 결과는 배포 시 기록할 것.

## 적용 내용

- 핵심 게임 소개 소식의 영문·일문 번역. 모든 본문 텍스트가 번역 원문과 일치할 때만 번역하고, 미번역 문장이 생기면 전체 본문을 한국어 원문으로 표시한다. 다른 소식도 원문 언어를 명시한다.
- 소식 카드·본문 API·일반 기사 링크에 언어 유지. 서버 미리보기와 클라이언트 카드에 동일한 제목·원문 표시 사용.
- 폼/푸터 개인정보 링크를 언어별 사전예약 안내(`/en/privacy`, `/ja/privacy`, 국문 `/kr/privacy`)로 통일. 안내 버전 `2026-10-26-v1`, DB 동의 버전 `2026-10-26-registration-v1`.
- 분석·선택적 유입정보 수집 오류가 신청을 막지 않도록 격리. 서버 응답으로 성공/중복 판단. 재진입 제출 방지, 타임아웃, finally에서 신청 중 상태 해제.

## 정책 내용 확인 결과와 남은 작업

기존 국문 개인정보처리방침(표시일 2026-10-12)에는 사전예약 수집 항목, 출시·소프트 런칭/사전예약 보상 안내 목적, 1년 보관, 미국 소재 Notion/Vercel 위탁 부록이 있다. 기존 영문(표시일 2026-02-21)에는 그 부록이 없고, 권리·국외 이전·아동 연령 등 본문도 다르다. 정책 모음에서 일본어 전체 서비스 방침은 확인하지 못했다.

이번 변경은 국문 사전예약 부록과 기존 폼의 수집·성과분석 안내를 바탕으로 **사전예약 안내를 현지화**했다. 앱까지 포함하는 전체 정책을 동등한 문서라고 표시하거나 덮어쓰지 않았다. 안내 하단에서 기존 전체 정책의 언어를 명시한다. **전체 서비스 정책의 국문/영문 정합성 및 일본어 전체 번역은 미해결**이다.

국문 원문: https://project-meow.notion.site/1bd423ba89b680f4b37dcb1ec02aa36c
기존 영문: https://project-meow.notion.site/Privacy-Policy-1be423ba89b680218e81d5956212eade

## 이벤트 계약

공통 필드: `page_language`(기존 `language` 유지), `landing_variant`, `landing_path`, `cta_copy_variant`, `funnel_version=2026-10-26-v1`, 기존 UTM 필드. variant는 현재 페이지 경로에서 결정하며 소재 `utm_content`와 독립적이다. GA 기본 세션으로 순서를 연결한다. 이메일·동의 입력값·기사 제목/본문·오류 원문·쿼리 포함 전체 URL은 커스텀 이벤트에 보내지 않는다.

| 행동 | 이벤트 | 추가 필드 |
| --- | --- | --- |
| 랜딩 표시 | landing_view (유지) | — |
| 소식 보드 10% 이상 노출 | news_section_view | 마운트당 1회 |
| 기사 카드에서 팝업 열기 | news_card_click | article_id |
| 본문 데이터 로드 성공/실패 | news_load_success / news_load_error | article_id, 취소 요청 제외 |
| 신청 CTA | pre_register_open (유지) | source, 직접 신청 링크는 link |
| 첫 실제 입력 변경 | pre_register_start (유지) | form, 자동 포커스 제외 |
| 검증 통과 후 제출 | pre_register_submit (유지) | form |
| 신규/중복 응답 또는 요청 오류 | pre_register_result | form, status=created/duplicate/error |
| 신규 등록 전환 | generate_lead (유지) | 신규만, platform |
| 중복 등록 | pre_register_duplicate (유지) | form |
| 검증/요청 오류 | pre_register_error (유지) | form, 고정 reason |
| 완료 화면 렌더링 | pre_register_complete_view | form, status=created/duplicate |

result는 브라우저가 받은 결과이며 서버에서 GA로 별도 전송하는 이벤트가 아니다. 응답 유실 시 DB 저장 여부는 GA만으로 확정할 수 없다. generate_lead만 신규 전환으로 사용하고 중복/완료 화면을 추가 전환으로 지정하지 않는다. 본문 성공 이벤트는 데이터 로드이며 이미지 로드·완독을 의미하지 않는다.

## CTA 실험

기본은 `cta_copy_variant=original`. `/ja?cta_copy=launch-email-v1` 또는 `/en?cta_copy=launch-email-v1`에서만 설명 문구 적용. 랜덤 배정이나 광고 링크 변경은 하지 않았다. landing variant와 UTM은 유지한다.

일본어 본문 CTA: `事前登録して、配信のお知らせを受け取る`. 좁은 헤더는 `配信通知を受け取る`. 이메일로 출시·소프트 런칭 및 사전예약 관련 소식을 받는다고 설명한다. 출시일·일본어 지원 확정·보상 지급·광고 없음 약속은 추가하지 않았다. 새 게임 화면을 생성하거나 실제 구현 화면이라고 추가하지 않았다.

## 검증 결과

타입 검사·프로덕션 빌드·기존 뉴스/현지화/등록 API 검사를 통과했다. 등록 API 검사에는 분석 예외, 저장소 차단 시 테스트 모드, 언어별 variant, 번역 및 원문 변경 fallback, DB 테스트 표식 검증을 추가했다.

`check-registration-offline.cjs`: 실제 React 신청 폼/Provider를 서버 없이 Chrome에서 실행. 영어·일본어의 잘못된 이메일, 동의 누락, 신규/중복/서버 오류, 분석 예외, 정상 이벤트별 1회, 이메일 미전송 검증 통과. API와 이미지 컴포넌트 등 외부 의존성을 모의 처리했다. 전체 사이트 디자인·실제 DB·실기기 검증을 대신하지 않는다.

`check-registration-funnel.cjs`: localhost:3017 개발 서버 대상 통합 검사. 현재 환경 네트워크 제한으로 **미완료**. Playwright는 설치된 모듈, PLAYWRIGHT_MODULE 또는 CODEX_PRIMARY_RUNTIME_NODE_MODULES에서 불러온다.

## 배포 전 남은 검증

- iOS Safari / Android Chrome / 인스타 인앱 브라우저에서 키보드, 스크롤, 일본어 줄바꿈, 검증 오류 접근성 확인.
- 새 브라우저 세션에서 `?registration_test=1`로 접속. 테스트 표식은 세션 저장소에 유지되고 커스텀 GA 이벤트 및 GA 설정 수집을 끈다. 저장소 차단 환경에서는 다음 페이지에도 쿼리를 유지할 것.
- 실제 제출 건은 DB `UTM Source=internal_test`, `UTM Campaign=registration_qa`, 본문 `registration_test: true`로 구분한다. 운영 집계·메일 발송에서 제외한다. 새 테스트 주소 사용.
- 실제 신규 저장 후 DB 존재 확인, 같은 이메일 재제출 시 중복 표시·추가 행 미생성 확인. 서버 장애는 QA 환경에서 모의 처리한다. **실제 DB 테스트 제출은 아직 실행하지 않았다.**
- 배포 시 KST 시각·커밋·변경 묶음·CTA 실험 사용 여부 기록. 운영 배포는 미실행.

## 비교 방법

GA 탐색용 커스텀 측정기준: page_language, landing_variant, cta_copy_variant, funnel_version, article_id, form, status, source. 설정 이전 데이터로 소급되지 않는다.

- CTA 진입률: CTA 이벤트가 있는 세션 / 랜딩 세션. source=link 직접 진입은 별도 분리.
- 폼 시작 후 신규 완료율: 시작 이후 generate_lead가 있는 세션 / 폼 시작 세션. 중복 등록 별도 집계.
- 소식 흐름: 같은 GA 세션의 news_load_success → pre_register_start → generate_lead 순서 탐색. 인과효과와 구분.
- 같은 언어·variant·CTA 실험군·기간끼리 비교. 광고·예산·타깃·소재 동시 변경을 피한다. 이번 수정은 묶음이므로 번역 단독 효과라고 해석하지 않는다.
