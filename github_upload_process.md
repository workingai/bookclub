# GitHub CLI (gh) API 기반 파일 직접 업로드 가이드

이 문서는 로컬 시스템에 `git` 클라이언트가 설치되어 있지 않거나 환경 변수(PATH) 설정 문제로 일반적인 Git 명령어를 사용할 수 없을 때, GitHub CLI (`gh`)와 GitHub REST API를 활용하여 원격 리포지토리에 파일을 직접 커밋 및 푸시(업로드)하는 우회 프로세스를 설명합니다.

향후 다른 프로젝트에서 동일한 환경적 제약(Git 설치 불가능 등)이 발생했을 때 이 문서를 복사하여 활용할 수 있습니다.

---

## 1. 운영 프로세스 (Workflow)

1. **파일 수정 및 개발**: 에이전트가 로컬 환경에서 필요한 코드 파일을 수정하고 검증합니다.
2. **사용자 승인 요청**: 에이전트는 파일 수정을 완료한 후 사용자에게 다음과 같이 확인을 요청합니다.
   > *"수정 사항을 GitHub에 등록할까요?"*
3. **우회 등록 실행**: 사용자가 승인(수락)하면, 에이전트는 내부적으로 작성된 PowerShell 스크립트를 실행하여 GitHub API 방식으로 업로드를 진행합니다.
4. **배포 트리거**: GitHub 리포지토리에 파일이 업데이트되면, 연동된 Vercel 등 호스팅 서비스에서 새로운 배포가 자동으로 실행됩니다.

---

## 2. GitHub API 기반 업로드 스크립트 템플릿

다른 프로젝트에 적용할 때 아래의 PowerShell 스크립트 양식에서 변수값(리포지토리 정보, 파일 목록 등)만 변경하여 실행 스크립트(`upload.ps1`)로 사용하면 됩니다.

```powershell
# ==========================================
# 1. 설정 변수 정의 (프로젝트에 맞게 변경)
# ==========================================
$REPO = "owner/repo-name"             # 예: "workingai/bookclub"
$FILES_TO_UPLOAD = @("index.html", "navigation.js") # 업로드할 파일 목록
$COMMIT_MESSAGE = "style: 모바일 레이아웃 최적화 및 텍스트 수정"

# ==========================================
# 2. GitHub CLI 로그인 상태 확인
# ==========================================
$authCheck = gh auth status 2>&1
if ($authCheck -like "*Not logged in*") {
    Write-Error "GitHub CLI가 로그인되어 있지 않습니다. 먼저 'gh auth login'을 실행해 주세요."
    exit 1
}

# ==========================================
# 3. 원격 리포지토리의 현재 파일 SHA 조회
# ==========================================
Write-Output "Retrieving file SHAs from GitHub..."
$remoteFiles = gh api repos/$REPO/contents | ConvertFrom-Json

# ==========================================
# 4. 파일 루프를 통한 Base64 변환 및 PUT 요청
# ==========================================
foreach ($file in $FILES_TO_UPLOAD) {
    if (-not (Test-Path $file)) {
        Write-Warning "로컬 파일이 존재하지 않아 건너뜁니다: $file"
        continue
    }

    # 기존 원격 파일의 SHA 매칭 (신규 생성이 아닌 업데이트인 경우 필수)
    $remoteFile = $remoteFiles | Where-Object { $_.name -eq $file }
    $sha = $null
    if ($remoteFile) {
        $sha = $remoteFile.sha
    }

    # 파일 읽기 및 Base64 인코딩
    $fileBytes = [System.IO.File]::ReadAllBytes($file)
    $base64Content = [System.Convert]::ToBase64String($fileBytes)

    # API 전송 바디 구성
    $body = @{
        message = "$COMMIT_MESSAGE ($file)"
        content = $base64Content
    }
    # 기존 파일이 있다면 sha 필드 추가 (충돌 방지)
    if ($sha) {
        $body.Add("sha", $sha)
    }

    $jsonBody = $body | ConvertTo-Json -Depth 5 -Compress

    # GitHub Contents API PUT 요청
    Write-Output "Uploading $file to GitHub (SHA: $sha)..."
    $jsonBody | gh api -X PUT repos/$REPO/contents/$file --input -
}

Write-Output "All files uploaded successfully!"
```

---

## 3. 원격 API 상세 요약 (참고자료)

- **HTTP Method**: `PUT`
- **Request URL**: `https://api.github.com/repos/{owner}/{repo}/contents/{path}`
- **Headers**:
  - `Accept: application/vnd.github+json`
  - `Authorization: Bearer <GITHUB_TOKEN>` (GitHub CLI가 내부적으로 자동 처리)
- **JSON Body Parameter**:
  - `message` (string, 필수): 커밋 메시지
  - `content` (string, 필수): 파일 내용을 **Base64**로 인코딩한 문자열
  - `sha` (string, 필수/선택): 기존 원격에 파일이 이미 존재하는 경우 해당 파일의 최신 blob SHA 값을 함께 전송해야만 덮어쓰기가 가능합니다. (없을 시 `409 Conflict` 에러 발생)
