param(
    [switch]$AutoDetect,
    [string]$HostIp = "",
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$RootEnvPath = Join-Path $RootDir ".env"
$BackendEnvPath = Join-Path $RootDir "backend\.env"
$MediaMtxDir = Join-Path $RootDir "backend\mediamtx"
$FirmwarePath = Join-Path (Split-Path -Parent $RootDir) "esp32cam1.ino"

if (-not (Test-Path $RootEnvPath)) {
    throw "Không tìm thấy file .env tại $RootEnvPath. Hãy copy từ .env.example trước."
}

function Set-EnvKey {
    param([string]$FilePath, [string]$Key, [string]$Value)
    $raw = if (Test-Path $FilePath) { Get-Content $FilePath -Raw -Encoding UTF8 } else { "" }
    $pattern = "(?m)^" + [regex]::Escape($Key) + "=.*$"
    $replacement = "$Key=$Value"
    if ($raw -match $pattern) {
        $raw = [regex]::Replace($raw, $pattern, $replacement)
    } else {
        if ($raw.Length -gt 0 -and -not $raw.EndsWith("`n")) { $raw += "`r`n" }
        $raw += "$replacement`r`n"
    }
    [System.IO.File]::WriteAllText($FilePath, $raw, [System.Text.UTF8Encoding]::new($false))
}

function Read-EnvMap {
    param([string]$FilePath)
    $map = @{}
    Get-Content $FilePath -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $idx = $line.IndexOf('=')
            $map[$line.Substring(0, $idx).Trim()] = $line.Substring($idx + 1).Trim()
        }
    }
    return $map
}

$envMap = Read-EnvMap -FilePath $RootEnvPath
$backendPort = if ($envMap["BACKEND_PORT"]) { $envMap["BACKEND_PORT"] } else { "4000" }

if ($AutoDetect) {
    $wifiIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.InterfaceAlias -notmatch "vEthernet|Loopback|WSL|VMware|VirtualBox|Bluetooth"
        } |
        Sort-Object @{ Expression = { if ($_.InterfaceAlias -eq "Wi-Fi") { 0 } else { 1 } } }, InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress

    if (-not $wifiIp) {
        throw "Không dò được IPv4 Wi-Fi hiện tại trên Windows. Kiểm tra kết nối Wi-Fi (không tự dùng IP giả)."
    }
    $HostIp = $wifiIp
    Write-Host "[AutoDetect] Đã phát hiện IPv4 LAN hiện tại: $HostIp" -ForegroundColor Cyan
}

if (-not [string]::IsNullOrWhiteSpace($HostIp)) {
    $cleanIp = $HostIp.Trim()
    Set-EnvKey -FilePath $RootEnvPath -Key "SERVER_HOST" -Value $cleanIp
    Set-EnvKey -FilePath $RootEnvPath -Key "MEDIAMTX_HOST" -Value $cleanIp
    Set-EnvKey -FilePath $RootEnvPath -Key "LOCAL_BACKEND_URL" -Value "http://${cleanIp}:${backendPort}"
    $envMap = Read-EnvMap -FilePath $RootEnvPath
}

$mediaHost = $envMap["MEDIAMTX_HOST"]
if ([string]::IsNullOrWhiteSpace($mediaHost) -or $mediaHost -eq "YOUR_WIFI_IP_OR_VPS_HOST") {
    throw "MEDIAMTX_HOST trong $RootEnvPath chưa được cấu hình hợp lệ."
}

$rtspPort = if ($envMap["STREAM_SERVER_PORT_RTSP"]) { $envMap["STREAM_SERVER_PORT_RTSP"] } else { "8554" }
$hlsPort = if ($envMap["STREAM_SERVER_PORT_HLS"]) { $envMap["STREAM_SERVER_PORT_HLS"] } else { "8888" }
$webrtcPort = if ($envMap["STREAM_SERVER_PORT_WEBRTC"]) { $envMap["STREAM_SERVER_PORT_WEBRTC"] } else { "8889" }
$mqttHost = if ($envMap["MQTT_BROKER_HOST"]) { $envMap["MQTT_BROKER_HOST"] } else { "broker.emqx.io" }
$mqttPort = if ($envMap["MQTT_BROKER_PORT"]) { $envMap["MQTT_BROKER_PORT"] } else { "1883" }
$mqttUrl = if ($envMap["MQTT_BROKER_URL"]) { $envMap["MQTT_BROKER_URL"] } else { "mqtt://${mqttHost}:${mqttPort}" }

# 1. Đồng bộ backend/.env (giữ nguyên toàn bộ DB / JWT / R2 secrets)
if (Test-Path $BackendEnvPath) {
    Set-EnvKey -FilePath $BackendEnvPath -Key "PORT" -Value $backendPort
    Set-EnvKey -FilePath $BackendEnvPath -Key "MEDIAMTX_HOST" -Value $mediaHost
    Set-EnvKey -FilePath $BackendEnvPath -Key "STREAM_SERVER_PORT_RTSP" -Value $rtspPort
    Set-EnvKey -FilePath $BackendEnvPath -Key "STREAM_SERVER_PORT_HLS" -Value $hlsPort
    Set-EnvKey -FilePath $BackendEnvPath -Key "STREAM_SERVER_PORT_WEBRTC" -Value $webrtcPort
    Set-EnvKey -FilePath $BackendEnvPath -Key "MQTT_BROKER_URL" -Value $mqttUrl
    Write-Host "[1/3] Đã đồng bộ -> $BackendEnvPath (MEDIAMTX_HOST=$mediaHost)" -ForegroundColor Green
}

# 2. Đồng bộ block #define trong firmware esp32cam1.ino
if (Test-Path $FirmwarePath) {
    $fw = Get-Content $FirmwarePath -Raw -Encoding UTF8
    $fw = [regex]::Replace($fw, '(?m)^(#define\s+MEDIAMTX_HOST\s+)"[^"]*"', "`$1`"$mediaHost`"")
    $fw = [regex]::Replace($fw, '(?m)^(#define\s+MEDIAMTX_PORT\s+)\d+', "`${1}$rtspPort")
    $fw = [regex]::Replace($fw, '(?m)^(#define\s+DEFAULT_MQTT_HOST\s+)"[^"]*"', "`$1`"$mqttHost`"")
    $fw = [regex]::Replace($fw, '(?m)^(#define\s+DEFAULT_MQTT_PORT\s+)\d+', "`${1}$mqttPort")
    [System.IO.File]::WriteAllText($FirmwarePath, $fw, [System.Text.UTF8Encoding]::new($false))
    Write-Host "[2/3] Đã đồng bộ -> $FirmwarePath (MEDIAMTX_HOST=${mediaHost}:${rtspPort})" -ForegroundColor Green
}

# 3. Cập nhật lại container Docker MediaMTX với --env-file
if (-not $SkipDocker) {
    Push-Location $MediaMtxDir
    try {
        & docker compose --env-file $RootEnvPath up -d --force-recreate
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose thất bại với mã lỗi $LASTEXITCODE"
        }
        Write-Host "[3/3] Đã khởi động lại container MediaMTX với cấu hình từ .env" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host "[3/3] Bỏ qua khởi động lại Docker MediaMTX theo cờ -SkipDocker." -ForegroundColor Yellow
}

$pubWifi = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -and $_.NetworkCategory -eq "Public" }
if ($pubWifi) {
    Write-Host ""
    Write-Host "[CẢNH BÁO FIREWALL] Wi-Fi '$($pubWifi.Name)' đang ở chế độ Public - Windows Defender có thể chặn ESP32/điện thoại truy cập MediaMTX & Backend!" -ForegroundColor Yellow
    Write-Host "Hãy chuyển sang Private network trong Windows Settings -> Wi-Fi properties." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Xong! Nếu Backend Local (cổng $backendPort) đang chạy sẵn với IP cũ, hãy khởi động lại Backend để nạp .env mới." -ForegroundColor Cyan
Write-Host "Với ESP32 đang online, khi bấm Xem Camera trên App, Backend sẽ tự đẩy 'rtsp:${mediaHost}:${rtspPort}' qua MQTT." -ForegroundColor Cyan

