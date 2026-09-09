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

## 🚀 本機使用方法

### 方法一：獨立專業選股金融終端（推薦）

1. 雙擊執行目錄中的 `start.bat`。
2. 系統會自動在背景啟動微型本機伺服器，並開啟瀏覽器：`http://localhost:8080/`
3. 包含四大核心實戰分頁：
   - **🏠 智慧選股**：MoneyDJ 多因子即時自選條件篩選，表格內嵌 MACD 走勢微圖，支援一鍵自選波段與匯出 CSV。
   - **🌊 波段手法指標**：波段 6 大核心手法指標實戰檢驗表（週 MACD 金叉、均線多頭、主力鎖碼、營收月增、量價型態、月線防守 SOP）。
   - **⚡ 當沖指標**：嚴格依據《Stock01.pdf》檢核 6 大指標（均價線、江波圖、K線形態、內外盤比、族群差異分析、券商分點主力手法）。
   - **🏛️ 大戶隔日沖**：分析主力分點買超集中度，預防隔日開盤倒貨風險。
4. 關閉方式：關閉彈出的 PowerShell 伺服器黑色視窗即可。

### 方法二：本機手動執行每日選股日報與匯出

- 雙擊執行 `run_daily_report.bat`。
- 系統會立即爬取 MoneyDJ 最新數據，並在 `output/` 目錄生成當日的 HTML 總結報告與 CSV 檔案。

### 方法三：在 MoneyDJ 官方頁面直接使用（書籤工具）

若您直接在 MoneyDJ 官方選股頁面：
1. 開啟 `moneydj_bookmarklet.js`，複製全部代碼並貼入瀏覽器 Console。
2. 點擊出現的藍色按鈕即可一鍵跳轉並取得包含指定條件的篩選結果與匯出 CSV。

---

## 📂 專案檔案結構

```text
StockUU/
├── .github/
│   └── workflows/
│       └── daily_report.yml    # GitHub Actions 每日 22:00 自動執行與發信工作流
├── scripts/
│   ├── daily_report.py         # Python 爬蟲、HTML 總結與 Gmail SMTP 發信腳本
│   └── daily_report.ps1        # PowerShell 本機爬蟲、HTML 與 CSV 產出腳本
├── index.html                  # 專業金融終端選股前端介面
├── style.css                   # 深色主題金融終端樣式庫 (台股紅漲綠跌規範)
├── app.js                      # 前端篩選、排序、搜尋與連動核心
├── server.ps1                  # 本機高效能 HTTP 伺服器
├── start.bat                   # 本機一鍵啟動終端批次檔
├── run_daily_report.bat        # 本機一鍵執行日報產出批次檔
├── moneydj_bookmarklet.js      # MoneyDJ 官方頁面自動化工具代碼
├── .gitignore                  # Git 忽略檔案清單 (排除備份與暫存)
├── README.md                   # 專案說明文件與資安設定指引
└── CHANGELOG.md                # 專案異動歷史記錄檔
```
