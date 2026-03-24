import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Briefcase, Settings, Plus, X, User, 
  TrendingUp, Download, Upload, ChevronRight, Globe, 
  Trash2, Bell, Activity, RefreshCw, ArrowUpRight, ArrowDownRight,
  Eye, EyeOff
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, parseISO, isAfter, isValid, format, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const BUILD_VERSION = "4.0.2";
const DIGI_AED = "󱵎"; // Digital Dirham Symbol

// --- CONFIG & MOCK API LOGIC ---
const EXCHANGE_API = "https://open.er-api.com/v6/latest/INR";
const YAHOO_PROXY = "https://api.allorigins.win/get?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/");

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currency, setCurrency] = useState('USD');
  const [holdings, setHoldings] = useState([]);
  const [rates, setRates] = useState({ USD: 85.50, AED: 23.28, INR: 1 });
  const [marketIndices, setMarketIndices] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userName, setUserName] = useState({ first: "First", last: "Last" });

  // --- 1. DATA SYNC ENGINE ---
  const syncAllData = async () => {
    setIsSyncing(true);
    try {
      const exRes = await fetch(EXCHANGE_API);
      const exData = await exRes.json();
      setRates({ INR: 1, USD: (1 / exData.rates.USD).toFixed(2), AED: (1 / exData.rates.AED).toFixed(2) });

      // Market Data (Nifty, S&P, Gold)
      const tickers = ['^NSEI', '^GSPC', 'GC=F'];
      const results = await Promise.all(tickers.map(async (t) => {
        const res = await fetch(`${YAHOO_PROXY}${t}?interval=1d&range=1d`);
        const json = await res.json();
        const data = JSON.parse(json.contents);
        const meta = data.chart.result[0].meta;
        return { name: t === '^NSEI' ? 'Nifty 50' : t === '^GSPC' ? 'S&P 500' : 'Gold Spot', value: meta.regularMarketPrice, change: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100).toFixed(2) };
      }));
      setMarketIndices(results);
    } catch (e) { console.error("Sync Error", e); }
    finally { setIsSyncing(false); }
  };

  useEffect(() => { syncAllData(); }, []);

  // --- 2. FINANCIAL CALCULATOR ---
  const processedHoldings = useMemo(() => {
    return holdings.map(h => {
      let currentPrice = parseFloat(h.manual_price) || 0;
      
      // Live Gold Logic (24k vs 22k)
      if (h.asset_group === 'commodity' && h.commodity_type === 'Gold') {
        const spot = marketIndices.find(m => m.name === 'Gold Spot')?.value || 2350;
        const gram24k = spot / 31.1035;
        currentPrice = h.gold_karat === '22K' ? gram24k * 0.916 : gram24k;
      }

      const rateToINR = h.currency === 'INR' ? 1 : rates[h.currency];
      const valINR = (currentPrice * (parseFloat(h.quantity) || 1)) * rateToINR;
      const targetRate = currency === 'INR' ? 1 : (1 / rates[currency]);

      return {
        ...h,
        display_value: (valINR * targetRate).toFixed(2),
        display_invested: (parseFloat(h.invested_amount) * rateToINR * targetRate).toFixed(2),
        pnl_pct: (((valINR / (parseFloat(h.invested_amount) * rateToINR)) - 1) * 100).toFixed(2)
      };
    });
  }, [holdings, rates, currency, marketIndices]);

  const totalNW = processedHoldings.reduce((s, h) => s + parseFloat(h.display_value), 0);
  const totalInv = processedHoldings.reduce((s, h) => s + parseFloat(h.display_invested), 0);
  const totalPnl = totalNW - totalInv;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-black text-white font-sans overflow-hidden flex flex-col relative select-none" style={{ overscrollBehavior: 'none' }}>
      
      {/* GLOBAL HEADER */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase mb-1">Welcome, {userName.first} {userName.last}</p>
            <h1 className="text-2xl font-black italic tracking-tighter">NEXUS WM</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={syncAllData} className={`w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 ${isSyncing ? 'animate-spin' : ''}`}>
              <RefreshCw size={18} className="text-amber-400" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <header-badge label="USD/INR" val={rates.USD} />
          <header-badge label="AED/INR" val={rates.AED} />
          {marketIndices.map((m, i) => (
            <header-badge key={i} label={m.name} val={m.value.toFixed(0)} change={m.change} />
          ))}
        </div>
      </header>

      {/* VIEWPORT */}
      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-32 no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'Home' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <h2 className="text-3xl font-bold italic">A single view of your<br/>wealth.</h2>
              
              <div className="flex gap-2 p-1 bg-zinc-900 rounded-full w-fit border border-zinc-800">
                {['USD', 'INR', 'AED'].map(c => (
                  <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-2 rounded-full text-[10px] font-black ${currency === c ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-zinc-500'}`}>
                    {c === 'AED' ? DIGI_AED : c}
                  </button>
                ))}
              </div>

              {/* NET WORTH CARD */}
              <div className="bg-zinc-900/40 p-8 rounded-[40px] border border-zinc-800/50 relative overflow-hidden">
                <div className="flex justify-between mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Total Net Worth</span>
                  <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                </div>
                <div className="text-5xl font-black tracking-tighter mb-4">
                  {isHidden ? '••••••••' : (currency === 'INR' ? '₹' : (currency === 'AED' ? DIGI_AED : '$'))}
                  {!isHidden && totalNW.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-zinc-500 uppercase">P&L</span>
                  <span className={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()} ({((totalPnl/totalInv)*100 || 0).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* RECENT HOLDINGS LIST */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600 px-2">Top Holdings</h3>
                {processedHoldings.slice(0, 3).map((h, i) => (
                  <div key={i} className="p-5 bg-zinc-900/20 rounded-3xl border border-zinc-900 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-amber-500 font-bold uppercase">{h.asset_group}</p>
                      <p className="font-bold">{h.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{isHidden ? '••••' : h.display_value}</p>
                      <p className={`text-[9px] font-bold ${h.pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{h.pnl_pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'Portfolio' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black italic mb-6">Investments</h2>
              {processedHoldings.map((h, i) => (
                <div key={i} className="p-5 bg-zinc-900/40 rounded-3xl border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] text-amber-500 font-bold uppercase">{h.asset_group} • {h.institution}</p>
                      <h3 className="font-bold">{h.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{isHidden ? '••••' : h.display_value}</p>
                      <p className={`text-[10px] font-bold ${h.pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{h.pnl_pct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-900 flex justify-around items-center h-24 z-50 max-w-md mx-auto px-4 pb-6">
        <NavButton icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
        <NavButton icon={<Briefcase />} label="Portfolio" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <NavButton icon={<Globe />} label="Markets" active={activeTab === 'Market'} onClick={() => setActiveTab('Market')} />
        <NavButton icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>

      {/* FAB */}
      <button onClick={() => setIsDrawerOpen(true)} className="fixed bottom-32 right-8 w-14 h-14 bg-amber-400 text-black rounded-full flex items-center justify-center shadow-2xl z-40">
        <Plus size={28} />
      </button>

      {/* DRAWER COMPONENT (Simplified for Stability) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col justify-end">
          <div className="bg-zinc-950 rounded-t-[40px] p-8 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black italic">Add New Holding</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-zinc-900 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-6">
               <input placeholder="Asset Name" className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 font-bold" onChange={e => setHoldings([...holdings, { name: e.target.value, asset_group: 'Cash', invested_amount: 1000, quantity: 1, currency: 'USD' }])} />
               <p className="text-xs text-zinc-500 italic">Form UI placeholder - Log logic active</p>
               <button onClick={() => setIsDrawerOpen(false)} className="w-full py-5 bg-amber-400 text-black font-black uppercase rounded-2xl">Save Asset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- HELPERS ---
function header-badge({ label, val, change }) {
  return (
    <div className="flex-shrink-0 bg-zinc-900/50 border border-zinc-800/50 px-3 py-1.5 rounded-xl">
      <p className="text-[8px] font-bold text-zinc-500 uppercase">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-black">{val}</span>
        {change && <span className={`text-[9px] font-bold ${parseFloat(change) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{change}%</span>}
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-amber-400' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
