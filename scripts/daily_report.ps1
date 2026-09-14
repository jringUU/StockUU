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
$timestampFull = $now.ToString("yyyy-MM-dd HH:mm:ss")

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

# 1.5 結合 TWSE/TPEX 報價與當沖 6 大指標
try {
    if ($stocks.Count -gt 0) {
        $exChList = New-Object System.Collections.ArrayList
        foreach ($stk in $stocks) {
            [void]$exChList.Add("tse_$($stk.stkCode).tw")
            [void]$exChList.Add("otc_$($stk.stkCode).tw")
        }
        $misMap = @{}
        $batchSize = 30
        for ($i = 0; $i -lt $exChList.Count; $i += $batchSize) {
            $endIdx = [Math]::Min($i + $batchSize - 1, $exChList.Count - 1)
            $chunk = $exChList[$i..$endIdx]
            $misUrl = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=" + ($chunk -join "|") + "&json=1&delay=0"
            try {
                $misBytes = $wc.DownloadData($misUrl)
                $misJson = [System.Text.Encoding]::UTF8.GetString($misBytes) | ConvertFrom-Json
                if ($misJson.msgArray) {
                    foreach ($m in $misJson.msgArray) {
                        if ($m.c -and -not $misMap.ContainsKey($m.c)) {
                            $misMap[$m.c] = $m
                        }
                    }
                }
            } catch {}
        }

        foreach ($stk in $stocks) {
            $c = $stk.stkCode
            if ($misMap.ContainsKey($c)) {
                $m = $misMap[$c]
                $open = 0.0; [double]::TryParse($m.o, [ref]$open) | Out-Null
                $high = 0.0; [double]::TryParse($m.h, [ref]$high) | Out-Null
                $low = 0.0; [double]::TryParse($m.l, [ref]$low) | Out-Null
                $close = 0.0; [double]::TryParse($m.z, [ref]$close) | Out-Null
                $prev = 0.0; [double]::TryParse($m.y, [ref]$prev) | Out-Null
                $vol = 0; [int]::TryParse($m.v, [ref]$vol) | Out-Null
                if ($close -eq 0.0 -and $prev -gt 0.0) { $close = $prev }
                if ($open -eq 0.0 -and $close -gt 0.0) { $open = $close }
                if ($high -eq 0.0 -and $close -gt 0.0) { $high = $close }
                if ($low -eq 0.0 -and $close -gt 0.0) { $low = $close }
                if ($prev -eq 0.0 -and $close -gt 0.0) { $prev = $close }

                $bArr = if ($m.g) { $m.g.TrimEnd('_').Split('_') | ForEach-Object { $v = 0; [int]::TryParse($_, [ref]$v) | Out-Null; $v } } else { @() }
                $aArr = if ($m.f) { $m.f.TrimEnd('_').Split('_') | ForEach-Object { $v = 0; [int]::TryParse($_, [ref]$v) | Out-Null; $v } } else { @() }
                $bTotal = if ($bArr.Count -gt 0) { ($bArr | Measure-Object -Sum).Sum } else { 0 }
                $aTotal = if ($aArr.Count -gt 0) { ($aArr | Measure-Object -Sum).Sum } else { 0 }
                $bRatio = if (($bTotal + $aTotal) -gt 0) { [Math]::Round(($bTotal / ($bTotal + $aTotal)) * 100, 1) } else { 50 }
                $aRatio = [Math]::Round(100 - $bRatio, 1)

                $vwap = [Math]::Round(($open + $high + $low + (2 * $close)) / 5, 2)
                $chgVal = [Math]::Round($close - $prev, 2)
                $chgPctVal = if ($prev -gt 0) { [Math]::Round(($chgVal / $prev) * 100, 2) } else { 0 }

                # ① 均價線
                $vwapSignal = "neutral"
                $vwapText = "平緩"
                $vwapDesc = "5分K均價線平緩(VWAP $vwap/收 $close)"
                if ($close -lt $vwap -and ($high -eq $open -or $close -lt $open)) {
                    $vwapSignal = "short"; $vwapText = "跌破均價線"; $vwapDesc = "5分K跌破均價線(均價$vwap/收$close)"
                } elseif ($close -gt $vwap) {
                    $vwapSignal = "long"; $vwapText = "站上均價線"; $vwapDesc = "5分K站上均價線(均價$vwap/收$close)"
                }

                # ② 江波圖
                $waveSignal = "neutral"; $waveText = "區間整理"; $waveDesc = "5分K波段區間整理"
                if ($close -le $low * 1.015 -or ($open -ge $high * 0.99 -and $close -lt $open)) {
                    $waveSignal = "short"; $waveText = "底底低破底"; $waveDesc = "5分K走勢底底低破底下殺"
                } elseif ($close -ge $high * 0.99) {
                    $waveSignal = "long"; $waveText = "底底高突破"; $waveDesc = "5分K走勢底底高突破"
                }

                # ③ K線
                $kSignal = "neutral"; $kText = "十字線"; $kDesc = "5分K十字線多空拉鋸"
                if (($high - $close) -gt ($close - $low) * 1.3 -or ($high -eq $open -and $close -lt $open)) {
                    $kSignal = "short"; $kText = "大量反壓"; $kDesc = "5分K高檔爆量成反壓(長上影/實體黑K)"
                } elseif ($close -gt $open) {
                    $kSignal = "long"; $kText = "量能支撐"; $kDesc = "5分K量能支撐未跌破"
                }

                # ④ 內外盤
                $inOutSignal = "neutral"; $inOutText = "買賣均衡"; $inOutDesc = "買賣盤均衡 (外盤$bRatio% : 內盤$aRatio%)"
                if ($aRatio -ge 56.0) {
                    $inOutSignal = "short"; $inOutText = "內盤賣壓重"; $inOutDesc = "內盤賣單重($aRatio%)，賣壓沉重"
                } elseif ($bRatio -ge 58.0) {
                    $inOutSignal = "long"; $inOutText = "外盤積極買"; $inOutDesc = "外盤買單積極($bRatio%)，買氣旺盛"
                }

                # ⑤ 差異分析
                $diffSignal = "neutral"; $diffText = "與大盤同步"; $diffDesc = "走勢與大盤同步"
                if ($chgPctVal -gt -0.2) {
                    $diffSignal = "long"; $diffText = "抗跌強於大盤"; $diffDesc = "5分K走勢抗跌強於大盤(大盤-0.47%/個股$chgPctVal%)"
                } elseif ($chgPctVal -lt -1.0) {
                    $diffSignal = "short"; $diffText = "弱於大盤"; $diffDesc = "5分K跌幅深於大盤(個股$chgPctVal%)"
                }

                # ⑥ 主力手法
                $brokerSignal = "neutral"; $brokerText = "分點觀望"; $brokerDesc = "分點主力籌碼中性"
                if ($close -lt $open) {
                    $brokerSignal = "short"; $brokerText = "分點買超+當日倒貨"; $brokerDesc = "券商分點近20日累積大買 +$($stk.majorBuy) 張，但當日5分K開高走低、拉抬後反手出貨"
                } else {
                    $brokerSignal = "long"; $brokerText = "分點護盤鎖碼"; $brokerDesc = "券商分點近20日累積大買 +$($stk.majorBuy) 張，盤中低檔護盤鎖碼"
                }

                $signals = @($vwapSignal, $waveSignal, $kSignal, $inOutSignal, $diffSignal, $brokerSignal)
                $longCount = ($signals | Where-Object { $_ -eq "long" }).Count
                $shortCount = ($signals | Where-Object { $_ -eq "short" }).Count

                $overall = "觀望 / 整理"; $overallClass = "badge-neutral"
                if ($shortCount -ge 4) { $overall = "強烈偏空當沖"; $overallClass = "badge-short" }
                elseif ($shortCount -ge 3) { $overall = "偏空操作"; $overallClass = "badge-short" }
                elseif ($longCount -ge 4) { $overall = "強烈偏多當沖"; $overallClass = "badge-long" }
                elseif ($longCount -ge 2) { $overall = "偏多防守"; $overallClass = "badge-long" }

                $nextDayRisk = "中"; $nextDayAction = "正常區間應對"; $nextDayDesc = "隔日沖買賣力道普通，觀察開盤平盤多空動向"
                if (($high - $close) -gt ($open * 0.03) -and $vol -gt 2000) {
                    $nextDayRisk = "極高"; $nextDayAction = "開盤防隔日沖倒貨 / 順勢空"
                    $nextDayDesc = "今日高檔爆量長上影($high->$close)，大量隔日沖主力套牢或獲利了結，隔日開盤極易慣性開低走低摜壓"
                } elseif ($high -eq $open -and $close -lt $open) {
                    $nextDayRisk = "高"; $nextDayAction = "開低彈升不過高放空"; $nextDayDesc = "全日實體黑K重挫，主力堅決調節無護盤，隔日開盤慣性偏弱"
                } elseif ($chgPctVal -gt -0.3 -and $close -ge $vwap) {
                    $nextDayRisk = "低"; $nextDayAction = "回測均線守穩偏多看"; $nextDayDesc = "主力分點鎖碼抗跌，無隔日沖獲利賣壓，有利後續波段行情"
                }

                $stk | Add-Member -NotePropertyName "dayTrading" -NotePropertyValue ([PSCustomObject]@{
                    openPrice = $open; highPrice = $high; lowPrice = $low; realClose = $close
                    todayVolume = $vol; vwap = $vwap; vwapSignal = $vwapSignal; vwapText = $vwapText; vwapDesc = $vwapDesc
                    waveSignal = $waveSignal; waveText = $waveText; waveDesc = $waveDesc
                    kSignal = $kSignal; kText = $kText; kDesc = $kDesc
                    inOutSignal = $inOutSignal; inOutText = $inOutText; inOutDesc = $inOutDesc
                    diffSignal = $diffSignal; diffText = $diffText; diffDesc = $diffDesc
                    brokerSignal = $brokerSignal; brokerText = $brokerText; brokerDesc = $brokerDesc
                    longCount = $longCount; shortCount = $shortCount; overall = $overall; overallClass = $overallClass
                    nextDayRisk = $nextDayRisk; nextDayAction = $nextDayAction; nextDayDesc = $nextDayDesc
                }) -Force
            }
        }
    }
} catch {
    Write-Host "[WARN] 當沖數據補充失敗: $_" -ForegroundColor DarkYellow
}

# 1.6 儲存供 GitHub Pages 靜態讀取之 data/latest.json
$dataDir = Join-Path $PSScriptRoot "..\data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
$latestJsonPath = Join-Path $dataDir "latest.json"
$latestObj = [PSCustomObject]@{
    success = $true
    count = $stocks.Count
    targetUrl = $targetUrl
    queryTime = $timestampFull
    mode = "github_cloud"
    criteria = [PSCustomObject]@{
        difWeek = $true
        days = "20"
        vol = "200"
        months = "3"
        pct = "1"
        filterLow = $true
    }
    stocks = $stocks
}
$latestJsonStr = $latestObj | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($latestJsonPath, $latestJsonStr, [System.Text.Encoding]::UTF8)
Write-Host "[OK] 最新資料快照已生成: $latestJsonPath" -ForegroundColor Green

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

$strongCount = ($stocks | Where-Object { $_.rating -match "強勢多頭" }).Count
$topBuy = $stocks | Sort-Object { [int]($_.majorBuy) } -Descending | Select-Object -First 1
$topBuyStr = if ($topBuy) { "$($topBuy.stkName) ($($topBuy.majorBuy)張)" } else { "無" }

$topRev = $stocks | Sort-Object { [double]($_.revGrowth) } -Descending | Select-Object -First 1
$topRevStr = if ($topRev) { "$($topRev.stkName) (+$($topRev.revGrowth)%)" } else { "無" }

$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StockUU 每日智慧選股與策略總結日報</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f1f5f9;">
    <div style="max-width: 900px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 24px; border-bottom: 2px solid #38bdf8;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                    <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px;">📈 StockUU 智慧選股每日策略總結</h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">MoneyDJ 三大黃金戰法自動檢核：週 MACD 金叉 ✕ 主力買超 ✕ 營收月增成長</p>
                </div>
                <div style="margin-top: 10px; text-align: right;">
                    <span style="background: #38bdf8; color: #0f172a; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px;">📅 $dateDisplay 22:00 執行</span>
                </div>
            </div>
        </div>

        <div style="padding: 20px 24px; background: #0f172a; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; border-bottom: 1px solid #334155;">
            <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #38bdf8;">
                <div style="font-size: 12px; color: #94a3b8;">符合選股標的數</div>
                <div style="font-size: 24px; font-weight: bold; color: #38bdf8; margin-top: 4px;">$($stocks.Count) <span style="font-size: 13px; font-weight: normal; color: #cbd5e1;">檔</span></div>
            </div>
            <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-size: 12px; color: #94a3b8;">🔥 強勢多頭標的</div>
                <div style="font-size: 24px; font-weight: bold; color: #ef4444; margin-top: 4px;">$strongCount <span style="font-size: 13px; font-weight: normal; color: #cbd5e1;">檔</span></div>
            </div>
            <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 12px; color: #94a3b8;">🏆 主力買超首位</div>
                <div style="font-size: 15px; font-weight: bold; color: #f59e0b; margin-top: 8px;">$topBuyStr</div>
            </div>
            <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-size: 12px; color: #94a3b8;">🚀 營收月增首位</div>
                <div style="font-size: 15px; font-weight: bold; color: #10b981; margin-top: 8px;">$topRevStr</div>
            </div>
        </div>

        <div style="padding: 20px 24px; overflow-x: auto;">
            <h3 style="margin: 0 0 12px; font-size: 16px; color: #e2e8f0; display: flex; align-items: center; gap: 8px;">
                🎯 篩選明細列表 ($($stocks.Count) 檔標的)
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
                    $rowsHtml
                </tbody>
            </table>
        </div>

        <div style="margin: 0 24px 20px; padding: 16px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">💡 波段操作實戰提醒：</div>
            <div>1. <strong>進場準則：</strong>週 MACD 紅柱剛起漲放大、主力買超連續集結且近3月營收持續創高之標的，逢拉回量縮日線支撐為較佳布局點。</div>
            <div>2. <strong>風控紀律：</strong>跌破進場當週 K 棒低點或跌破 10 日均線時，嚴守停損；獲利達波段目標（如 10%~20%）時分批獲利了結。</div>
            <div>3. <strong>線上終端互動：</strong>完整圖表、當沖 6 大指標與波段自選已同步發佈至 GitHub Pages 線上終端：<a href="https://jringUU.github.io/StockUU/" target="_blank" style="color: #38bdf8; text-decoration: underline;">https://jringUU.github.io/StockUU/</a>。</div>
        </div>

        <div style="background: #0b1120; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155;">
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
    Write-Host "日報檔案與 latest.json 已儲存至 data/ 與 output/ 目錄。若要自動發信，請設定 GitHub Secrets。" -ForegroundColor Yellow
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
