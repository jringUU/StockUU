@echo off
chcp 65001 > nul
title StockUU 每日智慧選股與郵件發送
echo ========================================================
echo   StockUU 智慧選股日報作業啟動中...
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\daily_report.ps1"
echo.
echo ========================================================
echo   作業執行完畢！
echo ========================================================
pause
