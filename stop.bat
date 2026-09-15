@echo off
chcp 65001 > nul
title 停止 StockUU 服務
echo 正在停止 StockUU 背景伺服器...
powershell -Command "Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.ps1*' } | Stop-Process -Force"
echo [成功] StockUU 背景伺服器已安全停止。
timeout /t 2 > nul
