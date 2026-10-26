# 리티 단독 브랜드 검색 개선 — 2026-10-26

사용자 요청: 리티 단독 검색에서 리핀보다 잘 노출되도록 가능한 개선을 실행. 화면 유지.

## 실제 수행

1. Ritty_Homepage 원격 최신 다국어·보안 변경을 fast-forward로 반영한 뒤 검색 정보만 수정. 홈 게임을 VideoGame + MobileApplication으로 함께 명시하고, 기존 공식 App Store ID 6743311040 / Google Play 패키지 com.sammeows.ritty를 sameAs에 연결했다. 소식의 about도 같은 게임 ID와 분류를 사용. 설치 링크는 출시 단계에서만 제공하는 기존 동작을 유지했다. 평가·가격·허위 출시 정보는 추가하지 않았다.
2. Google Play Console의 com.sammeows.ritty > 스토어 설정 > 연락처 세부정보 웹사이트를 `https://www.sam-meows.com/`에서 `https://ritty.sam-meows.com/`로 변경. 저장 및 출시 후 '변경사항 게시됨' 확인. 이메일·전화·앱 버전·배포 트랙·스토어 소개 문구·마케팅 옵션은 변경하지 않음. 공개 스토어 갱신은 보통 1시간, 더 걸릴 수도 있다는 UI 안내 확인.
3. 회사 홈페이지 소스 `C:/Users/csj09/Projects/sammeows_homepage` 확인. 제품의 공식 홈페이지 버튼은 JS window.open으로 옛 ritty.me를 열고 있어 서버 HTML에 링크가 없었다. 공식 홈페이지·Android·iOS 버튼을 같은 클래스와 애니메이션의 motion.a/href로 교체. 공식 홈페이지는 현재 주소로 직접 연결하고 접근성 이름은 '리티 (Ritty) 공식 홈페이지'. 화면 텍스트·디자인·회사 소개는 유지.

## 검증

- 리티 SEO·소식·다국어·서버 HTML 검사 통과. preregister/store 두 단계와 4개 언어에서 게임 식별 참조 및 설치 링크 구분을 검사.
- 리티 Next.js 16.4.1 운영 빌드 통과. 최신 잠금파일과 의존성을 맞춤. Windows의 잠긴 선택적 바이너리로 npm ci가 실패했으나 npm install --ignore-scripts로 복구 완료, 잠금파일 변경 없음. 무관한 프로세스 종료 없음.
- 리티 커밋 87641c6 운영 배포 완료. `node scripts/check-seo.cjs https://ritty.sam-meows.com` 통과.
- 회사 홈페이지 Next.js 운영 빌드 통과, 커밋 ccea71f 운영 배포 완료. 원격의 최신 app-ads.txt 변경을 보존. 서버 HTML에 현재 공식 주소의 a/href가 존재함을 확인했다. 브라우저에서 기존/신규 링크의 클래스·텍스트·크기 200x58·배경색·글자색·글자 크기 18px가 동일함을 확인.
- Google Play 변경 증거: art/qa/play-official-site-updated.png.

## 남은 우선순위

- 스토어 상세 소개의 옛 www.ritty.me/kr 링크와 다른 공식 SNS 소개 링크도 현재 주소로 통일할 필요가 있음. 이번 실행에서 해당 필드/계정의 편집이나 게시를 완료했다고 간주하지 않음.
- 같은 이름을 쓰던 다른 서비스가 검색 의도에 영향을 주므로 구조화 데이터만으로 단독 검색 역전을 보장할 수 없음. 실제 AI 대화·성격 차이·생활과 대화의 연결을 보여주는 공개 승인된 장면을 개발 소식으로 축적하고 공식 채널에서 자연스럽게 소개하는 것이 다음 콘텐츠 우선순위.
- 새 글은 기존 7일 제한을 유지. 날짜만 채우기 위한 발행·가짜 링크 확보·같은 원고 다중 도메인 복제 없음.
- 단독 검색 순위와 최근 7일 Search Console 결과를 이후 비교. 배포 직후 순위 변화나 인과관계는 주장하지 않음. 오늘 이미 확인한 색인 URL의 재수집 요청을 반복하지 않음.

## 참고

- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://developers.google.com/search/docs/appearance/site-names
