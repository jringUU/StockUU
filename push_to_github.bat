@echo off
chcp 65001 > nul
title 推送 StockUU 程式碼至 GitHub (https://github.com/jringUU/StockUU)
echo ============================================================
echo   正在推送 StockUU 程式碼至 GitHub...
echo   目標儲存庫: https://github.com/jringUU/StockUU.git
echo ============================================================
echo.

set "PATH=C:\Program Files\Git\cmd;C:\Users\user\AppData\Local\Programs\MinGit\cmd;%PATH%"

echo [1/3] 檢查並加入異動檔案...
git add -A

echo [2/3] 檢查是否有新修改需提交...
git diff --staged --quiet
if errorlevel 1 (
    echo 正在建立提交...
    git commit -m "feat: 支援 Vercel 雲端即時查詢架構與本機無黑視窗靜默啟動"
)

echo [3/3] 正在推送至 GitHub 遠端 main 分支...
git push -u origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo ------------------------------------------------------------
    echo 偵測到遠端可能有更新，正在嘗試自動同步 (rebase)...
    git pull origin main --rebase
    git push -u origin main
)

echo.
echo ============================================================
echo   推送完成！請至 https://github.com/jringUU/StockUU 檢視。
echo   若已連結 Vercel，Vercel 將在 10 秒內自動完成部署！
echo ============================================================
pause
