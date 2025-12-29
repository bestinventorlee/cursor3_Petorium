# GitHub에 소스 올리고 배포하기

이 가이드는 GitHub에 소스를 업로드하고 Lightsail 서버에서 다시 컴파일하는 방법을 설명합니다.

## 1단계: GitHub에 소스 업로드

### 로컬에서 Git 초기화 및 커밋

```bash
# Git이 초기화되지 않은 경우
git init

# 원격 저장소 추가 (GitHub에서 생성한 저장소 URL 사용)
git remote add origin https://github.com/your-username/petorium.git

# 또는 SSH 사용
# git remote add origin git@github.com:your-username/petorium.git

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Petorium video platform"

# 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

### 기존 저장소에 업데이트 푸시

```bash
# 변경사항 확인
git status

# 변경된 파일 추가
git add .

# 커밋
git commit -m "Update: 빌드 오류 수정 및 타입 정의 추가"

# GitHub에 푸시
git push origin main
```

## 2단계: 서버에서 소스 받기 및 컴파일

### SSH로 서버 접속

```bash
# Windows PowerShell
ssh -i your-key.pem ubuntu@43.200.91.84

# Mac/Linux
ssh -i your-key.pem ubuntu@43.200.91.84
```

### 서버에서 프로젝트 클론/업데이트

**처음 배포하는 경우:**

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론
git clone https://github.com/your-username/petorium.git
cd petorium

# 환경 변수 파일 생성
nano .env
# ENV-IP-SETUP.md의 내용을 참고하여 .env 파일 작성

# 의존성 설치 (빌드에 필요한 devDependencies 포함)
npm install

# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate
```

**이미 배포된 경우 (업데이트):**

```bash
# 프로젝트 디렉토리로 이동
cd ~/petorium

# 최신 코드 가져오기
git pull origin main

# 의존성 업데이트 (필요시)
npm install

# Prisma 마이그레이션 (필요시)
npm run db:migrate
```

### 프로덕션 빌드

```bash
# 프로덕션 빌드 실행
npm run build
```

### PM2로 재시작

```bash
# PM2로 애플리케이션 재시작
pm2 restart petorium

# 또는 배포 스크립트 사용
chmod +x deploy.sh
./deploy.sh
```

## 3단계: 배포 스크립트 사용 (권장)

### deploy.sh 스크립트 확인

프로젝트에 `deploy.sh` 파일이 있습니다. 이 스크립트는 다음을 자동으로 수행합니다:

1. Git에서 최신 코드 가져오기
2. 의존성 설치
3. Prisma 클라이언트 생성
4. 데이터베이스 마이그레이션
5. 프로덕션 빌드
6. PM2 재시작

### 사용 방법

```bash
# 서버에서 실행
cd ~/petorium
chmod +x deploy.sh
./deploy.sh
```

## 4단계: 배포 확인

### 로그 확인

```bash
# PM2 로그 확인
pm2 logs petorium

# 최근 100줄만 보기
pm2 logs petorium --lines 100

# 실시간 모니터링
pm2 monit
```

### 상태 확인

```bash
# PM2 상태 확인
pm2 status

# 애플리케이션 정보 확인
pm2 show petorium
```

### 웹사이트 접속 확인

브라우저에서 `http://43.200.91.84`로 접속하여 정상 작동하는지 확인하세요.

## 자동 배포 설정 (선택사항)

### GitHub Actions를 사용한 자동 배포

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to Lightsail

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: 43.200.91.84
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/petorium
            git pull origin main
            npm install
            npm run db:generate
            npm run db:migrate
            npm run build
            pm2 restart petorium
```

**GitHub Secrets 설정:**
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name: `SSH_PRIVATE_KEY`
4. Value: SSH 개인 키 내용 (`.pem` 파일 내용)

## 문제 해결

### Git pull 실패

```bash
# 로컬 변경사항이 있는 경우
git stash
git pull origin main
git stash pop

# 또는 강제로 덮어쓰기 (주의: 로컬 변경사항 손실)
git fetch origin
git reset --hard origin/main
```

### 빌드 실패

```bash
# .next 폴더 삭제 후 재빌드
rm -rf .next
npm run build

# node_modules 재설치
rm -rf node_modules
npm install
npm run build
```

### PM2 재시작 실패

```bash
# PM2 프로세스 확인
pm2 list

# 강제 재시작
pm2 restart petorium --update-env

# 완전히 중지 후 재시작
pm2 stop petorium
pm2 start ecosystem.config.js
```

### 환경 변수 문제

```bash
# .env 파일 확인
cat .env

# PM2 환경 변수 확인
pm2 env 0

# 환경 변수 업데이트 후 재시작
pm2 restart petorium --update-env
```

## 배포 체크리스트

배포 전 확인사항:

- [ ] GitHub에 최신 코드가 푸시되었는지 확인
- [ ] `.env` 파일이 서버에 올바르게 설정되었는지 확인
- [ ] 데이터베이스 마이그레이션이 필요한지 확인
- [ ] 빌드가 로컬에서 성공하는지 확인
- [ ] PM2가 정상적으로 실행 중인지 확인
- [ ] Nginx가 정상적으로 실행 중인지 확인

## 빠른 배포 명령어 요약

```bash
# 로컬에서
git add .
git commit -m "Update: 변경사항 설명"
git push origin main

# 서버에서
cd ~/petorium
git pull origin main
npm install
npm run build
pm2 restart petorium
```

또는 배포 스크립트 사용:

```bash
# 서버에서
cd ~/petorium
./deploy.sh
```

## 추가 팁

### 1. 배포 전 테스트

```bash
# 로컬에서 빌드 테스트
npm run build

# 프로덕션 모드로 로컬 실행 테스트
npm run build
npm start
```

### 2. 롤백 방법

```bash
# 이전 커밋으로 되돌리기
cd ~/petorium
git log  # 커밋 히스토리 확인
git checkout <이전-커밋-해시>
npm run build
pm2 restart petorium
```

### 3. 브랜치 전략

```bash
# 개발 브랜치에서 작업
git checkout -b develop
# ... 작업 ...
git push origin develop

# 메인 브랜치에 머지
git checkout main
git merge develop
git push origin main
```

## 보안 주의사항

1. **`.env` 파일은 절대 Git에 커밋하지 마세요**
   - `.gitignore`에 포함되어 있는지 확인
   - 환경 변수는 서버에서 직접 설정

2. **SSH 키 보안**
   - SSH 키는 절대 공개 저장소에 올리지 마세요
   - GitHub Secrets를 사용하여 안전하게 관리

3. **데이터베이스 백업**
   - 배포 전 데이터베이스 백업 권장
   ```bash
   pg_dump -U petorium_user petorium > backup_$(date +%Y%m%d).sql
   ```

