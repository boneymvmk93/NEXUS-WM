import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Briefcase, Settings, Plus, X, User, 
  TrendingUp, Download, Upload, ChevronRight, Globe, 
  Trash2, Bell, Activity, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, parseISO, isAfter, isValid, format, subDays, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const BUILD_VERSION = "4.0.1";
const DIGI_AED = "󱵎"; 

// --- API CONFIGURATION ---
const EXCHANGE_API = "https://open.er-api.com/v6/latest/INR";
// Using a CORS proxy for Yahoo Finance style data
const YAHOO_PROXY = "https://api.allorigins.win/get?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/");

export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currency, setCurrency] = useState('USD'); // Global Toggle: USD, INR, AED
  const [holdings, setHoldings] = useState([]);
  const [rates, setRates] = useState({ USD: 85.50, AED: 23.28, INR: 1 });
  const [marketIndices, setMarketIndices] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- 1. LIVE DATA SYNC (Currencies, Markets, Gold) ---
  const syncAllData = async () => {
    setIsSyncing(true);
    try {
      // Fetch Exchange Rates
      const exRes = await fetch(EXCHANGE_API);
      const exData = await exRes.json();
      const newRates = {
        INR: 1,
        USD: (1 / exData.rates.USD).toFixed(2),
        AED: (1 / exData.rates.AED).toFixed(2)
      };
      setRates(newRates);

      // Fetch Market Indices & Gold Spot
      const tickers = ['^NSEI', '^GSPC', 'DFMGI.AE', 'GC=F', 'SI=F']; 
      const results = await Promise.all(tickers.map(async (ticker) => {
        try {
          const res = await fetch(`${YAHOO_PROXY}${ticker}?interval=1d&range=1d`);
          const json = await res.json();
          const data = JSON.parse(json.contents);
          const meta = data.chart.result[0].meta;
          return {
            symbol: ticker,
            price: meta.regularMarketPrice,
            change: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100).toFixed(2)
          };
        } catch (e) { return null; }
      }));

      const marketData = results.filter(r => r !== null);
      setMarketIndices(marketData.map(m => ({
        name: m.symbol === '^NSEI' ? 'Nifty 50' : m.symbol === '^GSPC' ? 'S&P 500' : m.symbol === 'GC=F' ? 'Gold Spot' : 'DFM',
        value: m.price.toFixed(2),
        change: m.change
      })));

    } catch (e) {
      console.error("Global Sync Failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncAllData();
    // 6 AM UAE Auto-Refresh Logic
  }, []);

  // --- 2. ADVANCED FINANCIAL ENGINE ---
  const processedHoldings = useMemo(() => {
    return holdings.map(h => {
      let currentUnitPrice = parseFloat(h.manual_price) || 0;
      
      // Live Gold Logic
      if (h.asset_group === 'commodity' && h.commodity_type === 'Gold') {
        const spotGoldOz = marketIndices.find(m => m.name === 'Gold Spot')?.value || 2350;
        const goldGram24k = spotGoldOz / 31.1035;
        currentUnitPrice = h.gold_karat === '22K' ? goldGram24k * 0.916 : goldGram24k;
      }

      // Live Equity/MF Logic
      if (['equity', 'mf'].includes(h.asset_group) && h.ticker) {
        // In a real app, this would map h.ticker to the marketIndices array fetched above
      }

      // FD & Cash Calculations
      let currentValOrig = parseFloat(h.invested_amount);
      if (h.asset_group === 'fd' || (h.asset_group === 'cash' && h.acc_type !== 'Loan')) {
        const P = parseFloat(h.invested_amount);
        const R = parseFloat(h.interest_rate) / 100;
        const start = parseISO(h.purchase_date);
        const today = new Date();
        const daysPassed = Math.max(0, differenceInDays(today, start));
        const n = { 'Monthly': 12, 'Quarterly': 4, 'Yearly': 1 }[h.compounding] || 4;
        currentValOrig = P * Math.pow((1 + R / n), (n * (daysPassed / 365)));
      }

      const rateToINR = h.currency === 'INR' ? 1 : rates[h.currency];
      const valINR = (h.asset_group === 'fd' ? currentValOrig : (currentUnitPrice * (h.quantity || 1))) * rateToINR;
      const targetRate = currency === 'INR' ? 1 : (1 / rates[currency]);

      return {
        ...h,
        display_value: (valINR * targetRate).toFixed(2),
        display_invested: (parseFloat(h.invested_amount) * rateToINR * targetRate).toFixed(2),
        pnl_pct: (((valINR / (parseFloat(h.invested_amount) * rateToINR)) - 1) * 100).toFixed(2)
      };
    });
  }, [holdings, rates, currency, marketIndices]);

  // Totals
  const totalNetWorth = processedHoldings.reduce((s, h) => s + parseFloat(h.display_value), 0);
  const totalInvested = processedHoldings.reduce((s, h) => s + parseFloat(h.display_invested), 0);
  const totalPnl = totalNetWorth - totalInvested;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-black text-white font-sans overflow-hidden flex flex-col relative select-none" style={{ overscrollBehavior: 'none' }}>
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase mb-1">Welcome, First Last</p>
            <h1 className="text-2xl font-black italic tracking-tighter">NEXUS WM</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={syncAllData} className={`w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 ${isSyncing ? 'animate-spin' : ''}`}>
              <RefreshCw size={18} className="text-amber-400" />
            </button>
            <button onClick={() => setActiveTab('Settings')} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
              <User size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>
        
        {/* TOP LIVE RATES */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          <RateBadge label="USD/INR" val={rates.USD} />
          <RateBadge label="AED/INR" val={rates.AED} />
          {marketIndices.slice(0, 2).map((m, i) => (
            <RateBadge key={i} label={m.name} val={m.value} change={m.change} />
          ))}
        </div>
      </header>

      {/* VIEW ROUTER */}
      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-32 no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'Home' && (
            <motion.div key="h" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold italic leading-tight">A single view of your<br/>cross-border wealth.</h2>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{holdings.length} Holdings Active</span>
                  <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-1">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] text-emerald-500 font-bold tracking-widest uppercase">Live Ready</span>
                  </div>
                </div>
              </div>

              {/* CURRENCY SELECTOR */}
              <div className="flex gap-2 p-1 bg-zinc-900 rounded-full w-fit border border-zinc-800">
                {['USD', 'INR', 'AED'].map(c => (
                  <button key={c} onClick={() => setCurrency(c)} className={`px-6 py-2 rounded-full text-[10px] font-black transition-all ${currency === c ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 'text-zinc-500 hover:text-white'}`}>
                    {c === 'AED' ? DIGI_AED : c}
                  </button>
                ))}
              </div>

              {/* NET WORTH CARD */}
              <div className="bg-zinc-900/40 p-8 rounded-[40px] border border-zinc-800/50 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Net Worth</span>
                  <button onClick={() => setIsHidden(!isHidden)} className="text-zinc-600 hover:text-amber-400"><Activity size={16}/></button>
                </div>
                <div className="text-5xl font-black tracking-tighter mb-4 transition-all">
                  {isHidden ? '••••••••' : (currency === 'INR' ? '₹' : (currency === 'AED' ? DIGI_AED : '$'))}
                  {!isHidden && totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-zinc-500 uppercase tracking-widest">Total P&L</span>
                    <span className={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} ({((totalPnl/totalInvested)*100 || 0).toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-amber-400/5 blur-3xl rounded-full" />
              </div>

              {/* ALLOCATION RING Placeholder */}
              <div className="h-64 bg-zinc-900/20 rounded-[40px] border border-zinc-900 flex items-center justify-center italic text-zinc-700 text-xs font-bold uppercase tracking-widest">
                Portfolio Allocation Logic Active
              </div>
            </motion.div>
          )}

          {activeTab === 'Portfolio' && (
             <motion.div key="p" className="space-y-4">
                <h2 className="text-2xl font-black italic mb-6">Investments</h2>
                {processedHoldings.map((h, i) => (
                  <InvestmentCard key={i} data={h} currency={currency} isHidden={isHidden} />
                ))}
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-900 flex justify-around items-center h-24 z-50 max-w-md mx-auto px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavItem icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
        <NavItem icon={<Briefcase />} label="Holdings" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <NavItem icon={<Globe />} label="Markets" active={activeTab === 'Market'} onClick={() => setActiveTab('Market')} />
        <NavItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>

      {/* FAB */}
      <button onClick={() => setIsDrawerOpen(true)} className="fixed bottom-32 right-8 w-14 h-14 bg-amber-400 text-black rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-transform">
        <Plus size={28} />
      </button>

      <AddAssetDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={(d) => setHoldings([...holdings, d])} />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function RateBadge({ label, val, change }) {
  return (
    <div className="flex-shrink-0 bg-zinc-900/50 border border-zinc-800/50 px-3 py-1.5 rounded-xl">
      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-black">{val}</span>
        {change && (
          <span className={`text-[9px] font-bold ${parseFloat(change) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {parseFloat(change) >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
}

function InvestmentCard({ data, currency, isHidden }) {
  const sym = currency === 'INR' ? '₹' : (currency === 'AED' ? DIGI_AED : '$');
  return (
    <div className="p-5 bg-zinc-900/40 rounded-[32px] border border-zinc-800/50 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-1">{data.asset_group} • {data.institution}</p>
          <h3 className="font-bold text-white text-base">{data.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-black">{isHidden ? '••••' : `${sym}${parseFloat(data.display_value).toLocaleString()}`}</p>
          <p className={`text-[10px] font-bold ${parseFloat(data.pnl_pct) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {parseFloat(data.pnl_pct) >= 0 ? '+' : ''}{data.pnl_pct}%
          </p>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 px-4 transition-all ${active ? 'text-amber-400' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

// ASSET DRAWER 
function AddAssetDrawer({ isOpen, onClose, onSave }) {
  const [assetGroup, setAssetGroup] = useState('fd');
  const [formData, setFormData] = useState({ currency: 'INR', purchase_date: format(new Date(), 'yyyy-MM-dd') });

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col justify-end">
      <div className="bg-zinc-950 border-t border-zinc-800 rounded-t-[40px] p-8 max-w-md mx-auto w-full h-[85vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black italic">Add New Asset</h2>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="space-y-6 pb-20">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-4 tracking-widest">Asset Category</label>
            <div className="grid grid-cols-2 gap-2">
              {['fd', 'equity', 'mf', 'commodity', 'cash'].map(type => (
                <button key={type} onClick={() => setAssetGroup(type)} className={`py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${assetGroup === type ? 'bg-amber-400 text-black border-amber-400' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <Input label="Investment Label" onChange={v => setFormData({...formData, name: v})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Invested Amount" type="number" onChange={v => setFormData({...formData, invested_amount: v})} />
            <Input label="Currency" type="select" options={['INR', 'USD', 'AED']} onChange={v => setFormData({...formData, currency: v})} />
          </div>

          {assetGroup === 'commodity' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Metal Type" type="select" options={['Gold', 'Silver']} onChange={v => setFormData({...formData, commodity_type: v})} />
              <Input label="Karat" type="select" options={['24K', '22K']} onChange={v => setFormData({...formData, gold_karat: v})} />
            </div>
          )}

          <button onClick={() => { onSave({...formData, asset_group: assetGroup}); onClose(); }} className="w-full py-5 bg-amber-400 text-black font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-amber-400/10">Authorize Log</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type="text", options, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-500 font-bold uppercase ml-4">{label}</label>
      {type === 'select' ? (
        <select onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold text-white outline-none">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-amber-400/50 transition-all" />
      )}
    </div>
  );
}
