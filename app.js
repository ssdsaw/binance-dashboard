// 全局配置
const REFRESH_TIME = 20000; // 改为20秒刷新一次，因为我们要一次请求3页，太快会被封IP

// 全局变量
let binanceSymbols = new Set();
let allData = [];
let favorites = JSON.parse(localStorage.getItem('binance_favs')) || [];
let currentTab = 'market';
let sortField = 'market_cap_rank';
let sortDir = 'asc';

// 初始化
init();
setInterval(fetchCoinGeckoData, REFRESH_TIME);

// 1. 初始化：获取币安白名单
async function init() {
    try {
        const loadingEl = document.getElementById('loading');
        loadingEl.innerText = "正在同步币安合约列表...";
        
        const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const data = await res.json();
        
        data.symbols.forEach(s => {
            if (s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT') {
                binanceSymbols.add(s.baseAsset.toUpperCase());
                binanceSymbols.add(s.symbol.replace('USDT', '').toUpperCase());
            }
        });

        console.log(`币安合约白名单已建立，共 ${binanceSymbols.size} 个币种。`);
        fetchCoinGeckoData(); 

    } catch (e) {
        console.error("无法连接币安", e);
        document.getElementById('loading').innerText = "初始化失败：无法连接币安接口";
    }
}

// 2. 获取 CoinGecko 数据 (升级版：同时抓取前3页)
async function fetchCoinGeckoData() {
    const loadingEl = document.getElementById('loading');
    if (allData.length === 0) loadingEl.innerText = "正在加载全球 Top 750 数据...";
    
    try {
        // 并行发送 3 个请求，分别获取第 1, 2, 3 页的数据 (每页250个，共750个)
        // 这样可以覆盖绝大多数币安上的山寨币
        const pages = [1, 2, 3]; 
        const requests = pages.map(page => 
            fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`)
                .then(res => {
                    if (!res.ok) throw new Error(res.status);
                    return res.json();
                })
        );

        // 等待3页全部下载完
        const results = await Promise.all(requests);
        
        // 把3页数据合并成一个大数组
        const globalData = results.flat(); 

        // --- 过滤逻辑 ---
        allData = globalData.filter(coin => {
            const symbol = coin.symbol.toUpperCase(); 
            
            const isDirectMatch = binanceSymbols.has(symbol);
            const is1000Match = binanceSymbols.has("1000" + symbol);
            const is1M_Match = binanceSymbols.has("1000000" + symbol);
            
            if (is1000Match) coin.binanceName = "1000" + symbol;
            else if (is1M_Match) coin.binanceName = "1000000" + symbol;
            else coin.binanceName = symbol;

            return isDirectMatch || is1000Match || is1M_Match;
        });

        renderList();
        
        loadingEl.classList.add('hidden');
        document.getElementById('coin-list').classList.remove('hidden');

    } catch (err) {
        console.error("CoinGecko API 限制或错误", err);
        if (allData.length === 0) {
            loadingEl.innerText = "加载失败 (可能触发频率限制)，请稍等自动重试...";
            loadingEl.classList.add('text-yellow-500');
        }
    }
}

// 3. 渲染列表 (保持不变，但优化了排序逻辑)
function renderList() {
    const listEl = document.getElementById('coin-list');
    
    let displayData = allData;
    if (currentTab === 'fav') {
        displayData = allData.filter(item => favorites.includes(item.id));
        if (displayData.length === 0) {
            listEl.innerHTML = '<div class="text-center py-10 text-gray-500">暂无收藏代币</div>';
            return;
        }
    }

    displayData.sort((a, b) => {
        let valA, valB;
        
        if (sortField === 'market_cap_rank') {
            valA = a.market_cap_rank || 9999; 
            valB = b.market_cap_rank || 9999;
        } 
        else if (sortField === 'symbol') {
            return sortDir === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        }
        else if (sortField === 'price') { valA = a.current_price; valB = b.current_price; }
        else if (sortField === 'change') { valA = a.price_change_percentage_24h; valB = b.price_change_percentage_24h; }
        else if (sortField === 'volume') { valA = a.total_volume; valB = b.total_volume; }
        else if (sortField === 'mcap') { valA = a.market_cap; valB = b.market_cap; }

        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const existingRows = new Set();
    
    displayData.forEach((item) => {
        const rowId = `row-${item.id}`;
        existingRows.add(rowId);
        let row = document.getElementById(rowId);

        const isFav = favorites.includes(item.id);
        const change = item.price_change_percentage_24h || 0;
        
        if (!row) {
            row = document.createElement('div');
            row.id = rowId;
            row.className = 'grid grid-cols-12 gap-2 py-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors items-center';
            row.innerHTML = `
                <div class="col-span-1 pl-2 flex items-center gap-2 font-mono text-gray-500">
                    <span class="fav-btn cursor-pointer text-xl leading-none transition-transform active:scale-125" onclick="toggleFav('${item.id}')"></span>
                    <span class="rank-num font-bold text-gray-400 w-8 text-center"></span>
                </div>
                <div class="col-span-3 flex items-center gap-3">
                    <img src="${item.image}" class="w-8 h-8 rounded-full bg-gray-800 shadow-sm" loading="lazy">
                    <div>
                        <div class="font-bold text-[15px] text-gray-100 flex items-center gap-1">
                            ${item.symbol.toUpperCase()}
                            <span class="text-[10px] bg-gray-700/80 text-gray-400 px-1.5 py-0.5 rounded-[4px] font-medium binance-tag"></span>
                        </div>
                        <div class="text-xs text-gray-500 mt-0.5" title="CoinGecko ID">${item.name}</div>
                    </div>
                </div>
                <div class="col-span-2 text-right font-mono text-[15px] text-gray-100 price-text tracking-tight"></div>
                <div class="col-span-2 text-right">
                    <span class="change-tag bg-opacity-15 px-2.5 py-1.5 rounded-[6px] text-sm font-bold inline-block min-w-[70px] text-center"></span>
                </div>
                <div class="col-span-2 text-right text-gray-400 text-sm font-mono vol-text"></div>
                <div class="col-span-2 text-right text-gray-200 text-sm font-mono mcap-text font-medium"></div>
            `;
        }

        row.querySelector('.rank-num').textContent = item.market_cap_rank;
        row.querySelector('.binance-tag').textContent = item.binanceName || "PERP";
        
        const favBtn = row.querySelector('.fav-btn');
        favBtn.textContent = isFav ? '★' : '☆';
        favBtn.className = `fav-btn cursor-pointer text-xl leading-none transition-transform active:scale-125 ${isFav ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`;

        row.querySelector('.price-text').textContent = '$' + formatPrice(item.current_price);
        
        const changeTag = row.querySelector('.change-tag');
        changeTag.textContent = (change > 0 ? '+' : '') + change.toFixed(2) + '%';
        changeTag.className = `change-tag bg-opacity-15 px-2.5 py-1.5 rounded-[6px] text-sm font-bold inline-block min-w-[70px] text-center ${change >= 0 ? 'text-green-400 bg-green-400' : 'text-red-400 bg-red-400'}`;

        row.querySelector('.vol-text').textContent = '$' + formatBigNumber(item.total_volume);
        row.querySelector('.mcap-text').textContent = '$' + formatBigNumber(item.market_cap);

        listEl.appendChild(row);
    });

    Array.from(listEl.children).forEach(child => {
        if (child.id && !existingRows.has(child.id)) child.remove();
    });
}

// 辅助功能
window.switchTab = function(tab) {
    currentTab = tab;
    document.getElementById('coin-list').innerHTML = ''; 
    const btnMarket = document.getElementById('tab-market');
    const btnFav = document.getElementById('tab-fav');
    const active = "px-5 py-1.5 rounded-md text-sm font-medium transition-all bg-gray-600 text-white shadow";
    const inactive = "px-5 py-1.5 rounded-md text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-gray-700";
    btnMarket.className = tab === 'market' ? active : inactive;
    btnFav.className = tab === 'fav' ? active : inactive;
    renderList();
}

window.toggleFav = function(id) {
    if (favorites.includes(id)) favorites = favorites.filter(s => s !== id);
    else favorites.push(id);
    localStorage.setItem('binance_favs', JSON.stringify(favorites));
    renderList();
}

window.sortData = function(field) {
    if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortField = field; sortDir = 'asc'; }
    renderList();
}

function formatBigNumber(num) {
    if (!num) return '---';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
}

function formatPrice(num) {
    if (!num) return '0.00';
    if (num < 0.0001) return num.toFixed(8);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}