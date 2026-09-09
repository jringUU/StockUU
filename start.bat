@echo off
chcp 65001 > nul
title MoneyDJ 智慧選股系統
echo ============================================================
echo   正在啟動 MoneyDJ 智慧選股與 CSV 匯出系統...
echo ============================================================
echo.

:: 檢查是否已有正在監聽 8080 的處理程序，若有則提示
netstat -ano | findstr :8080 | findstr LISTENING > nul
if %ERRORLEVEL% equ 0 (
    echo [提示] 伺服器似乎已在運行中，正在直接開啟瀏覽器...
    start http://localhost:8080/
    goto END
)

:: 在背景或新視窗啟動 PowerShell 伺服器
start "MoneyDJ Screener Server" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0server.ps1"

echo 正在等待伺服器準備就緒...
ping 127.0.0.1 -n 3 > nul

echo 正在開啟瀏覽器...
start http://localhost:8080/

:END
echo.
echo 系統已啟動完成！
echo 請在開啟的網頁中操作選股與匯出功能。
echo 若要關閉伺服器，請關閉 PowerShell 伺服器視窗即可。
ping 127.0.0.1 -n 4 > nul