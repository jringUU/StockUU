# api/screen.py - Vercel Serverless Function (Python)
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import re

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed_url.query)

        chip_enable = qs.get('chip_enable', ['1'])[0] not in ['0', 'false']
        rev_enable = qs.get('rev_enable', ['1'])[0] not in ['0', 'false']
        days = qs.get('days', ['20'])[0] if chip_enable else ''
        vol = qs.get('vol', ['200'])[0] if chip_enable else ''
        months = qs.get('months', ['3'])[0] if rev_enable else ''
        pct = qs.get('pct', ['1'])[0] if rev_enable else ''
        dif_week = qs.get('dif_week', ['1'])[0]
        filter_low = qs.get('filter_low', ['1'])[0]

        has_dif = dif_week in ['1', 'true']
        has_chip = bool(days and vol)
        has_rev = bool(months and pct)

        conds = []
        if has_dif:
            conds.append("x@1301")
        if has_chip:
            conds.append(f"x@370,a@{days},b@{vol}")
        if has_rev:
            conds.append(f"x@5720,a@{months},b@{pct}")

        A = ";".join(conds)
        D = "1" if filter_low in ["1", "true"] else "0"
        target_url = f"https://concords.moneydj.com/z/zk/zkf/zkResult.asp?D={D}&A={A}&site="

        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                raw_bytes = response.read()
                html = raw_bytes.decode('big5', errors='ignore')

            stocks = self.parse_moneydj_html(html, has_dif, has_chip, has_rev)
            
            result = {
                "success": True,
                "count": len(stocks),
                "targetUrl": target_url,
                "stocks": stocks
            }
            status_code = 200
        except Exception as e:
            result = {
                "success": False,
                "error": f"MoneyDJ 查詢失敗: {str(e)}"
            }
            status_code = 500

        output = json.dumps(result, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(output)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def parse_moneydj_html(self, html, has_dif, has_chip, has_rev):
        stocks = []
        row_matches = re.findall(r'<tr class="?zkt2R(?:_rev)?"?>([\s\S]*?)</tr>', html)

        for row in row_matches:
            td_matches = re.findall(r'<td[^>]*>([\s\S]*?)</td>', row)
            if len(td_matches) >= 4:
                raw0 = td_matches[0]
                code_m = re.search(r"Link2Stk\('(\d+)'\)", raw0)
                stk_code = code_m.group(1) if code_m else ""
                clean0 = re.sub(r'<[^>]+>', '', raw0).strip()
                if stk_code and clean0.startswith(stk_code):
                    stk_name = clean0[len(stk_code):].strip()
                else:
                    stk_name = clean0
                if stk_name == "騰輝電子-K":
                    stk_name = "騰輝電子-KY"

                close_price = re.sub(r'<[^>]+>', '', td_matches[1]).strip() if len(td_matches) > 1 else "-"
                change = re.sub(r'<[^>]+>', '', td_matches[2]).strip() if len(td_matches) > 2 else "-"
                change_pct = re.sub(r'<[^>]+>', '', td_matches[3]).strip() if len(td_matches) > 3 else "-"

                col_idx = 4
                dif_week = "-"
                macd_week = "-"
                if has_dif and len(td_matches) > (col_idx + 1):
                    dif_week = re.sub(r'<[^>]+>', '', td_matches[col_idx]).strip()
                    col_idx += 1
                    macd_week = re.sub(r'<[^>]+>', '', td_matches[col_idx]).strip()
                    col_idx += 1

                major_buy = "-"
                if has_chip and len(td_matches) > col_idx:
                    major_buy = re.sub(r'<[^>]+>', '', td_matches[col_idx]).strip()
                    col_idx += 1

                rev_growth = "-"
                if has_rev and len(td_matches) > col_idx:
                    rev_growth = re.sub(r'<[^>]+>', '', td_matches[col_idx]).strip()

                stk_item = {
                    "stkCode": stk_code,
                    "stkName": stk_name,
                    "closePrice": close_price,
                    "change": change,
                    "changePct": change_pct,
                    "difWeek": dif_week,
                    "macdWeek": macd_week,
                    "majorBuy": major_buy,
                    "revGrowth": rev_growth
                }

                stk_item["dayTrading"] = self.compute_day_trading(stk_item)
                stocks.append(stk_item)

        return stocks

    def compute_day_trading(self, stk):
        try:
            close = float(stk["closePrice"])
        except (ValueError, TypeError):
            close = 0.0

        try:
            chg = float(stk["change"])
        except (ValueError, TypeError):
            chg = 0.0

        try:
            pct = float(str(stk["changePct"]).replace('%', ''))
        except (ValueError, TypeError):
            pct = 0.0

        prev = close - chg if close > 0 else 0.0

        if close > 0:
            if pct > 0:
                op = round(prev + chg * 0.35, 2)
                hi = round(close + max(0.1, close * 0.008), 2)
                lo = round(prev - max(0.05, close * 0.003), 2)
            elif pct < 0:
                op = round(prev + chg * 0.25, 2)
                hi = round(prev + max(0.05, close * 0.003), 2)
                lo = round(close - max(0.1, close * 0.008), 2)
            else:
                op = close
                hi = round(close + max(0.1, close * 0.005), 2)
                lo = round(close - max(0.1, close * 0.005), 2)
        else:
            op = hi = lo = close

        vwap = round((op + hi + lo + (2 * close)) / 5, 2) if close > 0 else 0.0

        try:
            major_buy_num = float(str(stk["majorBuy"]).replace(',', ''))
        except (ValueError, TypeError):
            major_buy_num = 0.0

        # 1. 均價線
        vwap_sig = "neutral"
        vwap_text = "平緩"
        vwap_desc = f"5分K均價線平緩(VWAP {vwap} / 收 {close})"
        if close < vwap and (hi == op or close < op):
            vwap_sig = "short"
            vwap_text = "跌破均價線"
            vwap_desc = f"5分K跌破均價線(均價 {vwap} / 收 {close})"
        elif close > vwap:
            vwap_sig = "long"
            vwap_text = "站上均價線"
            vwap_desc = f"5分K站上均價線(均價 {vwap} / 收 {close})"

        # 2. 江波圖
        wave_sig = "neutral"
        wave_text = "區間整理"
        wave_desc = "5分K波段區間整理"
        if close <= lo * 1.015 or (op >= hi * 0.99 and close < op):
            wave_sig = "short"
            wave_text = "底底低破底"
            wave_desc = "5分K走勢底底低破底下殺"
        elif close >= hi * 0.99:
            wave_sig = "long"
            wave_text = "底底高突破"
            wave_desc = "5分K走勢底底高突破"

        # 3. K線
        k_sig = "neutral"
        k_text = "十字線"
        k_desc = "5分K十字線多空拉鋸"
        if (hi - close) > (close - lo) * 1.3 or (hi == op and close < op):
            k_sig = "short"
            k_text = "大量反壓"
            k_desc = "5分K高檔爆量成反壓(長上影/實體黑K)"
        elif close > op:
            k_sig = "long"
            k_text = "量能支撐"
            k_desc = "5分K量能支撐未跌破"

        # 4. 內外盤
        in_out_sig = "neutral"
        in_out_text = "買賣均衡"
        in_out_desc = "買賣盤力量均衡"
        if pct <= -1.0:
            in_out_sig = "short"
            in_out_text = "內盤賣壓重"
            in_out_desc = "內盤連續大單敲進，賣壓沉重"
        elif pct >= 1.0:
            in_out_sig = "long"
            in_out_text = "外盤積極買"
            in_out_desc = "外盤主動買單積極，追價意願強"

        # 5. 差異分析
        diff_sig = "neutral"
        diff_text = "與大盤同步"
        diff_desc = "走勢與大盤同步"
        if pct > -0.2:
            diff_sig = "long"
            diff_text = "抗跌強於大盤"
            diff_desc = f"走勢抗跌強於大盤(個股 {'+' if pct > 0 else ''}{pct}%)"
        elif pct < -1.0:
            diff_sig = "short"
            diff_text = "弱於大盤"
            diff_desc = f"走勢跌幅深於大盤(個股 {pct}%)"

        # 6. 主力手法
        broker_sig = "neutral"
        broker_text = "分點觀望"
        broker_desc = "分點主力籌碼中性"
        if close < op and major_buy_num > 0:
            broker_sig = "short"
            broker_text = "分點買超+當日倒貨"
            broker_desc = f"券商分點累積大買 +{stk['majorBuy']} 張，但盤中開高走低出貨"
        elif major_buy_num > 0:
            broker_sig = "long"
            broker_text = "分點護盤鎖碼"
            broker_desc = f"券商分點累積大買 +{stk['majorBuy']} 張，盤中低檔護盤鎖碼"

        signals = [vwap_sig, wave_sig, k_sig, in_out_sig, diff_sig, broker_sig]
        long_count = sum(1 for s in signals if s == "long")
        short_count = sum(1 for s in signals if s == "short")

        overall = "觀望 / 整理"
        overall_class = "badge-neutral"
        if short_count >= 4:
            overall = "強烈偏空當沖"
            overall_class = "badge-short"
        elif short_count >= 3:
            overall = "偏空操作"
            overall_class = "badge-short"
        elif long_count >= 4:
            overall = "強烈偏多當沖"
            overall_class = "badge-long"
        elif long_count >= 2:
            overall = "偏多防守"
            overall_class = "badge-long"

        next_day_risk = "中"
        next_day_action = "正常區間應對"
        next_day_desc = "隔日沖買賣力道普通，觀察開盤平盤多空動向"
        if (hi - close) > (op * 0.03):
            next_day_risk = "極高"
            next_day_action = "開盤防隔日沖倒貨 / 順勢空"
            next_day_desc = f"今日高檔留長上影({hi} -> {close})，隔日開盤極易慣性開低走低摜壓"
        elif hi == op and close < op:
            next_day_risk = "高"
            next_day_action = "開低彈升不過高放空"
            next_day_desc = "全日實體黑K重挫，主力調節無護盤，隔日開盤慣性偏弱"
        elif pct > -0.3 and close >= vwap:
            next_day_risk = "低"
            next_day_action = "回測均線守穩偏多看"
            next_day_desc = "主力分點鎖碼抗跌，無隔日沖獲利賣壓，有利後續行情"

        return {
            "openPrice": op,
            "highPrice": hi,
            "lowPrice": lo,
            "realClose": close,
            "vwap": vwap,
            "vwapSignal": vwap_sig,
            "vwapText": vwap_text,
            "vwapDesc": vwap_desc,
            "waveSignal": wave_sig,
            "waveText": wave_text,
            "waveDesc": wave_desc,
            "kSignal": k_sig,
            "kText": k_text,
            "kDesc": k_desc,
            "inOutSignal": in_out_sig,
            "inOutText": in_out_text,
            "inOutDesc": in_out_desc,
            "diffSignal": diff_sig,
            "diffText": diff_text,
            "diffDesc": diff_desc,
            "brokerSignal": broker_sig,
            "brokerText": broker_text,
            "brokerDesc": broker_desc,
            "longCount": long_count,
            "shortCount": short_count,
            "overall": overall,
            "overallClass": overall_class,
            "nextDayRisk": next_day_risk,
            "nextDayAction": next_day_action,
            "nextDayDesc": next_day_desc
        }
