import React, { useState } from 'react';
import { Home, Briefcase, BarChart2, Settings, Eye, EyeOff, Shield, TrendingUp, Plus, X, User, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO, isAfter, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const VERSION = "1.22";

// --- REFACTORED CALCULATION ENGINE (Aligned with JSON Schema) ---
const calculateInvestment = (data) => {
  const { invested_amount, interest_rate, purchase_date, maturity_date, fd_investment_type, taxSlab, fd_compounding_period, asset_type } = data;
  
  const P = parseFloat(invested_amount) || 0;
  const R = parseFloat(interest_rate) / 100 || 0;
  const start = parseISO(purchase_date);
  const end = parseISO(maturity_date);
  const today = new Date();

  // Basic logic for Fixed Income (FD/Bonds)
  if (['fd', 'bond'].includes(asset_type) && isValid(start) && isValid(end)) {
    const totalDays = differenceInDays(end, start);
    const daysCompleted = differenceInDays(today, start);
    const daysRemaining = differenceInDays(end, today);
    const t = totalDays / 365;

    const nMap = { 'Monthly': 12, 'Quarterly': 4, 'Half Yearly': 2, 'Yearly': 1 };
    const n = nMap[fd_compounding_period] || 4;

    const maturityAmount = P * Math.pow((1 + R / n), (n * t));
    const interestEarned = maturityAmount - P;
    const actualTaxSlab = fd_investment_type === 'NRI' ? 0 : parseFloat(taxSlab || 30) / 100;
    const postTaxMaturity = maturityAmount - (interestEarned * actualTaxSlab);
    
    const tPassed = daysCompleted / 365;
    const currentValue = daysCompleted > 0 ? P * Math.pow((1 + R / n), (n * tPassed)) : P;
    const cagr = ((Math.pow((maturityAmount / P), (1 / t)) - 1) * 100).toFixed(2);

    return {
      ...data,
      current_value: currentValue.toFixed(2),
      maturity_amount: postTaxMaturity.toFixed(2),
      daysRemaining: Math.max(0, daysRemaining),
      pctComplete: Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100)).toFixed(1),
      status: isAfter(today, end) ? 'MATURED' : 'ACTIVE',
      cagr: cagr
    };
  }

  // Default return for non-fixed income (Equity/Crypto)
  return { ...data, status: 'ACTIVE', cagr: 'N/A' };
};

export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [holdings, setHoldings] = useState([]);

  const handleSave = (rawData) => {
    const computedData = calculateInvestment(rawData);
    setHoldings([...holdings, computedData]);
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-white max-w-md mx-auto relative overflow-hidden flex flex-col font-sans border-x border-zinc-900">
      <header className="p-6 pt-12 flex justify-between items-center">
        <div className="bg-zinc-900 border border-zinc-800 py-1 px-3 rounded-full flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Global Asset Tracker</span>
        </div>
        <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center border border-white/5"><User size={16}/></div>
      </header>

      <main className="flex-1 px-6 pb-32 overflow-y-auto no-scrollbar">
        {activeTab === 'Dashboard' && <DashboardView holdings={holdings} />}
        {activeTab === 'Portfolio' && <PortfolioView holdings={holdings} onAdd={() => setIsDrawerOpen(true)} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 px-10 py-6 flex justify-between z-40 max-w-md mx-auto">
        <NavItem icon={<Home />} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
        <NavItem icon={<Briefcase />} label="Portfolio" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <NavItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>

      <button onClick={() => setIsDrawerOpen(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-amber-200 text-black rounded-full flex items-center justify-center shadow-xl z-50">
        <Plus size={28} />
      </button>

      <AddInvestmentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSave} />
    </div>
  );
}

// --- VIEWS ---

function DashboardView({ holdings }) {
  const totalVal = holdings.reduce((sum, h) => sum + parseFloat(h.current_value || 0), 0);
  return (
    <div className="mt-4 space-y-6">
      <div>
        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Portfolio Value</p>
        <h2 className="text-4xl font-bold tracking-tighter">${totalVal.toLocaleString()}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-zinc-900/50 rounded-[30px] border border-zinc-800/50">
          <Shield size={18} className="text-blue-400 mb-2"/>
          <p className="text-[9px] text-zinc-500 uppercase font-bold">Protected</p>
          <p className="text-sm font-bold">FD, Bonds</p>
        </div>
        <div className="p-5 bg-zinc-900/50 rounded-[30px] border border-zinc-800/50">
          <TrendingUp size={18} className="text-emerald-400 mb-2"/>
          <p className="text-[9px] text-zinc-500 uppercase font-bold">Growth</p>
          <p className="text-sm font-bold">Equity, MF</p>
        </div>
      </div>
    </div>
  );
}

function PortfolioView({ holdings }) {
  return (
    <div className="mt-4 space-y-4">
      {holdings.map((h, i) => (
        <div key={i} className="p-6 bg-zinc-900/30 rounded-[32px] border border-white/5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">{h.asset_type}</p>
              <h3 className="text-lg font-bold">{h.name}</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-500">{h.original_currency}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-3">
            <Stat label="Current Value" val={h.current_value} />
            <Stat label="Invested" val={h.invested_amount} />
            {h.cagr !== 'N/A' && <Stat label="CAGR" val={`${h.cagr}%`} />}
            {h.daysRemaining !== undefined && <Stat label="Remaining" val={`${h.daysRemaining}d`} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- DYNAMIC DRAWER BASED ON SCHEMA ---

function AddInvestmentDrawer({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '', asset_type: 'fd', market: 'india', original_currency: 'INR',
    invested_amount: '', current_value: '', purchase_date: '', maturity_date: '',
    interest_rate: '', fd_investment_type: 'Resident', fd_compounding_period: 'Quarterly',
    institution: '', ticker_symbol: ''
  });

  const assetTypes = ["fd", "cash", "equity", "mutual_fund", "bond", "ulip", "commodity", "crypto"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-md z-50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 rounded-t-[40px] z-50 max-w-md mx-auto h-[85vh] p-8 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold italic">Add Investment</h2>
              <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-5 pb-20">
              <Select label="Asset Type" options={assetTypes} value={formData.asset_type} onChange={v => setFormData({...formData, asset_type: v})} />
              <Input label="Investment Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
              
              <div className="grid grid-cols-2 gap-4">
                <Select label="Market" options={['india', 'us', 'uae']} value={formData.market} onChange={v => setFormData({...formData, market: v})} />
                <Select label="Currency" options={['INR', 'USD', 'AED']} value={formData.original_currency} onChange={v => setFormData({...formData, original_currency: v})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Invested Amount" type="number" value={formData.invested_amount} onChange={v => setFormData({...formData, invested_amount: v, current_value: v})} />
                <Input label="Institution" value={formData.institution} onChange={v => setFormData({...formData, institution: v})} />
              </div>

              {/* Conditional Fields for FD/Bonds */}
              {['fd', 'bond'].includes(formData.asset_type) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Interest Rate %" type="number" value={formData.interest_rate} onChange={v => setFormData({...formData, interest_rate: v})} />
                    <Select label="Compounding" options={['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']} value={formData.fd_compounding_period} onChange={v => setFormData({...formData, fd_compounding_period: v})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Start Date" type="date" value={formData.purchase_date} onChange={v => setFormData({...formData, purchase_date: v})} />
                    <Input label="End Date" type="date" value={formData.maturity_date} onChange={v => setFormData({...formData, maturity_date: v})} />
                  </div>
                  <Select label="Residency" options={['Resident', 'NRI']} value={formData.fd_investment_type} onChange={v => setFormData({...formData, fd_investment_type: v})} />
                </>
              )}

              {/* Conditional Fields for Market Assets */}
              {['equity', 'mutual_fund', 'crypto'].includes(formData.asset_type) && (
                <Input label="Ticker / Fund Symbol" value={formData.ticker_symbol} onChange={v => setFormData({...formData, ticker_symbol: v})} />
              )}

              <button onClick={() => onSave(formData)} className="w-full py-5 bg-amber-200 text-black font-extrabold rounded-3xl mt-4">Complete Add</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- REUSABLE COMPONENTS ---
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-amber-200' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function Stat({ label, val }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold">{val}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-500 font-bold uppercase ml-3">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold outline-none focus:border-amber-500/50" />
    </div>
  );
}

function Select({ label, options, value, onChange, disabled }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-500 font-bold uppercase ml-3">{label}</label>
      <select disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold outline-none disabled:opacity-20">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
