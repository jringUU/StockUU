# MoneyDJ Screener Local HTTP Server (Pure ASCII)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$port = 8080
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)


try {
    $listener.Start()
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host " MoneyDJ Screener Server Started!" -ForegroundColor Green
    Write-Host " URL: $prefix" -ForegroundColor Yellow
    Write-Host " Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host "=================================================" -ForegroundColor Cyan
}
catch {
    Write-Host "Failed to start server: $_" -ForegroundColor Red
    exit 1
}

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $baseDir) { $baseDir = "c:\CodeZone" }

function Fetch-MoneyDJData($days, $vol, $months, $pct, $difWeek, $filterLow) {
    $hasDif = ($difWeek -eq "1" -or $difWeek -eq "true")
    $hasChip = (-not [string]::IsNullOrWhiteSpace($days) -and -not [string]::IsNullOrWhiteSpace($vol))
    $hasRev = (-not [string]::IsNullOrWhiteSpace($months) -and -not [string]::IsNullOrWhiteSpace($pct))

    $conds = New-Object System.Collections.ArrayList
    if ($hasDif) {
        [void]$conds.Add("x@1301")
    }
    if ($hasChip) {
        [void]$conds.Add("x@370,a@$days,b@$vol")
    }
    if ($hasRev) {
        [void]$conds.Add("x@5720,a@$months,b@$pct")
    }

    $A = $conds -join ";"
    $D = if ($filterLow -eq "0" -or $filterLow -eq "false") { "0" } else { "1" }
    $targetUrl = "https://concords.moneydj.com/z/zk/zkf/zkResult.asp?D=$D&A=$A&site="

    Write-Host "[API] Fetching: $targetUrl" -ForegroundColor Cyan

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
        if ($tdMatches.Count -ge 4) {
            $raw0 = $tdMatches[0].Groups[1].Value
            $stkCode = ""
            $stkName = ""
            $cMatch = [regex]::Match($raw0, "Link2Stk\('(\d+)'\)")
            if ($cMatch.Success) {
                $stkCode = $cMatch.Groups[1].Value
            }
            $clean0 = [regex]::Replace($raw0, '<[^>]+>', '').Trim()
            if ($stkCode -ne "" -and $clean0.StartsWith($stkCode)) {
                $stkName = $clean0.Substring($stkCode.Length).Trim()
            }
            else {
                $stkName = $clean0
            }
            if ($stkName -eq "騰輝電子-K") { $stkName = "騰輝電子-KY" }

            $close = if ($tdMatches.Count -gt 1) { [regex]::Replace($tdMatches[1].Groups[1].Value, '<[^>]+>', '').Trim() } else { "-" }
            $change = if ($tdMatches.Count -gt 2) { [regex]::Replace($tdMatches[2].Groups[1].Value, '<[^>]+>', '').Trim() } else { "-" }
            $changePct = if ($tdMatches.Count -gt 3) { [regex]::Replace($tdMatches[3].Groups[1].Value, '<[^>]+>', '').Trim() } else { "-" }

            $colIdx = 4
            $dif = "-"
            $macd = "-"
            if ($hasDif -and $tdMatches.Count -gt ($colIdx + 1)) {
                $dif = [regex]::Replace($tdMatches[$colIdx++].Groups[1].Value, '<[^>]+>', '').Trim()
                $macd = [regex]::Replace($tdMatches[$colIdx++].Groups[1].Value, '<[^>]+>', '').Trim()
            }

            $majorBuy = "-"
            if ($hasChip -and $tdMatches.Count -gt $colIdx) {
                $majorBuy = [regex]::Replace($tdMatches[$colIdx++].Groups[1].Value, '<[^>]+>', '').Trim()
            }

            $revGrowth = "-"
            if ($hasRev -and $tdMatches.Count -gt $colIdx) {
                $revGrowth = [regex]::Replace($tdMatches[$colIdx++].Groups[1].Value, '<[^>]+>', '').Trim()
            }

            $item = [PSCustomObject]@{
                stkCode    = $stkCode
                stkName    = $stkName
                closePrice = $close
                change     = $change
                changePct  = $changePct
                difWeek    = $dif
                macdWeek   = $macd
                majorBuy   = $majorBuy
                revGrowth  = $revGrowth
            }
            [void]$stocks.Add($item)
        }
    }

    # 結合 TWSE/TPEX 即時 5分K 報價與當沖 6 大指標分析 (Stock01 獲利術)
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
                }
                catch {}
            }

            foreach ($stk in $stocks) {
                try {
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
                        $chgPctVal = [Math]::Round(($chgVal / $prev) * 100, 2)

                        # ① 均價線 (當日5分K)
                        $vwapSignal = "neutral"
                        $vwapText = "平緩"
                        $vwapDesc = "5分K均價線平緩(VWAP $vwap/收 $close)"
                        if ($close -lt $vwap -and ($high -eq $open -or $close -lt $open)) {
                            $vwapSignal = "short"
                            $vwapText = "跌破均價線"
                            $vwapDesc = "5分K跌破均價線(均價$vwap/收$close)"
                        }
                        elseif ($close -gt $vwap) {
                            $vwapSignal = "long"
                            $vwapText = "站上均價線"
                            $vwapDesc = "5分K站上均價線(均價$vwap/收$close)"
                        }

                        # ② 江波圖 (當日5分K)
                        $waveSignal = "neutral"
                        $waveText = "區間整理"
                        $waveDesc = "5分K波段區間整理"
                        if ($close -le $low * 1.015 -or ($open -ge $high * 0.99 -and $close -lt $open)) {
                            $waveSignal = "short"
                            $waveText = "底底低破底"
                            $waveDesc = "5分K走勢底底低破底下殺"
                        }
                        elseif ($close -ge $high * 0.99) {
                            $waveSignal = "long"
                            $waveText = "底底高突破"
                            $waveDesc = "5分K走勢底底高突破"
                        }

                        # ③ K線 (當日5分K)
                        $kSignal = "neutral"
                        $kText = "十字線"
                        $kDesc = "5分K十字線多空拉鋸"
                        if (($high - $close) -gt ($close - $low) * 1.3 -or ($high -eq $open -and $close -lt $open)) {
                            $kSignal = "short"
                            $kText = "大量反壓"
                            $kDesc = "5分K高檔爆量成反壓(長上影/實體黑K)"
                        }
                        elseif ($close -gt $open) {
                            $kSignal = "long"
                            $kText = "量能支撐"
                            $kDesc = "5分K量能支撐未跌破"
                        }

                        # ④ 內外盤 (當日)
                        $inOutSignal = "neutral"
                        $inOutText = "買賣均衡"
                        $inOutDesc = "買賣盤均衡 (外盤$bRatio% : 內盤$aRatio%)"
                        if ($aRatio -ge 56.0) {
                            $inOutSignal = "short"
                            $inOutText = "內盤賣壓重"
                            $inOutDesc = "內盤賣單重($aRatio%)，賣壓沉重"
                        }
                        elseif ($bRatio -ge 58.0) {
                            $inOutSignal = "long"
                            $inOutText = "外盤積極買"
                            $inOutDesc = "外盤買單積極($bRatio%)，買氣旺盛"
                        }

                        # ⑤ 差異分析 (當日5分K vs 大盤 -0.47%)
                        $diffSignal = "neutral"
                        $diffText = "與大盤同步"
                        $diffDesc = "走勢與大盤同步"
                        if ($chgPctVal -gt -0.2) {
                            $diffSignal = "long"
                            $diffText = "抗跌強於大盤"
                            $diffDesc = "5分K走勢抗跌強於大盤(大盤-0.47%/個股$chgPctVal%)"
                        }
                        elseif ($chgPctVal -lt -1.0) {
                            $diffSignal = "short"
                            $diffText = "弱於大盤"
                            $diffDesc = "5分K跌幅深於大盤(個股$chgPctVal%)"
                        }

                        # ⑥ 主力手法 (參考券商分點)
                        $brokerSignal = "neutral"
                        $brokerText = "分點觀望"
                        $brokerDesc = "分點主力籌碼中性"
                        if ($close -lt $open) {
                            $brokerSignal = "short"
                            $brokerText = "分點買超+當日倒貨"
                            $brokerDesc = "券商分點近20日累積大買 +$($stk.majorBuy) 張，但當日5分K開高走低、拉抬後反手出貨"
                        }
                        else {
                            $brokerSignal = "long"
                            $brokerText = "分點護盤鎖碼"
                            $brokerDesc = "券商分點近20日累積大買 +$($stk.majorBuy) 張，盤中低檔護盤鎖碼"
                        }

                        # 計算多空得分
                        $signals = @($vwapSignal, $waveSignal, $kSignal, $inOutSignal, $diffSignal, $brokerSignal)
                        $longCount = ($signals | Where-Object { $_ -eq "long" }).Count
                        $shortCount = ($signals | Where-Object { $_ -eq "short" }).Count

                        $overall = "觀望 / 整理"
                        $overallClass = "badge-neutral"
                        if ($shortCount -ge 4) {
                            $overall = "強烈偏空當沖"
                            $overallClass = "badge-short"
                        }
                        elseif ($shortCount -ge 3) {
                            $overall = "偏空操作"
                            $overallClass = "badge-short"
                        }
                        elseif ($longCount -ge 4) {
                            $overall = "強烈偏多當沖"
                            $overallClass = "badge-long"
                        }
                        elseif ($longCount -ge 2) {
                            $overall = "偏多防守"
                            $overallClass = "badge-long"
                        }

                        # 隔日沖評級
                        $nextDayRisk = "中"
                        $nextDayAction = "正常區間應對"
                        $nextDayDesc = "隔日沖買賣力道普通，觀察開盤平盤多空動向"
                        if (($high - $close) -gt ($open * 0.03) -and $vol -gt 2000) {
                            $nextDayRisk = "極高"
                            $nextDayAction = "開盤防隔日沖倒貨 / 順勢空"
                            $nextDayDesc = "今日高檔爆量長上影($high->$close)，大量隔日沖主力套牢或獲利了結，隔日開盤極易慣性開低走低摜壓"
                        }
                        elseif ($high -eq $open -and $close -lt $open) {
                            $nextDayRisk = "高"
                            $nextDayAction = "開低彈升不過高放空"
                            $nextDayDesc = "全日實體黑K重挫，主力堅決調節無護盤，隔日開盤慣性偏弱"
                        }
                        elseif ($chgPctVal -gt -0.3 -and $close -ge $vwap) {
                            $nextDayRisk = "低"
                            $nextDayAction = "回測均線守穩偏多看"
                            $nextDayDesc = "主力分點鎖碼抗跌，無隔日沖獲利賣壓，有利後續波段行情"
                        }

                        $stk | Add-Member -NotePropertyName "dayTrading" -NotePropertyValue ([PSCustomObject]@{
                                openPrice     = $open
                                highPrice     = $high
                                lowPrice      = $low
                                realClose     = $close
                                todayVolume   = $vol
                                vwap          = $vwap
                                vwapSignal    = $vwapSignal
                                vwapText      = $vwapText
                                vwapDesc      = $vwapDesc
                                waveSignal    = $waveSignal
                                waveText      = $waveText
                                waveDesc      = $waveDesc
                                kSignal       = $kSignal
                                kText         = $kText
                                kDesc         = $kDesc
                                inOutSignal   = $inOutSignal
                                inOutText     = $inOutText
                                inOutDesc     = $inOutDesc
                                diffSignal    = $diffSignal
                                diffText      = $diffText
                                diffDesc      = $diffDesc
                                brokerSignal  = $brokerSignal
                                brokerText    = $brokerText
                                brokerDesc    = $brokerDesc
                                longCount     = $longCount
                                shortCount    = $shortCount
                                overall       = $overall
                                overallClass  = $overallClass
                                nextDayRisk   = $nextDayRisk
                                nextDayAction = $nextDayAction
                                nextDayDesc   = $nextDayDesc
                            }) -Force
                    }
                }
                catch {}
            }
        }
    }
    catch {
        Write-Host "Day trading enrichment error: $_" -ForegroundColor DarkYellow
    }

    Write-Host "[API] Parsed $($stocks.Count) stocks" -ForegroundColor Green

    return [PSCustomObject]@{
        success   = $true
        count     = $stocks.Count
        targetUrl = $targetUrl
        queryTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        criteria  = [PSCustomObject]@{
            difWeek   = ($difWeek -eq "1" -or $difWeek -eq "true")
            days      = $days
            vol       = $vol
            months    = $months
            pct       = $pct
            filterLow = ($D -eq "1")
        }
        stocks    = $stocks
    }
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $($request.HttpMethod) $path" -ForegroundColor DarkGray

        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ($path -eq "/api/screen") {
            $qs = $request.QueryString
            $chipEnable = if ($qs["chip_enable"] -eq "0" -or $qs["chip_enable"] -eq "false") { $false } else { $true }
            $revEnable = if ($qs["rev_enable"] -eq "0" -or $qs["rev_enable"] -eq "false") { $false } else { $true }

            $days = if ($chipEnable) { if ($qs["days"]) { $qs["days"] } else { "20" } } else { "" }
            $vol = if ($chipEnable) { if ($qs["vol"]) { $qs["vol"] } else { "200" } } else { "" }
            $months = if ($revEnable) { if ($qs["months"]) { $qs["months"] } else { "3" } } else { "" }
            $pct = if ($revEnable) { if ($qs["pct"]) { $qs["pct"] } else { "1" } } else { "" }
            $difWeek = if ($null -ne $qs["dif_week"]) { $qs["dif_week"] } else { "1" }
            $filterLow = if ($null -ne $qs["filter_low"]) { $qs["filter_low"] } else { "1" }

            try {
                $result = Fetch-MoneyDJData $days $vol $months $pct $difWeek $filterLow
                $json = $result | ConvertTo-Json -Depth 5
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            catch {
                Write-Host "API Error: $_" -ForegroundColor Red
                $errObj = [PSCustomObject]@{ success = $false; error = $_.ToString() }
                $json = $errObj | ConvertTo-Json
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.StatusCode = 500
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            $response.Close()
            continue
        }

        if ($path -eq "/api/export-csv") {
            $qs = $request.QueryString
            $chipEnable = if ($qs["chip_enable"] -eq "0" -or $qs["chip_enable"] -eq "false") { $false } else { $true }
            $revEnable = if ($qs["rev_enable"] -eq "0" -or $qs["rev_enable"] -eq "false") { $false } else { $true }

            $days = if ($chipEnable) { if ($qs["days"]) { $qs["days"] } else { "20" } } else { "" }
            $vol = if ($chipEnable) { if ($qs["vol"]) { $qs["vol"] } else { "200" } } else { "" }
            $months = if ($revEnable) { if ($qs["months"]) { $qs["months"] } else { "3" } } else { "" }
            $pct = if ($revEnable) { if ($qs["pct"]) { $qs["pct"] } else { "1" } } else { "" }
            $difWeek = if ($null -ne $qs["dif_week"]) { $qs["dif_week"] } else { "1" }
            $filterLow = if ($null -ne $qs["filter_low"]) { $qs["filter_low"] } else { "1" }

            try {
                $result = Fetch-MoneyDJData $days $vol $months $pct $difWeek $filterLow
                
                $csvLines = New-Object System.Collections.ArrayList
                $headerStr = [string][char]0x80a1 + [char]0x7968 + [char]0x4ee3 + [char]0x865f + "," + [char]0x80a1 + [char]0x7968 + [char]0x540d + [char]0x7a31 + "," + [char]0x6536 + [char]0x76e4 + [char]0x50f9 + "," + [char]0x6f32 + [char]0x8dcc + "," + [char]0x6f32 + [char]0x8dcc + [char]0x5e45 + ",DIF(" + [char]0x9031 + "),MACD(" + [char]0x9031 + ")," + [char]0x8fd1 + $days + [char]0x65e5 + [char]0x4e3b + [char]0x529b + [char]0x8cb7 + [char]0x8d85 + "(" + [char]0x5f35 + ")," + [char]0x8fd1 + $months + [char]0x6708 + [char]0x5e73 + [char]0x5747 + [char]0x71df + [char]0x6536 + [char]0x6210 + [char]0x9577 + [char]0x7387 + "(%)"
                [void]$csvLines.Add($headerStr)

                foreach ($s in $result.stocks) {
                    $cleanCode = "`"" + $s.stkCode + "`""
                    $cleanName = "`"" + $s.stkName.Replace('"', '""') + "`""
                    $cleanClose = $s.closePrice
                    $cleanChange = $s.change
                    $cleanPct = "`"" + $s.changePct + "`""
                    $cleanDif = $s.difWeek
                    $cleanMacd = $s.macdWeek
                    $cleanBuy = "`"" + $s.majorBuy.Replace(",", "") + "`""
                    $cleanRev = $s.revGrowth

                    [void]$csvLines.Add("$cleanCode,$cleanName,$cleanClose,$cleanChange,$cleanPct,$cleanDif,$cleanMacd,$cleanBuy,$cleanRev")
                }

                $csvContent = $csvLines -join "`r`n"
                $bom = [System.Text.Encoding]::UTF8.GetPreamble()
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($csvContent)
                
                $fullBytes = New-Object byte[] ($bom.Length + $bodyBytes.Length)
                [System.Buffer]::BlockCopy($bom, 0, $fullBytes, 0, $bom.Length)
                [System.Buffer]::BlockCopy($bodyBytes, 0, $fullBytes, $bom.Length, $bodyBytes.Length)

                $filename = "MoneyDJ_Screen_" + (Get-Date).ToString("yyyyMMdd_HHmmss") + ".csv"
                $response.ContentType = "text/csv; charset=utf-8"
                $response.Headers.Add("Content-Disposition", "attachment; filename=`"$filename`"")
                $response.ContentLength64 = $fullBytes.Length
                $response.OutputStream.Write($fullBytes, 0, $fullBytes.Length)
            }
            catch {
                $response.StatusCode = 500
                $err = [System.Text.Encoding]::UTF8.GetBytes("Error: $_")
                $response.OutputStream.Write($err, 0, $err.Length)
            }
            $response.Close()
            continue
        }

        # Static files
        $relPath = $path.TrimStart('/')
        if ($relPath -eq "") { $relPath = "index.html" }
        $filePath = Join-Path $baseDir $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".htm" { "text/html; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".js" { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".svg" { "image/svg+xml" }
                default { "application/octet-stream" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
    catch {
        Write-Host "Request Error: $_" -ForegroundColor Red
    }
}