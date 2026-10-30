# Gmail 개발일지 운영

연락처는 기존 Notion DB에 유지합니다. 홈페이지의 **`/admin/newsletter`에서 Google 로그인 → 글과 언어 선택 → 미리보기 확인 → 발송 버튼 한 번**으로 승인된 캠페인을 등록합니다. 실제 개별 발송은 GitHub Actions가 Workspace Gmail API로 처리하므로 브라우저를 계속 열어둘 필요가 없습니다.

새 글을 공개하는 것만으로 이메일이 나가지는 않습니다. 홈페이지·Discord 발행과 이메일 승인 단계는 별개입니다. 현재 이메일 지원 언어는 한국어(`kr`), 영어(`en`), 일본어(`ja`), 중국어 번체(`zh-tw`, 뉴스 언어 `ZH-TW`)입니다. 선택한 언어의 개발 소식을 같은 언어로 등록한 구독자에게 발송하며, 메일과 수신거부 화면도 해당 언어로 표시합니다.

## 보안 경계

| 위치 | 역할과 보관 정보 |
| --- | --- |
| 관리자 브라우저 | 미리보기·승인·결과 확인. Google/Gmail/Notion 비밀키는 받지 않음 |
| 홈페이지 서버 | Google에서 검증한 이메일을 정확한 관리자 허용 목록과 대조. 승인 내용을 서명하고 비공개 Notion 큐에 기록 |
| 비공개 Notion 페이지 | 캠페인 내용, 개별 수신자와 발송 상태 기록. 홈페이지 소식 DB와 분리하고 웹 공개 금지 |
| GitHub Actions | 고정된 `gmail-newsletter.yml`을 한 번에 하나씩 실행. 서버에서 현재 수신 동의를 재조회하고 Gmail 요청 |
| Gmail | 연결한 Workspace 계정으로 To 한 명씩 전송. 다른 구독자의 주소를 CC/BCC로 공유하지 않음 |

관리자 로그인은 `openid email`만 요청합니다. 서버가 확인한 Google 이메일과 `NEWSLETTER_ADMIN_EMAILS`가 일치해야 하며, 회사 도메인 전체를 자동 허용하지 않습니다. 세션은 HttpOnly 쿠키로 보관하고 변경 요청의 Origin도 확인합니다. 허용 목록에서 제거된 계정의 기존 세션은 이후 요청부터 거부됩니다.

Gmail 발송 권한을 가진 `GOOGLE_REFRESH_TOKEN`은 **GitHub Actions Secrets에만** 보관합니다. Vercel에는 발송 권한 토큰을 넣지 않습니다. 홈페이지에는 지정 저장소의 고정 워크플로를 깨우는 Actions 권한 토큰만 둡니다.

## 배포 없이 로컬에서 확인하기

관리자 화면, 실제 Google 관리자 로그인, 노션의 공개 글 조회와 메일 미리보기는 로컬에서 확인할 수 있습니다. 발송 처리·중복 방지·수신거부 로직은 아래 오프라인 테스트로 확인합니다. 홈페이지 배포는 이 검증들의 선행 조건이 아닙니다.

### 화면 열기

이 기능의 변경 사항이 들어 있는 홈페이지 소스에서 실행합니다. 원격 저장소에 아직 반영하지 않았다면 제공한 패치를 먼저 적용합니다.

```sh
npm ci
npm run dev -- --webpack
```

같은 PC의 브라우저에서 `http://localhost:3000/admin/newsletter`를 엽니다. 환경변수 없이도 로그인 안내 화면은 열리지만, 실제 로그인과 노션 데이터 조회에는 연결 설정이 필요합니다.

### 실제 로그인과 미리보기

프로젝트 루트의 git 제외 파일 `.env.local`에 다음을 설정합니다.

```dotenv
NEWSLETTER_ENABLED=false
NEWSLETTER_AUTH_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://ritty.sam-meows.com
```

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEWSLETTER_ADMIN_EMAILS`, `NEWSLETTER_SESSION_SECRET`도 최초 설정 절차대로 채웁니다. Google OAuth 클라이언트의 승인된 redirect URI에 다음 주소를 추가합니다.

```text
http://localhost:3000/api/admin/newsletter/auth/callback
```

Google은 로컬 테스트를 위한 localhost redirect URI를 지원합니다. [Google 공식 안내](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)

로그인 주소와 메일 안의 공개 링크 주소는 분리했습니다. `NEWSLETTER_AUTH_ORIGIN`은 로컬 로그인·쿠키·Origin 검사에만 사용하고, `NEXT_PUBLIC_SITE_URL`은 메일 원문·수신거부 링크의 공개 HTTPS 주소로 유지합니다. 포트를 바꾸면 로그인 origin과 Google에 등록한 callback의 포트를 함께 맞춥니다. 운영에서는 `NEWSLETTER_AUTH_ORIGIN`을 비워 기본 사이트 origin을 사용합니다.

미리보기에는 `NOTION_TOKEN`, `NOTION_PRE_REGISTER_DB_ID`, 소식 DB 접근 설정, 32자 이상의 `MARKETING_UNSUBSCRIBE_SECRET`이 필요합니다. 메일 하단을 확인하려면 발신 주소·회사명·주소도 채웁니다. 발송 이력까지 볼 때만 `NEWSLETTER_QUEUE_PAGE_ID`를 설정하면 됩니다. 미리보기만 확인할 때는 Gmail refresh token이나 GitHub 실행 토큰이 필요하지 않습니다.

환경변수를 바꾼 뒤 개발 서버를 재시작합니다. `NEWSLETTER_ENABLED=false`에서는 화면과 미리보기를 확인할 수 있고 실제 발송 요청은 서버에서 거부됩니다. 운영 대량 발송 워커는 단일 실행 보장을 위해 GitHub Actions에서 실행하도록 제한되어 있습니다. 로컬에서 그 실행 제한을 우회하지 말고 오프라인 테스트를 사용합니다.

실제 Google 로그인 승인은 브라우저에서 직접 확인하는 단계입니다. 실제 메일 도착, 공개 수신거부 링크, GitHub의 예약·백그라운드 실행은 모의 테스트 결과만으로 검증 완료라고 판단하지 않습니다.

## 최초 설정

### 1. 비공개 큐와 Google 연결 준비

1. Notion에 별도 **비공개 일반 페이지**를 만들고 기존 `NOTION_TOKEN` integration에 읽기·쓰기 권한을 공유합니다. 이 페이지의 ID를 `NEWSLETTER_QUEUE_PAGE_ID`로 사용합니다. 연락처 DB나 공개 소식 DB의 ID를 재사용하지 않습니다.
2. Workspace 조직의 Google Cloud 프로젝트에서 Gmail API를 켜고 OAuth **Web application** 클라이언트를 준비합니다. 조직 내부 계정만 사용할 때는 Internal 앱 구성을 사용합니다.
3. 다음 두 redirect URI를 정확히 등록합니다. 다른 홈페이지 도메인을 사용하면 첫 번째 URI의 origin을 실제 운영 도메인으로 바꿉니다.

```text
https://ritty.sam-meows.com/api/admin/newsletter/auth/callback
http://127.0.0.1:53682/oauth/callback
```

첫 URI는 관리자 로그인용이고 두 번째는 운영자의 로컬 PC에서 발신 계정을 최초 연결할 때만 사용합니다. 같은 OAuth Web 클라이언트를 사용할 수 있습니다. External 앱을 사용할 때는 테스트 모드와 토큰 만료 정책을 확인하고 운영 구성을 완료합니다. [Google OAuth 안내](https://developers.google.com/identity/protocols/oauth2)

### 2. Vercel 환경변수 설정

실제 예제 파일은 루트 `.env.example`입니다. `NEWSLETTER_ENABLED=false` 상태에서 다음 값을 설정합니다.

| 이름 | 값 |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 준비한 OAuth Web 클라이언트 |
| `NEWSLETTER_ADMIN_EMAILS` | 허용할 Google 이메일을 쉼표로 구분. 예: `admin@example.com,other@example.com` |
| `NEWSLETTER_SESSION_SECRET` | 32자 이상 독립된 무작위 비밀값 |
| `NOTION_TOKEN`, `NOTION_PRE_REGISTER_DB_ID` | 기존 연락처 integration과 DB ID |
| `NOTION_NEWS_DATA_SOURCE_ID` | 홈페이지에서 사용하는 소식 data source ID |
| `NOTION_NEWS_TOKEN` | 소식 전용 token이 있다면 설정. 없으면 `NOTION_TOKEN` 사용 |
| `NEWSLETTER_QUEUE_PAGE_ID` | 1단계에서 만든 비공개 일반 페이지 ID |
| `MARKETING_UNSUBSCRIBE_SECRET` | 32자 이상 안정적인 무작위 서명 키. 웹·Actions에 반드시 같은 값 |
| `NEWSLETTER_FROM_EMAIL` | 연결할 Workspace 계정의 정확한 기본 이메일 주소. 별칭은 현재 지원하지 않음 |
| `NEWSLETTER_COMPANY_NAME`, `NEWSLETTER_COMPANY_ADDRESS` | 메일 하단의 실제 회사명과 주소. 주소 필수 |
| `NEWSLETTER_CONTACT_EMAIL` | 수신자 문의 이메일. 생략하면 발신 주소 사용 |
| `NEXT_PUBLIC_SITE_URL` | 실제 공개 HTTPS origin. 기본 `https://ritty.sam-meows.com` |
| `NEWSLETTER_GITHUB_TOKEN` | 이 저장소만 선택한 fine-grained PAT. Repository permissions의 Actions: Read and write |
| `NEWSLETTER_GITHUB_REPOSITORY` | 기본 `SamMeows/Ritty_Homepage` |
| `NEWSLETTER_GITHUB_REF` | 기본 `master`. 저장소의 기본 브랜치와 일치시킴 |
| `NEWSLETTER_ENABLED` | 설정·검증이 끝날 때까지 `false` |

비밀값에 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다. 세션 키와 수신거부 키를 서로 재사용하지 않습니다. 수신거부 키를 바꾸면 이미 보낸 링크와 대기 중 승인 서명이 무효화되므로 임의로 재발급하지 않습니다.

### 3. 발신 계정 최초 연결

로컬 PC에서 git에 제외되는 `.env.newsletter.local`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEWSLETTER_FROM_EMAIL`을 넣고 실행합니다.

```sh
node --env-file=.env.newsletter.local scripts/authorize-newsletter-gmail.mjs
```

터미널에 표시되는 Google URL을 같은 PC의 브라우저에서 열고, 지정한 발신 계정으로 동의합니다. 도우미는 Gmail 발송 권한과 계정 이메일 확인 권한을 요청하며 받은편지함을 읽거나 테스트 메일을 보내지 않습니다. 일치하는 계정인지 확인한 뒤 refresh token을 로컬 파일에 저장합니다. 토큰 자체는 출력하지 않습니다.

파일 내용이나 토큰을 채팅·커밋·배포 로그에 붙이지 않습니다. 이 로컬 파일을 Vercel에 업로드하지 않습니다.

### 4. GitHub Actions 설정

저장소 **Settings → Secrets and variables → Actions**에서 설정합니다. Vercel 환경변수와 별도입니다.

| 종류 | 이름 |
| --- | --- |
| Secrets | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `NOTION_TOKEN`, `MARKETING_UNSUBSCRIBE_SECRET` |
| Variables — 필수 | `NOTION_PRE_REGISTER_DB_ID`, `NEWSLETTER_QUEUE_PAGE_ID`, `NEWSLETTER_FROM_EMAIL`, `NEWSLETTER_COMPANY_ADDRESS`, `NEWSLETTER_ENABLED` |
| Variables — 운영값 | `NEXT_PUBLIC_SITE_URL`, `NEWSLETTER_COMPANY_NAME`, `NEWSLETTER_CONTACT_EMAIL` |

발신 주소·회사 정보·사이트 origin·Notion ID는 웹과 같은 값으로 맞춥니다. 처음에는 Actions Variable의 `NEWSLETTER_ENABLED`도 `false`로 둡니다. `NEWSLETTER_FROM_EMAIL`은 **Variable**이며 Secrets에만 넣으면 워크플로가 읽지 못합니다.

`.github/workflows/gmail-newsletter.yml`을 기본 브랜치에 반영합니다. 워크플로는 기본 브랜치에서만 발송하고, 전체 발송 작업에 하나의 concurrency lock을 사용합니다. 별도 저장소나 로컬 프로세스에서 같은 큐의 발송기를 동시에 실행하지 않습니다.

### 5. 검증 후 발송 활성화

아래 오프라인 검증을 통과시키고, 배포한 `/admin/newsletter`에서 허용된 계정으로 로그인되는지 확인합니다. 발신 도메인의 SPF/DKIM/DMARC 설정과 발신 계정의 남은 사용량도 확인합니다. [Google 발신자 가이드](https://support.google.com/mail/answer/81126)

그다음 Vercel과 Actions Variable의 `NEWSLETTER_ENABLED`를 모두 `true`로 설정합니다. Vercel 환경변수를 변경한 경우 해당 설정이 적용되도록 재배포합니다. 이 구현 작업에서는 Google 계정 연결, 운영 비밀값 설정, 실제 수신자 발송을 수행하지 않았습니다.

## 매주 사용하는 방법

1. 평소처럼 Notion에서 개발일지를 작성하고 홈페이지에 공개합니다.
2. `/admin/newsletter`에서 Google 로그인 후 보낼 글·언어를 고르고 미리보기를 확인합니다.
3. 제목, 요약, 링크, 회사 정보와 예상 대상 수를 확인하고 발송을 한 번 승인합니다. 미리보기 승인은 30분 동안 유효합니다.
4. 결과 화면에서 Gmail 접수, 제외, 실패와 확인 필요 상태를 확인합니다.

버튼은 큐를 저장한 뒤 즉시 워크플로 실행을 요청합니다. 보완 실행은 **매시간 17분**에 큐를 확인합니다. 즉시 실행 요청이 실패하거나 한 실행에서 남은 대상을 모두 처리하지 못해도 대기 기록을 이어서 처리합니다. GitHub 예약 실행은 지연될 수 있어 정확한 시작 시각을 보장하지 않습니다. [GitHub 예약 실행 안내](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

한 캠페인은 최대 500명, 워커 한 번은 최대 300회 발송 시도 또는 20분 동안 처리합니다. 성공한 개별 요청 사이에 2초를 기다립니다. 동일한 글 ID와 언어의 캠페인을 반복 승인해도 이미 존재하는 발송 기록을 재사용/제외하며 새 전체 발송으로 취급하지 않습니다.

## 대상과 수신거부

- 전용 구독 상태가 있으면 그것을 우선합니다. 거부·철회·테스트·`Email Suppressed=true`는 제외합니다.
- 전용 상태가 없는 예전 연락처는 정확한 `Consent Version`이 `2026-10` 또는 `2026-10-new-launch`일 때 포함합니다. 이 두 가입 폼에서 마케팅 동의가 필수였다는 운영자 확인을 반영했습니다.
- 그 외 연락처는 명시적인 `Marketing Consent=true`가 필요합니다. 빈 값이나 다른 과거 버전을 동의로 추정하지 않습니다.
- 미리보기 수는 속성으로 산정한 예상치입니다. 실제 요청 직전에 현재 동의·철회·이메일·언어를 다시 확인하므로 실제 접수 수는 더 적을 수 있습니다.
- 메일 하단의 개인별 수신거부 링크와 RFC 8058 POST 엔드포인트를 제공합니다. 수신거부해도 사전예약은 유지됩니다.
- 같은 이메일이 여러 연락처 행에 있으면 현재 중복 행에도 철회를 반영합니다. 먼저 링크 대상의 철회를 저장하고 나머지를 처리하며, 일부 저장 실패를 성공으로 표시하지 않습니다. 저장 오류가 표시되면 복구 후 같은 링크로 다시 처리합니다.

Gmail 화면의 “수신거부” 버튼 노출까지 검증한 것은 아닙니다. 첫 실제 수신 메일 원본에서 인증 결과와 DKIM 서명의 두 List-Unsubscribe 헤더 포함 여부를 확인해야 합니다. 본문의 수신거부 링크는 별도로 제공됩니다. [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)

세부 상태 규칙과 엔드포인트는 [MARKETING-EMAILS.md](../MARKETING-EMAILS.md)를 참고합니다.

## 실패 처리와 운영 한계

| 상태 | 의미와 조치 |
| --- | --- |
| `submitted` | Gmail API가 요청을 접수하고 message ID를 반환함. 수신함 도착·열람·스팸함 제외를 보장하지 않음 |
| `skipped` | 현재 동의, 주소 또는 언어 확인에서 제외. 해당 회차는 보내지 않음 |
| `failed` | Gmail이 명시적으로 거절했거나 보내기 전 인증 등이 실패. 원인을 해결한 뒤 재개 가능 항목을 재개 |
| `unknown` | 타임아웃, 서버 오류 또는 발송 중 중단으로 결과가 불명확. 보낸편지함과 수신 여부를 확인하기 전 재발송 금지 |

`unknown`과 중단 당시의 `sending`은 자동 재발송하지 않습니다. Gmail POST에는 중복 방지를 보장하는 서버 측 idempotency key가 없으므로, 무조건 재시도하는 대신 사람이 결과를 확인하도록 멈춥니다. 관리자 재개도 `unknown`을 발송 대상으로 되돌리지 않습니다. Notion 발송 기록을 지워서 재시도하지 않습니다.

비공개 큐는 자동 기록 전용입니다. 캠페인 페이지의 이름·본문·발송 상태를 직접 수정하거나 페이지를 이동·삭제하지 않습니다. 이름이 바뀌거나 다른 용도의 자식 페이지가 섞이면 큐 처리를 중단합니다. 과거 기록을 이동·삭제하면 해당 발송을 중복 방지에 사용할 수 없으므로 기록을 보존합니다.

반송·스팸 신고 자동 수집, 오픈율·클릭률 추적, 전용 뉴스레터 서비스의 전달률 관리 기능은 포함하지 않습니다. 반송 주소나 별도 중단 요청은 연락처 DB의 `Email Suppressed` 체크박스로 차단하고 다음 발송 전 확인합니다.

급히 발송을 중단하려면 Actions의 실행 중 워크플로를 취소하고 두 환경의 `NEWSLETTER_ENABLED`를 `false`로 바꿉니다. 진행 중이던 요청은 이미 접수됐을 수 있으므로 결과 기록을 확인합니다.

별도 뉴스레터 구독료는 추가하지 않지만, 기존 Workspace 구독·Google 발송 제한·GitHub Actions 사용량이 적용됩니다. 큐가 비어 있는 보완 실행도 Actions 사용량이 발생할 수 있습니다. 현재 계정의 남은 한도와 청구 상태는 이 코드에서 확인하지 않으므로 무료 운영을 보장하지 않습니다. [Workspace 발송 한도](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace), [Actions 과금](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## 오프라인 검증

```sh
node scripts/check-marketing-subscription.cjs
node scripts/check-newsletter-auth.cjs
node scripts/check-newsletter-gmail.cjs
node scripts/check-newsletter-service.cjs
node scripts/check-newsletter-worker.cjs
npx tsc --noEmit
npm run build
```

테스트는 Notion·Google·Gmail을 mock으로 대체하며 실제 연락처를 변경하거나 메일을 보내지 않습니다. 배포 후 OAuth 연결, DNS 인증, 도착 메일과 메일 서비스의 수신거부 UI는 별도의 운영 검증 항목입니다.
