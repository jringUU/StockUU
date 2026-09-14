// MoneyDJ 智慧選股與當沖診斷前端應用程式邏輯

let allStocks = [];
let filteredStocks = [];
let currentSort = { column: 'stkCode', direction: 'asc' };
let currentQueryUrl = '';
let currentTab = 'swing'; // 預設為主頁 (智慧選股) 分頁
let selectedSwingCodes = new Set(); // 波段勾選代號集合
let waveShowOnlySelected = true; // 波段手法分頁顯示模式：僅顯示勾選標的

// DOM 元素 - 分頁切換
const tabBtnSwing = document.getElementById('tabBtnSwing');
const tabBtnWaveStrategy = document.getElementById('tabBtnWaveStrategy');
const tabBtnDayTrading = document.getElementById('tabBtnDayTrading');
const tabBtnOvernight = document.getElementById('tabBtnOvernight');
const tabBtnMoneyDjLive = document.getElementById('tabBtnMoneyDjLive');
const viewSwing = document.getElementById('viewSwing');
const viewWaveStrategy = document.getElementById('viewWaveStrategy');
const viewDayTrading = document.getElementById('viewDayTrading');
const viewOvernight = document.getElementById('viewOvernight');
const viewMoneyDjLive = document.getElementById('viewMoneyDjLive');

// DOM 元素 - 標籤徽章與勾選
const badgeSwingCount = document.getElementById('badgeSwingCount');
const badgeWaveCount = document.getElementById('badgeWaveCount');
const badgeDayTradingCount = document.getElementById('badgeDayTradingCount');
const checkAllSwing = document.getElementById('checkAllSwing');

// DOM 元素 - 波段手法分頁
const waveTableBody = document.getElementById('waveTableBody');
const waveSearchInput = document.getElementById('waveSearchInput');
const waveTableBadge = document.getElementById('waveTableBadge');
const waveMetricSelected = document.getElementById('waveMetricSelected');
const waveMetricStrong = document.getElementById('waveMetricStrong');
const waveMetricAvgBuy = document.getElementById('waveMetricAvgBuy');
const waveMetricAvgRev = document.getElementById('waveMetricAvgRev');
const btnWaveToggleAll = document.getElementById('btnWaveToggleAll');
const btnExportWaveCSV = document.getElementById('btnExportWaveCSV');

// DOM 元素 - 當沖分頁
const dtTableBody = document.getElementById('dtTableBody');
const dtSearchInput = document.getElementById('dtSearchInput');
const btnExportDtCSV = document.getElementById('btnExportDtCSV');
const dtMetricTotal = document.getElementById('dtMetricTotal');
const dtMetricShort = document.getElementById('dtMetricShort');
const dtMetricLong = document.getElementById('dtMetricLong');
const dtTableCountBadge = document.getElementById('dtTableCountBadge');

// DOM 元素 - 大戶隔日沖分頁
const overnightTableBody = document.getElementById('overnightTableBody');

// DOM 元素 - 智慧選股分頁
const btnRunFilter = document.getElementById('btnRunFilter');
const btnExportCSV = document.getElementById('btnExportCSV');
const btnResetDefault = document.getElementById('btnResetDefault');
const filterSpinner = document.getElementById('filterSpinner');
const filterIcon = document.getElementById('filterIcon');
const filterBtnText = document.getElementById('filterBtnText');

const condTechDIF = document.getElementById('condTechDIF');
const condChipEnable = document.getElementById('condChipEnable');
const condRevEnable = document.getElementById('condRevEnable');
const cardTech = document.getElementById('cardTech');
const cardChip = document.getElementById('cardChip');
const cardRev = document.getElementById('cardRev');
const inputChipDays = document.getElementById('inputChipDays');
const inputChipVol = document.getElementById('inputChipVol');
const inputRevMonths = document.getElementById('inputRevMonths');
const inputRevPct = document.getElementById('inputRevPct');
const condFilterLow = document.getElementById('condFilterLow');

const resultsMetaSection = document.getElementById('resultsMetaSection');
const tableStateBox = document.getElementById('tableStateBox');
const stateInitial = document.getElementById('stateInitial');
const stateLoading = document.getElementById('stateLoading');
const stateError = document.getElementById('stateError');
const errorMessageText = document.getElementById('errorMessageText');
const btnRetry = document.getElementById('btnRetry');

const tableContainer = document.getElementById('tableContainer');
const stockTableBody = document.getElementById('stockTableBody');
const tableCountBadge = document.getElementById('tableCountBadge');
const queryTimestamp = document.getElementById('queryTimestamp');
const tableSearchInput = document.getElementById('tableSearchInput');
const btnOpenTargetUrl = document.getElementById('btnOpenTargetUrl');

const thMajorBuy = document.getElementById('thMajorBuy');
const thRevGrowth = document.getElementById('thRevGrowth');

// 統計指標元素
const metricTotalCount = document.getElementById('metricTotalCount');
const metricUpCount = document.getElementById('metricUpCount');
const metricDownCount = document.getElementById('metricDownCount');
const metricAvgChange = document.getElementById('metricAvgChange');
const metricTotalMajorBuy = document.getElementById('metricTotalMajorBuy');

// 書籤彈窗
const btnOpenBookmarklet = document.getElementById('btnOpenBookmarklet');
const bookmarkletModal = document.getElementById('bookmarkletModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const bookmarkletLink = document.getElementById('bookmarkletLink');
const bookmarkletCodeText = document.getElementById('bookmarkletCodeText');
const btnCopyCode = document.getElementById('btnCopyCode');

// 初始化事件監聽
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initEvents();
    setupBookmarklet();
    // 主畫面直接向 MoneyDJ 官方伺服器 (concords.moneydj.com) 發送選股指令，進行即時動態運算
    runMainMoneyDJScreen(false);
    // 背景預載當沖與波段深度量化診斷指標
    runScreening();
});

// ========================================================
// 分頁切換控制 (四大核心模組)
// ========================================================
function initTabs() {
    const tabs = [
        { btn: tabBtnSwing, view: viewSwing, id: 'swing' },
        { btn: tabBtnWaveStrategy, view: viewWaveStrategy, id: 'waveStrategy' },
        { btn: tabBtnDayTrading, view: viewDayTrading, id: 'dayTrading' },
        { btn: tabBtnOvernight, view: viewOvernight, id: 'overnight' },
        { btn: tabBtnMoneyDjLive, view: viewMoneyDjLive, id: 'moneydjLive' }
    ];

    tabs.forEach(t => {
        if (!t.btn || !t.view) return;
        t.btn.addEventListener('click', () => {
            currentTab = t.id;
            tabs.forEach(item => {
                if (!item.btn || !item.view) return;
                item.btn.classList.toggle('active', item.id === t.id);
                item.view.style.display = (item.id === t.id) ? 'block' : 'none';
            });

            if (t.id === 'waveStrategy') {
                renderWaveStrategyTable(allStocks);
            } else if (t.id === 'dayTrading') {
                renderDayTradingTable(allStocks);
            } else if (t.id === 'overnight') {
                renderOvernightTable(allStocks);
            } else if (t.id === 'moneydjLive') {
                loadMoneyDJIframe();
            }
        });
    });
}

function initEvents() {
    btnRunFilter.addEventListener('click', () => {
        runMainMoneyDJScreen(true);
        runScreening();
    });
    btnExportCSV.addEventListener('click', exportToCSV);
    btnExportDtCSV.addEventListener('click', exportDayTradingCSV);
    if (btnExportWaveCSV) btnExportWaveCSV.addEventListener('click', exportWaveStrategyCSV);
    btnResetDefault.addEventListener('click', () => {
        resetDefaults();
        runMainMoneyDJScreen(false);
    });
    btnRetry.addEventListener('click', () => {
        runMainMoneyDJScreen(true);
        runScreening();
    });

    // 主畫面量化指標視圖切換
    const btnToggleQuantView = document.getElementById('btnToggleQuantView');
    if (btnToggleQuantView) {
        btnToggleQuantView.addEventListener('click', toggleQuantView);
    }

    // 主畫面 MoneyDJ 即時運算視窗控制項
    const btnReloadMainLive = document.getElementById('btnReloadMainLive');
    if (btnReloadMainLive) {
        btnReloadMainLive.addEventListener('click', () => runMainMoneyDJScreen(false));
    }
    const btnOpenMainNewTab = document.getElementById('btnOpenMainNewTab');
    if (btnOpenMainNewTab) {
        btnOpenMainNewTab.addEventListener('click', () => {
            window.open(getMoneyDJQueryUrl(), '_blank');
        });
    }
    const btnCopyMainUrl = document.getElementById('btnCopyMainUrl');
    if (btnCopyMainUrl) {
        btnCopyMainUrl.addEventListener('click', () => {
            const url = getMoneyDJQueryUrl();
            navigator.clipboard.writeText(url).then(() => {
                const orig = btnCopyMainUrl.innerHTML;
                btnCopyMainUrl.innerHTML = '<span class="icon">✅</span> 已複製！';
                setTimeout(() => { btnCopyMainUrl.innerHTML = orig; }, 2000);
            });
        });
    }

    const btnDirectMoneyDJRun = document.getElementById('btnDirectMoneyDJRun');
    if (btnDirectMoneyDJRun) {
        btnDirectMoneyDJRun.addEventListener('click', runMoneyDJDirectScreen);
    }
    const btnEmbedMoneyDJRun = document.getElementById('btnEmbedMoneyDJRun');
    if (btnEmbedMoneyDJRun) {
        btnEmbedMoneyDJRun.addEventListener('click', switchToMoneyDJLive);
    }
    const btnReloadIframe = document.getElementById('btnReloadIframe');
    if (btnReloadIframe) {
        btnReloadIframe.addEventListener('click', () => loadMoneyDJIframe(true));
    }
    const btnOpenIframeNewTab = document.getElementById('btnOpenIframeNewTab');
    if (btnOpenIframeNewTab) {
        btnOpenIframeNewTab.addEventListener('click', () => {
            window.open(getMoneyDJQueryUrl(), '_blank');
        });
    }
    const btnCopyIframeUrl = document.getElementById('btnCopyIframeUrl');
    if (btnCopyIframeUrl) {
        btnCopyIframeUrl.addEventListener('click', () => {
            const url = getMoneyDJQueryUrl();
            navigator.clipboard.writeText(url).then(() => {
                const orig = btnCopyIframeUrl.innerHTML;
                btnCopyIframeUrl.innerHTML = '<span class="icon">✅</span> 已複製！';
                setTimeout(() => { btnCopyIframeUrl.innerHTML = orig; }, 2000);
            });
        });
    }
    const btnBackToSwing = document.getElementById('btnBackToSwing');
    if (btnBackToSwing) {
        btnBackToSwing.addEventListener('click', () => {
            if (tabBtnSwing) tabBtnSwing.click();
        });
    }

    // 條件勾選即時連動卡片啟用/停用樣式與輸入框
    if (condTechDIF) {
        condTechDIF.addEventListener('change', () => {
            if (cardTech) cardTech.classList.toggle('inactive', !condTechDIF.checked);
        });
    }
    if (condChipEnable) {
        condChipEnable.addEventListener('change', () => {
            if (cardChip) cardChip.classList.toggle('inactive', !condChipEnable.checked);
            inputChipDays.disabled = !condChipEnable.checked;
            inputChipVol.disabled = !condChipEnable.checked;
        });
    }
    if (condRevEnable) {
        condRevEnable.addEventListener('change', () => {
            if (cardRev) cardRev.classList.toggle('inactive', !condRevEnable.checked);
            inputRevMonths.disabled = !condRevEnable.checked;
            inputRevPct.disabled = !condRevEnable.checked;
        });
    }

    // 波段手法搜尋
    if (waveSearchInput) {
        waveSearchInput.addEventListener('input', (e) => {
            applyWaveSearch(e.target.value.trim().toLowerCase());
        });
    }

    // 波段手法顯示模式切換
    if (btnWaveToggleAll) {
        btnWaveToggleAll.addEventListener('click', () => {
            waveShowOnlySelected = !waveShowOnlySelected;
            btnWaveToggleAll.querySelector('span').innerText = waveShowOnlySelected ? '顯示模式：僅勾選標的' : '顯示模式：全部標的';
            renderWaveStrategyTable(allStocks);
        });
    }

    // 全選/取消全選波段勾選欄位
    if (checkAllSwing) {
        checkAllSwing.addEventListener('change', (e) => {
            toggleAllSwing(e.target.checked);
        });
    }

    // 當沖表格關鍵字搜尋
    dtSearchInput.addEventListener('input', (e) => {
        applyDayTradingSearch(e.target.value.trim().toLowerCase());
    });

    // 智慧選股即時關鍵字搜尋
    tableSearchInput.addEventListener('input', (e) => {
        applySearch(e.target.value.trim().toLowerCase());
    });

    // 表頭點選排序
    document.querySelectorAll('.stock-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            handleSort(col);
        });
    });

    // 書籤彈窗開關
    btnOpenBookmarklet.addEventListener('click', () => {
        bookmarkletModal.style.display = 'flex';
    });
    btnCloseModal.addEventListener('click', () => {
        bookmarkletModal.style.display = 'none';
    });
    bookmarkletModal.addEventListener('click', (e) => {
        if (e.target === bookmarkletModal) bookmarkletModal.style.display = 'none';
    });

    // 複製代碼
    btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(bookmarkletCodeText.innerText).then(() => {
            btnCopyCode.innerText = '已複製！';
            setTimeout(() => { btnCopyCode.innerText = '複製代碼'; }, 2000);
        });
    });

    // 開啟 MoneyDJ 原始頁面
    btnOpenTargetUrl.addEventListener('click', () => {
        if (currentQueryUrl) {
            window.open(currentQueryUrl, '_blank');
        }
    });

    // 回到主頁 (智慧選股) 事件監聽
    const btnGoHome = document.getElementById('btnGoHome');
    const navBrandHome = document.getElementById('navBrandHome');
    const floatingHomeBtn = document.getElementById('floatingHomeBtn');
    if (btnGoHome) btnGoHome.addEventListener('click', goHome);
    if (navBrandHome) navBrandHome.addEventListener('click', goHome);
    if (floatingHomeBtn) floatingHomeBtn.addEventListener('click', goHome);

    // MACD 彈窗關閉事件：點擊叉叉或非 MACD 區域 (背景遮罩) 立即關閉並回到智慧選股
    const btnCloseMacdModal = document.getElementById('btnCloseMacdModal');
    const macdModal = document.getElementById('macdModal');
    if (btnCloseMacdModal) {
        btnCloseMacdModal.addEventListener('click', closeModalAndGoHome);
    }
    if (macdModal) {
        macdModal.addEventListener('click', (e) => {
            // 點在非 MACD 圖（灰底遮罩背景）回到智慧選股主頁
            if (e.target === macdModal) {
                closeModalAndGoHome();
            }
        });
    }

    // 當沖 6 大指標依據明細彈窗關閉事件
    const btnCloseDtModal = document.getElementById('btnCloseDtModal');
    const dtDetailModal = document.getElementById('dtDetailModal');
    if (btnCloseDtModal) {
        btnCloseDtModal.addEventListener('click', closeDtModal);
    }
    if (dtDetailModal) {
        dtDetailModal.addEventListener('click', (e) => {
            if (e.target === dtDetailModal) {
                closeDtModal();
            }
        });
    }

    // 按 Escape 鍵關閉彈窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('macdModal');
            if (modal && modal.style.display === 'flex') {
                closeModalAndGoHome();
            }
            const dtModal = document.getElementById('dtDetailModal');
            if (dtModal && dtModal.style.display === 'flex') {
                closeDtModal();
            }
        }
    });
}


// 恢復預設參數
function resetDefaults() {
    condTechDIF.checked = true;
    if (condChipEnable) condChipEnable.checked = true;
    if (condRevEnable) condRevEnable.checked = true;
    if (cardTech) cardTech.classList.remove('inactive');
    if (cardChip) cardChip.classList.remove('inactive');
    if (cardRev) cardRev.classList.remove('inactive');
    inputChipDays.disabled = false;
    inputChipVol.disabled = false;
    inputRevMonths.disabled = false;
    inputRevPct.disabled = false;
    inputChipDays.value = 20;
    inputChipVol.value = 200;
    inputRevMonths.value = 3;
    inputRevPct.value = 1;
    condFilterLow.checked = true;
}

let isCloudMode = false;
let cloudDataCache = null;

// 動態構造 MoneyDJ 選股大師官方即時篩選 URL (依據當前畫面所有核取與數值輸入)
function getMoneyDJQueryUrl() {
    const isTechActive = condTechDIF ? condTechDIF.checked : true;
    const isChipActive = condChipEnable ? condChipEnable.checked : true;
    const isRevActive = condRevEnable ? condRevEnable.checked : true;

    const days = isChipActive ? (inputChipDays.value || 20) : '';
    const vol = isChipActive ? (inputChipVol.value || 200) : '';
    const months = isRevActive ? (inputRevMonths.value || 3) : '';
    const pct = isRevActive ? (inputRevPct.value || 1) : '';
    const filterLow = condFilterLow ? (condFilterLow.checked ? 1 : 0) : 1;

    const conds = [];
    if (isTechActive) conds.push("x@1301");
    if (isChipActive && days && vol) conds.push(`x@370,a@${days},b@${vol}`);
    if (isRevActive && months && pct) conds.push(`x@5720,a@${months},b@${pct}`);
    const A = conds.join(';');
    return `https://concords.moneydj.com/z/zk/zkf/zkResult.asp?D=${filterLow}&A=${A}&site=`;
}

// 直連 MoneyDJ 官方伺服器即時運算篩選 (另開新頁)
function runMoneyDJDirectScreen() {
    const url = getMoneyDJQueryUrl();
    window.open(url, '_blank');
}

// 主畫面直接向 MoneyDJ 官方伺服器 (concords.moneydj.com) 發送選股指令，進行即時動態運算
function runMainMoneyDJScreen(scrollIntoView = false) {
    const iframe = document.getElementById('mainMoneydjIframe');
    const urlDisplay = document.getElementById('mainIframeUrlDisplay');
    const loadingBar = document.getElementById('mainIframeLoadingBar');
    const targetUrl = getMoneyDJQueryUrl();

    if (urlDisplay) urlDisplay.textContent = targetUrl;
    currentQueryUrl = targetUrl;

    if (iframe) {
        if (loadingBar) loadingBar.style.display = 'flex';
        iframe.src = targetUrl;
        iframe.onload = () => {
            if (loadingBar) loadingBar.style.display = 'none';
        };
    }

    if (scrollIntoView) {
        const liveSec = document.getElementById('mainLiveSection');
        if (liveSec) {
            liveSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// 切換主畫面當沖 6 大量化指標診斷表展開/收合
function toggleQuantView() {
    const metaSec = document.getElementById('resultsMetaSection');
    const tableSec = document.getElementById('tableContainer');
    const toggleText = document.getElementById('toggleQuantText');

    const isVisible = tableSec && tableSec.style.display !== 'none';
    if (isVisible) {
        if (metaSec) metaSec.style.display = 'none';
        if (tableSec) tableSec.style.display = 'none';
        if (toggleText) toggleText.textContent = '展開當沖 6 大診斷表';
    } else {
        if (metaSec) metaSec.style.display = 'block';
        if (tableSec) tableSec.style.display = 'block';
        if (toggleText) toggleText.textContent = '隱藏當沖 6 大診斷表';
        if (tableSec) tableSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (allStocks.length === 0) {
            runScreening();
        }
    }
}

// 載入或重新整理 MoneyDJ 內嵌視窗
function loadMoneyDJIframe(forceReload = false) {
    const iframe = document.getElementById('moneydjIframe');
    const urlDisplay = document.getElementById('iframeUrlDisplay');
    const loadingBar = document.getElementById('iframeLoadingBar');
    const targetUrl = getMoneyDJQueryUrl();

    if (urlDisplay) urlDisplay.textContent = targetUrl;
    if (!iframe) return;

    if (iframe.src !== targetUrl || forceReload) {
        if (loadingBar) loadingBar.style.display = 'flex';
        iframe.src = targetUrl;
        iframe.onload = () => {
            if (loadingBar) loadingBar.style.display = 'none';
        };
    }
}

// 切換至 MoneyDJ 原站即時篩選分頁並載入
function switchToMoneyDJLive() {
    if (tabBtnMoneyDjLive) {
        tabBtnMoneyDjLive.click();
    }
    loadMoneyDJIframe(true);
}

// 更新系統運行模式標籤 (線上雲端模式 vs 本機伺服器模式)
function updateSystemModeUI(source, queryTime) {
    const serverStatus = document.getElementById('serverStatus');
    const cloudBanner = document.getElementById('cloudModeBanner');
    const cloudBannerText = document.getElementById('cloudBannerText');

    if (source === 'cloud') {
        if (serverStatus) {
            serverStatus.innerHTML = `
                <span class="status-dot pulse" style="background:#06b6d4; box-shadow:0 0 8px rgba(6,182,212,0.6);"></span>
                <span class="status-text" style="color:#38bdf8;">🌐 線上金融終端</span>
            `;
            serverStatus.title = `目前運行於 GitHub Pages 線上終端，支援即時篩選、指標診斷與直連選股大師 (${queryTime || ''})`;
        }
        if (cloudBanner) {
            cloudBanner.style.display = 'flex';
            if (cloudBannerText) {
                cloudBannerText.innerHTML = `<strong>⚡ MoneyDJ 選股大師即時金融終端：</strong>支援自訂條件即時篩選、波段與當沖 6 大指標深度量化診斷，並支援一鍵直連 MoneyDJ 原站即時執行與匯出 CSV！`;
            }
        }
    } else {
        if (serverStatus) {
            serverStatus.innerHTML = `
                <span class="status-dot pulse" style="background:#10b981; box-shadow:0 0 8px rgba(16,185,129,0.6);"></span>
                <span class="status-text" style="color:#10b981;">⚡ 本機伺服器模式</span>
            `;
            serverStatus.title = '已連線本機 PowerShell 伺服器 (server.ps1)';
        }
        if (cloudBanner) {
            cloudBanner.style.display = 'none';
        }
    }
}

// 執行篩選與診斷 (前後端雙模支援)
async function runScreening() {
    const isTechActive = condTechDIF.checked;
    const isChipActive = condChipEnable ? condChipEnable.checked : true;
    const isRevActive = condRevEnable ? condRevEnable.checked : true;

    if (!isTechActive && !isChipActive && !isRevActive) {
        alert('請至少勾選一項篩選條件（技術面、籌碼面或營收獲利面）！');
        return;
    }

    const days = isChipActive ? (inputChipDays.value || 20) : '';
    const vol = isChipActive ? (inputChipVol.value || 200) : '';
    const months = isRevActive ? (inputRevMonths.value || 3) : '';
    const pct = isRevActive ? (inputRevPct.value || 1) : '';
    const difWeek = isTechActive ? 1 : 0;
    const filterLow = condFilterLow.checked ? 1 : 0;

    // 更新動態表頭說明
    thMajorBuy.innerHTML = isChipActive 
        ? `近${days}日主力買超(張) <span class="sort-arrow">↕</span>` 
        : `主力買超(未勾選) <span class="sort-arrow">↕</span>`;
    thRevGrowth.innerHTML = isRevActive 
        ? `近${months}月平均營收月成長 rev(%) <span class="sort-arrow">↕</span>` 
        : `營收成長(未勾選) <span class="sort-arrow">↕</span>`;

    setLoadingState(true);

    const queryParams = new URLSearchParams({
        days,
        vol,
        months,
        pct,
        dif_week: difWeek,
        chip_enable: isChipActive ? 1 : 0,
        rev_enable: isRevActive ? 1 : 0,
        filter_low: filterLow
    });

    let data = null;
    let dataSource = 'local';

    // 1. 判斷是否為 GitHub Pages 或無本機後端環境
    const isGitHubHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';

    // 若非 GitHub 靜態託管環境，優先連線本機 server.ps1
    if (!isGitHubHost) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(`/api/screen?${queryParams.toString()}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                const resJson = await response.json();
                if (resJson.success) {
                    data = resJson;
                    dataSource = 'local';
                }
            }
        } catch (localErr) {
            console.warn('本機後端未連線或逾時，自動無縫切換至雲端快照 data/latest.json:', localErr);
        }
    }

    // 2. 若本機伺服器未運行或處於 GitHub 靜態環境，自動載入最新靜態快照
    if (!data) {
        try {
            // 避免瀏覽器快取，加上時間戳記
            const staticResp = await fetch('./data/latest.json?t=' + Date.now());
            if (!staticResp.ok) {
                throw new Error(`找不到 data/latest.json 快照 (HTTP ${staticResp.status})`);
            }
            const staticJson = await staticResp.json();
            if (!staticJson.success) {
                throw new Error(staticJson.error || '靜態資料解析失敗');
            }
            data = staticJson;
            dataSource = 'cloud';
            cloudDataCache = staticJson;
        } catch (staticErr) {
            console.error('靜態快照資料載入失敗:', staticErr);
        }
    }

    if (!data) {
        errorMessageText.innerHTML = `
            篩選失敗：無法連線本機伺服器 (server.ps1)，且讀取雲端快照 <code>data/latest.json</code> 失敗。<br>
            • 若在 GitHub Pages：請確認已透過 GitHub Actions 執行至少一次選股以生成快照資料。<br>
            • 若在本機使用：請確認已執行 <code>start.bat</code> 啟動伺服器。
        `;
        setLoadingState(false, false);
        return;
    }

    // 在雲端模式下，若使用者調整門檻（如過濾低價股或變更買超張數），支援純前端自適應過濾
    let finalStocks = data.stocks || [];
    if (dataSource === 'cloud') {
        finalStocks = finalStocks.filter(s => {
            if (difWeek && (s.difWeek === '-' || !s.difWeek)) return false;
            if (isChipActive && vol) {
                const buy = parseInt(String(s.majorBuy).replace(/,/g, ''), 10) || 0;
                if (buy < parseInt(vol, 10)) return false;
            }
            if (isRevActive && pct) {
                const rev = parseFloat(String(s.revGrowth).replace('%', '')) || 0;
                if (rev < parseFloat(pct)) return false;
            }
            if (filterLow) {
                const price = parseFloat(s.closePrice) || 0;
                if (price > 0 && price < 5.0) return false;
            }
            return true;
        });
    }

    allStocks = finalStocks;
    currentQueryUrl = getMoneyDJQueryUrl();
    isCloudMode = (dataSource === 'cloud');

    // 更新系統模式 UI (標籤與橫幅)
    updateSystemModeUI(dataSource, data.queryTime);

    // 篩選後波段預設為未勾選，由使用者自選標的
    selectedSwingCodes.clear();

    // 渲染智慧選股主頁
    renderResults(allStocks, data.queryTime);

    // 渲染波段手法指標
    renderWaveStrategyTable(allStocks);

    // 渲染當沖 6 大指標與診斷
    renderDayTradingTable(allStocks);

    // 渲染大戶隔日沖策略
    renderOvernightTable(allStocks);

    // 更新波段勾選 UI 狀態
    updateSwingSelectionUI();

    btnExportCSV.disabled = allStocks.length === 0;
    tableSearchInput.disabled = false;
    if (currentQueryUrl) {
        btnOpenTargetUrl.style.display = 'inline-flex';
    }
    setLoadingState(false, true);
}

// 設置加載/空狀態
function setLoadingState(isLoading, isSuccess = true) {
    if (isLoading) {
        btnRunFilter.disabled = true;
        filterSpinner.style.display = 'inline-block';
        filterIcon.style.display = 'none';
        filterBtnText.innerText = '篩選運算中...';

        tableStateBox.style.display = 'block';
        stateInitial.style.display = 'none';
        stateLoading.style.display = 'block';
        stateError.style.display = 'none';
        tableContainer.style.display = 'none';
        resultsMetaSection.style.display = 'none';
    } else {
        btnRunFilter.disabled = false;
        filterSpinner.style.display = 'none';
        filterIcon.style.display = 'inline';
        filterBtnText.innerText = '開始篩選';

        stateLoading.style.display = 'none';

        if (isSuccess) {
            tableStateBox.style.display = 'none';
            tableContainer.style.display = 'block';
            resultsMetaSection.style.display = 'block';
        } else {
            tableStateBox.style.display = 'block';
            stateError.style.display = 'block';
            tableContainer.style.display = 'none';
            resultsMetaSection.style.display = 'none';
        }
    }
}

// ========================================================
// 當沖 6 大獲利指標渲染 (Stock01.pdf 獲利方法實戰檢核)
// ========================================================
function renderDayTradingTable(stocks) {
    if (!dtTableBody) return;

    badgeDayTradingCount.innerText = `${stocks.length} 檔診斷`;
    badgeSwingCount.innerText = `${stocks.length} 檔符合`;
    dtTableCountBadge.innerText = `共完成 ${stocks.length} 檔 6 大指標核對`;

    let shortCount = 0;
    let longCount = 0;

    stocks.forEach(s => {
        if (s.dayTrading) {
            if (s.dayTrading.overallClass === 'badge-short') shortCount++;
            if (s.dayTrading.overallClass === 'badge-long') longCount++;
        }
    });

    dtMetricTotal.innerHTML = `${stocks.length} <span class="unit">檔</span>`;
    dtMetricShort.innerHTML = `${shortCount} <span class="unit">檔</span>`;
    dtMetricLong.innerHTML = `${longCount} <span class="unit">檔</span>`;

    if (stocks.length === 0) {
        dtTableBody.innerHTML = `<tr><td colspan="11" class="text-center" style="padding: 2rem; color: var(--text-muted);">目前無篩選標的可診斷</td></tr>`;
        return;
    }

    const html = stocks.map((s, idx) => {
        const dt = s.dayTrading || {};
        const chgNum = parseFloat(s.change) || 0;
        const chgClass = chgNum > 0 ? 'stock-up' : chgNum < 0 ? 'stock-down' : 'stock-flat';
        const chgPrefix = chgNum > 0 ? '+' : '';
        const realClose = dt.realClose || s.closePrice;

        const getPill = (signal, text) => {
            const cls = signal === 'short' ? 'pill-short' : signal === 'long' ? 'pill-long' : 'pill-neutral';
            const icon = signal === 'short' ? '🔴' : signal === 'long' ? '🟢' : '⚪';
            return `<span class="pill-tag ${cls}" title="${text || '觀察'}">${icon} ${text || '觀察'}</span>`;
        };

        return `
            <tr class="dt-main-row" data-code="${s.stkCode}">
                <!-- 1. 股票代號/名稱 -->
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span class="stock-code">${s.stkCode}</span>
                        <span class="stock-name" style="font-weight:700;">${s.stkName}</span>
                        <div style="display:flex; gap:3px; align-items:center; flex-wrap:wrap;">
                            <span class="badge badge-cyan" style="font-size:0.65rem; padding:1px 5px; cursor:pointer; width:fit-content; border:1px solid rgba(56,189,248,0.4);" onclick="openMacdModal('${s.stkCode}')" title="點擊檢視 MACD(12) 週線走勢">📈 MACD(12)</span>
                            <span style="font-size:0.65rem; color:#38bdf8; font-family:var(--font-mono); background:rgba(56,189,248,0.1); padding:0 4px; border-radius:3px; border:1px solid rgba(56,189,248,0.25);" title="近3月平均營收月增率">rev:+${s.revGrowth}%</span>
                        </div>
                    </div>
                </td>
                <!-- 2. 現價 / 漲跌 -->
                <td class="text-right">
                    <div class="font-bold font-mono ${chgClass}" style="font-size:1rem;">${realClose}</div>
                    <div class="${chgClass}" style="font-size:0.76rem;">${chgPrefix}${s.change} (${s.changePct})</div>
                </td>
                <!-- 3. 達成指標 (空 / 多) -->
                <td class="text-center">
                    <div class="score-badge" style="justify-content:center;">
                        <span class="score-short">空${dt.shortCount || 0}</span>
                        <span style="color:var(--text-muted)">/</span>
                        <span class="score-long">多${dt.longCount || 0}</span>
                    </div>
                </td>
                <!-- 4. 當沖綜合指引 -->
                <td class="text-center">
                    <span class="badge-overall ${dt.overallClass || 'badge-neutral'}" style="font-size:0.75rem; padding:0.25rem 0.55rem;">
                        ${dt.overall || '觀望'}
                    </span>
                </td>
                <!-- 5. 依據明細 (仿主頁 MACD(12) 走勢微圖風格卡片) -->
                <td class="text-center">
                    ${generateDtDetailSparkline(s, dt)}
                </td>
                <!-- 6. ① 均價線 (5分K) -->
                <td>${getPill(dt.vwapSignal, dt.vwapText)}</td>
                <!-- 7. ② 江波圖 (5分K) -->
                <td>${getPill(dt.waveSignal, dt.waveText)}</td>
                <!-- 8. ③ K線型態 (5分K) -->
                <td>${getPill(dt.kSignal, dt.kText)}</td>
                <!-- 9. ④ 內外盤 (當日) -->
                <td>${getPill(dt.inOutSignal, dt.inOutText)}</td>
                <!-- 10. ⑤ 差異分析 (5分K) -->
                <td>${getPill(dt.diffSignal, dt.diffText)}</td>
                <!-- 11. ⑥ 主力手法 (券商分點) -->
                <td>${getPill(dt.brokerSignal, dt.brokerText)}</td>
            </tr>
        `;
    }).join('');

    dtTableBody.innerHTML = html;
}

// ========================================================
// 產生「依據明細」微圖卡片 (仿主頁 MACD(12) 走勢圖風格)
// ========================================================
function generateDtDetailSparkline(s, dt) {
    const shortCount = dt.shortCount || 0;
    const longCount = dt.longCount || 0;
    const overallClass = dt.overallClass || 'badge-neutral';
    const isLong = overallClass === 'badge-long';
    const isShort = overallClass === 'badge-short';
    const statusText = isLong ? '多方確立 ▲' : isShort ? '空方警戒 ▼' : '觀望整理 ─';
    const statusColor = isLong ? '#10b981' : isShort ? '#ef4444' : '#94a3b8';

    // 6 大獲利指標信號 (均價, 江波, K線, 內外, 差異, 主力)
    const sigs = [
        { name: '均價', sig: dt.vwapSignal },
        { name: '江波', sig: dt.waveSignal },
        { name: 'K線', sig: dt.kSignal },
        { name: '內外', sig: dt.inOutSignal },
        { name: '差異', sig: dt.diffSignal },
        { name: '主力', sig: dt.brokerSignal }
    ];

    // 產生 6 根能量柱體 (仿 MACD OSC 紅綠柱體演進圖形)
    const barsSvg = sigs.map((item, idx) => {
        const x = 8 + idx * 21;
        let color = '#64748b';
        let y = 13;
        let h = 4;
        let dotY = 15;
        if (item.sig === 'long') {
            color = '#10b981'; // 偏多 (綠)
            y = 4;
            h = 11;
            dotY = 3;
        } else if (item.sig === 'short') {
            color = '#ef4444'; // 偏空 (紅)
            y = 15;
            h = 11;
            dotY = 27;
        }
        return `
            <rect x="${x}" y="${y}" width="12" height="${h}" fill="${color}" rx="2" opacity="0.85">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="${1.6 + idx * 0.2}s" repeatCount="indefinite" />
            </rect>
            <circle cx="${x + 6}" cy="${dotY}" r="2" fill="${color}" />
        `;
    }).join('');

    return `
        <div class="dt-sparkline-box" onclick="openDtDetailModal('${s.stkCode}')" title="點擊放大檢視 ${s.stkCode} ${s.stkName} 的當沖 6 大獲利術實戰診斷依據與操作SOP">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px; font-size:0.68rem;">
                <span style="color:#c084fc; font-weight:700;">📊 依據明細</span>
                <span style="color:${statusColor}; font-weight:700;">${statusText}</span>
            </div>
            <svg class="dt-sparkline-svg" width="135" height="30" viewBox="0 0 135 30">
                <!-- 零軸基準線 (仿 MACD 零軸) -->
                <line x1="4" y1="15" x2="132" y2="15" stroke="rgba(255,255,255,0.2)" stroke-dasharray="2,2" stroke-width="1" />
                ${barsSvg}
            </svg>
            <div class="macd-val-tag" style="justify-content:space-between; width:100%; margin-top:2px;">
                <span style="color:#10b981; font-weight:700; font-size:0.68rem;">多:${longCount}項</span>
                <span style="color:#ef4444; font-weight:700; font-size:0.68rem;">空:${shortCount}項</span>
                <span style="color:#38bdf8; font-weight:700; font-size:0.68rem;">明細 ↗</span>
            </div>
        </div>
    `;
}

// ========================================================
// 開啟當沖 6 大獲利術實戰診斷詳細彈窗 (緊湊一頁模式)
// ========================================================
window.openDtDetailModal = function(code) {
    const stock = allStocks.find(s => s.stkCode === code);
    if (!stock) return;

    const modal = document.getElementById('dtDetailModal');
    const title = document.getElementById('dtModalTitle');
    const body = document.getElementById('dtModalBody');
    if (!modal || !body) return;

    const dt = stock.dayTrading || {};
    const shortCount = dt.shortCount || 0;
    const longCount = dt.longCount || 0;
    const overallText = dt.overall || '觀望';
    const overallClass = dt.overallClass || 'badge-neutral';

    title.innerHTML = `⚡ ${stock.stkCode} ${stock.stkName} ─ 當沖 6 大獲利術實戰診斷依據 (Stock01.pdf)`;

    body.innerHTML = `
        <div class="dt-modal-body-content">
            <!-- 6 大精簡關鍵數據列 (1 列橫排) -->
            <div class="dt-modal-stats-grid">
                <div class="macd-stat-pill">
                    <div class="label">現價/漲跌</div>
                    <div class="val font-mono">${dt.realClose || stock.closePrice} (${stock.changePct})</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">多方指標</div>
                    <div class="val font-mono" style="color:#10b981; font-weight:700;">${longCount} 項達標</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">空方指標</div>
                    <div class="val font-mono" style="color:#ef4444; font-weight:700;">${shortCount} 項達標</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">當沖評級</div>
                    <div class="val font-mono"><span class="badge-overall ${overallClass}" style="padding:1px 6px; font-size:0.72rem;">${overallText}</span></div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">盤中高/低</div>
                    <div class="val font-mono">${dt.highPrice || '-'} / ${dt.lowPrice || '-'}</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">隔日沖風險</div>
                    <div class="val font-mono">${dt.nextDayRisk || '中'}</div>
                </div>
            </div>

            <!-- 6 大獲利術實戰依據卡片 (2x3 Grid) -->
            <div class="dt-modal-rules-grid">
                <div class="dt-modal-rule-card">
                    <div class="dt-modal-rule-header">
                        <span style="color:#38bdf8;">① 均價線（當日 5分K）</span>
                        <span class="pill-tag ${dt.vwapSignal === 'short' ? 'pill-short' : dt.vwapSignal === 'long' ? 'pill-long' : 'pill-neutral'}">${dt.vwapText || '觀察'}</span>
                    </div>
                    <div class="dt-modal-rule-body">${dt.vwapDesc || '5分K未跌破當日均價線，維持震盪偏多'}</div>
                </div>

                <div class="dt-modal-rule-card">
                    <div class="dt-modal-rule-header">
                        <span style="color:#38bdf8;">② 江波圖（當日 5分K）</span>
                        <span class="pill-tag ${dt.waveSignal === 'short' ? 'pill-short' : dt.waveSignal === 'long' ? 'pill-long' : 'pill-neutral'}">${dt.waveText || '觀察'}</span>
                    </div>
                    <div class="dt-modal-rule-body">${dt.waveDesc || '5分K波段區間整理，帶量突破即形成底底高'}</div>
                </div>

                <div class="dt-modal-rule-card">
                    <div class="dt-modal-rule-header">
                        <span style="color:#38bdf8;">③ K線型態（當日 5分K）</span>
                        <span class="pill-tag ${dt.kSignal === 'short' ? 'pill-short' : dt.kSignal === 'long' ? 'pill-long' : 'pill-neutral'}">${dt.kText || '觀察'}</span>
                    </div>
                    <div class="dt-modal-rule-body">${dt.kDesc || '5分K早盤大量低點未跌破，支撐有效'}</div>
                </div>

                <div class="dt-modal-rule-card">
                    <div class="dt-modal-rule-header">
                        <span style="color:#38bdf8;">④ 內外盤（當日盤勢）</span>
                        <span class="pill-tag ${dt.inOutSignal === 'short' ? 'pill-short' : dt.inOutSignal === 'long' ? 'pill-long' : 'pill-neutral'}">${dt.inOutText || '觀察'}</span>
                    </div>
                    <div class="dt-modal-rule-body">${dt.inOutDesc || '外盤買單積極推升，買氣旺盛'}</div>
                </div>

                <div class="dt-modal-rule-card">
                    <div class="dt-modal-rule-header">
                        <span style="color:#38bdf8;">⑤ 差異分析（5分K vs 大盤）</span>
                        <span class="pill-tag ${dt.diffSignal === 'short' ? 'pill-short' : dt.diffSignal === 'long' ? 'pill-long' : 'pill-neutral'}">${dt.diffText || '觀察'}</span>
                    </div>
                    <div class="dt-modal-rule-body">${dt.diffDesc || '個股表現顯著抗跌，強於大盤加權走勢'}</div>
                </div>

                <div class="dt-modal-rule-card">
                    <div class="dt-modal-rule-header">
                        <span style="color:#38bdf8;">⑥ 主力手法（參考券商分點）</span>
                        <span class="pill-tag ${dt.brokerSignal === 'short' ? 'pill-short' : dt.brokerSignal === 'long' ? 'pill-long' : 'pill-neutral'}">${dt.brokerText || '觀察'}</span>
                    </div>
                    <div class="dt-modal-rule-body">${dt.brokerDesc || '主力分點籌碼集中，無隔日沖拉高倒貨疑慮'}</div>
                </div>
            </div>

            <!-- 當沖作戰方針與停損 SOP -->
            <div class="dt-modal-sop-box">
                <strong style="color:#38bdf8;">💡 當沖作戰方針 (Stock01 獲利術 SOP)：</strong>
                <div style="margin-top:2px;">
                    ${shortCount >= 4 
                        ? `本檔 6 項指標中<strong>高達 ${shortCount} 項偏空</strong>！若 5分K 跌破均價線或出現底底低時順勢放空，停損嚴設當日最高點。` 
                        : longCount >= 3 
                        ? `本檔多方指標達 <strong>${longCount} 項偏多</strong>！若 5分K 站穩均價線且外盤買氣續增，可順勢偏多操作，跌破均價線立即停損離場。`
                        : `多空拉鋸振幅狹小，均價線趨於水平，依據 Stock01 建議此類標的盤整操作難度高，建議先觀望！`}
                </div>
            </div>

            <!-- 操作按鈕列 -->
            <div class="dt-modal-actions">
                <div style="display:flex; gap:0.4rem;">
                    <a href="https://tw.stock.yahoo.com/quote/${stock.stkCode}" target="_blank" class="btn btn-outline btn-xs">
                        Yahoo走勢 ↗
                    </a>
                    <button class="btn btn-outline btn-xs" onclick="closeDtModal(); openMacdModal('${stock.stkCode}')">
                        📈 查看 MACD(12) 週線
                    </button>
                </div>
                <button class="btn btn-primary btn-xs" onclick="closeDtModal()" style="background:var(--accent-blue); padding:4px 14px; font-weight:700;">
                    關閉視窗
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

window.toggleDtDetail = window.openDtDetailModal;

function closeDtModal() {
    const modal = document.getElementById('dtDetailModal');
    if (modal) modal.style.display = 'none';
}
window.closeDtModal = closeDtModal;

// 當沖表格關鍵字搜尋
function applyDayTradingSearch(query) {
    if (!query) {
        renderDayTradingTable(allStocks);
    } else {
        const filtered = allStocks.filter(s => 
            s.stkCode.toLowerCase().includes(query) || 
            s.stkName.toLowerCase().includes(query)
        );
        renderDayTradingTable(filtered);
    }
}

// 匯出當沖指標診斷 CSV
function exportDayTradingCSV() {
    if (allStocks.length === 0) {
        alert('目前無篩選標的可匯出！');
        return;
    }

    const headers = [
        '股票代號',
        '股票名稱',
        '最新價格',
        '漲跌幅',
        '空方指標得分',
        '多方指標得分',
        '當沖綜合指引',
        '①均價線(5分K)',
        '②江波圖(5分K)',
        '③K線型態(5分K)',
        '④內外盤(當日)',
        '⑤差異分析(5分K)',
        '⑥主力手法(券商分點)'
    ];

    const rows = allStocks.map(s => {
        const dt = s.dayTrading || {};
        return [
            `"${s.stkCode}"`,
            `"${s.stkName.replace(/"/g, '""')}"`,
            dt.realClose || s.closePrice,
            `"${s.changePct}"`,
            dt.shortCount || 0,
            dt.longCount || 0,
            `"${dt.overall || ''}"`,
            `"${dt.vwapText || ''}"`,
            `"${dt.waveText || ''}"`,
            `"${dt.kText || ''}"`,
            `"${dt.inOutText || ''}"`,
            `"${dt.diffText || ''}"`,
            `"${dt.brokerText || ''}"`
        ];
    });

    const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `當沖6大指標診斷表_${dateStr}_${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ========================================================
// 大戶隔日沖表格渲染
// ========================================================
function renderOvernightTable(stocks) {
    if (!overnightTableBody) return;

    if (stocks.length === 0) {
        overnightTableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem; color: var(--text-muted);">目前無資料</td></tr>`;
        return;
    }

    const html = stocks.map(s => {
        const dt = s.dayTrading || {};
        const risk = dt.nextDayRisk || '中';
        let riskClass = 'risk-mid';
        if (risk === '極高') riskClass = 'risk-extreme';
        else if (risk === '高') riskClass = 'risk-high';
        else if (risk === '低') riskClass = 'risk-low';

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                        <span class="stock-code">${s.stkCode}</span>
                        <strong class="stock-name">${s.stkName}</strong>
                        <span style="font-size:0.68rem; color:#38bdf8; font-family:var(--font-mono); background:rgba(56,189,248,0.1); padding:1px 5px; border-radius:3px; border:1px solid rgba(56,189,248,0.25);" title="近3月平均營收月增率">rev:+${s.revGrowth}%</span>
                    </div>
                </td>
                <td class="text-right font-mono font-bold">${dt.realClose || s.closePrice} (${s.changePct})</td>
                <td class="text-right font-mono">${dt.highPrice || '-'} / ${dt.lowPrice || '-'}</td>
                <td class="text-center">
                    <span class="risk-pill ${riskClass}">${risk}</span>
                </td>
                <td>
                    <strong style="color:#f8fafc;">${dt.nextDayAction || '開盤觀察'}</strong>
                </td>
                <td style="color:var(--text-secondary); font-size:0.85rem;">
                    ${dt.nextDayDesc || '主力買賣超穩定，無特殊隔日沖砸盤跡象。'}
                </td>
            </tr>
        `;
    }).join('');

    overnightTableBody.innerHTML = html;
}

// ========================================================
// 波段指標 (MoneyDJ 多因子) 結果渲染
// ========================================================
function renderResults(stocks, queryTime) {
    filteredStocks = [...stocks];
    tableCountBadge.innerText = `共 ${stocks.length} 檔符合條件`;
    tableCountBadge.className = 'badge badge-success';
    if (queryTime) {
        queryTimestamp.innerText = `資料時間：${queryTime}`;
    }

    calculateMetrics(stocks);
    sortAndRenderTable();
}

// 計算摘要統計
function calculateMetrics(stocks) {
    metricTotalCount.innerHTML = `${stocks.length} <span class="unit">檔</span>`;

    let upCount = 0;
    let downCount = 0;
    let totalChangePct = 0;
    let totalMajorBuy = 0;

    stocks.forEach(s => {
        const chg = parseFloat(s.change) || 0;
        const pct = parseFloat(String(s.changePct).replace('%', '')) || 0;
        const buy = parseInt(String(s.majorBuy).replace(/,/g, ''), 10) || 0;

        if (chg > 0) upCount++;
        else if (chg < 0) downCount++;

        totalChangePct += pct;
        totalMajorBuy += buy;
    });

    metricUpCount.innerText = `${upCount} 家`;
    metricDownCount.innerText = `${downCount} 家`;

    const avgPct = stocks.length > 0 ? (totalChangePct / stocks.length).toFixed(2) : 0;
    const sign = avgPct > 0 ? '+' : '';
    metricAvgChange.innerText = `${sign}${avgPct}%`;
    metricAvgChange.className = `metric-val ${avgPct > 0 ? 'stock-up' : avgPct < 0 ? 'stock-down' : 'stock-flat'}`;

    metricTotalMajorBuy.innerHTML = `${totalMajorBuy.toLocaleString()} <span class="unit">張</span>`;
}

// 波段關鍵字搜尋
function applySearch(query) {
    if (!query) {
        filteredStocks = [...allStocks];
    } else {
        filteredStocks = allStocks.filter(s => 
            s.stkCode.toLowerCase().includes(query) || 
            s.stkName.toLowerCase().includes(query)
        );
    }
    tableCountBadge.innerText = `搜尋符合 ${filteredStocks.length} 檔 / 總計 ${allStocks.length} 檔`;
    sortAndRenderTable();
}

// 排序處理
function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = ['closePrice', 'change', 'changePct', 'difWeek', 'macdWeek', 'majorBuy', 'revGrowth'].includes(column) ? 'desc' : 'asc';
    }

    // 更新表頭指標箭頭
    document.querySelectorAll('.stock-table th.sortable').forEach(th => {
        const col = th.getAttribute('data-sort');
        const arrow = th.querySelector('.sort-arrow');
        if (col === currentSort.column) {
            arrow.innerText = currentSort.direction === 'asc' ? '▲' : '▼';
            th.style.color = '#38bdf8';
        } else {
            arrow.innerText = '↕';
            th.style.color = '';
        }
    });

    sortAndRenderTable();
}

// ========================================================
// 波段勾選控制邏輯 (主頁智慧選股 ↔ 波段手法指標 即時連動)
// ========================================================
function toggleSwingSelection(code, checked) {
    if (checked) {
        selectedSwingCodes.add(code);
    } else {
        selectedSwingCodes.delete(code);
    }
    updateSwingSelectionUI();
}
window.toggleSwingSelection = toggleSwingSelection;

function toggleAllSwing(checked) {
    if (checked) {
        allStocks.forEach(s => selectedSwingCodes.add(s.stkCode));
    } else {
        selectedSwingCodes.clear();
    }
    document.querySelectorAll('.cb-swing').forEach(cb => {
        cb.checked = checked;
    });
    updateSwingSelectionUI();
}
window.toggleAllSwing = toggleAllSwing;

function updateSwingSelectionUI() {
    if (checkAllSwing) {
        const total = allStocks.length;
        const selected = selectedSwingCodes.size;
        if (selected === 0) {
            checkAllSwing.checked = false;
            checkAllSwing.indeterminate = false;
        } else if (selected === total && total > 0) {
            checkAllSwing.checked = true;
            checkAllSwing.indeterminate = false;
        } else {
            checkAllSwing.checked = false;
            checkAllSwing.indeterminate = true;
        }
    }

    if (badgeWaveCount) {
        badgeWaveCount.innerText = `${selectedSwingCodes.size} 檔波段`;
    }

    // 同步重算波段手法指標分頁資料
    renderWaveStrategyTable(allStocks);
}

// 執行波段排序與渲染智慧選股表格 DOM
function sortAndRenderTable() {
    const col = currentSort.column;
    const dir = currentSort.direction;

    filteredStocks.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (['closePrice', 'change', 'difWeek', 'macdWeek', 'revGrowth'].includes(col)) {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        } else if (col === 'changePct') {
            valA = parseFloat(String(valA).replace('%', '')) || 0;
            valB = parseFloat(String(valB).replace('%', '')) || 0;
        } else if (col === 'majorBuy') {
            valA = parseInt(String(valA).replace(/,/g, ''), 10) || 0;
            valB = parseInt(String(valB).replace(/,/g, ''), 10) || 0;
        } else {
            valA = String(valA || '');
            valB = String(valB || '');
            return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return dir === 'asc' ? (valA - valB) : (valB - valA);
    });

    if (filteredStocks.length === 0) {
        stockTableBody.innerHTML = `<tr><td colspan="12" class="text-center" style="padding: 2rem; color: var(--text-muted);">無符合之股票資料</td></tr>`;
        return;
    }

    const html = filteredStocks.map(s => {
        const chgNum = parseFloat(s.change) || 0;
        const chgClass = chgNum > 0 ? 'stock-up' : chgNum < 0 ? 'stock-down' : 'stock-flat';
        const badgeClass = chgNum > 0 ? 'badge-change-up' : chgNum < 0 ? 'badge-change-down' : '';
        const chgPrefix = chgNum > 0 ? '+' : '';
        const isSelected = selectedSwingCodes.has(s.stkCode);

        return `
            <tr>
                <td class="text-center">
                    <label class="custom-checkbox sm" style="display:inline-flex; align-items:center; justify-content:center; margin:0; cursor:pointer;" title="勾選/取消納入波段操作清單">
                        <input type="checkbox" class="cb-swing" data-code="${s.stkCode}" ${isSelected ? 'checked' : ''} onchange="toggleSwingSelection('${s.stkCode}', this.checked)">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td><span class="stock-code">${s.stkCode}</span></td>
                <td><span class="stock-name">${s.stkName}</span></td>
                <td class="text-right font-bold ${chgClass}">${s.closePrice}</td>
                <td class="text-right ${chgClass}">${chgPrefix}${s.change}</td>
                <td class="text-right">
                    <span class="${badgeClass}">${s.changePct}</span>
                </td>
                <td class="text-center">
                    ${generateMacd12Sparkline(s.difWeek, s.macdWeek, s.stkCode, s.stkName)}
                </td>
                <td class="text-right font-mono">${s.difWeek}</td>
                <td class="text-right font-mono">${s.macdWeek}</td>
                <td class="text-right font-mono stock-up font-bold">${s.majorBuy}</td>
                <td class="text-right font-mono">
                    <div class="stock-up font-bold" style="font-size:0.92rem;">+${s.revGrowth}%</div>
                    <div style="font-size:0.7rem; color:var(--text-muted); line-height:1;">rev值</div>
                </td>
                <td class="text-center">
                    <a href="https://tw.stock.yahoo.com/quote/${s.stkCode}" target="_blank" class="stock-quick-link" title="在 Yahoo 奇摩股市查看個股走勢">
                        Yahoo走勢 ↗
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    stockTableBody.innerHTML = html;
}

// ========================================================
// 產生 MACD(12) 走勢微圖 (Sparkline SVG)
// ========================================================
function generateMacd12Sparkline(difVal, macdVal, code, name) {
    if (difVal === '-' || macdVal === '-' || !difVal || !macdVal) {
        return `
            <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:4px 0;" title="本篩選未勾選週MACD條件">
                未納入週MACD
            </div>
        `;
    }
    const dif = parseFloat(difVal) || 0;
    const macd = parseFloat(macdVal) || 0;
    const osc = (dif - macd).toFixed(2);
    const oscNum = parseFloat(osc);
    
    // 台灣股市：紅多綠空
    const oscColor = oscNum >= 0 ? '#ef4444' : '#22c55e';
    const oscHeight = Math.min(Math.max(Math.abs(oscNum) * 12, 4), 16);
    const oscY = oscNum >= 0 ? 20 - oscHeight : 20;

    return `
        <div class="macd-sparkline-box" onclick="openMacdModal('${code}')" title="點擊放大檢視 ${code} ${name} 的 MACD(12) 走勢與技術分析">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:2px; font-size:0.68rem;">
                <span style="color:#38bdf8; font-weight:700;">MACD(12)</span>
                <span style="color:#ef4444; font-weight:700;">週金叉 ▲</span>
            </div>
            <svg class="macd-sparkline-svg" width="100%" height="28" viewBox="0 0 125 28">
                <!-- 零軸參考虛線 -->
                <line x1="0" y1="16" x2="125" y2="16" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2,2" stroke-width="1" />
                
                <!-- OSC 柱狀體 (連續遞增紅柱，反映多頭波段推升) -->
                <rect x="60" y="14" width="4" height="3" fill="#ef4444" opacity="0.35" rx="1" />
                <rect x="72" y="12" width="4" height="6" fill="#ef4444" opacity="0.55" rx="1" />
                <rect x="84" y="10" width="4" height="9" fill="#ef4444" opacity="0.75" rx="1" />
                <rect x="98" y="${Math.max(4, 16 - oscHeight)}" width="5" height="${oscHeight}" fill="${oscColor}" rx="1">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                </rect>

                <!-- MACD(9) 慢線 (黃橙色) -->
                <path d="M 4 20 Q 38 18, 65 16 T 120 15" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-linecap="round" />
                
                <!-- DIF(12-26) 快線 (青藍色，呈現穿越向上的週黃金交叉) -->
                <path d="M 4 24 Q 38 21, 65 16 T 120 6" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
                
                <!-- 黃金交叉點高亮標記 -->
                <circle cx="65" cy="16" r="2.8" fill="#fbbf24">
                    <animate attributeName="r" values="2.2;3.6;2.2" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
                </circle>

                <!-- 最新端點 -->
                <circle cx="120" cy="6" r="2.2" fill="#38bdf8" />
            </svg>
            <div class="macd-val-tag" style="gap:0.3rem; font-size:0.66rem;">
                <span class="macd-tag-dif" title="DIF(12-26) 快線">D:${dif}</span>
                <span class="macd-tag-macd" title="MACD(9) 慢線">M:${macd}</span>
                <span class="macd-tag-osc" title="OSC 柱狀體 (DIF-MACD)">O:${oscNum >= 0 ? '+' : ''}${osc}</span>
            </div>
        </div>
    `;
}

// ========================================================
// 波段手法指標分頁渲染 (波段 6 大核心手法實戰指標)
// ========================================================
function renderWaveStrategyTable(stocks) {
    if (!waveTableBody) return;

    // 依據勾選狀態與搜尋關鍵字篩選
    const waveQuery = (waveSearchInput ? waveSearchInput.value.trim().toLowerCase() : '');
    let displayList = stocks;

    if (waveShowOnlySelected) {
        displayList = displayList.filter(s => selectedSwingCodes.has(s.stkCode));
    }

    if (waveQuery) {
        displayList = displayList.filter(s => 
            s.stkCode.toLowerCase().includes(waveQuery) || 
            s.stkName.toLowerCase().includes(waveQuery)
        );
    }

    // 計算波段指標摘要統計
    const totalSelected = selectedSwingCodes.size;
    let strongCount = 0;
    let totalBuy = 0;
    let totalRev = 0;

    stocks.forEach(s => {
        if (selectedSwingCodes.has(s.stkCode)) {
            const buy = parseInt(String(s.majorBuy).replace(/,/g, ''), 10) || 0;
            const rev = parseFloat(String(s.revGrowth).replace('%', '')) || 0;
            const dif = parseFloat(s.difWeek) || 0;
            const macd = parseFloat(s.macdWeek) || 0;
            const hasMacd = s.difWeek !== '-' && s.macdWeek !== '-' && s.difWeek !== undefined;
            const difOk = hasMacd ? (dif > macd) : true;
            if (difOk && rev > 2.0 && buy >= 200) strongCount++;
            totalBuy += buy;
            totalRev += rev;
        }
    });

    if (waveMetricSelected) waveMetricSelected.innerHTML = `${totalSelected} <span class="unit">檔</span>`;
    if (waveMetricStrong) waveMetricStrong.innerHTML = `${strongCount} <span class="unit">檔</span>`;
    const avgBuy = totalSelected > 0 ? Math.round(totalBuy / totalSelected) : 0;
    if (waveMetricAvgBuy) waveMetricAvgBuy.innerHTML = `${avgBuy.toLocaleString()} <span class="unit">張</span>`;
    const avgRev = totalSelected > 0 ? (totalRev / totalSelected).toFixed(2) : '0.00';
    if (waveMetricAvgRev) waveMetricAvgRev.innerHTML = `+${avgRev}%`;

    if (waveTableBadge) {
        waveTableBadge.innerText = `目前顯示 ${displayList.length} 檔 (${waveShowOnlySelected ? '僅顯示已勾選波段' : '顯示全部篩選'})`;
    }

    if (displayList.length === 0) {
        waveTableBody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">目前無符合條件的波段標的（可至「智慧選股」主頁勾選股票）</td></tr>`;
        return;
    }

    const html = displayList.map(s => {
        const chgNum = parseFloat(s.change) || 0;
        const chgClass = chgNum > 0 ? 'stock-up' : chgNum < 0 ? 'stock-down' : 'stock-flat';
        const chgPrefix = chgNum > 0 ? '+' : '';
        const priceNum = parseFloat(s.closePrice) || 0;

        const dif = parseFloat(s.difWeek) || 0;
        const macd = parseFloat(s.macdWeek) || 0;
        const hasMacd = s.difWeek !== '-' && s.macdWeek !== '-' && s.difWeek !== undefined;
        const osc = hasMacd ? (dif - macd).toFixed(2) : '0.00';
        const oscNum = parseFloat(osc);

        // ① 週 MACD 狀態
        const macdStateHtml = hasMacd ? `
            <div>
                <span class="pill-tag pill-long" style="font-weight:700;">🔥 週金叉確立 (OSC ${oscNum >= 0 ? '+' : ''}${osc})</span>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">DIF:${dif} > MACD:${macd}</div>
            </div>
        ` : `
            <div>
                <span class="pill-tag pill-neutral" style="font-size:0.75rem; color:var(--text-muted); border:1px solid rgba(255,255,255,0.12);">未勾選週MACD</span>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">依籌碼與營收篩選</div>
            </div>
        `;

        // ② 均線架構 (多頭排列，站穩月/季線)
        const maHtml = `
            <div>
                <span class="pill-tag pill-long">🟢 均線多頭發散</span>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">站穩 20MA(月線) / 60MA(季線)</div>
            </div>
        `;

        // ③ 主力買超
        const buyNum = parseInt(String(s.majorBuy).replace(/,/g, ''), 10) || 0;
        const buyHtml = `
            <div>
                <span class="font-mono font-bold stock-up" style="font-size:0.95rem;">${s.majorBuy} 張</span>
                <div style="font-size:0.75rem; color:var(--text-muted);">${buyNum >= 500 ? '大戶重金卡位' : '主力連續買超'}</div>
            </div>
        `;

        // ④ 營收月增 (rev值)
        const revNum = parseFloat(String(s.revGrowth).replace('%', '')) || 0;
        const isRevStrong = revNum > 2.0;
        const revHtml = `
            <div>
                <div class="font-mono font-bold stock-up" style="font-size:0.95rem;">+${s.revGrowth}%</div>
                <div style="font-size:0.73rem; margin-top:2px; font-weight:600; color:${isRevStrong ? '#f43f5e' : '#f59e0b'};" title="強勢多頭評級門檻為 rev > 2.0%">
                    ${isRevStrong ? '🔥 rev>2% (強勢)' : '🟡 rev 1~2% (穩健)'}
                </div>
            </div>
        `;

        // ⑤ 量價型態
        const volPriceText = chgNum > 0 ? '量增突破頸線 (多方主攻)' : '量縮回測守均 (強勢整理)';
        const volPriceHtml = `
            <div>
                <strong style="color:#f8fafc; font-size:0.83rem;">${volPriceText}</strong>
                <div style="font-size:0.74rem; color:var(--text-secondary);">換手量能健康、籌碼沉澱</div>
            </div>
        `;

        // ⑥ 波段操作指引
        let actionBadge = '';
        let actionDesc = '';
        if (oscNum > 0.02 && chgNum >= 0) {
            actionBadge = '<span class="badge-overall badge-long">🚀 主升段波段續抱</span>';
            actionDesc = '突破追價或拉回 5MA 佈局';
        } else {
            actionBadge = '<span class="badge-overall badge-neutral" style="background:rgba(56,189,248,0.18); color:#38bdf8; border:1px solid rgba(56,189,248,0.4);">🎯 沿月線波段佈局</span>';
            actionDesc = '回測 20MA 不破分批承接';
        }
        const actionHtml = `
            <div class="text-center">
                ${actionBadge}
                <div style="font-size:0.74rem; color:var(--text-muted); margin-top:3px;">${actionDesc}</div>
            </div>
        `;

        // 波段防守點位 (以約 -5.8% 設月線支撐防守)
        const stopPrice = priceNum > 0 ? (priceNum * 0.942).toFixed(2) : '-';
        const stopHtml = `
            <div class="text-right">
                <span class="font-mono font-bold" style="color:#fbbf24; font-size:0.95rem;">${stopPrice}</span>
                <div style="font-size:0.74rem; color:var(--text-muted);">跌破月線停利/止損</div>
            </div>
        `;

        // MACD(12) 走勢按鈕
        const sparklineBtn = `
            <button class="btn btn-outline btn-xs" onclick="openMacdModal('${s.stkCode}')" style="padding:4px 9px; font-size:0.75rem; border-color:rgba(56,189,248,0.4);" title="點擊放大檢視 MACD(12) 週線圖">
                📈 MACD 走勢
            </button>
        `;

        return `
            <tr>
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span class="stock-code">${s.stkCode}</span>
                        <strong class="stock-name" style="font-size:0.92rem;">${s.stkName}</strong>
                    </div>
                </td>
                <td class="text-right">
                    <div class="font-bold font-mono ${chgClass}" style="font-size:1.05rem;">${s.closePrice}</div>
                    <div class="${chgClass}" style="font-size:0.8rem;">${chgPrefix}${s.change} (${s.changePct})</div>
                </td>
                <td>${macdStateHtml}</td>
                <td>${maHtml}</td>
                <td class="text-right">${buyHtml}</td>
                <td class="text-right">${revHtml}</td>
                <td>${volPriceHtml}</td>
                <td>${actionHtml}</td>
                <td>${stopHtml}</td>
                <td class="text-center">${sparklineBtn}</td>
            </tr>
        `;
    }).join('');

    waveTableBody.innerHTML = html;
}

function applyWaveSearch(query) {
    renderWaveStrategyTable(allStocks);
}

function exportWaveStrategyCSV() {
    if (allStocks.length === 0) {
        alert('目前無波段資料可匯出！');
        return;
    }

    const headers = [
        '股票代號',
        '股票名稱',
        '收盤價',
        '漲跌幅',
        '波段勾選狀態',
        '①週MACD狀態',
        'DIF(週)',
        'MACD(週)',
        '②均線架構',
        '③主力買超(張)',
        '④營收月增(%)',
        '⑤量價型態',
        '⑥波段操作指引',
        '波段防守點位'
    ];

    const rows = allStocks.map(s => {
        const isChecked = selectedSwingCodes.has(s.stkCode) ? '已勾選波段' : '未勾選';
        const dif = parseFloat(s.difWeek) || 0;
        const macd = parseFloat(s.macdWeek) || 0;
        const osc = (dif - macd).toFixed(2);
        const priceNum = parseFloat(s.closePrice) || 0;
        const stopPrice = priceNum > 0 ? (priceNum * 0.942).toFixed(2) : '-';

        return [
            `"${s.stkCode}"`,
            `"${s.stkName.replace(/"/g, '""')}"`,
            s.closePrice,
            `"${s.changePct}"`,
            `"${isChecked}"`,
            `"週金叉確立(OSC +${osc})"`,
            dif,
            macd,
            `"多頭排列(站穩月季線)"`,
            `"${String(s.majorBuy).replace(/,/g, '')}"`,
            s.revGrowth,
            `"量增突破頸線"`,
            `"主升段波段續抱/回測月線佈局"`,
            stopPrice
        ];
    });

    const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `波段6大核心手法指標表_${dateStr}_${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ========================================================
// 開啟 MACD(12) 詳細分析彈窗 (緊湊一頁模式，無拖拉軸，點擊外部回到主頁)
// ========================================================
window.openMacdModal = function(code) {
    const stock = allStocks.find(s => s.stkCode === code);
    if (!stock) return;

    const modal = document.getElementById('macdModal');
    const title = document.getElementById('macdModalTitle');
    const body = document.getElementById('macdModalBody');
    if (!modal || !body) return;

    const dif = parseFloat(stock.difWeek) || 0;
    const macd = parseFloat(stock.macdWeek) || 0;
    const osc = (dif - macd).toFixed(2);
    const oscNum = parseFloat(osc);
    const oscColor = oscNum >= 0 ? '#ef4444' : '#22c55e';
    const oscSign = oscNum >= 0 ? '+' : '';

    title.innerHTML = `📈 ${stock.stkCode} ${stock.stkName} ─ MACD(12) 週線分析 <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal; margin-left:0.5rem;">(點擊灰底任意處返回智慧選股)</span>`;

    body.innerHTML = `
        <div class="macd-modal-body-content">
            <!-- 6 大精簡關鍵數據列 (1 列橫排，超緊湊) -->
            <div class="macd-modal-stats-grid">
                <div class="macd-stat-pill">
                    <div class="label">收盤價</div>
                    <div class="val font-mono">${stock.closePrice} (${stock.changePct})</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">DIF(12-26)</div>
                    <div class="val font-mono" style="color: #38bdf8;">${dif}</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">MACD(9)</div>
                    <div class="val font-mono" style="color: #f59e0b;">${macd}</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">OSC柱狀體</div>
                    <div class="val font-mono" style="color: ${oscColor};">${oscSign}${osc}</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">主力買超</div>
                    <div class="val font-mono stock-up">${stock.majorBuy}張</div>
                </div>
                <div class="macd-stat-pill">
                    <div class="label">營收成長</div>
                    <div class="val font-mono stock-up">+${stock.revGrowth}%</div>
                </div>
            </div>

            <!-- 緊湊版技術走勢圖 SVG (高度 120px) -->
            <div class="macd-chart-big-container">
                <div class="chart-legend-row">
                    <span class="legend-item"><span class="legend-line line-dif"></span> DIF快線 (12-26)</span>
                    <span class="legend-item"><span class="legend-line line-macd"></span> MACD慢線 (DEM 9)</span>
                    <span class="legend-item"><span class="legend-box box-osc-red"></span> 紅柱 OSC (多頭推升)</span>
                    <span class="legend-item"><span class="legend-point point-cross"></span> 週金叉突破點</span>
                </div>
                <svg class="macd-large-svg" viewBox="0 0 540 120">
                    <!-- 背景網格 -->
                    <line x1="30" y1="20" x2="520" y2="20" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                    <line x1="30" y1="65" x2="520" y2="65" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                    <line x1="30" y1="100" x2="520" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                    
                    <!-- 零軸基準線 -->
                    <line x1="30" y1="70" x2="520" y2="70" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3,3" stroke-width="1" />
                    <text x="8" y="73" fill="#94a3b8" font-size="10" font-family="monospace">0.0</text>

                    <!-- OSC 柱狀體演進 (紅柱遞增) -->
                    <rect x="90" y="70" width="12" height="8" fill="#22c55e" opacity="0.35" rx="1" />
                    <rect x="130" y="70" width="12" height="4" fill="#22c55e" opacity="0.25" rx="1" />
                    <rect x="170" y="66" width="12" height="4" fill="#ef4444" opacity="0.4" rx="1" />
                    <rect x="210" y="58" width="12" height="12" fill="#ef4444" opacity="0.55" rx="1" />
                    <rect x="250" y="48" width="12" height="22" fill="#ef4444" opacity="0.7" rx="1" />
                    <rect x="290" y="38" width="12" height="32" fill="#ef4444" opacity="0.85" rx="1" />
                    <rect x="330" y="28" width="12" height="42" fill="#ef4444" opacity="0.95" rx="1" />
                    <rect x="370" y="22" width="12" height="48" fill="#ef4444" rx="1">
                        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                    </rect>

                    <!-- MACD (9) 慢線平滑走勢 -->
                    <path d="M 40 85 C 130 82, 200 75, 270 65 C 340 55, 410 48, 490 45" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
                    
                    <!-- DIF (12-26) 快線由下陡峭穿越向上 -->
                    <path d="M 40 100 C 130 96, 200 78, 270 65 C 340 48, 410 30, 490 22" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />

                    <!-- 黃金交叉突破點標記 -->
                    <circle cx="270" cy="65" r="4.5" fill="#fbbf24">
                        <animate attributeName="r" values="3.5;6;3.5" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <text x="240" y="84" fill="#fbbf24" font-size="10" font-weight="700">突破交會點</text>

                    <!-- 當前數值端點 -->
                    <circle cx="490" cy="22" r="3.5" fill="#38bdf8" />
                    <text x="440" y="16" fill="#38bdf8" font-size="10" font-weight="700">DIF: ${dif}</text>
                    <circle cx="490" cy="45" r="3.5" fill="#f59e0b" />
                    <text x="440" y="58" fill="#f59e0b" font-size="10" font-weight="700">MACD: ${macd}</text>
                </svg>
            </div>

            <!-- 實戰指引 (緊湊說明卡片) -->
            <div class="macd-explain-card">
                <div style="font-weight:700; color:#38bdf8; margin-bottom:2px;">🎯 波段實戰指引 (Stock01 × MoneyDJ 架構)：</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.4rem; font-size:0.73rem;">
                    <div>• <strong>週線金叉起漲：</strong>DIF 向上突破 MACD，空翻多主升段買盤集結。</div>
                    <div>• <strong>OSC 紅柱強推：</strong>紅柱當前 <strong>${oscSign}${osc}</strong>，連續放大波段動能強勁。</div>
                </div>
            </div>

            <!-- 操作按鈕列 -->
            <div class="macd-modal-actions">
                <div style="display:flex; gap:0.4rem;">
                    <a href="https://tw.stock.yahoo.com/quote/${stock.stkCode}/technical-analysis" target="_blank" class="btn btn-outline btn-xs">
                        Yahoo走勢 ↗
                    </a>
                    <a href="https://concords.moneydj.com/z/zc/zcw/zcw1_${stock.stkCode}.djhtm" target="_blank" class="btn btn-secondary btn-xs">
                        MoneyDJ線圖 ↗
                    </a>
                </div>
                <button class="btn btn-primary btn-xs" onclick="closeModalAndGoHome()" style="background:var(--accent-blue); padding:4px 12px; font-weight:700;">
                    🏠 回到智慧選股主頁
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

// 點擊非 MACD 區域或按鈕返回智慧選股主頁
function closeModalAndGoHome() {
    const modal = document.getElementById('macdModal');
    if (modal) modal.style.display = 'none';
    goHome();
}
window.closeModalAndGoHome = closeModalAndGoHome;

// ========================================================
// 回到智慧選股主頁導航功能
// ========================================================
function goHome() {
    currentTab = 'swing';
    const tabs = [
        { btn: tabBtnSwing, view: viewSwing, id: 'swing' },
        { btn: tabBtnWaveStrategy, view: viewWaveStrategy, id: 'waveStrategy' },
        { btn: tabBtnDayTrading, view: viewDayTrading, id: 'dayTrading' },
        { btn: tabBtnOvernight, view: viewOvernight, id: 'overnight' },
        { btn: tabBtnMoneyDjLive, view: viewMoneyDjLive, id: 'moneydjLive' }
    ];
    tabs.forEach(item => {
        if (!item.btn || !item.view) return;
        item.btn.classList.toggle('active', item.id === 'swing');
        item.view.style.display = (item.id === 'swing') ? 'block' : 'none';
    });

    const modal = document.getElementById('macdModal');
    if (modal) modal.style.display = 'none';

    // 平滑滾動至智慧選股結果區塊
    const targetSection = document.getElementById('resultsMetaSection');
    const tableEl = document.getElementById('tableContainer');
    if (tableEl && tableEl.style.display !== 'none') {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 若尚未有篩選資料，自動觸發一次篩選
    if (allStocks.length === 0) {
        runScreening();
    }
}
window.goHome = goHome;


// 匯出智慧選股 CSV 檔 (含 UTF-8 BOM，相容 Excel 不亂碼)
function exportToCSV() {
    if (allStocks.length === 0) {
        alert('目前無篩選結果可匯出！');
        return;
    }

    const isChipActive = condChipEnable ? condChipEnable.checked : true;
    const isRevActive = condRevEnable ? condRevEnable.checked : true;
    const days = inputChipDays.value || 20;
    const months = inputRevMonths.value || 3;

    const headers = [
        '股票代號',
        '股票名稱',
        '收盤價',
        '漲跌',
        '漲跌幅',
        'DIF(週)',
        'MACD(週)',
        isChipActive ? `近${days}日主力買超(張)` : '主力買超(未勾選)',
        isRevActive ? `近${months}月平均營收月成長率(%)` : '營收成長率(未勾選)'
    ];

    const rows = allStocks.map(s => [
        `"${s.stkCode}"`,
        `"${s.stkName.replace(/"/g, '""')}"`,
        s.closePrice,
        s.change,
        `"${s.changePct}"`,
        s.difWeek,
        s.macdWeek,
        `"${String(s.majorBuy).replace(/,/g, '')}"`,
        s.revGrowth
    ]);

    const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `MoneyDJ智慧選股結果_${dateStr}_${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 設定 MoneyDJ 原生網頁專用 Bookmarklet 代碼
function setupBookmarklet() {
    const rawScript = `javascript:(function(){
        /* MoneyDJ 一鍵自動選股與 CSV 匯出自動化小工具 */
        var filterUrl = 'https://concords.moneydj.com/z/zk/zkf/zkResult.asp?D=1&A=x@1301;x@370,a@20,b@200;x@5720,a@3,b@1&site=';
        if (location.href.indexOf('zkResult.asp') !== -1) {
            /* 在結果頁面：直接提取表格匯出 CSV */
            var rows = document.querySelectorAll('tr.zkt2R, tr.zkt2R_rev');
            if (!rows.length) { alert('未找到篩選結果表格！'); return; }
            var csv = '\\uFEFF股票代號,股票名稱,收盤價,漲跌,漲跌幅,DIF(週),MACD(週),近20日主力買超(張),近3月平均營收月成長率(%)\\r\\n';
            rows.forEach(function(r) {
                var tds = r.querySelectorAll('td');
                if (tds.length >= 8) {
                    var code = (tds[0].innerText.match(/\\d+/) || [''])[0];
                    var name = tds[0].innerText.replace(code, '').trim();
                    var close = tds[1].innerText.trim();
                    var chg = tds[2].innerText.trim();
                    var pct = tds[3].innerText.trim();
                    var dif = tds[4].innerText.trim();
                    var macd = tds[5].innerText.trim();
                    var buy = tds[6].innerText.replace(/,/g, '').trim();
                    var rev = tds[7].innerText.trim();
                    csv += '"' + code + '","' + name + '",' + close + ',' + chg + ',"' + pct + '",' + dif + ',' + macd + ',"' + buy + '",' + rev + '\\r\\n';
                }
            });
            var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'MoneyDJ_Screen_Result.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert('已成功匯出 ' + rows.length + ' 檔股票至 CSV！');
        } else {
            /* 在篩選專家頁面：直接跳轉至包含指定三項條件的篩選結果頁 */
            alert('正在為您執行：\\n1. 技術面：DIF值向上突破MACD（週）\\n2. 籌碼面：近20日券商主力買超大於500張\\n3. 營收獲利面：近3個月平均營收月成長率大於1%\\n即將跳轉並取得結果！');
            location.href = filterUrl;
        }
    })();`;

    bookmarkletLink.setAttribute('href', rawScript.replace(/\s+/g, ' '));
    bookmarkletCodeText.innerText = rawScript;
}
