@echo off
chcp 65001 >nul
title Austec IoT - Build Release APK Android

echo ========================================================================
echo                  AUSTEC IOT PLATFORM - BUILD APK
echo            Tự động đóng gói ứng dụng di động cho Android
echo ========================================================================
echo.

:: Xác định đường dẫn thư mục gốc và thư mục mobile-app
set "PROJECT_ROOT=%~dp0"
set "APP_DIR=%PROJECT_ROOT%mobile-app"
set "OUTPUT_DIR=%PROJECT_ROOT%dist-apk"

:: Kiểm tra lệnh flutter trong môi trường
where flutter >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Không tìm thấy lệnh 'flutter' trong hệ thống (PATH)!
    echo Vui lòng đảm bảo Flutter SDK đã được cài đặt và thêm vào biến môi trường PATH.
    echo.
    pause
    exit /b 1
)

:: Kiểm tra thư mục mobile-app
if not exist "%APP_DIR%" (
    echo [LỖI] Không tìm thấy thư mục dự án: %APP_DIR%
    echo.
    pause
    exit /b 1
)

cd /d "%APP_DIR%"

echo [1/3] Đang cập nhật gói thư viện (flutter pub get)...
call flutter pub get
if %errorlevel% neq 0 (
    echo [LỖI] Cập nhật thư viện thất bại!
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Đang biên dịch Release APK (flutter build apk --release)...
echo Quá trình này có thể mất từ 1 - 3 phút, vui lòng chờ...
echo.

call flutter build apk --release %*
if %errorlevel% neq 0 (
    echo.
    echo [LỖI] Quá trình biên dịch APK thất bại! Vui lòng xem log chi tiết ở trên.
    echo.
    pause
    exit /b %errorlevel%
)

:: Kiểm tra file APK đầu ra
set "SOURCE_APK=%APP_DIR%\build\app\outputs\flutter-apk\app-release.apk"
if not exist "%SOURCE_APK%" (
    echo.
    echo [LỖI] Không tìm thấy file APK tại: %SOURCE_APK%
    echo.
    pause
    exit /b 1
)

:: Tạo thư mục xuất file ở thư mục gốc để người dùng dễ lấy
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
)

set "TARGET_APK=%OUTPUT_DIR%\Austec_IoT_v2.0.0.apk"
copy /y "%SOURCE_APK%" "%TARGET_APK%" >nul
copy /y "%SOURCE_APK%" "%OUTPUT_DIR%\app-release.apk" >nul

echo.
echo ========================================================================
echo              [THÀNH CÔNG] ĐÃ BIÊN DỊCH RELEASE APK XONG!
echo ========================================================================
echo.
echo File APK đã được sao chép ra thư mục xuất bản:
echo   -> %TARGET_APK%
echo.
echo Bạn có thể gửi file này qua Zalo, Telegram, Google Drive,...
echo Người dùng chỉ cần tải về điện thoại Android và mở lên để cài đặt.
echo.
echo Đang mở thư mục chứa file APK trong File Explorer...

:: Mở File Explorer và chọn sẵn file APK vừa tạo
explorer.exe /select,"%TARGET_APK%"

echo.
pause
