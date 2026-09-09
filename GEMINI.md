# 專案開發守則與行為規範

## 🔴 重要強制規則（每次修改必做）

1. **修改前強制建立備份**：
   - 每次在對專案任何檔案進行編輯、覆蓋或刪除前，**必須先建立時間戳記備份資料夾**：
     `c:\CodeZone\backups\backup_YYYYMMDD_HHMMSS\`
   - 將即將修改或全專案核心檔案（`index.html`, `style.css`, `app.js`, `server.ps1`, `start.bat`, `moneydj_bookmarklet.js`, `README.md` 等）複製至該備份資料夾。
   - **備份數量限制**：備份目錄（`c:\CodeZone\backups\`）**僅保留最新與次新（共 2 個）日期的資料夾**，超過時自動清理較舊的備份資料夾。

2. **每次修改後更新異動記錄檔**：
   - 修改完成後，**必須在 [CHANGELOG.md](file:///c:/CodeZone/CHANGELOG.md) 最上方追加最新異動紀錄**。
   - 紀錄格式包含：
     - 日期時間 `[YYYY-MM-DD HH:mm:ss]`
     - 異動目的
     - 異動檔案
     - 備份存放路徑
     - 詳細修改內容
