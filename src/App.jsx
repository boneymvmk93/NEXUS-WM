import React, { useState, useMemo } from 'react';
import { Home, Briefcase, BarChart2, Settings, Eye, EyeOff, Shield, TrendingUp, Plus, X, User, Bell, Monitor, Smartphone, RefreshCcw } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { differenceInDays, parseISO, isAfter, isValid, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const VERSION = "1.21";
const DIGITAL_AED = "د.إ";

// --- FINANCIAL CALCULATOR ENGINE ---
const calculateInvestment = (data) => {
  const { principal, rate, startDate, endDate, invType, taxSlab, compounding, category } = data;
  const P = parseFloat(principal);
  const R = parseFloat(rate) / 100;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const today = new Date();

  if (!isValid(start) || !isValid(end)) return data;

  const totalDays = differenceInDays(end, start);
  const daysCompleted = differenceInDays(today, start);
  const daysRemaining = differenceInDays(end, today);
  const t = totalDays / 365;

  const nMap = { 'Monthly': 12, 'Quarterly': 4, 'Half Yearly': 2, 'Yearly': 1 };
  const n = nMap[compounding] || 4;

  const maturityAmount = P * Math.pow((1 + R / n), (n * t));
  const interestEarned = maturityAmount - P;
  const actualTaxSlab = invType === 'NRI' ? 0 : parseFloat(taxSlab) / 100;
  const taxAmount = interestEarned * actualTaxSlab;
  const postTaxMaturity = maturityAmount - taxAmount;

  const tPassed = daysCompleted / 365;
  const currentValue = daysCompleted > 0 ? P * Math.pow((1 + R / n), (n * tPassed)) : P;
  const cagr = ((Math.pow((maturityAmount / P), (1 / t)) - 1) * 100).toFixed(2);

  return {
    ...data,
    maturityAmount: maturityAmount.toFixed(2),
    postTaxMaturity: postTaxMaturity.toFixed(2),
    currentValue: currentValue.toFixed(2),
    daysRemaining: Math.max(0, daysRemaining),
    pctComplete: Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100)).toFixed(1),
    status: isAfter(today, end) ? 'MATURED' : 'ACTIVE',
    cagr: cagr
  };
};

export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currency, setCurrency] = useState('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [holdings, setHoldings] = useState([]);

  const handleSave = (rawData) => {
    const computedData = calculateInvestment(rawData);
    setHoldings([...holdings, computedData]);
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-white max-w-md mx-auto relative overflow-hidden flex flex-col font-sans border-x border-zinc-900">
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 safe-pt">
        <div className="bg-zinc-900/80 border border-zinc-800 py-1.5 px-3 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Live ready</span>
        </div>
        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(252,211,77,0.1)]">
          <User size={18} className="text-amber-200" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {activeTab === 'Dashboard' && <HomeView currency={currency} setCurrency={setCurrency} isHidden={isHidden} setIsHidden={setIsHidden} holdings={holdings} />}
        {activeTab === 'Portfolio' && <PortfolioView isHidden={isHidden} holdings={holdings} onAdd={() => setIsDrawerOpen(true)} />}
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-3xl border-t border-zinc-900 px-10 pt-4 pb-10 flex justify-between z-40 max-w-md mx-auto">
        <NavItem icon={<Home />} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
        <NavItem icon={<Briefcase />} label="Portfolio" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <NavItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>

      {/* Floating Add Button */}
      <button onClick={() => setIsDrawerOpen(true)} className="fixed bottom-28 right-8 w-14 h-14 bg-amber-200 text-black rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(252,211,77,0.3)] z-50">
        <Plus size={28} strokeWidth={3} />
      </button>

      <AddInvestmentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSave} />
    </div>
  );
}

// --- SUB-VIEWS ---

function HomeView({ currency, setCurrency, isHidden, setIsHidden, holdings }) {
  const totalNetWorth = holdings.reduce((acc, h) => acc + parseFloat(h.currentValue || 0), 0);

  return (
    <div className="space-y-8 mt-4">
      <header>
        <p className="text-[10px] tracking-[0.2em] text-amber-500 font-bold uppercase mb-2">Private Wealth</p>
        <h1 className="text-3xl font-bold leading-[1.1] tracking-tight italic">
          A single view of <br/>your cross-border wealth.
        </h1>
      </header>

      <div className="flex gap-2">
        {['USD', 'INR', 'AED'].map(c => (
          <button key={c} onClick={() => setCurrency(c)} className={`px-6 py-2.5 rounded-full text-[11px] font-bold transition-all ${currency === c ? 'bg-amber-200 text-black shadow-lg shadow-amber-500/20' : 'bg-zinc-900/50 text-zinc-500'}`}>
            {c === 'AED' ? DIGITAL_AED : c}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/40 p-8 rounded-[40px] border border-zinc-800/50 relative overflow-hidden">
        <div className="flex justify-between items-center opacity-40 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest">Total Net Worth</span>
          <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
        <div className="text-5xl font-bold tracking-tighter">
          {isHidden ? '••••••••' : `${currency === 'INR' ? '₹' : '$'} ${totalNetWorth.toLocaleString()}`}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-10">
          <Sleeve icon={<Shield className="text-blue-400"/>} label="Protected" sub="FD, Bonds" />
          <Sleeve icon={<TrendingUp className="text-emerald-400"/>} label="Growth" sub="Equity, MF" />
        </div>
      </div>
    </div>
  );
}

function PortfolioView({ isHidden, holdings, onAdd }) {
  return (
    <div className="space-y-6 mt-4">
      <h1 className="text-2xl font-bold">Investments</h1>
      <div className="space-y-4">
        {holdings.map((h, i) => (
          <div key={i} className="p-6 bg-zinc-900/30 rounded-[32px] border border-zinc-800/40">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">{h.category}</p>
                <h3 className="text-lg font-bold">{h.bankName}</h3>
              </div>
              <span className="text-[9px] px-2 py-1 bg-zinc-800 rounded-full font-bold text-zinc-400">{h.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Current" val={isHidden ? '••••' : h.currentValue} />
              <Stat label="Maturity (Post-Tax)" val={isHidden ? '••••' : h.postTaxMaturity} />
              <Stat label="CAGR" val={`${h.cagr}%`} />
              <Stat label="Remaining" val={`${h.daysRemaining}d`} />
            </div>
            <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-200" style={{ width: `${h.pctComplete}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- DRAWER & COMPONENTS ---

function AddInvestmentDrawer({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    category: 'Fixed Deposit', bankName: '', principal: '', rate: '', 
    startDate: '', endDate: '', invType: 'Resident', taxSlab: '30%', compounding: 'Quarterly'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-md z-50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 rounded-t-[40px] z-50 max-w-md mx-auto h-[85vh] p-8 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold italic">New Holding</h2>
              <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-6 pb-20">
              <Input label="Bank Name" value={formData.bankName} onChange={v => setFormData({...formData, bankName: v})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Principal" type="number" value={formData.principal} onChange={v => setFormData({...formData, principal: v})} />
                <Input label="Rate %" type="number" value={formData.rate} onChange={v => setFormData({...formData, rate: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Date" type="date" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
                <Input label="End Date" type="date" value={formData.endDate} onChange={v => setFormData({...formData, endDate: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Residency" options={['Resident', 'NRI']} value={formData.invType} onChange={v => setFormData({...formData, invType: v, taxSlab: v === 'NRI' ? '0%' : '30%'})} />
                <Select label="Tax Slab" options={['0%', '10%', '20%', '30%']} value={formData.taxSlab} disabled={formData.invType === 'NRI'} onChange={v => setFormData({...formData, taxSlab: v})} />
              </div>
              <button onClick={() => onSave(formData)} className="w-full py-5 bg-amber-200 text-black font-extrabold rounded-[32px] shadow-xl shadow-amber-500/10">Save Investment</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-600 font-bold uppercase ml-3 tracking-widest">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 text-sm font-bold focus:border-amber-500/50 outline-none" />
    </div>
  );
}

function Select({ label, options, value, onChange, disabled }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-600 font-bold uppercase ml-3 tracking-widest">{label}</label>
      <select disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 text-sm font-bold outline-none disabled:opacity-20">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Stat({ label, val }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{label}</p>
      <p className="text-sm font-bold">{val}</p>
    </div>
  );
}

function Sleeve({ icon, label, sub }) {
  return (
    <div className="bg-zinc-950/40 p-5 rounded-3xl border border-zinc-800/50">
      {icon}
      <p className="text-[9px] text-zinc-500 uppercase font-extrabold tracking-widest mt-3 mb-1">{label}</p>
      <p className="text-[11px] font-bold text-zinc-200">{sub}</p>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 transition-all">
      <div className={`${active ? 'text-amber-200' : 'text-zinc-700'}`}>
        {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-tighter ${active ? 'text-amber-100' : 'text-zinc-800'}`}>{label}</span>
    </button>
  );
}
