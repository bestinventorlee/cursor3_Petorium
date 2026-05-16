# Petorium 프로젝트 실행 가이드

## 필수 요구사항

- Node.js 18.x 이상
- PostgreSQL 데이터베이스
- npm 또는 yarn

## 단계별 실행 절차

### 1단계: 의존성 설치

```bash
npm install
```

### 2단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# 데이터베이스
DATABASE_URL="postgresql://사용자명:비밀번호@localhost:5432/데이터베이스명?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="랜덤한-비밀키-생성-필요"

# OAuth (선택사항)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
APPLE_ID=""
APPLE_SECRET=""

# AWS S3 또는 Cloudflare R2 (선택사항)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
AWS_S3_BUCKET_NAME=""

# 또는 Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=""
CLOUDFLARE_R2_ACCESS_KEY_ID=""
CLOUDFLARE_R2_SECRET_ACCESS_KEY=""
CLOUDFLARE_R2_BUCKET_NAME=""
CLOUDFLARE_R2_PUBLIC_URL=""

# CDN (선택사항)
USE_CDN="false"
CDN_BASE_URL=""

# Redis (선택사항, 캐싱용)
REDIS_URL="redis://localhost:6379"

# CSRF 보호
CSRF_SECRET="랜덤한-비밀키-생성-필요"

# Socket.io (선택사항)
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

**중요**: `NEXTAUTH_SECRET`과 `CSRF_SECRET`은 반드시 랜덤한 문자열로 생성해야 합니다.

```bash
# Linux/Mac에서 비밀키 생성
openssl rand -base64 32

# Windows PowerShell에서 비밀키 생성
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3단계: PostgreSQL 데이터베이스 생성

PostgreSQL이 설치되어 있다면:

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE petorium;

# 사용자 생성 (선택사항)
CREATE USER petorium_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE petorium TO petorium_user;
```

또는 pgAdmin 같은 GUI 도구를 사용할 수도 있습니다.

### 4단계: Prisma 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 스키마 적용 (개발용)
npm run db:push

# 또는 마이그레이션 파일 생성 (프로덕션 권장)
npm run db:migrate
```

**참고**: 
- `db:push`: 스키마를 직접 데이터베이스에 적용 (개발용)
- `db:migrate`: 마이그레이션 파일을 생성하고 적용 (프로덕션 권장)

### 5단계: 관리자 계정 생성 (선택사항)

관리자 대시보드를 사용하려면 관리자 계정이 필요합니다.

**방법 1: Prisma Studio 사용**
```bash
npm run db:studio
```
Prisma Studio에서 사용자 계정을 생성한 후, 해당 사용자의 `role` 필드를 `ADMIN`으로 변경하세요.

**방법 2: SQL 직접 실행**
```sql
-- 먼저 일반 사용자로 회원가입한 후
UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin-email@example.com';
```

### 6단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 주요 페이지

- **홈**: `http://localhost:3000`
- **로그인**: `http://localhost:3000/auth/signin`
- **회원가입**: `http://localhost:3000/auth/signup`
- **비디오 피드**: `http://localhost:3000/feed`
- **비디오 업로드**: `http://localhost:3000/upload` (로그인 필요)
- **검색**: `http://localhost:3000/search`
- **트렌딩**: `http://localhost:3000/trending`
- **관리자 대시보드**: `http://localhost:3000/admin` (관리자 권한 필요)

## 문제 해결

### 데이터베이스 연결 오류

- PostgreSQL이 실행 중인지 확인하세요
- `DATABASE_URL`이 올바른지 확인하세요
- 데이터베이스가 생성되었는지 확인하세요

### Prisma 오류

```bash
# Prisma 클라이언트 재생성
npm run db:generate

# 스키마 재적용
npm run db:push
```

### 포트 충돌

기본 포트 3000이 사용 중이면:
```bash
PORT=3001 npm run dev
```

### FFmpeg 오류

비디오 처리 기능을 사용하려면 FFmpeg가 설치되어 있어야 합니다:
- Windows: [FFmpeg 다운로드](https://ffmpeg.org/download.html)
- Mac: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

또는 `ffmpeg-static` 패키지가 자동으로 설치됩니다.

## 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## Git 배포 후 서버에서 MVP 테스트 시드 실행

테스트용 계정·숏폼 업로드를 자동으로 넣는 스크립트(`scripts/mvp-seed.mjs`)를 **배포된 앱이 실제로 응답하는 URL**에 대해 실행합니다. 스토리지(S3/R2)·DB·`NEXTAUTH`가 서버와 동일하게 동작해야 합니다.

### 1. 저장소 반영 후 서버에서

```bash
cd /path/to/petorium   # 배포 디렉터리
git pull
npm ci                 # 또는 npm install
```

### 2. 설정 파일은 Git에 올리지 않기

`scripts/mvp-seed.config.json`은 `.gitignore`에 포함되어 있습니다. 서버에서 예시를 복사해 만듭니다.

```bash
cp scripts/mvp-seed.config.example.json scripts/mvp-seed.config.json
```

편집 시 특히 다음을 **운영 환경과 동일하게** 맞춥니다.

- **`baseUrl`**: 공개 HTTPS 원본만 (끝에 `/` 없음). 예: `https://your-domain.com`
- **`publicBasePath`**: `next.config`의 `NEXT_PUBLIC_BASE_PATH`와 같게. 로컬 개발처럼 루트에 배포했으면 `""`, 프로덕션 기본(`/petorium`)이면 `"/petorium"`
- **`password`**: 시드 유저 공통 비밀번호 (6자 이상)
- **콘텐츠 소스 (택일)**  
  - **`autoMedia.provider`: `"pexels"`** — 검색어로 Pexels에서 15~60초 클립만 골라 자동 수집·업로드. [API 키](https://www.pexels.com/api/) 발급 후 환경 변수 `PEXELS_API_KEY`(또는 설정의 `apiKeyEnv`)에 넣습니다.  
  - 또는 **`items`** — 직접 `file` / `url` 목록 (`autoMedia`를 쓰면 `items`는 비워도 됨)

`NEXTAUTH_URL`은 사용자가 접속하는 주소와 같아야 하며(예: `https://your-domain.com/petorium` 배포 시 전체 public URL), 시드의 `baseUrl` + `publicBasePath` 조합과 **같은 앱**을 가리켜야 쿠키·로그인이 맞습니다.

### 3. 앱이 떠 있는 상태에서 실행

PM2·systemd 등으로 `next start`가 이미 떠 있다고 가정합니다.

```bash
npm run mvp-seed -- --config scripts/mvp-seed.config.json
```

Pexels 자동 수집을 쓰는 경우 `.env`에 `PEXELS_API_KEY=` 를 넣거나, 실행 전 셸에서 `export PEXELS_API_KEY=...` 하면 스크립트가 루트 `.env`를 읽어 키를 사용합니다.

로그가 필요하면 `--verbose`를 덧붙입니다.

### 4. 속도 제한(429)

미들웨어에서 가입·업로드 요청 수가 분당 제한됩니다. 한 번에 많은 계정/영상을 넣을 때는 `mvp-seed.config.json`의 `registerDelayMs`, `uploadDelayMs`를 늘리세요.

### 5. 로컬 PC에서 운영 서버만 때리는 경우

서버에 SSH로 올라가지 않아도 됩니다. 노트북에서 Node 18+로 같은 저장소를 두고 `baseUrl`/`publicBasePath`만 운영 URL로 두면, 방화벽에서 해당 API가 열려 있을 때 동일하게 동작합니다.

## 유용한 명령어

```bash
# Prisma Studio (데이터베이스 GUI)
npm run db:studio

# 코드 포맷팅
npm run format

# 린트 검사
npm run lint
```

## 다음 단계

1. 첫 번째 사용자 계정 생성 (회원가입)
2. 관리자 계정 설정 (위의 5단계 참조)
3. 비디오 업로드 테스트
4. 기능 테스트

## 추가 설정 (선택사항)

### Redis 설정
캐싱 기능을 사용하려면 Redis를 설치하고 실행하세요:
```bash
# Mac
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Windows
# Redis for Windows 다운로드 및 설치
```

### Socket.io 서버
실시간 기능을 사용하려면 별도의 Socket.io 서버가 필요할 수 있습니다.
현재는 Next.js API Routes에서 Socket.io를 사용하도록 설정되어 있습니다.

## 지원

문제가 발생하면:
1. 콘솔 로그 확인
2. 브라우저 개발자 도구 확인
3. 데이터베이스 연결 상태 확인
4. 환경 변수 설정 확인

