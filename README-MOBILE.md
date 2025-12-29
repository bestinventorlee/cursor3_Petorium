# Mobile Optimization Guide

## 구현된 기능

### 1. 모바일 퍼스트 디자인

#### 반응형 브레이크포인트
- `xs`: 475px (초소형 모바일)
- `sm`: 640px (소형 모바일, 가로 모드)
- `md`: 768px (태블릿)
- `lg`: 1024px (데스크톱)
- `xl`: 1280px (대형 데스크톱)
- `2xl`: 1536px (초대형 데스크톱)

#### 모바일 최적화
- 터치 친화적 버튼 크기 (최소 44x44px)
- Safe area insets 지원 (노치 대응)
- 모바일에서 Navbar 숨김, 하단 네비게이션 표시

### 2. 터치 제스처

#### 구현된 제스처 (`lib/touch-gestures.ts`)
- **스와이프 업/다운**: 비디오 네비게이션
- **스와이프 좌/우**: (향후 구현 가능)
- **더블탭**: 좋아요
- **롱프레스**: 옵션 메뉴 표시
- **핀치**: 프로필 이미지 줌

#### 제스처 설정
```typescript
const callbacks: TouchGestureCallbacks = {
  onSwipeUp: () => handleNextVideo(),
  onSwipeDown: () => handlePreviousVideo(),
  onDoubleTap: () => handleLike(),
  onLongPress: () => showOptionsMenu(),
  onPinch: (scale) => zoomImage(scale),
};
```

### 3. PWA 기능

#### Web App Manifest (`public/manifest.json`)
- 앱 이름, 아이콘, 테마 색상
- Standalone 모드
- 포트레이트 방향 고정
- 홈 화면 바로가기
- 공유 타겟 (비디오 공유)

#### Service Worker (`public/sw.js`)
- 오프라인 지원
- 비디오 캐싱 (최대 50MB)
- 이미지 캐싱
- API 응답 캐싱
- 백그라운드 동기화
- 푸시 알림 처리

#### 설치 프롬프트 (`components/PWAInstallPrompt.tsx`)
- 자동 설치 프롬프트
- 세션별 한 번만 표시
- 설치 상태 추적

### 4. 하단 네비게이션

#### 컴포넌트 (`components/BottomNavigation.tsx`)
- 모바일에서만 표시 (`md:hidden`)
- 5개 주요 메뉴:
  - 홈
  - 피드
  - 업로드 (로그인 필요)
  - 트렌딩
  - 프로필
- 활성 상태 표시
- 애니메이션 (Framer Motion)

### 5. 반응형 비디오 피드

#### 컴포넌트 (`components/ResponsiveVideoFeed.tsx`)
- 모바일: 스와이프 기반 네비게이션
- 데스크톱: 스크롤 기반 네비게이션
- 자동 디바이스 감지
- 터치 최적화

#### 모바일 비디오 플레이어 (`components/MobileVideoPlayer.tsx`)
- 터치 제스처 지원
- 더블탭 좋아요
- 롱프레스 옵션 메뉴
- 자동 재생/일시정지
- 컨트롤 오버레이

## 테스트 가이드

### iOS Safari
1. 개발자 도구 → Responsive Design Mode
2. iPhone 12/13/14 Pro 선택
3. 테스트 항목:
   - 스와이프 제스처
   - 더블탭 좋아요
   - 롱프레스 메뉴
   - PWA 설치
   - 오프라인 모드

### Chrome Android
1. Chrome DevTools → Device Toolbar
2. Android 기기 선택
3. 테스트 항목:
   - 터치 제스처
   - 하단 네비게이션
   - PWA 설치
   - Service Worker 동작

## PWA 설정

### 필수 파일
1. `public/manifest.json` - 앱 매니페스트
2. `public/sw.js` - Service Worker
3. `public/icon-192x192.png` - 아이콘 (192x192)
4. `public/icon-512x512.png` - 아이콘 (512x512)

### 아이콘 생성
```bash
# 아이콘 이미지를 생성하세요
# 192x192, 512x512 크기의 PNG 파일
```

### Service Worker 등록
- `app/register-sw.tsx`에서 자동 등록
- 프로덕션 모드에서만 활성화

## 터치 제스처 상세

### 스와이프
- **최소 거리**: 50px
- **최소 속도**: 0.3
- **방향**: 상/하/좌/우

### 더블탭
- **지연 시간**: 300ms
- **최대 거리**: 10px

### 롱프레스
- **지연 시간**: 500ms
- **이동 시 취소**: 예

### 핀치
- **최소 변화**: 10%
- **최대 줌**: 3x
- **최소 줌**: 1x

## 반응형 컴포넌트

### VideoGrid
- 모바일: 2열
- 태블릿: 3열
- 데스크톱: 4열

### SearchBar
- 모바일: 작은 패딩, 작은 텍스트
- 데스크톱: 큰 패딩, 큰 텍스트

### ProfileHeader
- 모바일: 세로 레이아웃
- 데스크톱: 가로 레이아웃

## 성능 최적화

### 모바일
- 이미지 지연 로딩
- 비디오 프리로딩
- 코드 분할
- Service Worker 캐싱

### 터치 최적화
- `touch-action` CSS 속성
- Passive 이벤트 리스너
- 제스처 디바운싱

## 알려진 이슈

1. **iOS Safari 비디오 자동 재생**
   - 사용자 상호작용 후 재생 필요
   - `playsInline` 속성 사용

2. **Android Chrome PWA 설치**
   - HTTPS 필수
   - Manifest 파일 필수

3. **터치 제스처 충돌**
   - 스크롤과 스와이프 구분
   - `touch-action: pan-y` 사용

## 추가 개선 사항

1. **오프라인 큐**
   - 오프라인 시 작업 저장
   - 온라인 복귀 시 동기화

2. **백그라운드 동기화**
   - 비디오 시청 기록
   - 좋아요/댓글 동기화

3. **푸시 알림**
   - 새 댓글 알림
   - 팔로우 알림
   - 좋아요 알림

