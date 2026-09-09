@echo off
chcp 65001 > nul
title 推送 StockUU 程式碼至 GitHub (https://github.com/jringUU/StockUU)
echo ============================================================
echo   正在推送 StockUU 程式碼至 GitHub...
echo   目標儲存庫: https://github.com/jringUU/StockUU.git
echo ============================================================
echo.

set "PATH=C:\Users\user\AppData\Local\Programs\MinGit\cmd;%PATH%"

git push -u origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo ------------------------------------------------------------
    echo 若出現遠端已有檔案衝突，正在嘗試自動同步 (rebase)...
    git pull origin main --rebase
    git push -u origin main
)

echo.
echo ============================================================
echo   推送完成！請至 https://github.com/jringUU/StockUU 檢視。
echo ============================================================
pause
