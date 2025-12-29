# AWS Lightsail 배포 가이드

이 가이드는 Petorium 애플리케이션을 Amazon Lightsail에 배포하는 방법을 설명합니다.

## Lightsail이란?

AWS Lightsail은 간단한 웹 애플리케이션을 위한 가상 프라이빗 서버(VPS) 서비스입니다. EC2보다 설정이 간단하고 관리가 용이합니다.

## 사전 준비사항

1. **AWS 계정**
   - AWS 계정 생성 및 로그인
   - Lightsail 서비스 접근 권한

2. **도메인** (선택사항)
   - 도메인 구매 (Route 53, GoDaddy 등)
   - DNS 설정 권한

3. **AWS 서비스** (선택사항)
   - RDS PostgreSQL (또는 Lightsail 인스턴스에 직접 설치)
   - ElastiCache Redis (또는 Lightsail 인스턴스에 직접 설치)
   - S3 버킷 (비디오 저장용)

## 1단계: Lightsail 인스턴스 생성

### 인스턴스 생성

1. **AWS Lightsail 콘솔 접속**
   - [AWS Lightsail 콘솔](https://lightsail.aws.amazon.com/) 접속

2. **인스턴스 생성**
   - "Create instance" 클릭
   - **플랫폼**: Linux/Unix
   - **블루프린트**: Ubuntu 22.04 LTS (또는 최신 버전)
   - **인스턴스 플랜**: 
     - 개발/테스트: $5/월 (512MB RAM, 1 vCPU)
     - 소규모 프로덕션: $10/월 (1GB RAM, 1 vCPU)
     - 중규모 프로덕션: $20/월 (2GB RAM, 1 vCPU) **권장**
     - 대규모 프로덕션: $40/월 (4GB RAM, 2 vCPU)

3. **인스턴스 이름 설정**
   - 예: `petorium-production`

4. **SSH 키 쌍 설정**
   - 기존 키 사용 또는 새로 생성
   - 키 다운로드 (`.pem` 파일)

5. **인스턴스 생성 완료**
   - "Create instance" 클릭
   - 인스턴스가 시작될 때까지 대기 (약 1-2분)

### 고정 IP 할당

1. **네트워킹 탭**에서 "Create static IP" 클릭
2. **이름 설정**: `petorium-static-ip`
3. **인스턴스 연결**: 생성한 인스턴스 선택
4. **생성 완료**

### 방화벽 설정

1. **네트워킹 탭**에서 "Firewall" 섹션 클릭
2. **필요한 포트 추가**:
   - **HTTP (80)**: 모든 IP 허용
   - **HTTPS (443)**: 모든 IP 허용
   - **SSH (22)**: 내 IP만 허용 (보안 강화)
   - **커스텀 (3000)**: 선택사항 (직접 접근용)

## 2단계: SSH 접속

### Windows (PowerShell)

```powershell
# SSH 키 권한 설정 (첫 실행 시)
icacls your-key.pem /inheritance:r
icacls your-key.pem /grant:r "%username%:R"

# SSH 접속
ssh -i your-key.pem ubuntu@your-static-ip
```

### Mac/Linux

```bash
# SSH 키 권한 설정
chmod 400 your-key.pem

# SSH 접속
ssh -i your-key.pem ubuntu@your-static-ip
```

## 3단계: 서버 초기 설정

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

# Certbot 설치 (SSL 인증서용)
sudo apt install certbot python3-certbot-nginx -y
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

## 4단계: 데이터베이스 설정

### PostgreSQL 설정

```bash
# PostgreSQL 서비스 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL 접속
sudo -u postgres psql

# 데이터베이스 및 사용자 생성
CREATE DATABASE petorium;
CREATE USER petorium_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE petorium TO petorium_user;
ALTER USER petorium_user CREATEDB;
\q
```

**보안 강화** (선택사항):
```bash
# PostgreSQL 설정 파일 수정
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 다음 줄을 찾아서 수정:
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5
```

### Redis 설정

```bash
# Redis 서비스 시작
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Redis 설정 확인
redis-cli ping  # PONG 응답 확인

# Redis 비밀번호 설정 (선택사항, 보안 강화)
sudo nano /etc/redis/redis.conf
# requirepass your_redis_password 추가
sudo systemctl restart redis-server
```

## 5단계: 애플리케이션 배포

### 프로젝트 클론

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론 (GitHub, GitLab 등에서)
git clone https://github.com/your-username/petorium.git
cd petorium

# 또는 직접 파일 업로드 (scp 사용)
# 로컬에서: scp -r -i your-key.pem ./petorium ubuntu@your-static-ip:~/
```

### 의존성 설치

```bash
npm install --production
```

### 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

**도메인이 있는 경우** `.env` 파일 내용:

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
# 또는 비밀번호가 있는 경우:
# REDIS_URL="redis://:your_redis_password@localhost:6379"

# CSRF 보호
CSRF_SECRET="your-csrf-secret-key-here"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"

# Node 환경
NODE_ENV="production"
```

**IP 주소로 배포하는 경우** (도메인 없음) `.env` 파일 내용:

```env
# 데이터베이스
DATABASE_URL="postgresql://petorium_user:your_secure_password@localhost:5432/petorium?schema=public"

# NextAuth.js - IP 주소 사용 (HTTP)
NEXTAUTH_URL="http://43.200.91.84"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# OAuth (선택사항)
# 주의: OAuth는 IP 주소로는 제대로 작동하지 않을 수 있습니다.
# OAuth 제공업체에서 리다이렉트 URI를 IP 주소로 등록해야 합니다.
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket-name"

# CDN - IP 주소로는 CDN 사용 불가 (비활성화)
USE_CDN="false"
CDN_BASE_URL=""

# Redis
REDIS_URL="redis://localhost:6379"
# 또는 비밀번호가 있는 경우:
# REDIS_URL="redis://:your_redis_password@localhost:6379"

# CSRF 보호
CSRF_SECRET="your-csrf-secret-key-here"

# Socket.io - IP 주소 사용 (HTTP)
NEXT_PUBLIC_SOCKET_URL="http://43.200.91.84"

# Node 환경
NODE_ENV="production"
```

**중요 사항 (IP 주소 사용 시)**:
- SSL 인증서를 IP 주소로 발급할 수 없으므로 HTTP만 사용합니다
- OAuth 로그인은 IP 주소로 제한될 수 있습니다 (OAuth 제공업체에서 IP 주소를 리다이렉트 URI로 허용해야 함)
- CDN은 도메인이 필요하므로 비활성화합니다

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

## 6단계: 프로덕션 빌드

```bash
# 프로덕션 빌드
npm run build
```

## 7단계: PM2로 애플리케이션 실행

### PM2 설정 파일 확인

프로젝트에 `ecosystem.config.js` 파일이 있는지 확인하고, 없으면 생성:

```bash
# 파일이 이미 있다면 확인
cat ecosystem.config.js
```

### PM2로 시작

```bash
# 로그 디렉토리 생성
mkdir -p logs

# PM2로 애플리케이션 시작
pm2 start ecosystem.config.js

# 시스템 재시작 시 자동 시작 설정
pm2 startup
# 출력된 명령어를 복사해서 실행 (예: sudo env PATH=...)
pm2 save

# 상태 확인
pm2 status
pm2 logs petorium
```

## 8단계: Nginx 리버스 프록시 설정

### Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/petorium
```

설정 내용:

**도메인이 있는 경우** 설정 내용:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt 인증서 인증용
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTP를 HTTPS로 리다이렉트 (SSL 설정 후 주석 해제)
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
    
    # 정적 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**IP 주소로 배포하는 경우** (도메인 없음) 설정 내용:

```nginx
server {
    listen 80;
    server_name 43.200.91.84;
    # 또는 모든 호스트 허용:
    # listen 80 default_server;

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
    
    # 정적 파일 캐싱
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
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

## 9단계: 도메인 연결 (선택사항)

### DNS 설정

도메인 제공업체의 DNS 설정에서:

1. **A 레코드 추가**
   - 호스트: `@` 또는 `your-domain.com`
   - 값: Lightsail 고정 IP 주소
   - TTL: 300 (5분)

2. **WWW 서브도메인** (선택사항)
   - 호스트: `www`
   - 값: Lightsail 고정 IP 주소
   - TTL: 300

### Lightsail에서 도메인 연결

1. Lightsail 콘솔에서 **Networking** 탭 클릭
2. **Domains & DNS** 섹션에서 "Create DNS zone" 클릭
3. 도메인 입력 및 생성
4. 네임서버를 도메인 등록업체에 설정

## 10단계: SSL 인증서 설정 (Let's Encrypt)

### SSL 인증서 발급

```bash
# 도메인이 연결된 후 실행
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot이 자동으로:
- SSL 인증서 발급
- Nginx 설정 업데이트
- HTTP → HTTPS 리다이렉트 설정

### 자동 갱신 설정

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신은 이미 설정됨 (systemd timer)
# 상태 확인
sudo systemctl status certbot.timer
```

## 11단계: 모니터링 및 로그

### PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs petorium --lines 100

# 메트릭 확인
pm2 show petorium

# 재시작
pm2 restart petorium

# 중지
pm2 stop petorium
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
# 또는
top

# 디스크 사용량
df -h

# 네트워크 연결
netstat -tulpn
```

## 12단계: 백업 전략

### Lightsail 스냅샷

1. Lightsail 콘솔에서 인스턴스 선택
2. **Snapshots** 탭 클릭
3. "Create snapshot" 클릭
4. 자동 스냅샷 설정 (선택사항)

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

# S3에 업로드 (선택사항)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql s3://your-backup-bucket/

# 오래된 백업 삭제 (7일 이상)
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "백업 완료: db_backup_$DATE.sql"
```

```bash
# 실행 권한 부여
chmod +x ~/backup-db.sh

# Cron으로 자동 백업 설정 (매일 새벽 2시)
crontab -e
# 다음 줄 추가:
0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```

## 13단계: 업데이트 절차

### 배포 스크립트 사용

```bash
# 프로젝트 디렉토리로 이동
cd ~/petorium

# 배포 스크립트 실행 권한 부여 (최초 1회)
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

### 수동 업데이트

```bash
# 프로젝트 디렉토리로 이동
cd ~/petorium

# 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
npm install --production

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

## 문제 해결

### 애플리케이션이 시작되지 않을 때

```bash
# PM2 로그 확인
pm2 logs petorium --lines 100

# 포트 사용 확인
sudo lsof -i :3000

# 환경 변수 확인
pm2 env 0

# PM2 프로세스 재시작
pm2 restart petorium
```

### 데이터베이스 연결 오류

```bash
# PostgreSQL 서비스 확인
sudo systemctl status postgresql

# PostgreSQL 로그 확인
sudo tail -f /var/log/postgresql/postgresql-*.log

# 연결 테스트
psql -U petorium_user -d petorium -h localhost

# 비밀번호 확인
sudo -u postgres psql -c "\du"
```

### Nginx 502 Bad Gateway

```bash
# Next.js 애플리케이션 실행 확인
pm2 status

# 포트 확인
sudo netstat -tulpn | grep 3000

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# Nginx 재시작
sudo systemctl restart nginx
```

### 메모리 부족

Lightsail 인스턴스의 메모리가 부족한 경우:

1. **인스턴스 업그레이드**
   - Lightsail 콘솔에서 더 큰 플랜으로 변경

2. **스왑 파일 생성** (임시 해결책)

```bash
# 스왑 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 활성화
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

### SSL 인증서 갱신 실패

```bash
# 수동 갱신 시도
sudo certbot renew --force-renewal

# Nginx 재시작
sudo systemctl restart nginx

# 로그 확인
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## Lightsail 특화 기능

### 로드 밸런서 (선택사항)

여러 인스턴스를 사용하는 경우:

1. Lightsail 콘솔에서 **Networking** 탭
2. "Create load balancer" 클릭
3. 인스턴스 연결
4. SSL 인증서 연결

### Lightsail Container Services (고급)

컨테이너 기반 배포를 원하는 경우:

1. Docker 이미지 빌드
2. Lightsail Container Service 생성
3. 컨테이너 배포

## 비용 최적화

### Lightsail 플랜 선택 가이드

- **$5/월**: 개발/테스트용 (512MB RAM)
- **$10/월**: 소규모 프로덕션 (1GB RAM)
- **$20/월**: 중규모 프로덕션 (2GB RAM) **권장**
- **$40/월**: 대규모 프로덕션 (4GB RAM)

### 비용 절감 팁

1. **스냅샷 정리**: 오래된 스냅샷 삭제
2. **미사용 리소스 삭제**: 사용하지 않는 인스턴스 정리
3. **자동 스케일링**: 필요시에만 업그레이드

## 보안 체크리스트

- [ ] SSH 키 인증만 사용 (비밀번호 인증 비활성화)
- [ ] Lightsail 방화벽 설정 완료
- [ ] SSL 인증서 설치 완료
- [ ] 환경 변수 보안 확인 (.env 파일 권한: 600)
- [ ] 데이터베이스 비밀번호 강력하게 설정
- [ ] Redis 비밀번호 설정 (선택사항)
- [ ] 정기적인 보안 업데이트 (`sudo apt update && sudo apt upgrade`)
- [ ] 백업 자동화 설정
- [ ] 로그 모니터링 설정
- [ ] SSH 포트를 기본 포트가 아닌 다른 포트로 변경 (선택사항)

## 추가 리소스

- [AWS Lightsail 문서](https://lightsail.aws.amazon.com/ls/docs/)
- [Next.js 배포 문서](https://nextjs.org/docs/deployment)
- [PM2 문서](https://pm2.keymetrics.io/docs/)
- [Nginx 문서](https://nginx.org/en/docs/)

## 지원

문제가 발생하면:
1. PM2 로그 확인: `pm2 logs petorium`
2. Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`
3. 시스템 로그 확인: `journalctl -xe`
4. Lightsail 콘솔의 메트릭 확인

