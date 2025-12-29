# Production Optimization Guide

## 환경 변수 설정

프로덕션 환경을 위해 다음 환경 변수를 설정하세요:

```env
# CDN 설정
USE_CDN=true
CDN_BASE_URL=https://your-cdn-domain.com
# 또는
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-domain.com

# Redis 캐싱
REDIS_URL=redis://localhost:6379
# 또는
REDIS_URL=rediss://your-redis-host:6380

# CSRF 보호
CSRF_SECRET=your-random-secret-key-here

# 데이터베이스 연결 풀링
DATABASE_URL=postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=20
```

## 최적화 기능

### 1. 비디오 최적화

#### CDN 통합
- CloudFlare R2 또는 AWS CloudFront 사용
- `lib/cdn.ts`에서 CDN URL 생성
- 환경 변수로 활성화/비활성화

#### HLS 스트리밍
- 적응형 비트레이트 스트리밍 지원
- `lib/hls.ts`에서 HLS 생성 유틸리티 제공
- 여러 해상도 지원 (240p, 480p, 720p, 1080p)

#### 썸네일 스프라이트
- 비디오 스크러빙을 위한 썸네일 스프라이트 생성
- VTT 파일 생성 지원

### 2. 데이터베이스 최적화

#### 인덱스
- 자주 쿼리되는 필드에 인덱스 추가
- `prisma/migrations/add_indexes.sql` 실행
- Full-text search 인덱스 포함

#### Redis 캐싱
- 핫 데이터 캐싱
- `lib/redis.ts`에서 캐싱 유틸리티 제공
- TTL 지원

#### 연결 풀링
- Prisma 연결 풀 설정
- `lib/prisma.ts`에서 자동 구성

### 3. 프론트엔드 최적화

#### 이미지 최적화
- Next.js Image 컴포넌트 사용
- AVIF 및 WebP 포맷 지원
- 반응형 이미지 크기

#### 코드 분할
- Webpack 설정으로 자동 코드 분할
- Vendor 및 Common 청크 분리

#### Service Worker
- 오프라인 지원
- 정적 자산 캐싱
- `public/sw.js`에 구현

#### Web Vitals 모니터링
- Core Web Vitals 추적
- `components/WebVitalsReporter.tsx` 사용
- `/api/analytics/web-vitals`로 전송

### 4. 보안

#### Rate Limiting
- API 엔드포인트별 속도 제한
- `middleware.ts`에서 구현
- Redis 기반 (fallback: 메모리)

#### CSRF 보호
- CSRF 토큰 생성 및 검증
- `lib/csrf.ts`에서 구현
- `/api/csrf-token`에서 토큰 가져오기

#### 콘텐츠 모더레이션
- 텍스트, 비디오, 이미지 검증
- `lib/content-moderation.ts`에서 구현
- 스팸 감지 포함

#### 보안 헤더
- `middleware.ts`에서 자동 추가
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy

## 배포 체크리스트

- [ ] 환경 변수 설정
- [ ] Redis 서버 설정
- [ ] CDN 설정 및 연결
- [ ] 데이터베이스 인덱스 마이그레이션 실행
- [ ] Service Worker 등록
- [ ] Web Vitals 모니터링 설정
- [ ] Rate limiting 테스트
- [ ] CSRF 보호 테스트
- [ ] 콘텐츠 모더레이션 테스트
- [ ] 프로덕션 빌드 테스트

## 성능 모니터링

### Web Vitals
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### API 성능
- 응답 시간 모니터링
- 에러율 추적
- Rate limit 히트율

## 추가 최적화

### 비디오 처리
- 백그라운드 작업 큐 사용 (Bull, BullMQ)
- 비동기 비디오 처리
- 진행 상황 추적

### 캐싱 전략
- CDN 캐싱 규칙 설정
- Redis 캐시 워밍업
- 캐시 무효화 전략

### 모니터링
- APM 도구 통합 (Sentry, Datadog)
- 로그 집계
- 알림 설정

