#!/bin/bash

# Petorium 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Petorium 배포를 시작합니다..."

# 1. Git에서 최신 코드 가져오기
echo "📥 최신 코드를 가져오는 중..."
git pull origin main || git pull origin master

# 2. 의존성 설치
echo "📦 의존성을 설치하는 중..."
npm install

# 3. Prisma 클라이언트 생성
echo "🗄️ Prisma 클라이언트를 생성하는 중..."
npm run db:generate

# 4. 데이터베이스 마이그레이션 (필요시)
echo "🔄 데이터베이스 마이그레이션을 실행하는 중..."
npm run db:migrate || echo "⚠️ 마이그레이션 스킵 (이미 최신 상태일 수 있음)"

# 5. 프로덕션 빌드
echo "🔨 프로덕션 빌드를 실행하는 중..."
npm run build

# 6. 로그 디렉토리 생성
echo "📁 로그 디렉토리를 생성하는 중..."
mkdir -p logs

# 7. PM2로 재시작
echo "🔄 PM2로 애플리케이션을 재시작하는 중..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# 8. 상태 확인
echo "✅ 배포 완료! 상태를 확인하는 중..."
pm2 status

echo "✨ 배포가 완료되었습니다!"
echo "📊 로그를 확인하려면: pm2 logs petorium"
echo "📈 모니터링을 확인하려면: pm2 monit"



