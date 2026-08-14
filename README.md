# 모임 (Friend Task)

친구 50~100명이 게임·식사·운동·스터디 같은 약속을 빠르게 만들고, 참여 현황을 실시간에 가깝게 확인하는 모바일 우선 비공개 웹서비스입니다.

## 핵심 기능

- 로그인 후 초대 코드 + 닉네임으로 가입
- 오늘 / 내일 / 예정 / 완료 모임 분류
- 카드에서 바로 참여 / 고민중 / 불참 변경
- 최소·최대 인원에 따른 모집 중 / 성공 / FULL 상태 표시
- 모임 생성, 상세 조회, 수정, 취소, 완료
- 참여자 목록과 모임별 알림 켜기
- D1 기반 영속 저장과 동시 참여 시 최대 인원 원자적 검증
- 모바일 safe area, PWA manifest, 서비스 워커 지원

## 기술 구성

- Vinext + React 19 + TypeScript
- Tailwind CSS 4 + 제품 전용 반응형 CSS
- Cloudflare D1 + Drizzle ORM / migrations
- Sites 인증 헤더 및 Sign in with ChatGPT
- Sites 배포

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

로컬에서는 프리뷰 사용자로 동작합니다. 최초 API 요청 시 로컬 D1 테이블이 안전하게 초기화됩니다.

## 환경 변수

`.env.example`을 참고해 `.env.local`을 만듭니다.

```bash
INVITE_CODE=원하는-초대-코드
```

초대 코드는 브라우저 번들에 포함되지 않으며, 데이터베이스에는 SHA-256 해시만 저장됩니다. 배포 환경 값은 Sites 런타임 설정으로 관리합니다.

## 데이터베이스

스키마는 `db/schema.ts`, 생성된 마이그레이션은 `drizzle/`에 있습니다.

```bash
npm run db:generate
```

주요 테이블은 `profiles`, `invite_codes`, `tasks`, `task_participants`, `task_watchers`, `notification_events`입니다. 인원·상태·시간 조건은 API와 데이터베이스 제약 조건에서 함께 검증합니다.

## 검증

```bash
npx tsc --noEmit
npm test
```

## 배포

`.openai/hosting.json`의 D1 논리 바인딩을 Sites가 실제 데이터베이스에 연결하고, `dist/.openai/drizzle`의 마이그레이션을 배포 시 적용합니다. 로그인은 배포 플랫폼이 소유하는 인증 경로를 사용하며 앱은 전달받은 사용자 ID·이메일만 신뢰합니다.

## 알림 범위

사용자는 모임 상세에서 알림을 켜고 브라우저 권한을 허용할 수 있습니다. 현재 버전은 알림 구독 상태와 서비스 워커 수신 경로를 포함합니다. 서버 예약 푸시 발송 크론과 외부 Web Push 공급자 연결은 후속 운영 단계입니다.
