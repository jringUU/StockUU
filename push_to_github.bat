@echo off
chcp 65001 > nul
title ?券?StockUU 蝔?蝣潸 GitHub (https://github.com/jringUU/StockUU)
echo ============================================================
echo   甇??券?StockUU 蝔?蝣潸 GitHub...
echo   ?格??脣?摨? https://github.com/jringUU/StockUU.git
echo ============================================================
echo.

set "PATH=C:\Users\user\AppData\Local\Programs\MinGit\cmd;%PATH%"

git push -u origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo ------------------------------------------------------------
    echo ?亙?暸?蝡臬歇??獢?蝒?甇??岫?芸??郊 (rebase)...
    git pull origin main --rebase
    git push -u origin main
)

echo.
echo ============================================================
echo   ?券???隢 https://github.com/jringUU/StockUU 瑼Ｚ???echo ============================================================
pause
