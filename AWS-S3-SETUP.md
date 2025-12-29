# AWS S3 Access Key 설정 가이드

Lightsail에서 S3를 사용하려면 AWS IAM에서 Access Key를 생성해야 합니다.

## 1단계: AWS S3 버킷 생성

### S3 버킷 생성

1. **AWS 콘솔 접속**
   - [AWS S3 콘솔](https://s3.console.aws.amazon.com/) 접속
   - 또는 AWS 콘솔에서 "S3" 검색

2. **버킷 생성**
   - "Create bucket" 클릭
   - **버킷 이름**: `petorium-videos` (고유한 이름으로 변경)
   - **리전**: `us-east-1` (또는 원하는 리전)
   - **객체 소유권**: ACL 비활성화 (권장) 또는 버킷 소유자 선호
   - **퍼블릭 액세스 설정**: 
     - "Block all public access" 체크 해제 (비디오를 공개적으로 접근 가능하게 하려면)
     - 또는 "Block all public access" 유지 (Presigned URL 사용 시)
   - **버전 관리**: 필요시 활성화
   - "Create bucket" 클릭

3. **CORS 설정** (필요시)
   - 버킷 선택 → "Permissions" 탭
   - "Cross-origin resource sharing (CORS)" 섹션
   - "Edit" 클릭 후 다음 설정 추가:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["http://43.200.91.84", "*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

## 2단계: IAM 사용자 생성 및 Access Key 발급

### IAM 사용자 생성

1. **IAM 콘솔 접속**
   - [AWS IAM 콘솔](https://console.aws.amazon.com/iam/) 접속
   - 또는 AWS 콘솔에서 "IAM" 검색

2. **사용자 생성**
   - 왼쪽 메뉴에서 "Users" 클릭
   - "Create user" 클릭
   - **사용자 이름**: `petorium-s3-user` (원하는 이름)
   - "Next" 클릭

3. **권한 설정**
   - "Attach policies directly" 선택
   - 다음 정책 중 하나 선택:
     - **`AmazonS3FullAccess`** (간단하지만 모든 S3 접근 권한)
     - 또는 **커스텀 정책** (권장, 특정 버킷만 접근)

### 커스텀 정책 생성 (권장)

1. **정책 생성**
   - IAM 콘솔 → "Policies" → "Create policy"
   - "JSON" 탭 선택
   - 다음 정책 내용 입력 (버킷 이름을 실제 버킷 이름으로 변경):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::petorium-videos",
                "arn:aws:s3:::petorium-videos/*"
            ]
        }
    ]
}
```

2. **정책 이름**: `PetoriumS3Access`
3. "Create policy" 클릭

4. **사용자에 정책 연결**
   - 생성한 사용자 선택
   - "Add permissions" → "Attach policies directly"
   - 방금 생성한 `PetoriumS3Access` 정책 선택
   - "Next" → "Add permissions"

### Access Key 생성

1. **사용자 선택**
   - IAM 콘솔 → "Users" → 생성한 사용자 클릭

2. **Access Key 생성**
   - "Security credentials" 탭 클릭
   - "Access keys" 섹션에서 "Create access key" 클릭
   - **사용 사례**: "Application running outside AWS" 선택
   - "Next" 클릭
   - 설명 태그 추가 (선택사항)
   - "Create access key" 클릭

3. **Access Key 저장**
   - **Access Key ID**: 복사하여 안전한 곳에 저장
   - **Secret Access Key**: 복사하여 안전한 곳에 저장
   - ⚠️ **중요**: Secret Access Key는 이 창을 닫으면 다시 볼 수 없습니다!

## 3단계: .env 파일에 설정 추가

서버의 `.env` 파일에 다음 내용을 추가하세요:

```env
# AWS S3
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"  # 실제 Access Key ID로 변경
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  # 실제 Secret Access Key로 변경
AWS_REGION="us-east-1"  # 버킷을 생성한 리전
AWS_S3_BUCKET_NAME="petorium-videos"  # 실제 버킷 이름으로 변경
```

## 4단계: 버킷 정책 설정 (선택사항)

비디오를 공개적으로 접근 가능하게 하려면:

1. **버킷 선택** → "Permissions" 탭
2. **버킷 정책** 섹션에서 "Edit" 클릭
3. 다음 정책 추가 (버킷 이름 변경):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::petorium-videos/*"
        }
    ]
}
```

## 보안 권장사항

### 1. 최소 권한 원칙
- 전체 S3 접근 권한 대신 특정 버킷만 접근 가능한 정책 사용
- 위의 커스텀 정책 예제 사용 권장

### 2. Access Key 보안
- Access Key를 코드에 하드코딩하지 마세요
- `.env` 파일은 `.gitignore`에 포함되어 있는지 확인
- 정기적으로 Access Key를 로테이션하세요

### 3. 버킷 보안
- 공개 액세스가 필요하지 않으면 "Block all public access" 활성화
- Presigned URL을 사용하여 임시 접근 권한 부여

## 비용 최적화

### S3 스토리지 클래스
- **Standard**: 자주 접근하는 파일 (기본)
- **Intelligent-Tiering**: 자동으로 최적화
- **Glacier**: 아카이브용 (저렴하지만 접근 시간이 김)

### 수명 주기 정책
- 오래된 비디오를 자동으로 Glacier로 이동
- 버킷 → "Management" → "Lifecycle rules"에서 설정

## 문제 해결

### Access Denied 오류
- IAM 정책이 올바르게 설정되었는지 확인
- 버킷 이름이 정확한지 확인
- 리전이 일치하는지 확인

### 버킷을 찾을 수 없음
- 버킷 이름 확인 (대소문자 구분)
- 리전 확인
- 버킷이 실제로 생성되었는지 확인

### 업로드 실패
- CORS 설정 확인
- 버킷 정책 확인
- 파일 크기 제한 확인 (기본 5GB)

## 테스트

서버에서 다음 명령어로 S3 연결을 테스트할 수 있습니다:

```bash
# AWS CLI 설치 (선택사항)
sudo apt install awscli -y

# 설정
aws configure
# AWS Access Key ID: 입력
# AWS Secret Access Key: 입력
# Default region: us-east-1
# Default output format: json

# 버킷 목록 확인
aws s3 ls

# 파일 업로드 테스트
echo "test" > test.txt
aws s3 cp test.txt s3://petorium-videos/test.txt
```

## 추가 리소스

- [AWS S3 문서](https://docs.aws.amazon.com/s3/)
- [IAM 사용자 가이드](https://docs.aws.amazon.com/IAM/latest/UserGuide/)
- [S3 버킷 정책 예제](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)

