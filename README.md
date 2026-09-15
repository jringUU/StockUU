# StockUU - MoneyDJ 智慧選股與每日自動化策略日報系統

這套工具專為自動執行 **MoneyDJ（嘉實資訊）選股專家系統** 的多因子篩選策略所設計，支援技術面、籌碼面、營收獲利面條件，並能**即時展示篩選結果**、**一鍵匯出相容 Excel 的 CSV 檔案**，以及**每日晚上 10:00 自動執行並將總結報告與 CSV 寄送至您的電子郵件**。

GitHub 儲存庫：[https://github.com/jringUU/StockUU](https://github.com/jringUU/StockUU)

---

## 🎯 預設篩選策略條件

1. **技術面**：`DIF值 向上突破 MACD（週）`（代碼：`1301`）
   - 中長線週線級別多方波段起漲訊號。
2. **籌碼面**：`近 20 日券商主力買超大於 200 張`（代碼：`370`）
   - 券商主力近期持續卡位、籌碼集中度高。
3. **營收獲利面**：`近 3 個月平均營收月成長率大於 1 %`（代碼：`5720`）
   - 營運基本面維持正向月成長態勢。
4. **過濾條件**：過濾股價 5 元以下、5 日均量在 500 張以下之個股（`D=1`）。

---

## ⏰ 每日晚上 10 點自動化執行與郵件發送 (GitHub Actions)

本專案已配置 GitHub Actions 雲端工作流（`.github/workflows/daily_report.yml`）：
- **排程時間**：每天晚上 **22:00（台灣時間 UTC+8 / UTC 14:00）** 自動在 GitHub 雲端執行。
- **無人值守**：**您的電腦即使關機、休眠，GitHub 雲端依然會準時執行並寄出信件**。
- **產出內容**：
  1. 結構化 HTML 策略總結信件（含統計卡片、符合標的清單、多頭評級、實戰操作建議）。
  2. 夾帶 `StockUU_選股日報_YYYYMMDD.csv` 附件（含 UTF-8 BOM，Excel 點開繁中絕不亂碼）。
- **手動一鍵觸發**：在 GitHub 倉庫頁面點擊 **Actions** 分頁 -> 選擇「每日晚上 10 點選股與郵件發送日報」-> 點擊 **Run workflow** 即可隨時立即測試發信。

---

## 🔒 公開專案 (Public Repository) 資安防護說明與設定

> **問：我的 GitHub 專案是 Public（公開），把我的 Mail 放裡面會有資安問題嗎？**  
> **答：**  
> 1. **不要將 Email 與密碼直接寫在程式碼裡**：若寫在公開代碼中，爬蟲會自動抓取 Email 造成大量垃圾信，而若誤把登入密碼寫入，更會導致 Google 帳號被盜。  
> 2. **本專案採用 GitHub Secrets（安全金庫）架構**：所有敏感資料（Email、密碼）皆保存在 GitHub 後台加密區，程式碼內完全零硬編碼（Zero-Leakage）。任何瀏覽公開專案的人都看不到您的 Email 與密碼！

### 🛠️ 3 步驟設定 GitHub Secrets（只需設定一次）：

#### 第一步：取得 Google「應用程式密碼 (App Password)」
1. 前往 Google 帳戶安全性設定：[https://myaccount.google.com/security](https://myaccount.google.com/security)
2. 確認已開啟 **兩步驟驗證 (2-Step Verification)**。
3. 搜尋或點擊 **「應用程式密碼」**（App Passwords）。
4. 應用程式名稱輸入 `StockUU`，點擊「建立」，系統會產生一組 **16 個英文字母的密碼**（例如：`abcd efgh ijkl mnop`），請複製保存。

#### 第二步：在 GitHub 儲存庫新增 Secrets
1. 前往您的 GitHub 儲存庫：[https://github.com/jringUU/StockUU](https://github.com/jringUU/StockUU)
2. 點擊頂部 **Settings**（設定） -> 左側側邊欄點選 **Secrets and variables** -> **Actions**。
3. 點擊綠色按鈕 **New repository secret**，依序新增以下三個 Secret：
   - **名稱**：`GMAIL_APP_PASSWORD`  
     **內容**：貼上剛才取得的 16 碼 Google 應用程式密碼（不含空格）。
   - **名稱**：`GMAIL_USER`  
     **內容**：`jringyou@gmail.com`（發信 Gmail 信箱）。
   - **名稱**：`RECEIVER_EMAIL`  
     **內容**：`jringyou@gmail.com`（接收日報的信箱）。

#### 第三步：測試發信
前往 GitHub 倉庫頂部的 **Actions** 分頁 -> 點選左側「每日晚上 10 點選股與郵件發送日報」-> 點擊右側 **Run workflow** 按鈕。約 30 秒後，您的 Gmail 即可收到當日的選股日報與 CSV 附件！

---

## 🚀 本機與雲端使用方法

### 方法一：本機極速啟動（100% 靜默無黑視窗）

1. 雙擊目錄中的 `start.bat`（或 `start.vbs`）。
2. 系統會自動以完全隱藏視窗在背景提供服務，並直接開啟預設瀏覽器：`http://localhost:8080/`
3. **完全沒有黑色命令提示字元視窗**，體驗就像開啟原生桌面應用程式！
4. 若欲停止本機背景服務，雙擊 `stop.bat` 即可一鍵安全結束。

### 方法二：部署至 Vercel 雲端免費平台（隨處可開、免開電腦）

本專案已完全配置好 Vercel Serverless 架構（支援 `api/screen.py`）：
1. 雙擊 `push_to_github.bat` 將最新程式碼推送到 GitHub。
2. 前往 [Vercel 官網 (vercel.com)](https://vercel.com)，以 GitHub 帳號登入。
3. 點擊 **Add New Project**，選擇您的儲存庫 `StockUU`，直接點擊 **Deploy**。
4. 約 30 秒後即可取得專屬公開網址（例如 `https://stock-uu.vercel.app`），手機、平板、電腦隨時隨地開啟，點「開始篩選」即由雲端即時向 MoneyDJ 查詢運算！

---

## 📂 專案檔案結構

```text
StockUU/
├── api/
│   └── screen.py               # Vercel 雲端 Serverless 函數 (Python 即時查詢 MoneyDJ)
├── .github/
│   └── workflows/
│       └── daily_report.yml    # GitHub Actions 每日 22:00 自動執行與發信工作流
├── scripts/
│   ├── daily_report.py         # Python 爬蟲、HTML 總結與 Gmail SMTP 發信腳本
│   └── daily_report.ps1        # PowerShell 本機爬蟲、HTML 與 CSV 產出腳本
├── index.html                  # 專業金融終端選股前端介面
├── style.css                   # 深色主題金融終端樣式庫 (台股紅漲綠跌規範)
├── app.js                      # 前端整合核心 (自動適配本機與 Vercel 雲端 API)
├── vercel.json                 # Vercel 路由配置檔
├── start.bat                   # 本機一鍵啟動批次檔 (呼叫 start.vbs 靜默啟動)
├── start.vbs                   # 100% 靜默無黑視窗啟動腳本
├── stop.bat                    # 本機一鍵停止背景服務批次檔
├── push_to_github.bat          # 一鍵自動提交並推送到 GitHub 工具
├── run_daily_report.bat        # 本機一鍵執行日報產出批次檔
├── moneydj_bookmarklet.js      # MoneyDJ 官方頁面自動化工具代碼
├── .gitignore                  # Git 忽略檔案清單
├── README.md                   # 專案說明文件與資安設定指引
└── CHANGELOG.md                # 專案異動歷史記錄檔
```
