import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, TrendingDown, Search, LayoutList, Heart } from 'lucide-react';

// 为了演示，我们使用 CoinGecko API，因为它直接提供 Logo 和市值
// 币安 API 需要复杂的映射才能获得图片和准确的市值
const API_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false";

const CryptoDashboard = () => {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [view, setView] = useState('all'); // 'all' or 'favorites'
  const [searchTerm, setSearchTerm] = useState('');

  // 初始化加载数据和本地收藏
  useEffect(() => {
    fetchCoins();
    const savedFavs = JSON.parse(localStorage.getItem('cryptoFavorites')) || [];
    setFavorites(savedFavs);
  }, []);

  // 获取数据
  const fetchCoins = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setCoins(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  // 切换收藏状态
  const toggleFavorite = (coinId) => {
    let newFavs;
    if (favorites.includes(coinId)) {
      newFavs = favorites.filter(id => id !== coinId);
    } else {
      newFavs = [...favorites, coinId];
    }
    setFavorites(newFavs);
    localStorage.setItem('cryptoFavorites', JSON.stringify(newFavs));
  };

  // 格式化数字
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(number);
  };

  // 过滤数据逻辑
  const filteredCoins = coins.filter(coin => {
    const matchesSearch = coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || coin.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    if (view === 'favorites') {
      return favorites.includes(coin.id) && matchesSearch;
    }
    return matchesSearch;
  });

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">加载市场数据中...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
      {/* 顶部导航与统计 */}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-yellow-500 flex items-center gap-2">
              <LayoutList /> 币安代币看板 (Demo)
            </h1>
            <p className="text-gray-400 text-sm mt-1">实时追踪市值排名前 100 的代币</p>
          </div>

          <div className="flex items-center gap-4 bg-gray-800 p-2 rounded-lg">
            {/* 视图切换按钮 */}
            <button 
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-md transition-all ${view === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              全部市场
            </button>
            <button 
              onClick={() => setView('favorites')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${view === 'favorites' ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Heart size={16} fill={view === 'favorites' ? "currentColor" : "none"} />
              我的收藏 ({favorites.length})
            </button>
          </div>
        </header>

        {/* 搜索栏 */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="搜索代币名称 (例如 BTC, ETH)..." 
            className="w-full md:w-1/3 bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 表格主体 */}
        <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-xl border border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 text-sm uppercase tracking-wider">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4 w-12 text-center"><Star size={16} /></th>
                <th className="p-4">代币名称</th>
                <th className="p-4 text-right">价格 (USD)</th>
                <th className="p-4 text-right">24H 涨跌</th>
                <th className="p-4 text-right">24H 成交量</th>
                <th className="p-4 text-right">市值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCoins.length > 0 ? (
                filteredCoins.map((coin, index) => {
                  const isFav = favorites.includes(coin.id);
                  const isUp = coin.price_change_percentage_24h >= 0;

                  return (
                    <tr key={coin.id} className="hover:bg-gray-750 transition-colors group">
                      {/* 排名 */}
                      <td className="p-4 text-center text-gray-500 font-mono">
                         {coin.market_cap_rank}
                      </td>
                      
                      {/* 收藏按钮 */}
                      <td className="p-4 text-center cursor-pointer" onClick={() => toggleFavorite(coin.id)}>
                        <Star 
                          size={18} 
                          className={`transition-all ${isFav ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 group-hover:text-gray-400'}`} 
                        />
                      </td>

                      {/* 代币名称与Logo */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{coin.symbol.toUpperCase()}</span>
                            <span className="text-xs text-gray-400">{coin.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* 价格 */}
                      <td className="p-4 text-right font-mono text-white">
                        {formatCurrency(coin.current_price)}
                      </td>

                      {/* 24H 涨跌幅 */}
                      <td className={`p-4 text-right font-mono font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </div>
                      </td>

                      {/* 成交量 */}
                      <td className="p-4 text-right text-gray-300 font-mono">
                        ${formatCompactNumber(coin.total_volume)}
                      </td>

                      {/* 市值 */}
                      <td className="p-4 text-right text-gray-300 font-mono">
                        ${formatCompactNumber(coin.market_cap)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    {view === 'favorites' ? '还没有添加任何收藏代币' : '未找到相关代币'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <p className="mt-4 text-center text-xs text-gray-500">
          数据来源: CoinGecko API (演示用途，生产环境建议结合 Binance WebSocket)
        </p>
      </div>
    </div>
  );
};

export default CryptoDashboard;