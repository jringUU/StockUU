@echo off
chcp 65001 > nul
:: 透過 VBScript 以完全隱藏模式在背景啟動伺服器並開啟瀏覽器（完全無黑色視窗）
start "" wscript.exe "%~dp0start.vbs"
exit /b 0