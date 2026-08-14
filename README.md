# 모임 (Friend Task)

친구 50~100명이 게임·식사·운동·스터디 같은 약속을 빠르게 만들고 참여 현황을 바로 확인하는 모바일 우선 비공개 웹서비스입니다.

## 핵심 기능

- Supabase Google OAuth 로그인과 세션 유지
- 초대 코드 + 닉네임을 이용한 비공개 가입
- 오늘 / 내일 / 예정 / 완료 모임 분류
- 홈에서 참여 / 고민중 / 불참 즉시 변경
- 최소·최대 인원에 따른 모집 중 / 성공 / FULL 상태
- 모임 생성, 상세 조회, 수정, 취소, 완료
- 상세 화면 참여자·모임 상태 Supabase Realtime 반영
- 모임별 알림 Watch 및 알림 이벤트 중복 방지
- 모바일 safe area, PWA manifest, 서비스 워커

## 기술 구성

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 + 제품 전용 모바일 반응형 CSS
- Supabase Auth, PostgreSQL, Realtime, Row Level Security
- Vercel 배포

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`에 실제 Supabase URL과 Publishable Key를 넣습니다.

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Publishable Key는 RLS를 전제로 브라우저에서 사용하는 키입니다. Secret Key나 Service Role Key는 이 프로젝트의 클라이언트 환경 변수에 넣지 않습니다.

## Supabase 설정

1. 새 Supabase 프로젝트를 만듭니다.
2. 프로젝트 루트에서 `supabase link --project-ref <project-ref>`를 실행합니다.
3. `npm run db:push`로 `supabase/migrations`의 스키마와 RLS 정책을 적용합니다.
4. Supabase Dashboard의 Authentication > Providers에서 Google을 활성화하고 Google Client ID/Secret을 입력합니다.
5. Authentication > URL Configuration에 로컬 및 Vercel callback URL을 추가합니다.

허용할 callback 예시:

```text
http://localhost:3000/auth/callback
https://your-project.vercel.app/auth/callback
```

초대 코드는 운영 데이터이므로 Git 저장소에 넣지 않습니다. 원하는 고엔트로피 코드를 만든 뒤 해시를 생성하고 `invite_codes.code_hash`에 한 번 등록합니다.

```bash
npm run invite:hash -- YOUR-INVITE-CODE
```

데이터베이스에는 출력된 SHA-256 해시만 저장합니다.

## 데이터베이스

스키마는 migration으로 재현됩니다.

```bash
npm run db:new -- add_feature_name
npm run db:push
```

주요 테이블은 `profiles`, `invite_codes`, `tasks`, `task_participants`, `task_watchers`, `push_subscriptions`, `notification_events`입니다.

- 모든 주요 테이블에 RLS 적용
- 가입 완료 사용자만 커뮤니티 데이터 조회 가능
- 생성자만 자신의 모임 수정·취소·완료 가능
- 참여 상태는 본인만 변경 가능
- 최대 인원 검증은 Task row lock을 사용하는 PostgreSQL RPC에서 원자적으로 처리
- `MIN_REACHED`, `FULL`, `TASK_CANCELLED` 이벤트는 Task당 한 번만 기록

## 검증

```bash
npm test
```

`npm test`는 TypeScript, ESLint, 프로덕션 빌드를 순서대로 확인합니다.

## Vercel 배포

1. GitHub 저장소를 Vercel에 Import합니다.
2. Framework Preset은 Next.js, Root Directory는 저장소 루트를 사용합니다.
3. 위 Supabase 환경 변수 두 개를 Production / Preview / Development에 설정합니다.
4. 배포 후 생성된 도메인의 `/auth/callback`을 Supabase Redirect URLs에 추가합니다.

## Push 범위

현재 버전은 모임 Watch, 브라우저 권한 요청, PWA 서비스 워커, Push 구독 저장용 스키마와 중복 방지 이벤트 큐를 포함합니다. 실제 원격 Web Push 발송용 VAPID/FCM 공급자와 예약 Cron은 운영 키가 필요한 후속 연결 단계입니다. Push를 거부해도 Task 핵심 기능은 정상 동작합니다.
