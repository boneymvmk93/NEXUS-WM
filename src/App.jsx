import React, { useState, useEffect, useMemo } from 'react';
import { Home as HomeIcon, Briefcase, BarChart2, Settings as SettingsIcon, Eye, EyeOff, Shield, TrendingUp, Plus, ChevronRight, User, Download, Smartphone, Monitor } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, format, parseISO, addMonths, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';

// Constants & Types
const VERSION = "1.12";
const DIGITAL_AED = "د.إ"; // New Digital AED Symbol

// --- FINANCE UTILS ---
const calculateXIRR = (payments, dates) => {
  let rate = 0.1;
  for (let i = 0; i < 20; i++) {
    let f = 0, df = 0;
    for (let j = 0; j < payments.length; j++) {
      const t = differenceInDays(new Date(dates[j]), new Date(dates[0])) / 365;
      f += payments[j] / Math.pow(1 + rate, t);
      df -= (t * payments[j]) / Math.pow(1 + rate, t + 1);
    }
    rate = rate - f / df;
  }
  return rate * 100;
};

// --- COMPONENTS ---
export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currency, setCurrency] = useState('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [viewMode, setViewMode] = useState('mobile'); // Desktop/Phone toggle
  const [holdings, setHoldings] = useState([]);

  // Mock Data for logic demo
  const stats = {
    netWorth: 87744,
    pnl: -3026.15,
    pnlPct: -3.33,
    holdingsCount: 15
  };

  return (
    <div className={`min-h-screen bg-black text-white ${viewMode === 'mobile' ? 'max-w-md mx-auto border-x border-zinc-800' : 'w-full'}`}>
      
      {/* HEADER: Welcome Message */}
      <div className="flex justify-between items-center p-5 safe-pt">
        <div>
          <h2 className="text-zinc-500 text-xs">Welcome,</h2>
          <h1 className="text-lg font-bold">Firstname Lastname</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')} className="p-2 bg-zinc-900 rounded-full">
            {viewMode === 'mobile' ? <Monitor size={18}/> : <Smartphone size={18}/>}
          </button>
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-amber-500/30">
            <User size={20} />
          </div>
        </div>
      </div>

      <main className="pb-24 px-5 overflow-y-auto no-scrollbar h-[calc(100vh-160px)]">
        {activeTab === 'Home' && <HomeView stats={stats} currency={currency} setCurrency={setCurrency} isHidden={isHidden} setIsHidden={setIsHidden} />}
        {activeTab === 'Portfolio' && <PortfolioView holdings={holdings} />}
        {activeTab === 'Market' && <MarketView />}
        {activeTab === 'Settings' && <SettingsView />}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-zinc-800 safe-pb flex justify-around py-3">
        <NavItem icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
        <NavItem icon={<Briefcase />} label="Investments" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <NavItem icon={<BarChart2 />} label="Market" active={activeTab === 'Market'} onClick={() => setActiveTab('Market')} />
        <NavItem icon={<SettingsIcon />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>
    </div>
  );
}

// --- SUB-PAGES ---

function HomeView({ stats, currency, setCurrency, isHidden, setIsHidden }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">A single view of your cross-border wealth</p>
        <p className="text-xs text-zinc-500 mt-1">{stats.holdingsCount} holdings across India, UAE, US and global markets • Live ready</p>
      </header>

      {/* Currency Switcher */}
      <div className="flex gap-2">
        {['USD', 'INR', 'AED'].map(c => (
          <button key={c} onClick={() => setCurrency(c)} className={`px-4 py-1.5 rounded-xl text-xs font-medium ${currency === c ? 'bg-amber-200 text-black' : 'bg-zinc-900'}`}>
            {c === 'AED' ? DIGITAL_AED : c}
          </button>
        ))}
      </div>

      {/* Net Worth Card */}
      <div className="bg-zinc-900/50 p-6 rounded-[32px] border border-zinc-800">
        <div className="flex justify-between items-center opacity-50 mb-1">
          <span className="text-xs">Total net worth</span>
          <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
        <div className="text-3xl font-bold">{isHidden ? '••••••••' : `$${stats.netWorth.toLocaleString()}`}</div>
        <div className="mt-2 space-y-1">
          <p className="text-red-500 text-sm font-semibold">-${Math.abs(stats.pnl).toLocaleString()}</p>
          <p className="text-zinc-500 text-[10px]">{stats.pnlPct}% vs cost</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Sleeve icon={<Shield className="text-blue-400"/>} label="Protected sleeves" sub="FD, bonds, ULIP" />
          <Sleeve icon={<TrendingUp className="text-emerald-400"/>} label="Growth sleeves" sub="Equity, MF, crypto" />
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-40 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[{d: '1 Feb', v: 4000}, {d: '15 Feb', v: 4200}, {d: '4 Mar', v: 4800}, {d: '16 Mar', v: 5000}]}>
            <XAxis dataKey="d" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tick={{dy: 10}} />
            <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#colorGreen)" strokeWidth={2} />
            <defs>
              <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PortfolioView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Investments</h1>
        <button className="bg-amber-200 text-black p-2 rounded-full"><Plus size={20}/></button>
      </div>
      {/* Investment Summary Table Header as per notes */}
      <div className="text-[10px] text-zinc-500 grid grid-cols-4 gap-2 border-b border-zinc-800 pb-2 uppercase font-bold">
        <span>Type</span>
        <span>Invested</span>
        <span>Qty</span>
        <span>P&L</span>
      </div>
      <div className="flex flex-col gap-4 py-4 opacity-50 italic text-sm text-center">
        Click + to add your first Fixed Deposit, Bond, or Equity.
      </div>
    </div>
  );
}

function MarketView() {
  const indices = [
    { name: 'Nifty 50', price: '22,012', change: '+0.45%' },
    { name: 'Nasdaq', price: '16,215', change: '-1.20%' },
    { name: 'ADX', price: '9,234', change: '+0.12%' }
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Market</h1>
      {indices.map(idx => (
        <div key={idx.name} className="flex justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500">{idx.name}</p>
            <p className="font-bold">{idx.price}</p>
          </div>
          <p className={idx.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}>{idx.change}</p>
        </div>
      ))}
    </div>
  );
}

function SettingsView() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="space-y-2">
        <SettingsBtn icon={<Download size={18}/>} label="Export Your Data to Excel" />
        <SettingsBtn icon={<ChevronRight size={18}/>} label="App Theme" />
        <SettingsBtn icon={<ChevronRight size={18}/>} label="Device Manager" />
      </div>
      <div className="pt-10 border-t border-zinc-800 text-center">
        <p className="text-zinc-600 text-[10px]">Build Version {VERSION}</p>
        <button className="text-red-500 text-xs mt-4 font-bold">Delete Account</button>
      </div>
    </div>
  );
}

// --- HELPERS ---
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-amber-200' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22 })}
      <span className="text-[9px] font-medium uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function Sleeve({ icon, label, sub }) {
  return (
    <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-700/50">
      {icon}
      <p className="text-[9px] text-zinc-500 uppercase font-bold mt-2">{label}</p>
      <p className="text-[11px] font-medium">{sub}</p>
    </div>
  );
}

function SettingsBtn({ icon, label }) {
  return (
    <button className="w-full flex justify-between items-center p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
      <span className="text-sm font-medium">{label}</span>
      {icon}
    </button>
  );
}
