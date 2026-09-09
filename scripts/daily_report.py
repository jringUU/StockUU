# -*- coding: utf-8 -*-
"""
StockUU 每日智慧選股與郵件發送日報腳本
- 自動爬取 MoneyDJ 篩選條件：
  1. 週 MACD 金叉 (DIF 向上突破 MACD)
  2. 近 20 日券商主力買超大於 200 張
  3. 近 3 個月平均營收月成長率大於 1%
- 產出結構化 HTML 總結郵件與 CSV 附檔 (UTF-8 with BOM)
- 支援透過 Gmail SMTP 安全發信 (搭配 GitHub Secrets 零資安外洩)
"""

import os
import re
import sys
import smtplib
import urllib.request
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

def get_tw_now():
    """取得台灣時間 (UTC+8)"""
    tz_tw = timezone(timedelta(hours=8))
    return datetime.now(tz_tw)

def fetch_moneydj_data():
    """從 MoneyDJ 爬取符合條件之股票"""
    url = "https://concords.moneydj.com/z/zk/zkf/zkResult.asp?D=1&A=x@1301;x@370,a@20,b@200;x@5720,a@3,b@1&site="
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw_bytes = response.read()
            html = raw_bytes.decode('cp950', errors='ignore')
    except Exception as e:
        print(f"[ERROR] 連線 MoneyDJ 失敗: {e}")
        return []

    row_pattern = re.compile(r'<tr class="?zkt2R(?:_rev)?"?>([\s\S]*?)</tr>', re.IGNORECASE)
    td_pattern = re.compile(r'<td[^>]*>([\s\S]*?)</td>', re.IGNORECASE)
    tag_cleaner = re.compile(r'<[^>]+>')

    rows = row_pattern.findall(html)
    stocks = []

    for row in rows:
        tds = td_pattern.findall(row)
        if len(tds) >= 8:
            raw0 = tds[0]
            code_match = re.search(r"Link2Stk\('(\d+)'\)", raw0)
            code = code_match.group(1) if code_match else ""
            clean0 = tag_cleaner.sub('', raw0).strip()
            name = clean0[len(code):].strip() if code and clean0.startswith(code) else clean0
            if name == "騰輝電子-K":
                name = "騰輝電子-KY"

            close = tag_cleaner.sub('', tds[1]).strip()
            change = tag_cleaner.sub('', tds[2]).strip()
            change_pct = tag_cleaner.sub('', tds[3]).strip()
            dif = tag_cleaner.sub('', tds[4]).strip()
            macd = tag_cleaner.sub('', tds[5]).strip()
            major_buy = tag_cleaner.sub('', tds[6]).strip().replace(',', '')
            rev_growth = tag_cleaner.sub('', tds[7]).strip()

            # 計算 OSC 與多頭評級
            try:
                dif_f = float(dif)
                macd_f = float(macd)
                osc = round(dif_f - macd_f, 2)
            except Exception:
                osc = 0.0

            try:
                buy_val = int(major_buy)
            except Exception:
                buy_val = 0

            try:
                rev_val = float(rev_growth)
            except Exception:
                rev_val = 0.0

            if osc > 0 and buy_val >= 500 and rev_val >= 2.0:
                rating = "🔥 強勢多頭"
                rating_badge = "background:#ef4444; color:#fff;"
            elif osc > 0 and buy_val >= 200 and rev_val >= 1.0:
                rating = "🟢 穩健多頭"
                rating_badge = "background:#10b981; color:#fff;"
            else:
                rating = "🟡 觀察多頭"
                rating_badge = "background:#f59e0b; color:#fff;"

            stocks.append({
                "stkCode": code,
                "stkName": name,
                "closePrice": close,
                "change": change,
                "changePct": change_pct,
                "difWeek": dif,
                "macdWeek": macd,
                "osc": f"+{osc}" if osc > 0 else str(osc),
                "majorBuy": major_buy,
                "revGrowth": rev_growth,
                "rating": rating,
                "ratingBadge": rating_badge
            })

    return stocks

def generate_csv(stocks, file_path):
    """產出含 UTF-8 BOM 之 CSV 檔案"""
    headers = [
        "股票代號", "股票名稱", "收盤價", "漲跌", "漲跌幅",
        "DIF(週)", "MACD(週)", "OSC紅柱(週)", "近20日主力買超(張)",
        "近3月平均營收月成長率(%)", "多頭評級"
    ]
    lines = [",".join(headers)]
    for s in stocks:
        row = [
            f'"{s["stkCode"]}"',
            f'"{s["stkName"]}"',
            s["closePrice"],
            s["change"],
            f'"{s["changePct"]}"',
            s["difWeek"],
            s["macdWeek"],
            s["osc"],
            s["majorBuy"],
            s["revGrowth"],
            f'"{s["rating"]}"'
        ]
        lines.append(",".join(row))

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8-sig") as f:
        f.write("\r\n".join(lines))
    print(f"[OK] CSV 報告已生成: {file_path}")

def generate_html_report(stocks, date_str):
    """產出精美、自適應的 HTML 郵件總結"""
    total = len(stocks)
    strong_count = sum(1 for s in stocks if "強勢多頭" in s["rating"])
    solid_count = sum(1 for s in stocks if "穩健多頭" in s["rating"])

    # 找出主力買超最高者
    top_buy = max(stocks, key=lambda s: int(s["majorBuy"]) if s["majorBuy"].isdigit() else 0, default=None)
    top_buy_str = f"{top_buy['stkName']} ({top_buy['majorBuy']}張)" if top_buy else "無"

    # 找出營收成長最高者
    def parse_rev(val):
        try:
            return float(val)
        except Exception:
            return -999.0
    top_rev = max(stocks, key=lambda s: parse_rev(s["revGrowth"]), default=None)
    top_rev_str = f"{top_rev['stkName']} (+{top_rev['revGrowth']}%)" if top_rev else "無"

    rows_html = ""
    for s in stocks:
        chg_val = float(s["change"]) if s["change"] not in ("-", "") else 0.0
        chg_color = "#ef4444" if chg_val > 0 else ("#10b981" if chg_val < 0 else "#6b7280")
        chg_sign = "+" if chg_val > 0 else ""

        rows_html += f"""
        <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 8px; font-weight: bold; color: #38bdf8; font-family: monospace;">{s['stkCode']}</td>
            <td style="padding: 10px 8px; font-weight: 600; color: #f1f5f9;">{s['stkName']}</td>
            <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: {chg_color}; font-family: monospace;">{s['closePrice']}</td>
            <td style="padding: 10px 8px; text-align: right; color: {chg_color}; font-family: monospace;">{chg_sign}{s['change']} ({s['changePct']})</td>
            <td style="padding: 10px 8px; text-align: right; color: #cbd5e1; font-family: monospace;">{s['difWeek']} / {s['macdWeek']}</td>
            <td style="padding: 10px 8px; text-align: right; color: #ef4444; font-weight: 600; font-family: monospace;">{s['osc']}</td>
            <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #f59e0b; font-family: monospace;">{s['majorBuy']} 張</td>
            <td style="padding: 10px 8px; text-align: right; color: #10b981; font-weight: bold; font-family: monospace;">+{s['revGrowth']}%</td>
            <td style="padding: 10px 8px; text-align: center;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; {s['ratingBadge']}">{s['rating']}</span>
            </td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StockUU 每日智慧選股與策略總結日報</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f1f5f9;">
        <div style="max-width: 900px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            
            <!-- 標頭 Header -->
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 24px; border-bottom: 2px solid #38bdf8;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px;">📈 StockUU 智慧選股每日策略總結</h1>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">MoneyDJ 三大黃金戰法自動檢核：週 MACD 金叉 ✕ 主力買超 ✕ 營收月增成長</p>
                    </div>
                    <div style="margin-top: 10px; text-align: right;">
                        <span style="background: #38bdf8; color: #0f172a; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px;">📅 {date_str} 22:00 執行</span>
                    </div>
                </div>
            </div>

            <!-- 數據統計卡片 Summary Cards -->
            <div style="padding: 20px 24px; background: #0f172a; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; border-bottom: 1px solid #334155;">
                <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #38bdf8;">
                    <div style="font-size: 12px; color: #94a3b8;">符合選股標的數</div>
                    <div style="font-size: 24px; font-weight: bold; color: #38bdf8; margin-top: 4px;">{total} <span style="font-size: 13px; font-weight: normal; color: #cbd5e1;">檔</span></div>
                </div>
                <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 12px; color: #94a3b8;">🔥 強勢多頭標的</div>
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444; margin-top: 4px;">{strong_count} <span style="font-size: 13px; font-weight: normal; color: #cbd5e1;">檔</span></div>
                </div>
                <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 12px; color: #94a3b8;">🏆 主力買超首位</div>
                    <div style="font-size: 15px; font-weight: bold; color: #f59e0b; margin-top: 8px;">{top_buy_str}</div>
                </div>
                <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-size: 12px; color: #94a3b8;">🚀 營收月增首位</div>
                    <div style="font-size: 15px; font-weight: bold; color: #10b981; margin-top: 8px;">{top_rev_str}</div>
                </div>
            </div>

            <!-- 選股清單表格 Stock Table -->
            <div style="padding: 20px 24px; overflow-x: auto;">
                <h3 style="margin: 0 0 12px; font-size: 16px; color: #e2e8f0; display: flex; align-items: center; gap: 8px;">
                    🎯 篩選明細列表 ({total} 檔標的)
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                    <thead>
                        <tr style="background: #0f172a; color: #94a3b8; border-bottom: 2px solid #38bdf8;">
                            <th style="padding: 10px 8px;">代號</th>
                            <th style="padding: 10px 8px;">股票名稱</th>
                            <th style="padding: 10px 8px; text-align: right;">收盤價</th>
                            <th style="padding: 10px 8px; text-align: right;">漲跌</th>
                            <th style="padding: 10px 8px; text-align: right;">週 DIF/MACD</th>
                            <th style="padding: 10px 8px; text-align: right;">OSC紅柱</th>
                            <th style="padding: 10px 8px; text-align: right;">20日主力(張)</th>
                            <th style="padding: 10px 8px; text-align: right;">營收月增(rev)</th>
                            <th style="padding: 10px 8px; text-align: center;">綜合評級</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html if stocks else '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">今日無符合條件之標的</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- 實戰操作指引 Practical Guideline -->
            <div style="margin: 0 24px 20px; padding: 16px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">💡 波段操作實戰提醒：</div>
                <div>1. <strong>進場準則：</strong>週 MACD 紅柱剛起漲放大、主力買超連續集結且近3月營收持續創高之標的，逢拉回量縮日線支撐為較佳布局點。</div>
                <div>2. <strong>風控紀律：</strong>跌破進場當週 K 棒低點或跌破 10 日均線時，嚴守停損；獲利達波段目標（如 10%~20%）時分批獲利了結。</div>
                <div>3. <strong>詳細數據：</strong>完整名單與歷史欄位已同步匯出為 CSV 附件（<code>StockUU_選股日報_{date_str.replace('/', '')}.csv</code>），支援 Excel 點開直接分析。</div>
            </div>

            <!-- 頁尾 Footer -->
            <div style="background: #0b1120; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155;">
                此郵件由 StockUU 每日排程自動化系統於 GitHub Actions 雲端安全發送 ‧ 請勿直接回覆本郵件
            </div>
        </div>
    </body>
    </html>
    """
    return html

def send_email(subject, html_content, csv_path, receiver_email, sender_email, sender_password):
    """透過 Gmail SMTP 安全發送信件 (含附件)"""
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = f"StockUU 智慧選股日報 <{sender_email}>"
    msg["To"] = receiver_email

    # HTML 郵件主體
    msg_body = MIMEMultipart("alternative")
    part_html = MIMEText(html_content, "html", "utf-8")
    msg_body.attach(part_html)
    msg.attach(msg_body)

    # 夾帶 CSV 附件
    if os.path.exists(csv_path):
        with open(csv_path, "rb") as f:
            part_csv = MIMEBase("application", "octet-stream")
            part_csv.set_payload(f.read())
            encoders.encode_base64(part_csv)
            filename = os.path.basename(csv_path)
            # 使用 RFC 2231 / utf-8 檔名格式
            part_csv.add_header("Content-Disposition", f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}")
            msg.attach(part_csv)

    # 透過 Gmail SMTP (SSL 465 或 TLS 587) 發送
    print(f"[INFO] 正在連接 Gmail SMTP 發送郵件至: {receiver_email} ...")
    try:
        # 優先嘗試 SSL 465
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [receiver_email], msg.as_string())
        print(f"[SUCCESS] 郵件已成功寄達 {receiver_email}！")
        return True
    except Exception as e_ssl:
        print(f"[WARN] SSL 465 發送失敗 ({e_ssl})，改嘗試 STARTTLS 587 ...")
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, [receiver_email], msg.as_string())
            print(f"[SUCCESS] 郵件透過 STARTTLS 成功寄達 {receiver_email}！")
            return True
        except Exception as e_tls:
            print(f"[ERROR] 郵件發送失敗: {e_tls}")
            return False

def main():
    tw_now = get_tw_now()
    date_display = tw_now.strftime("%Y/%m/%d")
    date_file = tw_now.strftime("%Y%m%d")

    print(f"==================================================")
    print(f"StockUU 每日智慧選股與郵件發送作業啟動 [{date_display}]")
    print(f"==================================================")

    # 1. 爬取 MoneyDJ 數據
    stocks = fetch_moneydj_data()
    print(f"[OK] 成功取得 {len(stocks)} 檔符合條件之標的")

    # 2. 生成 CSV 與 HTML 檔案
    output_dir = os.path.join(os.getcwd(), "output")
    csv_file = os.path.join(output_dir, f"StockUU_選股日報_{date_file}.csv")
    html_file = os.path.join(output_dir, f"StockUU_選股日報_{date_file}.html")

    generate_csv(stocks, csv_file)
    html_content = generate_html_report(stocks, date_display)

    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"[OK] HTML 報告已生成: {html_file}")

    # 3. 讀取發信環境變數 (支援 GitHub Secrets 安全傳遞)
    sender_email = os.getenv("GMAIL_USER") or os.getenv("SENDER_EMAIL") or "jringyou@gmail.com"
    app_password = os.getenv("GMAIL_APP_PASSWORD") or os.getenv("SMTP_PASSWORD")
    receiver_email = os.getenv("RECEIVER_EMAIL") or "jringyou@gmail.com"

    subject = f"📈 【StockUU 智慧選股日報】{date_display} 共 {len(stocks)} 檔符合 (附 CSV 明細)"

    if not app_password:
        print("\n" + "="*60)
        print("⚠️ [安全提醒] 未偵測到 GMAIL_APP_PASSWORD 環境變數。")
        print("報告與 CSV 檔案已成功產出在本地 output/ 目錄。")
        print("若要自動寄出至您的信箱，請至 GitHub 儲存庫設定 Secrets：")
        print("1. 前往 GitHub Repo -> Settings -> Secrets and variables -> Actions")
        print("2. 新增 Secret 名稱：GMAIL_APP_PASSWORD (您的 16 碼 Google 應用程式密碼)")
        print("3. (可選) 新增 Secret：GMAIL_USER (您的 Gmail 地址)")
        print("4. (可選) 新增 Secret：RECEIVER_EMAIL (收件者信箱)")
        print("="*60 + "\n")
        return

    # 4. 發送郵件
    send_email(subject, html_content, csv_file, receiver_email, sender_email, app_password)

if __name__ == "__main__":
    main()
