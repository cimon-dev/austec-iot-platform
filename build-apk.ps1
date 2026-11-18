param(
    [switch]$Auto = $false,
    [string]$Version = "",
    [int]$BuildNumber = 0,
    [switch]$NoPause = $false
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
if ($Host.UI -and $Host.UI.RawUI) {
    $Host.UI.RawUI.WindowTitle = "Austec IoT - Build Release APK Android"
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "                 AUSTEC IOT PLATFORM - BUILD APK" -ForegroundColor Cyan
Write-Host "           Tự động đóng gói ứng dụng di động cho Android" -ForegroundColor Gray
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MobileAppDir = Join-Path $ScriptDir "mobile-app"
$DistDir = Join-Path $ScriptDir "dist-apk"
$PubspecPath = Join-Path $MobileAppDir "pubspec.yaml"

# 1. Kiểm tra Flutter SDK
$FlutterCmd = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $FlutterCmd) {
    Write-Host "[LỖI] Không tìm thấy lệnh 'flutter' trong biến môi trường PATH!" -ForegroundColor Red
    Write-Host "Vui lòng kiểm tra lại cài đặt Flutter SDK trên máy tính." -ForegroundColor Yellow
    Write-Host ""
    if (-not $NoPause) { Read-Host "Nhấn Enter để thoát..." }
    exit 1
}

# 2. Kiểm tra thư mục mobile-app
if (-not (Test-Path $MobileAppDir)) {
    Write-Host "[LỖI] Không tìm thấy thư mục: $MobileAppDir" -ForegroundColor Red
    Write-Host ""
    if (-not $NoPause) { Read-Host "Nhấn Enter để thoát..." }
    exit 1
}

if (-not (Test-Path $PubspecPath)) {
    Write-Host "[LỖI] Không tìm thấy file: $PubspecPath" -ForegroundColor Red
    Write-Host ""
    if (-not $NoPause) { Read-Host "Nhấn Enter để thoát..." }
    exit 1
}

# 3. Đọc phiên bản hiện tại từ pubspec.yaml
$PubspecContent = Get-Content $PubspecPath -Raw -Encoding UTF8
$VersionMatch = [regex]::Match($PubspecContent, 'version:\s*([^\s+]+)(?:\+(\d+))?')

$CurrentVerName = "1.0.0"
$CurrentVerCode = 1

if ($VersionMatch.Success) {
    $CurrentVerName = $VersionMatch.Groups[1].Value
    if ($VersionMatch.Groups[2].Success -and $VersionMatch.Groups[2].Value) {
        $CurrentVerCode = [int]$VersionMatch.Groups[2].Value
    }
}

# Tính toán phiên bản tự động tăng +0.1 (tăng minor version)
# Ví dụ: 2.0.0 -> 2.1.0, 2.1.0 -> 2.2.0, 2.0 -> 2.1
$VerParts = $CurrentVerName.Split('.')
$Major = 1
$Minor = 0
$Patch = 0

if ($VerParts.Count -ge 1) { [int]::TryParse($VerParts[0], [ref]$Major) | Out-Null }
if ($VerParts.Count -ge 2) { [int]::TryParse($VerParts[1], [ref]$Minor) | Out-Null }
if ($VerParts.Count -ge 3) { [int]::TryParse($VerParts[2], [ref]$Patch) | Out-Null }

$NextMinor = $Minor + 1
$NextVerName = if ($VerParts.Count -ge 3) { "$Major.$NextMinor.$Patch" } else { "$Major.$NextMinor" }
$NextVerCode = $CurrentVerCode + 1
$DateStamp = Get-Date -Format "yyyyMMdd_HHmm"

Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " Phiên bản hiện tại trong pubspec.yaml: " -NoNewline -ForegroundColor White
Write-Host "v$CurrentVerName " -ForegroundColor Yellow -NoNewline
Write-Host "(Mã Build Code: " -NoNewline -ForegroundColor White
Write-Host "$CurrentVerCode" -ForegroundColor Yellow -NoNewline
Write-Host ")" -ForegroundColor White
Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " [1] Tự động tăng phiên bản (+0.1 -> v$NextVerName, Build $NextVerCode) (Mặc định)" -ForegroundColor Green
Write-Host " [2] Giữ nguyên phiên bản hiện tại (v$CurrentVerName, Build $CurrentVerCode)" -ForegroundColor White
Write-Host " [3] Nhập phiên bản mới tùy ý (Ví dụ: 2.1.0, 2.2.0...)" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray

$TargetVerName = $NextVerName
$TargetVerCode = $NextVerCode

if ($Version -and $BuildNumber -gt 0) {
    $TargetVerName = $Version
    $TargetVerCode = $BuildNumber
    Write-Host "-> Sử dụng tham số dòng lệnh: v$TargetVerName (Build $TargetVerCode)" -ForegroundColor Cyan
} elseif ($Auto) {
    $TargetVerName = $NextVerName
    $TargetVerCode = $NextVerCode
    Write-Host "-> Tự động nâng cấp: v$TargetVerName (Build $TargetVerCode)" -ForegroundColor Green
} else {
    try {
        $Choice = Read-Host "Chọn [1, 2, 3] (Nhấn Enter để chọn mặc định [1])"
    } catch {
        $Choice = "1"
    }
    if ([string]::IsNullOrWhiteSpace($Choice)) {
        $Choice = "1"
    }

    switch ($Choice) {
        "1" {
            $TargetVerName = $NextVerName
            $TargetVerCode = $NextVerCode
        }
        "2" {
            $TargetVerName = $CurrentVerName
            $TargetVerCode = $CurrentVerCode
            Write-Host "-> Giữ nguyên phiên bản: v$TargetVerName+$TargetVerCode" -ForegroundColor Cyan
        }
        "3" {
            $InputName = Read-Host "Nhập tên phiên bản mới (vd: $NextVerName, để trống lấy $NextVerName)"
            if ([string]::IsNullOrWhiteSpace($InputName)) { $InputName = $NextVerName }
            
            $InputCode = Read-Host "Nhập mã build code số nguyên (vd: $NextVerCode, để trống lấy $NextVerCode)"
            if ([string]::IsNullOrWhiteSpace($InputCode)) { $InputCode = $NextVerCode }
            
            $TargetVerName = $InputName
            $TargetVerCode = [int]$InputCode
        }
        Default {
            $TargetVerName = $NextVerName
            $TargetVerCode = $NextVerCode
        }
    }
}

# Cập nhật pubspec.yaml nếu phiên bản thay đổi
if ($TargetVerName -ne $CurrentVerName -or $TargetVerCode -ne $CurrentVerCode) {
    $NewPubspec = [regex]::Replace($PubspecContent, 'version:\s*[^\r\n]+', "version: $TargetVerName+$TargetVerCode")
    [System.IO.File]::WriteAllText($PubspecPath, $NewPubspec, [System.Text.Encoding]::UTF8)
    Write-Host "-> Đã cập nhật pubspec.yaml: $TargetVerName+$TargetVerCode" -ForegroundColor Green
}

Write-Host ""
Write-Host "[1/3] Đang cập nhật gói thư viện (flutter pub get)..." -ForegroundColor Cyan
Push-Location $MobileAppDir
try {
    & flutter pub get
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[LỖI] 'flutter pub get' thất bại!" -ForegroundColor Red
        Pop-Location
        if (-not $NoPause) { Read-Host "Nhấn Enter để thoát..." }
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "[2/3] Đang biên dịch Release APK (v$TargetVerName - Build $TargetVerCode)..." -ForegroundColor Cyan
    Write-Host "Quá trình này có thể mất từ 1 - 3 phút, vui lòng chờ..." -ForegroundColor Gray
    Write-Host ""

    # Nạp biến từ file .env tập trung ở thư mục gốc dự án (nếu có) để truyền vào App qua --dart-define
    $RootEnvPath = Join-Path $ScriptDir ".env"
    $DartDefines = @()
    if (Test-Path $RootEnvPath) {
        $EnvMap = @{}
        Get-Content $RootEnvPath -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
                $idx = $line.IndexOf('=')
                $k = $line.Substring(0, $idx).Trim()
                $v = $line.Substring($idx + 1).Trim()
                $EnvMap[$k] = $v
            }
        }
        if ($EnvMap["CLOUD_BACKEND_URL"]) {
            $DartDefines += "--dart-define=CLOUD_BACKEND_URL=$($EnvMap["CLOUD_BACKEND_URL"])"
        }
        if ($EnvMap["LOCAL_BACKEND_URL"]) {
            $DartDefines += "--dart-define=LOCAL_BACKEND_URL=$($EnvMap["LOCAL_BACKEND_URL"])"
        } elseif ($EnvMap["SERVER_HOST"]) {
            $PortVal = if ($EnvMap["BACKEND_PORT"]) { $EnvMap["BACKEND_PORT"] } else { "4000" }
            $DartDefines += "--dart-define=LOCAL_BACKEND_URL=http://$($EnvMap["SERVER_HOST"]):$PortVal"
        }
        if ($EnvMap["MEDIAMTX_HOST"]) {
            $DartDefines += "--dart-define=MEDIAMTX_HOST=$($EnvMap["MEDIAMTX_HOST"])"
        }
        if ($EnvMap["STREAM_SERVER_PORT_WEBRTC"]) {
            $DartDefines += "--dart-define=STREAM_SERVER_PORT_WEBRTC=$($EnvMap["STREAM_SERVER_PORT_WEBRTC"])"
        }
        if ($EnvMap["STREAM_SERVER_PORT_RTSP"]) {
            $DartDefines += "--dart-define=STREAM_SERVER_PORT_RTSP=$($EnvMap["STREAM_SERVER_PORT_RTSP"])"
        }
        if ($EnvMap["STREAM_SERVER_PORT_HLS"]) {
            $DartDefines += "--dart-define=STREAM_SERVER_PORT_HLS=$($EnvMap["STREAM_SERVER_PORT_HLS"])"
        }
        if ($DartDefines.Count -gt 0) {
            Write-Host "-> Đã nạp cấu hình Server từ .env: $($DartDefines -join ' ')" -ForegroundColor Cyan
        }
    }

    & flutter build apk --release --build-name=$TargetVerName --build-number=$TargetVerCode @DartDefines

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[LỖI] Biên dịch APK thất bại! Vui lòng xem thông báo lỗi chi tiết ở trên." -ForegroundColor Red
        Pop-Location
        if (-not $NoPause) { Read-Host "Nhấn Enter để thoát..." }
        exit $LASTEXITCODE
    }

    $SourceApk = Join-Path $MobileAppDir "build\app\outputs\flutter-apk\app-release.apk"
    if (-not (Test-Path $SourceApk)) {
        Write-Host "[LỖI] Không tìm thấy file APK đầu ra tại: $SourceApk" -ForegroundColor Red
        Pop-Location
        if (-not $NoPause) { Read-Host "Nhấn Enter để thoát..." }
        exit 1
    }

    # 4. Xuất file vào dist-apk
    if (-not (Test-Path $DistDir)) {
        New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
    }

    $TargetParts = $TargetVerName.Split('.')
    $TargetMajorMinor = if ($TargetParts.Count -ge 2) { "$($TargetParts[0]).$($TargetParts[1])" } else { $TargetVerName }

    # Đặt tên ứng dụng theo dạng: Tên + Version (ví dụ Austec_IoT_v2.1.apk hoặc Austec_IoT_v2.1.0.apk)
    $VersionOnlyName = "Austec_IoT_v${TargetVerName}.apk"
    $ShortVersionName = "Austec_IoT_v${TargetMajorMinor}.apk"
    $ArchivedName = "Austec_IoT_v${TargetVerName}_b${TargetVerCode}_${DateStamp}.apk"
    $LatestName = "Austec_IoT_latest.apk"

    $VersionOnlyPath = Join-Path $DistDir $VersionOnlyName
    $ShortVersionPath = Join-Path $DistDir $ShortVersionName
    $ArchivedPath = Join-Path $DistDir $ArchivedName
    $LatestPath = Join-Path $DistDir $LatestName

    # Sao chép các bản APK vào dist-apk
    Copy-Item $SourceApk $VersionOnlyPath -Force
    Copy-Item $SourceApk $ShortVersionPath -Force
    Copy-Item $SourceApk $ArchivedPath -Force
    Copy-Item $SourceApk $LatestPath -Force

    # Tự động đồng bộ sang backend/public/downloads để phục vụ In-App OTA Update trực tiếp từ máy chủ
    $BackendDownloadsDir = Join-Path $ScriptDir "backend\public\downloads"
    if (Test-Path (Join-Path $ScriptDir "backend")) {
        if (-not (Test-Path $BackendDownloadsDir)) {
            New-Item -ItemType Directory -Path $BackendDownloadsDir -Force | Out-Null
        }
        Copy-Item $SourceApk (Join-Path $BackendDownloadsDir "Austec_IoT_latest.apk") -Force
        Copy-Item $SourceApk (Join-Path $BackendDownloadsDir $VersionOnlyName) -Force

        # Tự động đồng bộ lên Cloudflare R2 CDN để phục vụ In-App OTA tốc độ cao không phụ thuộc IP
        $UploadScript = Join-Path $ScriptDir "backend\scripts\upload_apk_r2.cjs"
        if (Test-Path $UploadScript) {
            Write-Host "-> Đang đồng bộ file APK lên Cloudflare R2 CDN..." -ForegroundColor Cyan
            try {
                & node $UploadScript
            } catch {
                Write-Host "[CẢNH BÁO] Không thể tải APK lên R2: $_" -ForegroundColor Yellow
            }
        }
    }

    $ApkItem = Get-Item $VersionOnlyPath
    $SizeMB = [math]::Round($ApkItem.Length / 1MB, 2)

    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host "             [THÀNH CÔNG] ĐÃ BIÊN DỊCH RELEASE APK XONG!" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Phiên bản: v$TargetVerName (Build Code: $TargetVerCode)" -ForegroundColor Yellow
    Write-Host "Kích thước: $SizeMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "1. File APK chuẩn tên + phiên bản:" -ForegroundColor Cyan
    Write-Host "   -> $VersionOnlyPath" -ForegroundColor White
    if ($VersionOnlyName -ne $ShortVersionName) {
        Write-Host "   -> $ShortVersionPath" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "2. File APK bản mới nhất (Austec_IoT_latest.apk):" -ForegroundColor Cyan
    Write-Host "   -> $LatestPath" -ForegroundColor White
    Write-Host ""
    Write-Host "3. File APK lưu trữ lịch sử build:" -ForegroundColor Cyan
    Write-Host "   -> $ArchivedPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Lưu ý cho người dùng Android:" -ForegroundColor Yellow
    Write-Host " - Do mã Build Code đã được tăng lên ($TargetVerCode), khách hàng đang dùng app cũ" -ForegroundColor Gray
    Write-Host "   chỉ cần mở file APK và chọn 'Cập nhật' (Update), KHÔNG cần phải gỡ app ra." -ForegroundColor Gray
    Write-Host ""

    if (-not $NoPause -and [Environment]::UserInteractive) {
        try {
            Start-Process explorer.exe "/select,`"$VersionOnlyPath`""
        } catch {}
    }
}
finally {
    Pop-Location
}

Write-Host ""
if (-not $NoPause) {
    try {
        Read-Host "Nhấn Enter để hoàn tất..."
    } catch {}
}
