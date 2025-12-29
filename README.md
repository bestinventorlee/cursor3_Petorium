# Petorium - 짧은 비디오 콘텐츠 플랫폼

TikTok과 유사한 현대적인 짧은 비디오 콘텐츠 플랫폼입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Video Storage**: AWS S3 또는 Cloudflare R2
- **Video Processing**: FFmpeg
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io

## 프로젝트 구조

```
petorium/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth.js 인증
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── signup/route.ts
│   │   ├── videos/        # 비디오 API
│   │   │   ├── [id]/      # 개별 비디오
│   │   │   │   ├── comments/route.ts
│   │   │   │   ├── like/route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── upload/        # 비디오 업로드
│   │   └── health/        # 헬스 체크
│   ├── auth/              # 인증 페이지
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   ├── globals.css        # 전역 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 홈 페이지
│   └── providers.tsx      # NextAuth Provider
├── components/            # React 컴포넌트
│   ├── VideoPlayer.tsx    # 비디오 플레이어
│   ├── VideoCard.tsx      # 비디오 카드
│   └── Navbar.tsx         # 네비게이션 바
├── lib/                   # 유틸리티 및 설정
│   ├── prisma.ts          # Prisma 클라이언트
│   ├── auth.ts            # NextAuth 설정
│   ├── s3.ts              # AWS S3 유틸리티
│   ├── cloudflare-r2.ts   # Cloudflare R2 유틸리티
│   ├── video-processing.ts # FFmpeg 비디오 처리
│   └── socket.ts          # Socket.io 설정
├── prisma/                # Prisma 스키마
│   └── schema.prisma      # 데이터베이스 스키마
├── types/                 # TypeScript 타입 정의
│   └── next-auth.d.ts     # NextAuth 타입 확장
├── public/                # 정적 파일
├── tmp/                   # 임시 파일 (업로드 등)
├── .env.example           # 환경 변수 템플릿
├── .eslintrc.json         # ESLint 설정
├── .prettierrc            # Prettier 설정
├── next.config.js         # Next.js 설정
├── tailwind.config.ts     # Tailwind CSS 설정
├── tsconfig.json          # TypeScript 설정
└── package.json           # 프로젝트 의존성
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값들을 입력하세요:

```bash
cp .env.example .env
```

### 3. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 `.env` 파일에 `DATABASE_URL`을 설정하세요.

### 4. Prisma 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# 또는 개발 중에는 push 사용
npm run db:push
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 데이터베이스 스키마

### 주요 모델

- **User**: 사용자 정보
- **Video**: 비디오 콘텐츠
- **Comment**: 댓글
- **Like**: 좋아요
- **Follow**: 팔로우 관계

## 주요 기능

- ✅ 사용자 인증 (이메일/비밀번호, OAuth)
- ✅ 비디오 업로드 및 처리
- ✅ 비디오 재생
- ✅ 댓글 시스템
- ✅ 좋아요 기능
- ✅ 팔로우 시스템
- ✅ 실시간 업데이트 (Socket.io)

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npm run format` - Prettier 포맷팅
- `npm run db:generate` - Prisma 클라이언트 생성
- `npm run db:push` - 데이터베이스 스키마 푸시
- `npm run db:migrate` - 데이터베이스 마이그레이션
- `npm run db:studio` - Prisma Studio 실행

## 라이선스

MIT

