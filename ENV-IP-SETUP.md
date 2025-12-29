# IP 주소로 배포할 때 .env 설정 가이드

IP 주소 `43.200.91.84`로 배포할 때 사용하는 `.env` 파일 설정입니다.

## .env 파일 내용

서버에서 다음 명령어로 `.env` 파일을 생성하세요:

```bash
nano .env
```

다음 내용을 복사해서 붙여넣으세요:

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
# Access Key 생성 방법: AWS-S3-SETUP.md 참고
# 1. AWS IAM 콘솔에서 사용자 생성
# 2. S3 접근 권한 정책 연결
# 3. Access Key 생성 및 복사
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

## 비밀키 생성

서버에서 다음 명령어로 비밀키를 생성하세요:

```bash
# NEXTAUTH_SECRET 생성
openssl rand -base64 32

# CSRF_SECRET 생성
openssl rand -base64 32
```

생성된 값을 `.env` 파일의 `NEXTAUTH_SECRET`과 `CSRF_SECRET`에 각각 입력하세요.

## Nginx 설정 (IP 주소용)

`/etc/nginx/sites-available/petorium` 파일 내용:

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

## 중요 사항

### 1. HTTP만 사용 가능
- IP 주소로는 SSL 인증서를 발급할 수 없으므로 HTTP만 사용합니다
- 브라우저에서 `http://43.200.91.84`로 접속합니다

### 2. OAuth 제한사항
- Google, GitHub 등 OAuth 제공업체는 보안상 IP 주소를 리다이렉트 URI로 허용하지 않을 수 있습니다
- OAuth를 사용하려면 도메인이 필요합니다
- 일부 제공업체는 IP 주소를 허용하지만, 각 제공업체의 설정에서 확인해야 합니다

### 3. CDN 사용 불가
- CDN은 도메인이 필요하므로 `USE_CDN="false"`로 설정합니다

### 4. 보안 고려사항
- HTTP는 암호화되지 않으므로 비밀번호 등 민감한 정보가 평문으로 전송됩니다
- 가능한 한 빨리 도메인을 연결하고 SSL 인증서를 설치하는 것을 권장합니다

## 접속 URL

배포 완료 후 다음 URL로 접속할 수 있습니다:

- **메인 페이지**: `http://43.200.91.84`
- **로그인**: `http://43.200.91.84/auth/signin`
- **회원가입**: `http://43.200.91.84/auth/signup`
- **비디오 피드**: `http://43.200.91.84/feed`
- **비디오 업로드**: `http://43.200.91.84/upload`
- **검색**: `http://43.200.91.84/search`
- **트렌딩**: `http://43.200.91.84/trending`

## 나중에 도메인을 추가하는 경우

도메인을 추가하면:

1. `.env` 파일 수정:
   - `NEXTAUTH_URL="https://your-domain.com"`
   - `NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"`
   - `USE_CDN="true"` (CDN 사용 시)

2. Nginx 설정 수정:
   - `server_name your-domain.com www.your-domain.com;`

3. SSL 인증서 설치:
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

4. 애플리케이션 재시작:
   ```bash
   pm2 restart petorium
   ```

