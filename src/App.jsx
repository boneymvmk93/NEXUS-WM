import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Briefcase, BarChart2, Settings as SettingsIcon, Eye, EyeOff, Shield, TrendingUp, Plus, ChevronRight, User, Download, Smartphone, Monitor, Bell } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

const VERSION = "1.12";
const DIGITAL_AED = "󱵎"; // Digital AED Symbol

export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currency, setCurrency] = useState('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [viewMode, setViewMode] = useState('mobile');

  // Logic for FD Tax Slab (Requirement #2 in New Notes)
  const calculatePostTax = (principal, rate, type, slab) => {
    const interest = principal * (rate / 100);
    const taxRate = type === 'NRI' ? 0 : parseInt(slab) / 100;
    return principal + (interest * (1 - taxRate));
  };

  return (
    <div className={`min-h-screen bg-black text-white ${viewMode === 'mobile' ? 'max-w-md mx-auto border-x border-zinc-800 shadow-2xl' : 'w-full'}`}>
      
      {/* Top Header */}
      <div className="flex justify-between items-center p-6 safe-pt">
        <div>
          <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Welcome back,</h2>
          <h1 className="text-xl font-bold">User Name</h1>
        </div>
        <div className="flex gap-4 items-center">
           <button onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
            {viewMode === 'mobile' ? <Monitor size={18}/> : <Smartphone size={18}/>}
          </button>
          <div className="relative">
            <Bell size={20} className="text-zinc-400" />
            <span className="absolute -top-1 -right-1 bg-amber-500 text-[8px] text-black font-bold px-1 rounded-full">2</span>
          </div>
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-amber-500/20">
            <User size={20} className="text-amber-200" />
          </div>
        </div>
      </div>

      <main className="pb-28 px-6 no-scrollbar h-[calc(100vh-100px)] overflow-y-auto">
        {activeTab === 'Home' && <HomeView currency={currency} setCurrency={setCurrency} isHidden={isHidden} setIsHidden={setIsHidden} />}
        {activeTab === 'Portfolio' && <PortfolioView isHidden={isHidden} />}
        {activeTab === 'Market' && <MarketView />}
        {activeTab === 'Settings' && <SettingsView />}
      </main>

      {/* Persistent Bottom Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 safe-pb flex justify-around py-4 z-50">
        <TabItem icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
        <TabItem icon={<Briefcase />} label="Investments" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <TabItem icon={<BarChart2 />} label="Market" active={activeTab === 'Market'} onClick={() => setActiveTab('Market')} />
        <TabItem icon={<SettingsIcon />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>
    </div>
  );
}

// --- SUB-VIEWS ---

function HomeView({ currency, setCurrency, isHidden, setIsHidden }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold leading-tight">A single view of your cross-border wealth.</h3>
        <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-tighter italic">15 holdings across India, UAE, US and global markets • Live ready</p>
      </div>

      {/* Currency Toggles */}
      <div className="flex gap-2">
        {['USD', 'INR', 'AED'].map(c => (
          <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-2 rounded-2xl text-[10px] font-bold transition-all ${currency === c ? 'bg-amber-200 text-black shadow-lg shadow-amber-500/20' : 'bg-zinc-900 text-zinc-500'}`}>
            {c === 'AED' ? DIGITAL_AED : c}
          </button>
        ))}
      </div>

      {/* Dashboard Metrics */}
      <div className="bg-gradient-to-br from-zinc-900 to-black p-7 rounded-[40px] border border-zinc-800/50 shadow-inner">
        <div className="flex justify-between items-center opacity-40 mb-2">
          <span className="text-[10px] font-bold uppercase">Total Net Worth</span>
          <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
        <div className="text-4xl font-bold tracking-tight">
          {isHidden ? '••••••••' : `$ 87,744`}
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Total P&L</span>
            <span className="text-red-500 font-bold">-$ 3,026.15 (-3.3%)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-zinc-800/30 p-4 rounded-3xl border border-zinc-700/30">
            <Shield className="text-blue-400 mb-2" size={20}/>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Protected</p>
            <p className="text-xs font-bold">FD, Bonds, ULIP</p>
          </div>
          <div className="bg-zinc-800/30 p-4 rounded-3xl border border-zinc-700/30">
            <TrendingUp className="text-emerald-400 mb-2" size={20}/>
            <p className="text-[9px] text-zinc-500 uppercase font-bold">Growth</p>
            <p className="text-xs font-bold">Equity, MF, Crypto</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioView({ isHidden }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="text-2xl font-bold">Investments</h1>
        <button className="bg-zinc-900 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-full border border-zinc-800">REFRESH PRICES</button>
      </div>
      
      {/* Investment List Summary Layout */}
      <div className="space-y-3">
        {['Fixed Deposit', 'Equity', 'Mutual Fund'].map((type) => (
          <div key={type} className="flex justify-between items-center p-5 bg-zinc-900/40 rounded-[28px] border border-zinc-800/50">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{type}</p>
              <p className="text-sm font-bold">{isHidden ? '••••' : '$12,400'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-500 uppercase">Status</p>
              <p className="text-[10px] text-emerald-500 font-bold">ACTIVE</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketView() {
  const data = [
    { n: 'NIFTY 50', p: '22,012', c: '+0.8%' },
    { n: 'NASDAQ', p: '16,215', c: '-1.1%' },
    { n: 'ADX', p: '9,234', c: '+0.2%' }
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Market Indices</h1>
      {data.map(i => (
        <div key={i.n} className="flex justify-between items-center p-5 bg-zinc-950 rounded-3xl border border-zinc-900">
          <span className="text-xs font-bold">{i.n}</span>
          <div className="text-right">
            <p className="text-sm font-bold">{i.p}</p>
            <p className={`text-[10px] font-bold ${i.c.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{i.c}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="space-y-3">
        <button className="w-full flex justify-between p-5 bg-zinc-900 rounded-3xl text-sm font-bold">Export Data to Excel <Download size={18}/></button>
        <button className="w-full flex justify-between p-5 bg-zinc-900 rounded-3xl text-sm font-bold">App Theme <ChevronRight size={18}/></button>
        <button className="w-full flex justify-between p-5 bg-zinc-900 rounded-3xl text-sm font-bold text-red-500">Delete Account</button>
      </div>
      <div className="text-center opacity-30 text-[10px] font-bold">
        BUILD VERSION {VERSION}
      </div>
    </div>
  );
}

function TabItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-amber-200' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}
