@echo off
chcp 65001 >nul
setlocal
title Austec IoT - Build Release APK Android

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Co loi xay ra trong qua trinh bien dich APK.
    pause
)
