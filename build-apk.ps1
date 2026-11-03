[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Austec IoT - Build Release APK Android"

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
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

# 2. Kiểm tra thư mục mobile-app
if (-not (Test-Path $MobileAppDir)) {
    Write-Host "[LỖI] Không tìm thấy thư mục: $MobileAppDir" -ForegroundColor Red
    Write-Host ""
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

if (-not (Test-Path $PubspecPath)) {
    Write-Host "[LỖI] Không tìm thấy file: $PubspecPath" -ForegroundColor Red
    Write-Host ""
    Read-Host "Nhấn Enter để thoát..."
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

$NextVerCode = $CurrentVerCode + 1
$DateStamp = Get-Date -Format "yyyyMMdd_HHmm"

Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " Phiên bản hiện tại trong pubspec.yaml: " -NoNewline -ForegroundColor White
Write-Host "v$CurrentVerName " -ForegroundColor Yellow -NoNewline
Write-Host "(Mã Build Code: " -NoNewline -ForegroundColor White
Write-Host "$CurrentVerCode" -ForegroundColor Yellow -NoNewline
Write-Host ")" -ForegroundColor White
Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " [1] Tự động tăng mã Build (+1 -> Build $NextVerCode) để Android cho phép Cập nhật đè (Mặc định)" -ForegroundColor Green
Write-Host " [2] Giữ nguyên phiên bản hiện tại ($CurrentVerName+$CurrentVerCode)" -ForegroundColor White
Write-Host " [3] Nhập phiên bản mới tùy ý (Ví dụ: 2.0.1, 2.1.0...)" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkGray

$Choice = Read-Host "Chọn [1, 2, 3] (Nhấn Enter để chọn mặc định [1])"
if ([string]::IsNullOrWhiteSpace($Choice)) {
    $Choice = "1"
}

$TargetVerName = $CurrentVerName
$TargetVerCode = $NextVerCode

switch ($Choice) {
    "1" {
        $TargetVerName = $CurrentVerName
        $TargetVerCode = $NextVerCode
        $NewPubspec = [regex]::Replace($PubspecContent, 'version:\s*[^\r\n]+', "version: $TargetVerName+$TargetVerCode")
        [System.IO.File]::WriteAllText($PubspecPath, $NewPubspec, [System.Text.Encoding]::UTF8)
        Write-Host "-> Đã cập nhật pubspec.yaml: $TargetVerName+$TargetVerCode" -ForegroundColor Green
    }
    "2" {
        $TargetVerName = $CurrentVerName
        $TargetVerCode = $CurrentVerCode
        Write-Host "-> Giữ nguyên phiên bản: $TargetVerName+$TargetVerCode" -ForegroundColor Cyan
    }
    "3" {
        $InputName = Read-Host "Nhập tên phiên bản mới (vd: 2.0.1, để trống lấy $CurrentVerName)"
        if ([string]::IsNullOrWhiteSpace($InputName)) { $InputName = $CurrentVerName }
        
        $InputCode = Read-Host "Nhập mã build code số nguyên (vd: $NextVerCode, để trống lấy $NextVerCode)"
        if ([string]::IsNullOrWhiteSpace($InputCode)) { $InputCode = $NextVerCode }
        
        $TargetVerName = $InputName
        $TargetVerCode = [int]$InputCode
        $NewPubspec = [regex]::Replace($PubspecContent, 'version:\s*[^\r\n]+', "version: $TargetVerName+$TargetVerCode")
        [System.IO.File]::WriteAllText($PubspecPath, $NewPubspec, [System.Text.Encoding]::UTF8)
        Write-Host "-> Đã cập nhật pubspec.yaml: $TargetVerName+$TargetVerCode" -ForegroundColor Green
    }
    Default {
        $TargetVerName = $CurrentVerName
        $TargetVerCode = $NextVerCode
    }
}

Write-Host ""
Write-Host "[1/3] Đang cập nhật gói thư viện (flutter pub get)..." -ForegroundColor Cyan
Push-Location $MobileAppDir
try {
    & flutter pub get
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[LỖI] 'flutter pub get' thất bại!" -ForegroundColor Red
        Pop-Location
        Read-Host "Nhấn Enter để thoát..."
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "[2/3] Đang biên dịch Release APK (v$TargetVerName - Build $TargetVerCode)..." -ForegroundColor Cyan
    Write-Host "Quá trình này có thể mất từ 1 - 3 phút, vui lòng chờ..." -ForegroundColor Gray
    Write-Host ""

    & flutter build apk --release --build-name=$TargetVerName --build-number=$TargetVerCode

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[LỖI] Biên dịch APK thất bại! Vui lòng xem thông báo lỗi chi tiết ở trên." -ForegroundColor Red
        Pop-Location
        Read-Host "Nhấn Enter để thoát..."
        exit $LASTEXITCODE
    }

    $SourceApk = Join-Path $MobileAppDir "build\app\outputs\flutter-apk\app-release.apk"
    if (-not (Test-Path $SourceApk)) {
        Write-Host "[LỖI] Không tìm thấy file APK đầu ra tại: $SourceApk" -ForegroundColor Red
        Pop-Location
        Read-Host "Nhấn Enter để thoát..."
        exit 1
    }

    # 4. Xuất file vào dist-apk
    if (-not (Test-Path $DistDir)) {
        New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
    }

    $VersionedName = "Austec_IoT_v${TargetVerName}_b${TargetVerCode}_${DateStamp}.apk"
    $VersionedApkPath = Join-Path $DistDir $VersionedName
    $LatestApkPath = Join-Path $DistDir "Austec_IoT_latest.apk"

    Copy-Item $SourceApk $VersionedApkPath -Force
    Copy-Item $SourceApk $LatestApkPath -Force

    $ApkItem = Get-Item $VersionedApkPath
    $SizeMB = [math]::Round($ApkItem.Length / 1MB, 2)

    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host "             [THÀNH CÔNG] ĐÃ BIÊN DỊCH RELEASE APK XONG!" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Phiên bản: v$TargetVerName (Build Code: $TargetVerCode)" -ForegroundColor Yellow
    Write-Host "Kích thước: $SizeMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "1. File APK có gắn Version & Thời gian (để lưu trữ theo dõi):" -ForegroundColor Cyan
    Write-Host "   -> $VersionedApkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "2. File APK bản mới nhất (tiện copy nhanh để gửi khách):" -ForegroundColor Cyan
    Write-Host "   -> $LatestApkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Lưu ý cho người dùng Android:" -ForegroundColor Yellow
    Write-Host " - Do mã Build Code đã được tăng lên ($TargetVerCode), khách hàng đang dùng app cũ" -ForegroundColor Gray
    Write-Host "   chỉ cần mở file APK và chọn 'Cập nhật' (Update), KHÔNG cần phải gỡ app ra." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Đang mở thư mục chứa file APK trong File Explorer..." -ForegroundColor Gray

    Start-Process explorer.exe "/select,`"$VersionedApkPath`""
}
finally {
    Pop-Location
}

Write-Host ""
Read-Host "Nhấn Enter để hoàn tất..."
