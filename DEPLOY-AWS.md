# AWS EC2 배포 가이드

이 가이드는 Petorium 애플리케이션을 Amazon EC2 서버에 배포하는 방법을 설명합니다.

## 사전 준비사항

1. **AWS 계정 및 EC2 인스턴스**
   - EC2 인스턴스 생성 (Ubuntu 22.04 LTS 권장)
   - 보안 그룹 설정 (HTTP: 80, HTTPS: 443, SSH: 22 포트 열기)
   - Elastic IP 할당 (선택사항, IP 고정용)

2. **도메인 설정** (선택사항)
   - Route 53 또는 다른 DNS 서비스에서 도메인 설정
   - A 레코드로 EC2 IP 연결

3. **AWS 서비스**
   - RDS PostgreSQL (또는 EC2에 직접 설치)
   - ElastiCache Redis (또는 EC2에 직접 설치)
   - S3 버킷 (비디오 저장용)

## 1단계: EC2 서버 초기 설정

### SSH 접속

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 시스템 업데이트

```bash
sudo apt update
sudo apt upgrade -y
```

### 필수 패키지 설치

```bash
# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 설치
sudo apt install postgresql postgresql-contrib -y

# Redis 설치
sudo apt install redis-server -y

# Nginx 설치
sudo apt install nginx -y

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# Git 설치
sudo apt install git -y

# FFmpeg 설치 (비디오 처리용)
sudo apt install ffmpeg -y

# Build essentials (네이티브 모듈 컴파일용)
sudo apt install build-essential -y
```

### 버전 확인

```bash
node --version  # v20.x.x
npm --version
psql --version
redis-cli --version
nginx -v
pm2 --version
```

## 2단계: 데이터베이스 설정

### PostgreSQL 설정

```bash
# PostgreSQL 서비스 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL 접속
sudo -u postgres psql

# 데이터베이스 및 사용자 생성
CREATE DATABASE petorium;
CREATE USER petorium_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE petorium TO petorium_user;
ALTER USER petorium_user CREATEDB;
\q
```

### Redis 설정

```bash
# Redis 서비스 시작
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Redis 설정 확인
redis-cli ping  # PONG 응답 확인
```

## 3단계: 애플리케이션 배포

### 프로젝트 클론

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론 (GitHub, GitLab 등에서)
git clone https://github.com/your-username/petorium.git
cd petorium

# 또는 직접 파일 업로드 (scp 사용)
# 로컬에서: scp -r -i your-key.pem ./petorium ubuntu@your-ec2-ip:~/
```

### 의존성 설치

```bash
npm install
```

### 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

`.env` 파일 내용:

```env
# 데이터베이스
DATABASE_URL="postgresql://petorium_user:your_secure_password@localhost:5432/petorium?schema=public"

# NextAuth.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# OAuth (선택사항)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket-name"

# CDN
USE_CDN="true"
CDN_BASE_URL="https://your-cdn-domain.com"

# Redis
REDIS_URL="redis://localhost:6379"

# CSRF 보호
CSRF_SECRET="your-csrf-secret-key-here"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"

# Node 환경
NODE_ENV="production"
```

**중요**: 비밀키 생성 방법:

```bash
# NEXTAUTH_SECRET 생성
openssl rand -base64 32

# CSRF_SECRET 생성
openssl rand -base64 32
```

### Prisma 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate
```

## 4단계: 프로덕션 빌드

```bash
# 프로덕션 빌드
npm run build
```

## 5단계: PM2로 애플리케이션 실행

### PM2 설정 파일 생성

```bash
nano ecosystem.config.js
```

`ecosystem.config.js` 내용:

```javascript
module.exports = {
  apps: [{
    name: 'petorium',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/petorium',
    instances: 2, // CPU 코어 수에 맞게 조정
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
```

### PM2로 시작

```bash
# 로그 디렉토리 생성
mkdir -p logs

# PM2로 애플리케이션 시작
pm2 start ecosystem.config.js

# 시스템 재시작 시 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs petorium
```

## 6단계: Nginx 리버스 프록시 설정

### Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/petorium
```

설정 내용:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt 인증서 인증용 (SSL 설정 전)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTP를 HTTPS로 리다이렉트 (SSL 설정 후)
    # return 301 https://$server_name$request_uri;

    # 임시: HTTP로 서비스 (SSL 설정 전)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 파일 업로드 크기 제한
    client_max_body_size 100M;
}
```

### Nginx 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/petorium /etc/nginx/sites-enabled/

# 기본 설정 제거 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 7단계: SSL 인증서 설정 (Let's Encrypt)

### Certbot 설치

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### SSL 인증서 발급

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot이 자동으로 Nginx 설정을 업데이트하고 SSL을 활성화합니다.

### 자동 갱신 설정

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신은 이미 설정됨 (systemd timer)
```

## 8단계: 방화벽 설정

### UFW 방화벽 설정

```bash
# UFW 활성화
sudo ufw enable

# 기본 규칙
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필요한 포트 열기
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 상태 확인
sudo ufw status
```

## 9단계: 모니터링 및 로그

### PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs petorium

# 메트릭 확인
pm2 show petorium
```

### Nginx 로그

```bash
# 액세스 로그
sudo tail -f /var/log/nginx/access.log

# 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 시스템 리소스 모니터링

```bash
# CPU 및 메모리 사용량
htop

# 디스크 사용량
df -h

# 네트워크 연결
netstat -tulpn
```

## 10단계: 백업 전략

### 데이터베이스 백업

```bash
# 백업 스크립트 생성
nano ~/backup-db.sh
```

스크립트 내용:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL 백업
pg_dump -U petorium_user petorium > $BACKUP_DIR/db_backup_$DATE.sql

# 오래된 백업 삭제 (7일 이상)
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

```bash
# 실행 권한 부여
chmod +x ~/backup-db.sh

# Cron으로 자동 백업 설정 (매일 새벽 2시)
crontab -e
# 다음 줄 추가:
0 2 * * * /home/ubuntu/backup-db.sh
```

## 11단계: 성능 최적화

### Nginx 캐싱 설정

`/etc/nginx/sites-available/petorium`에 추가:

```nginx
# 정적 파일 캐싱
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 30d;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Node.js 메모리 제한

`ecosystem.config.js`에서 이미 설정됨 (`max_memory_restart: '1G'`)

## 문제 해결

### 애플리케이션이 시작되지 않을 때

```bash
# PM2 로그 확인
pm2 logs petorium --lines 100

# 포트 사용 확인
sudo lsof -i :3000

# 환경 변수 확인
pm2 env 0
```

### 데이터베이스 연결 오류

```bash
# PostgreSQL 서비스 확인
sudo systemctl status postgresql

# PostgreSQL 로그 확인
sudo tail -f /var/log/postgresql/postgresql-*.log

# 연결 테스트
psql -U petorium_user -d petorium -h localhost
```

### Nginx 502 Bad Gateway

```bash
# Next.js 애플리케이션 실행 확인
pm2 status

# 포트 확인
netstat -tulpn | grep 3000

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 메모리 부족

```bash
# 스왑 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 활성화
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 업데이트 절차

```bash
# 프로젝트 디렉토리로 이동
cd ~/petorium

# 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
npm install

# Prisma 마이그레이션 (필요시)
npm run db:migrate

# 빌드
npm run build

# PM2 재시작
pm2 restart petorium

# 상태 확인
pm2 status
pm2 logs petorium
```

## 보안 체크리스트

- [ ] SSH 키 인증만 사용 (비밀번호 인증 비활성화)
- [ ] 방화벽 설정 완료
- [ ] SSL 인증서 설치 완료
- [ ] 환경 변수 보안 확인 (.env 파일 권한)
- [ ] 데이터베이스 비밀번호 강력하게 설정
- [ ] 정기적인 보안 업데이트
- [ ] 백업 자동화 설정
- [ ] 로그 모니터링 설정

## 추가 리소스

- [AWS EC2 문서](https://docs.aws.amazon.com/ec2/)
- [Next.js 배포 문서](https://nextjs.org/docs/deployment)
- [PM2 문서](https://pm2.keymetrics.io/docs/)
- [Nginx 문서](https://nginx.org/en/docs/)

## 지원

문제가 발생하면:
1. PM2 로그 확인: `pm2 logs petorium`
2. Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`
3. 시스템 로그 확인: `journalctl -xe`

