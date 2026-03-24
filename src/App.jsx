import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Briefcase, BarChart2, Settings, Eye, EyeOff, Shield, 
  TrendingUp, Plus, X, User, Zap, Monitor, Smartphone, Trash2, 
  Download, Upload, ChevronRight, RefreshCcw, ArrowLeft, Bell
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { differenceInDays, parseISO, isAfter, isValid, format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const BUILD_VERSION = "2.25"; 
const DIGITAL_AED = "󱵎"; // Digital Dirham Symbol

// --- CORE FINANCIAL ENGINE ---
const calculateInvestment = (data, rates) => {
  const P = parseFloat(data.invested_amount) || 0;
  const R = parseFloat(data.interest_rate) / 100 || 0;
  const start = parseISO(data.purchase_date);
  const end = parseISO(data.maturity_date);
  const today = new Date();
  const rateToINR = data.original_currency === 'INR' ? 1 : (rates[data.original_currency] || 1);

  let computed = { ...data, status: 'ACTIVE', current_value: P, invested_inr: (P * rateToINR).toFixed(2) };

  // FD & Cash Account Logic
  if (['fd', 'cash'].includes(data.asset_type)) {
    if (data.account_type === 'Loan') return { ...computed, status: 'DEBT' };
    
    if (isValid(start) && isValid(end)) {
      const totalDays = differenceInDays(end, start);
      const daysComp = differenceInDays(today, start);
      const t = totalDays / 365;
      const n = { 'Monthly': 12, 'Quarterly': 4, 'Half Yearly': 2, 'Yearly': 1 }[data.fd_compounding_period] || 4;

      const maturity = P * Math.pow((1 + R / n), (n * t));
      const taxRate = data.fd_investment_type === 'NRI' ? 0 : (parseFloat(data.taxSlab) / 100 || 0.3);
      const interest = maturity - P;
      const postTaxMaturity = maturity - (interest * taxRate);
      
      const tPassed = daysComp / 365;
      const currentVal = daysComp > 0 ? P * Math.pow((1 + R / n), (n * Math.max(0, tPassed))) : P;

      computed = {
        ...computed,
        current_value: currentVal.toFixed(2),
        current_inr: (currentVal * rateToINR).toFixed(2),
        maturity_amount: postTaxMaturity.toFixed(2),
        daysRemaining: Math.max(0, differenceInDays(end, today)),
        pctComplete: Math.min(100, Math.max(0, (daysComp / totalDays) * 100)).toFixed(1),
        status: isAfter(today, end) ? 'MATURED' : 'ACTIVE',
        cagr: ((Math.pow((maturity / P), (1 / t)) - 1) * 100).toFixed(2)
      };
    }
  }
  return computed;
};

export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Home');
  const [holdings, setHoldings] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({ USD: 85.50, AED: 23.28 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Sync Live Rates
  const fetchRates = async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/INR');
      const data = await res.json();
      if (data.result === "success") {
        setRates({ USD: (1 / data.rates.USD).toFixed(2), AED: (1 / data.rates.AED).toFixed(2) });
      }
    } catch (e) { console.error("Rate fetch failed"); }
  };

  useEffect(() => { fetchRates(); }, []);

  const handleSave = (item) => {
    const computed = calculateInvestment(item, rates);
    setHoldings([...holdings, computed]);
    setIsDrawerOpen(false);
  };

  const handleExport = () => {
    const data = holdings.map(h => ({
      "Name": h.name,
      "Asset": h.asset_type.toUpperCase(),
      "Invested Currency": h.original_currency,
      "Invested (Orig)": h.invested_amount,
      "Invested (INR)": h.invested_inr,
      "Current (INR)": h.current_inr || h.invested_inr,
      "Institution": h.institution,
      "Maturity": h.maturity_date || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
    XLSX.writeFile(wb, `Nexus_Export_${format(new Date(), 'ddMMMyy')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto border-x border-zinc-900 shadow-2xl flex flex-col relative overflow-hidden">
      
      {/* HEADER */}
      <header className="p-6 pt-12 flex justify-between items-start">
        <div>
          <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase mb-1">Welcome, First Last</p>
          <h1 className="text-2xl font-black italic tracking-tighter">NEXUS WM</h1>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
            <User size={20} className="text-amber-200" />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 px-6 pb-32 overflow-y-auto no-scrollbar">
        {activeTab === 'Home' && <HomeView holdings={holdings} isHidden={isHidden} setIsHidden={setIsHidden} currency={currency} setCurrency={setCurrency} />}
        {activeTab === 'Portfolio' && <PortfolioView holdings={holdings} isHidden={isHidden} onAdd={() => setIsDrawerOpen(true)} />}
        {activeTab === 'Settings' && <SettingsView onExport={handleExport} />}
      </main>

      {/* NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 flex justify-around py-6 z-40 max-w-md mx-auto">
        <NavItem icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
        <NavItem icon={<Briefcase />} label="Portfolio" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <NavItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>

      {/* FAB */}
      <button onClick={() => setIsDrawerOpen(true)} className="fixed bottom-28 right-8 w-14 h-14 bg-amber-200 text-black rounded-full flex items-center justify-center shadow-xl z-50">
        <Plus size={28} />
      </button>

      <AddInvestmentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSave} />
    </div>
  );
}

// --- SUB-VIEWS ---
function HomeView({ holdings, isHidden, setIsHidden, currency, setCurrency }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight italic leading-tight">A single view of your<br/>cross-border wealth.</h2>
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">{holdings.length} Holdings Active</span>
          <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-1">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Live Ready</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {['USD', 'INR', 'AED'].map(c => (
          <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-all ${currency === c ? 'bg-amber-200 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
            {c === 'AED' ? DIGITAL_AED : c}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 p-8 rounded-[40px] border border-zinc-800 relative">
        <div className="flex justify-between items-center opacity-40 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest">Total Net Worth</span>
          <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
        <div className="text-5xl font-bold tracking-tighter">
          {isHidden ? '••••••••' : `${currency === 'INR' ? '₹' : (currency === 'AED' ? DIGITAL_AED : '$')} 0.00`}
        </div>
      </div>
    </div>
  );
}

function PortfolioView({ holdings, isHidden, onAdd }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold italic">Investments</h2>
      {holdings.map((h, i) => (
        <div key={i} className="p-6 bg-zinc-900/40 rounded-[32px] border border-zinc-800/50">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-[9px] text-amber-500 font-bold uppercase">{h.asset_type}</p>
              <h3 className="text-lg font-bold">{h.name}</h3>
            </div>
            <span className="text-[9px] px-2 py-1 bg-zinc-800 rounded-full h-fit">{h.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Current" val={isHidden ? '••••' : h.current_value} />
            <StatItem label="CAGR" val={`${h.cagr || 0}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ onExport }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold italic">Settings</h2>
      <button onClick={onExport} className="w-full p-5 bg-zinc-900 rounded-3xl border border-zinc-800 flex justify-between items-center group active:scale-95 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-200/10 rounded-2xl text-amber-200"><Download size={20}/></div>
          <div className="text-left">
            <p className="text-sm font-bold">Export Your Data</p>
            <p className="text-[10px] text-zinc-500">CONVERT ALL TO INR BASE</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-700"/>
      </button>
      <div className="pt-20 text-center opacity-20">
        <p className="text-[10px] font-bold tracking-widest uppercase">Nexus Build {BUILD_VERSION}</p>
      </div>
    </div>
  );
}

// --- SHARED UI ---
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 ${active ? 'text-amber-200' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[9px] font-bold uppercase">{label}</span>
    </button>
  );
}

function StatItem({ label, val }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-500 font-bold uppercase mb-0.5">{label}</p>
      <p className="text-sm font-bold">{val}</p>
    </div>
  );
}

function AddInvestmentDrawer({ isOpen, onClose, onSave }) {
  const [fdData, setFdData] = useState({
    asset_type: 'fd', name: '', invested_amount: '', interest_rate: '', original_currency: 'INR',
    purchase_date: format(new Date(), 'yyyy-MM-dd'), maturity_date: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    fd_investment_type: 'Resident', fd_compounding_period: 'Quarterly', institution: '', taxSlab: '30%'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-md z-50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 rounded-t-[40px] z-50 max-w-md mx-auto h-[90vh] p-8 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic">Secure New Asset</h2>
              <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-500"><X size={20}/></button>
            </div>
            <div className="space-y-5 pb-20">
              <FormInput label="Investment Label" value={fdData.name} onChange={v => setFdData({...fdData, name: v})} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Invested Amount" type="number" value={fdData.invested_amount} onChange={v => setFdData({...fdData, invested_amount: v})} />
                <SelectInput label="Currency" options={['INR', 'USD', 'AED']} value={fdData.original_currency} onChange={v => setFdData({...fdData, original_currency: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Interest Rate %" type="number" value={fdData.interest_rate} onChange={v => setFdData({...fdData, interest_rate: v})} />
                <SelectInput label="Compounding" options={['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']} value={fdData.fd_compounding_period} onChange={v => setFdData({...fdData, fd_compounding_period: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectInput label="Type" options={['Resident', 'NRI']} value={fdData.fd_investment_type} onChange={v => setFdData({...fdData, fd_investment_type: v})} />
                <SelectInput label="Tax Slab" options={['0%', '10%', '20%', '30%']} value={fdData.taxSlab} disabled={fdData.fd_investment_type === 'NRI'} onChange={v => setFdData({...fdData, taxSlab: v})} />
              </div>
              <button onClick={() => onSave(fdData)} className="w-full py-5 bg-amber-200 text-black font-black uppercase tracking-widest rounded-3xl mt-6 shadow-xl shadow-amber-500/10">Authorize Transaction</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FormInput({ label, value, onChange, type="text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-500 font-bold uppercase ml-3">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold focus:border-amber-500/50 outline-none" />
    </div>
  );
}

function SelectInput({ label, options, value, onChange, disabled }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-500 font-bold uppercase ml-3">{label}</label>
      <select disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold outline-none disabled:opacity-30">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
