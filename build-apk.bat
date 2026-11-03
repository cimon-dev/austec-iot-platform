@echo off
setlocal
chcp 65001 >nul
title Austec IoT - Build Release APK Android

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk.ps1"
if %errorlevel% neq 0 (
    echo.
    echo [LÖI] Có l×i x£y ra trong quá trình thñc thi.
    pause
)
