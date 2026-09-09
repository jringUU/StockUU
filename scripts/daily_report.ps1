# ========================================================
# StockUU 每日智慧選股與郵件發送日報 (PowerShell 本機/雲端雙相容版)
# ========================================================
[CmdletBinding()]
param(
    [string]$ReceiverEmail = $env:RECEIVER_EMAIL,
    [string]$SenderEmail = $env:GMAIL_USER,
    [string]$AppPassword = $env:GMAIL_APP_PASSWORD
)

$ErrorActionPreference = "Stop"

if (-not $ReceiverEmail) { $ReceiverEmail = "jringyou@gmail.com" }
if (-not $SenderEmail) { $SenderEmail = "jringyou@gmail.com" }

$now = Get-Date
$dateDisplay = $now.ToString("yyyy/MM/dd")
$dateFile = $now.ToString("yyyyMMdd")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "StockUU 每日智慧選股與郵件發送作業啟動 [$dateDisplay]" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. 爬取 MoneyDJ 數據
$targetUrl = "https://concords.moneydj.com/z/zk/zkf/zkResult.asp?D=1&A=x@1301;x@370,a@20,b@200;x@5720,a@3,b@1&site="
Write-Host "[API] 正在連線 MoneyDJ: $targetUrl" -ForegroundColor Yellow

$wc = New-Object System.Net.WebClient
$wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
$bytes = $wc.DownloadData($targetUrl)
$enc = [System.Text.Encoding]::GetEncoding("big5")
$html = $enc.GetString($bytes)

$rowMatches = [regex]::Matches($html, '<tr class="?zkt2R(?:_rev)?"?>([\s\S]*?)</tr>')
$stocks = New-Object System.Collections.ArrayList

foreach ($rm in $rowMatches) {
    $rowHtml = $rm.Groups[1].Value
    $tdMatches = [regex]::Matches($rowHtml, '<td[^>]*>([\s\S]*?)</td>')
    if ($tdMatches.Count -ge 8) {
        $raw0 = $tdMatches[0].Groups[1].Value
        $stkCode = ""
        $cMatch = [regex]::Match($raw0, "Link2Stk\('(\d+)'\)")
        if ($cMatch.Success) { $stkCode = $cMatch.Groups[1].Value }
        $clean0 = [regex]::Replace($raw0, '<[^>]+>', '').Trim()
        $stkName = if ($stkCode -ne "" -and $clean0.StartsWith($stkCode)) { $clean0.Substring($stkCode.Length).Trim() } else { $clean0 }
        if ($stkName -eq "騰輝電子-K") { $stkName = "騰輝電子-KY" }

        $close = [regex]::Replace($tdMatches[1].Groups[1].Value, '<[^>]+>', '').Trim()
        $change = [regex]::Replace($tdMatches[2].Groups[1].Value, '<[^>]+>', '').Trim()
        $changePct = [regex]::Replace($tdMatches[3].Groups[1].Value, '<[^>]+>', '').Trim()
        $dif = [regex]::Replace($tdMatches[4].Groups[1].Value, '<[^>]+>', '').Trim()
        $macd = [regex]::Replace($tdMatches[5].Groups[1].Value, '<[^>]+>', '').Trim()
        $majorBuy = [regex]::Replace($tdMatches[6].Groups[1].Value, '<[^>]+>', '').Trim().Replace(',', '')
        $revGrowth = [regex]::Replace($tdMatches[7].Groups[1].Value, '<[^>]+>', '').Trim()

        $difNum = 0.0; [double]::TryParse($dif, [ref]$difNum) | Out-Null
        $macdNum = 0.0; [double]::TryParse($macd, [ref]$macdNum) | Out-Null
        $oscNum = [Math]::Round($difNum - $macdNum, 2)
        $oscStr = if ($oscNum -gt 0) { "+$oscNum" } else { "$oscNum" }

        $buyNum = 0; [int]::TryParse($majorBuy, [ref]$buyNum) | Out-Null
        $revNum = 0.0; [double]::TryParse($revGrowth, [ref]$revNum) | Out-Null

        $rating = "🟡 觀察多頭"
        $ratingBadge = "background:#f59e0b; color:#fff;"
        if ($oscNum -gt 0 -and $buyNum -ge 500 -and $revNum -ge 2.0) {
            $rating = "🔥 強勢多頭"
            $ratingBadge = "background:#ef4444; color:#fff;"
        } elseif ($oscNum -gt 0 -and $buyNum -ge 200 -and $revNum -ge 1.0) {
            $rating = "🟢 穩健多頭"
            $ratingBadge = "background:#10b981; color:#fff;"
        }

        [void]$stocks.Add([PSCustomObject]@{
            stkCode = $stkCode
            stkName = $stkName
            closePrice = $close
            change = $change
            changePct = $changePct
            difWeek = $dif
            macdWeek = $macd
            osc = $oscStr
            majorBuy = $majorBuy
            revGrowth = $revGrowth
            rating = $rating
            ratingBadge = $ratingBadge
        })
    }
}

Write-Host "[OK] 成功取得 $($stocks.Count) 檔符合條件標的" -ForegroundColor Green

# 2. 產出 CSV 檔案 (含 UTF-8 BOM)
$outDir = Join-Path $PSScriptRoot "..\output"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$csvPath = Join-Path $outDir "StockUU_選股日報_$dateFile.csv"
$htmlPath = Join-Path $outDir "StockUU_選股日報_$dateFile.html"

$csvLines = New-Object System.Collections.Generic.List[string]
$csvLines.Add("股票代號,股票名稱,收盤價,漲跌,漲跌幅,DIF(週),MACD(週),OSC紅柱(週),近20日主力買超(張),近3月平均營收月成長率(%),多頭評級")
foreach ($s in $stocks) {
    $csvLines.Add("""$($s.stkCode)"",""$($s.stkName)"",$($s.closePrice),$($s.change),""$($s.changePct)"",$($s.difWeek),$($s.macdWeek),$($s.osc),$($s.majorBuy),$($s.revGrowth),""$($s.rating)""")
}

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllLines($csvPath, $csvLines, $utf8Bom)
Write-Host "[OK] CSV 已產出: $csvPath" -ForegroundColor Green

# 3. 產出 HTML 總結報告
$rowsHtml = ""
foreach ($s in $stocks) {
    $chgVal = 0.0; [double]::TryParse($s.change, [ref]$chgVal) | Out-Null
    $chgColor = if ($chgVal -gt 0) { "#ef4444" } elseif ($chgVal -lt 0) { "#10b981" } else { "#6b7280" }
    $chgSign = if ($chgVal -gt 0) { "+" } else { "" }

    $rowsHtml += @"
    <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 10px 8px; font-weight: bold; color: #38bdf8; font-family: monospace;">$($s.stkCode)</td>
        <td style="padding: 10px 8px; font-weight: 600; color: #f1f5f9;">$($s.stkName)</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: $chgColor; font-family: monospace;">$($s.closePrice)</td>
        <td style="padding: 10px 8px; text-align: right; color: $chgColor; font-family: monospace;">$chgSign$($s.change) ($($s.changePct))</td>
        <td style="padding: 10px 8px; text-align: right; color: #cbd5e1; font-family: monospace;">$($s.difWeek) / $($s.macdWeek)</td>
        <td style="padding: 10px 8px; text-align: right; color: #ef4444; font-weight: 600; font-family: monospace;">$($s.osc)</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #f59e0b; font-family: monospace;">$($s.majorBuy) 張</td>
        <td style="padding: 10px 8px; text-align: right; color: #10b981; font-weight: bold; font-family: monospace;">+$($s.revGrowth)%</td>
        <td style="padding: 10px 8px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; $($s.ratingBadge)">$($s.rating)</span>
        </td>
    </tr>
"@
}

$strongCount = ($stocks | Where-Object { $_.rating -like "*強勢*" }).Count
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>StockUU 每日智慧選股與策略總結日報</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
    <div style="max-width: 900px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 24px; border-bottom: 2px solid #38bdf8;">
            <h1 style="margin: 0; font-size: 22px; color: #ffffff;">📈 StockUU 智慧選股每日策略總結</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">MoneyDJ 三大黃金戰法自動檢核：週 MACD 金叉 ✕ 主力買超 ✕ 營收月增成長</p>
            <div style="margin-top: 10px;"><span style="background: #38bdf8; color: #0f172a; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px;">📅 $dateDisplay 22:00 執行</span></div>
        </div>
        <div style="padding: 16px 24px; background: #0f172a; display: flex; gap: 16px; border-bottom: 1px solid #334155;">
            <div style="background: #1e293b; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #38bdf8;">
                <div style="font-size: 12px; color: #94a3b8;">符合選股標的</div>
                <div style="font-size: 22px; font-weight: bold; color: #38bdf8;">$($stocks.Count) 檔</div>
            </div>
            <div style="background: #1e293b; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-size: 12px; color: #94a3b8;">🔥 強勢多頭</div>
                <div style="font-size: 22px; font-weight: bold; color: #ef4444;">$strongCount 檔</div>
            </div>
        </div>
        <div style="padding: 20px 24px; overflow-x: auto;">
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
                    $rowsHtml
                </tbody>
            </table>
        </div>
        <div style="background: #0b1120; padding: 14px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155;">
            此郵件由 StockUU 每日排程系統自動安全發送 ‧ 請勿直接回覆
        </div>
    </div>
</body>
</html>
"@

[System.IO.File]::WriteAllText($htmlPath, $htmlContent, [System.Text.Encoding]::UTF8)
Write-Host "[OK] HTML 已產出: $htmlPath" -ForegroundColor Green

# 4. 發送郵件 (若有配置密碼)
if (-not $AppPassword) {
    Write-Host "`n==================================================" -ForegroundColor Yellow
    Write-Host "⚠️ [提醒] 未設定 GMAIL_APP_PASSWORD 密碼。" -ForegroundColor Yellow
    Write-Host "日報檔案已儲存至 output/ 目錄。若要自動發信，請設定 GitHub Secrets。" -ForegroundColor Yellow
    Write-Host "==================================================`n" -ForegroundColor Yellow
    return
}

Write-Host "[INFO] 正在連線 smtp.gmail.com 發送郵件至 $ReceiverEmail ..." -ForegroundColor Cyan
try {
    $mail = New-Object System.Net.Mail.MailMessage
    $mail.From = New-Object System.Net.Mail.MailAddress($SenderEmail, "StockUU 智慧選股日報")
    $mail.To.Add($ReceiverEmail)
    $mail.Subject = "📈 【StockUU 智慧選股日報】$dateDisplay 共 $($stocks.Count) 檔符合 (附 CSV 明細)"
    $mail.Body = $htmlContent
    $mail.IsBodyHtml = $true

    if (Test-Path $csvPath) {
        $attachment = New-Object System.Net.Mail.Attachment($csvPath)
        $mail.Attachments.Add($attachment)
    }

    $smtp = New-Object System.Net.Mail.SmtpClient("smtp.gmail.com", 587)
    $smtp.EnableSsl = $true
    $smtp.Credentials = New-Object System.Net.NetworkCredential($SenderEmail, $AppPassword)
    $smtp.Send($mail)
    Write-Host "[SUCCESS] 郵件已成功寄達 $ReceiverEmail！" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] 發送郵件失敗: $($_.Exception.Message)" -ForegroundColor Red
}
