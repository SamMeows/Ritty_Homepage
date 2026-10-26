# 개발 소식 → Discord 연결

공개 체크 + 분류 `개발 소식` + 언어 `KO`(또는 비어 있음) / `EN` + 게시일이 한국 날짜 기준 오늘 이전인 글만 전송합니다. 한국어는 한국어 채널, 영어는 영어 채널로 각각 보냅니다. 일본어·공지사항·팀 레터는 제외합니다. 미래 예약 글은 해당 날짜부터 대상입니다.

홈페이지 API와 상세 페이지가 열리는지 확인한 뒤 제목·본문 앞부분 요약·커버 이미지·홈페이지 링크를 카드로 보냅니다. 이미지는 노션 페이지 커버를 사용합니다. 본문 이미지 전체 업로드 기능은 아닙니다.

## 최초 설정

1. 노션 **리티 소식** DB에 `Discord 알림 기록`이라는 **텍스트** 속성을 추가합니다. 기존 Notion integration에 DB 콘텐츠 읽기·수정 권한이 필요합니다. 작성할 때 이 열은 비워둡니다.
2. Discord 서버 설정 → 연동 → 웹훅에서 한국어·영어 일반 텍스트 채널마다 웹훅을 하나씩 만들고 각각 URL을 복사합니다.
한국어 원문과 영어 번역본은 기존 홈페이지 방식대로 노션의 별도 글로 관리합니다. 각 글에 동일한 분류인 `개발 소식`과 맞는 언어를 지정합니다. 영어는 실제 영어 번역본이 공개된 뒤에만 전송하며, 원문을 영어 채널에 대신 보내지 않습니다. 영어 링크는 `/en/news/글ID`이고 카드 안내 문구도 영어입니다. 한국어를 먼저 공개하고 나중에 영어를 공개해도 각 글이 한 번씩 전송됩니다. 알림 기록은 각 노션 글별로 저장합니다.

3. GitHub `SamMeows/Ritty_Homepage` → Settings → Secrets and variables → Actions → **Secrets**에 세 값을 저장합니다. Vercel 환경변수와는 별도입니다.

   | Secret | 값 |
   | --- | --- |
   | `NOTION_NEWS_TOKEN` | 홈페이지 소식에 쓰는 Notion integration token |
   | `DISCORD_WEBHOOK_URL_KO` | 한국어 채널 웹훅 URL |
   | `DISCORD_WEBHOOK_URL_EN` | 영어 채널 웹훅 URL |

4. 이 코드를 기본 브랜치에 반영합니다. Actions → **Discord development news** → Run workflow에서 `initialize`를 **한 번** 실행합니다. 현재 공개된 글을 분류·언어에 관계없이 `skipped:existing:…`로 기록하며 발송하지 않습니다. 초안과 미래 예약 글은 남겨둡니다. **이 단계가 성공하기 전에 전송을 켜지 마세요.**
5. 같은 화면에서 `preview`를 실행해 발송 대상이 없는지 확인합니다.
6. Settings → Secrets and variables → Actions → **Variables**에 `DISCORD_NEWS_ENABLED`를 `true`로 추가합니다. 이제 새 글 공개 후 자동 전송합니다. 끄려면 `false`로 바꿉니다.

기존에 `DISCORD_WEBHOOK_URL`로 등록했다면 한국어 URL을 `DISCORD_WEBHOOK_URL_KO`로 다시 등록하세요. 이전 이름은 사용하지 않습니다. 두 언어 채널의 웹훅 설정이 모두 필요합니다.

Data source를 바꿨다면 GitHub Variable `NOTION_NEWS_DATA_SOURCE_ID`도 변경합니다. 기본값은 기존 홈페이지와 같습니다. 초기화는 새 글 발행 전에 끝내세요. 다시 초기화하면 아직 발송하지 않은 공개 글도 제외됩니다.

## 동작과 복구

- 10분 간격이며 GitHub 대기열에 따라 지연될 수 있습니다. Actions 사용량이 발생합니다. 공개 저장소는 장기간 활동이 없으면 예약 실행이 중지될 수 있으니 Actions 상태를 확인하세요.
- 실행은 한 번에 하나만 진행하며 실행당 최대 5개를 전송합니다. 나머지는 다음 실행에서 처리합니다.
- `sent:메시지ID`: 전송 완료. 수정, 공개 해제 후 재공개에도 재전송하지 않습니다.
- `skipped:existing:…`: 초기화할 때 이미 공개된 글. 자동 전송하지 않습니다.
- `pending:…`: 전송 직전 기록. 네트워크 중단, Discord 서버 오류, 전송 후 Notion 기록 실패 시 중복 방지를 위해 자동 재전송하지 않고 Actions를 실패 처리합니다. **Discord 채널에 글이 있는지 확인**해서 있으면 `sent:메시지ID`로 수정하고, 없으면 기록을 지워 다음 실행에서 재시도합니다. Discord 개발자 모드를 켜면 메시지 메뉴에서 ID를 복사할 수 있습니다.
- 홈페이지 조회 실패와 Discord의 명시적 4xx 거절(429 포함)은 다음 실행에서 재시도합니다. 실패 이유는 Actions 로그에서 확인합니다. 토큰과 웹훅 URL은 출력하지 않습니다.
- 알림 기록을 지우면 이미 보낸 글도 재발송 대상이 됩니다. 다른 복사본의 자동화를 동시에 실행하지 마세요.

검증: `node --test scripts/discord-news.test.mjs`. 로컬에서는 환경변수를 설정하고 `node scripts/discord-news.mjs preview`로 확인합니다. 실발송 테스트는 테스트 채널 웹훅을 사용하세요.
