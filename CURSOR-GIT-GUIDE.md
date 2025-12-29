# Cursor에서 GitHub로 코드 올리기

Cursor IDE에서 GitHub로 코드를 올리는 방법을 설명합니다.

## 방법 1: Cursor의 Git UI 사용 (권장)

### 1단계: Source Control 패널 열기

1. **왼쪽 사이드바**에서 **Source Control 아이콘** (분기 모양) 클릭
   - 또는 단축키: `Ctrl + Shift + G` (Windows/Linux), `Cmd + Shift + G` (Mac)

### 2단계: 변경사항 스테이징 (Staging)

1. **Changes** 섹션에서 커밋할 파일 확인
2. 파일 옆의 **+** 버튼 클릭하여 스테이징
   - 또는 **"Stage All Changes"** 버튼으로 모든 변경사항 스테이징
   - 또는 파일을 우클릭 → **"Stage Changes"**

### 3단계: 커밋 (Commit)

1. 상단의 **메시지 입력창**에 커밋 메시지 입력
   - 예: "Update: 빌드 오류 수정 및 타입 정의 추가"
2. **✓ Commit** 버튼 클릭
   - 또는 `Ctrl + Enter` (Windows/Linux), `Cmd + Enter` (Mac)

### 4단계: 푸시 (Push)

1. 상단의 **"..." (더보기)** 메뉴 클릭
2. **"Push"** 선택
   - 또는 단축키: `Ctrl + Shift + P` → "Git: Push" 입력
   - 또는 하단 상태바의 **분기 이름** 클릭 → **"Push"** 선택

## 방법 2: 터미널 사용

Cursor 하단의 **터미널**을 열어서 명령어로 실행할 수 있습니다.

### 터미널 열기

- `Ctrl + `` (백틱) 또는 `View → Terminal`

### 명령어 실행

```bash
# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 커밋
git commit -m "Update: 빌드 오류 수정 및 타입 정의 추가"

# GitHub에 푸시
git push origin main
```

## 현재 상태 확인

현재 프로젝트 상태:
- ✅ Git 저장소 초기화됨
- ✅ 원격 저장소 연결됨 (origin/main)
- 📝 변경된 파일들이 있음

## 지금 바로 올리기

### Cursor UI로:

1. `Ctrl + Shift + G` (Source Control 열기)
2. **"Stage All Changes"** 클릭
3. 커밋 메시지 입력: `"Update: 빌드 오류 수정 및 배포 가이드 추가"`
4. **✓ Commit** 클릭
5. **"..."** 메뉴 → **"Push"** 클릭

### 터미널로:

```bash
git add .
git commit -m "Update: 빌드 오류 수정 및 배포 가이드 추가"
git push origin main
```

## 문제 해결

### "origin"이 설정되지 않은 경우

```bash
git remote add origin https://github.com/bestinventorlee/cursor3_Petorium.git
```

### 브랜치 이름 확인

```bash
git branch
# main 브랜치가 아니면
git branch -M main
```

### 푸시 전에 Pull이 필요한 경우

```bash
git pull origin main --rebase
git push origin main
```

## Git 설정 확인

### 사용자 정보 설정 (처음인 경우)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 원격 저장소 확인

```bash
git remote -v
```

## 주의사항

1. **`.env` 파일은 올라가지 않습니다**
   - `.gitignore`에 포함되어 있어 자동으로 제외됩니다
   - 서버에서 직접 설정해야 합니다

2. **커밋 전 확인**
   - Source Control 패널에서 어떤 파일이 올라가는지 확인하세요
   - 민감한 정보가 포함된 파일은 제외하세요

3. **커밋 메시지**
   - 명확하고 의미 있는 메시지를 작성하세요
   - 예: "Fix: 타입 오류 수정", "Add: 배포 가이드 추가"

## Cursor Git 단축키

- `Ctrl + Shift + G`: Source Control 열기
- `Ctrl + Enter`: 커밋
- `Ctrl + Shift + P`: 명령 팔레트 (Git 명령 검색)
- `Ctrl + ``: 터미널 열기/닫기

