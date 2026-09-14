@echo off
chcp 65001 > nul
title StockUU 推送至 GitHub

echo ============================================================
echo   正在推送 StockUU 程式碼至 GitHub...
echo   目標儲存庫: https://github.com/jringUU/StockUU.git
echo ============================================================
echo.

set "PATH=C:\Users\user\AppData\Local\Programs\MinGit\cmd;%PATH%"

echo [1/3] 檢查並加入異動檔案...
git add -A

echo [2/3] 檢查是否有新修改需提交...
git diff --staged --quiet
if errorlevel 1 goto DO_COMMIT
goto DO_PUSH

:DO_COMMIT
echo 正在建立提交...
git commit -m "feat: 支援 GitHub Pages 線上發佈執行與自動化快照部署"

:DO_PUSH
echo.
echo [3/3] 正在推送至 GitHub 遠端 main 分支...
git push -u origin main
if errorlevel 1 goto REBASE_PUSH
goto SUCCESS

:REBASE_PUSH
echo.
echo ------------------------------------------------------------
echo 正在嘗試自動同步遠端更新 (rebase)...
git pull origin main --rebase
git push -u origin main
if errorlevel 1 goto FAILED
goto SUCCESS

:FAILED
echo.
echo ============================================================
echo   [錯誤] 推送失敗，請確認網路連線或遠端權限。
echo ============================================================
pause
exit /b 1

:SUCCESS
echo.
echo ============================================================
echo   推送完成！
echo   • 原始碼儲存庫: https://github.com/jringUU/StockUU
echo   • GitHub Pages 線上終端: https://jringUU.github.io/StockUU/
echo ============================================================
pause
exit /b 0
