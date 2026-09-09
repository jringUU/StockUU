// ==UserScript==
// @name         MoneyDJ 智慧選股自動化與 CSV 匯出小工具
// @namespace    https://concords.moneydj.com/
// @version      1.0
// @description  自動點選：技術面 DIF突破MACD(週)、籌碼面 近20日主力買超>500張、營收獲利面 近3月平均營收成長>1%，並匯出 CSV
// @author       Antigravity
// @match        https://concords.moneydj.com/z/zk/zkf/zkExpert_F.asp*
// @match        https://concords.moneydj.com/z/zk/zkf/zkResult.asp*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 判斷當前所在頁面
    if (window.location.href.indexOf('zkResult.asp') !== -1) {
        // === 結果頁面：自動添加「匯出 CSV」按鈕 ===
        addExportButton();
    } else if (window.location.href.indexOf('zkExpert_F.asp') !== -1) {
        // === 條件設定頁面：自動添加「一鍵選股並匯出」按鈕 ===
        addAutoScreenButton();
    }

    function addAutoScreenButton() {
        const btn = document.createElement('button');
        btn.innerHTML = '🚀 一鍵執行指定選股條件 (DIF週MACD + 主力20日200張 + 營收3月1%)';
        btn.style.position = 'fixed';
        btn.style.top = '15px';
        btn.style.right = '20px';
        btn.style.zIndex = '99999';
        btn.style.padding = '10px 18px';
        btn.style.backgroundColor = '#2563eb';
        btn.style.color = '#ffffff';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)';

        btn.onclick = function () {
            // 跳轉到包含三項條件的篩選結果
            // A = x@1301 (技術面DIF突破MACD週) ; x@370,a@20,b@200 (主力買超) ; x@5720,a@3,b@1 (營收月成長)
            const targetUrl = '/z/zk/zkf/zkResult.asp?D=1&A=x@1301;x@370,a@20,b@200;x@5720,a@3,b@1&site=';
            window.location.href = targetUrl;
        };


        document.body.appendChild(btn);
    }

    function addExportButton() {
        const btn = document.createElement('button');
        btn.innerHTML = '📥 匯出當前篩選結果為 CSV 檔';
        btn.style.position = 'fixed';
        btn.style.top = '15px';
        btn.style.right = '20px';
        btn.style.zIndex = '99999';
        btn.style.padding = '10px 18px';
        btn.style.backgroundColor = '#059669';
        btn.style.color = '#ffffff';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 4px 12px rgba(5,150,105,0.4)';

        btn.onclick = function () {
            exportTableToCSV();
        };

        document.body.appendChild(btn);
    }

    function exportTableToCSV() {
        const rows = document.querySelectorAll('tr.zkt2R, tr.zkt2R_rev');
        if (!rows || rows.length === 0) {
            alert('未找到符合的股票篩選結果！');
            return;
        }

        const headers = [
            '股票代號',
            '股票名稱',
            '收盤價',
            '漲跌',
            '漲跌幅',
            'DIF(週)',
            'MACD(週)',
            '近20日主力買超(張)',
            '近3月平均營收月成長率(%)'
        ];

        let csv = '\uFEFF' + headers.join(',') + '\r\n';

        rows.forEach(r => {
            const tds = r.querySelectorAll('td');
            if (tds.length >= 8) {
                const rawName = tds[0].innerText.trim();
                const codeMatch = rawName.match(/\d+/);
                const code = codeMatch ? codeMatch[0] : '';
                const name = code ? rawName.replace(code, '').trim() : rawName;
                const close = tds[1].innerText.trim();
                const change = tds[2].innerText.trim();
                const pct = tds[3].innerText.trim();
                const dif = tds[4].innerText.trim();
                const macd = tds[5].innerText.trim();
                const buy = tds[6].innerText.replace(/,/g, '').trim();
                const rev = tds[7].innerText.trim();

                csv += `"${code}","${name}",${close},${change},"${pct}",${dif},${macd},"${buy}",${rev}\r\n`;
            }
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MoneyDJ_篩選結果_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
})();
