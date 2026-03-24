import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Briefcase, BarChart2, Settings, Eye, EyeOff, Shield, 
  TrendingUp, Plus, X, User, Zap, Monitor, Smartphone, Trash2, 
  Download, Upload, ChevronRight, Bell, RefreshCcw, ArrowLeft
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, YAxis } from 'recharts';
import { differenceInDays, parseISO, isAfter, isValid, format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const BUILD_VERSION = "2.1"; // Major Update: Implementation of all combined notes
const DIGITAL_AED = "󱵎"; // New Digital Dirham Symbol

// --- UTILITIES & CALCULATORS ---
const calculateInvestment = (data) => {
  const P = parseFloat(data.invested_amount) || 0;
  const R = parseFloat(data.interest_rate) / 100 || 0;
  const start = parseISO(data.purchase_date);
  const end = parseISO(data.maturity_date);
  const today = new Date();

  // 1. FD & CASH LOGIC
  if (['fd', 'cash'].includes(data.asset_type)) {
    if (data.account_type === 'Loan') return { ...data, status: 'DEBT', current_value: P };
    
    if (isValid(start) && isValid(end)) {
      const totalDays = differenceInDays(end, start);
      const daysComp = differenceInDays(today, start);
      const daysRem = differenceInDays(end, today);
      const t = totalDays / 365;
      const n = { 'Monthly': 12, 'Quarterly': 4, 'Half Yearly': 2, 'Yearly': 1 }[data.fd_compounding_period] || 4;

      const maturity = P * Math.pow((1 + R / n), (n * t));
      const taxRate = data.fd_investment_type === 'NRI' ? 0 : 0.30;
      const interest = maturity - P;
      const postTaxMaturity = maturity - (interest * taxRate);
      
      const tPassed = daysComp / 365;
      const currentVal = daysComp > 0 ? P * Math.pow((1 + R / n), (n * Math.max(0, tPassed))) : P;

      return {
        ...data,
        current_value: currentVal.toFixed(2),
        maturity_amount: postTaxMaturity.toFixed(2),
        interest_earned: interest.toFixed(2),
        daysRemaining: Math.max(0, daysRem),
        daysCompleted: Math.max(0, daysComp),
        pctComplete: Math.min(100, Math.max(0, (daysComp / totalDays) * 100)).toFixed(1),
        status: isAfter(today, end) ? 'MATURED' : 'ACTIVE',
        cagr: ((Math.pow((maturity / P), (1 / t)) - 1) * 100).toFixed(2),
        tax_rate: (taxRate * 100) + "%"
      };
    }
  }

  // 2. BOND LOGIC
  if (data.asset_type === 'bond') {
    const tradeValue = (parseFloat(data.units) || 0) * (parseFloat(data.bond_price_per_unit) || 0);
    const totalVal = tradeValue + (parseFloat(data.bond_accrued) || 0);
    return { ...data, trade_value: tradeValue, total_value: totalVal, current_value: totalVal };
  }

  return { ...data, current_value: data.current_value || P, status: 'ACTIVE' };
};

// --- MAIN APPLICATION ---
export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currency, setCurrency] = useState('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [viewMode, setViewMode] = useState('mobile');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [theme, setTheme] = useState('dark');

  const handleSave = (item) => {
    const computed = calculateInvestment(item);
    setHoldings([...holdings, computed]);
    setIsDrawerOpen(false);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-zinc-50 text-black'} font-sans transition-colors duration-300`}>
      <div className={`${viewMode === 'mobile' ? 'max-w-md mx-auto border-x border-zinc-900 shadow-2xl min-h-screen relative flex flex-col' : 'w-full'}`}>
        
        {/* HEADER */}
        <header className="p-6 pt-10 flex justify-between items-start safe-pt">
          <div>
            <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase">Welcome, First Last</p>
            <h1 className="text-xl font-black italic tracking-tighter">NEXUS WM</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setViewMode(v => v === 'mobile' ? 'desktop' : 'mobile')} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
              {viewMode === 'mobile' ? <Monitor size={18}/> : <Smartphone size={18}/>}
            </button>
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-amber-500/20">
              <User size={20} className="text-amber-200" />
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 overscroll-none">
          {activeTab === 'Home' && <HomeView holdings={holdings} isHidden={isHidden} setIsHidden={setIsHidden} currency={currency} setCurrency={setCurrency} />}
          {activeTab === 'Portfolio' && <PortfolioView holdings={holdings} onAdd={() => setIsDrawerOpen(true)} isHidden={isHidden} />}
          {activeTab === 'Market' && <MarketView />}
          {activeTab === 'Settings' && <SettingsView theme={theme} setTheme={setTheme} />}
        </main>

        {/* BOTTOM NAV */}
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 safe-pb flex justify-around py-5 z-40 max-w-md mx-auto">
          <TabItem icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
          <TabItem icon={<Briefcase />} label="Portfolio" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
          <TabItem icon={<BarChart2 />} label="Market" active={activeTab === 'Market'} onClick={() => setActiveTab('Market')} />
          <TabItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
        </nav>

        {/* ADD ACTION */}
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setIsDrawerOpen(true)}
          className="fixed bottom-28 right-8 w-14 h-14 bg-amber-200 text-black rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 z-50"
        >
          <Plus size={28} strokeWidth={3} />
        </motion.button>

        <AddInvestmentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSave} />
      </div>
    </div>
  );
}

// --- VIEW: HOME ---
function HomeView({ holdings, isHidden, setIsHidden, currency, setCurrency }) {
  const totalVal = useMemo(() => holdings.reduce((sum, h) => sum + parseFloat(h.current_value || 0), 0), [holdings]);
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight italic leading-tight">A single view of your<br/>cross-border wealth.</h2>
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">{holdings.length} Holdings Across Global Markets</span>
          <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-1">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[8px] text-emerald-500 font-bold uppercase">Live Ready</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {['USD', 'INR', 'AED'].map(c => (
          <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-2 rounded-full text-[11px] font-bold ${currency === c ? 'bg-amber-200 text-black shadow-lg shadow-amber-500/20' : 'bg-zinc-900 text-zinc-500'}`}>
            {c === 'AED' ? DIGITAL_AED : c}
          </button>
        ))}
      </div>

      {/* NET WORTH CARD */}
      <div className="bg-zinc-900/50 p-8 rounded-[40px] border border-zinc-800 relative overflow-hidden">
        <div className="flex justify-between items-center opacity-40 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest">Total Net Worth</span>
          <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
        <div className="text-5xl font-bold tracking-tighter mb-8">
          {isHidden ? '••••••••' : `${currency === 'INR' ? '₹' : (currency === 'AED' ? DIGITAL_AED : '$')} ${totalVal.toLocaleString()}`}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800">
            <Shield className="text-blue-400 mb-2" size={18}/>
            <p className="text-[9px] text-zinc-500 font-bold uppercase">Protected</p>
            <p className="text-xs font-bold">FD, Bonds</p>
          </div>
          <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800">
            <TrendingUp className="text-emerald-400 mb-2" size={18}/>
            <p className="text-[9px] text-zinc-500 font-bold uppercase">Growth</p>
            <p className="text-xs font-bold">Equity, Crypto</p>
          </div>
        </div>
      </div>

      {/* CHART PLACEHOLDER */}
      <div className="h-40 w-full opacity-30 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[{v:10}, {v:15}, {v:12}, {v:25}, {v:20}, {v:35}]}>
            <Area type="monotone" dataKey="v" stroke="#fcd34d" fill="#fcd34d" fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- VIEW: PORTFOLIO ---
function PortfolioView({ holdings, isHidden, onAdd }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Investments</h2>
        <button className="text-zinc-500 p-2 bg-zinc-900 rounded-full"><RefreshCcw size={18}/></button>
      </div>
      
      {holdings.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700">
            <Briefcase size={32}/>
          </div>
          <p className="text-zinc-500 text-sm italic">No holdings found.<br/>Tap + to start tracking.</p>
        </div>
      ) : (
        holdings.map((h, i) => (
          <div key={i} className="p-6 bg-zinc-900/40 rounded-[32px] border border-zinc-800/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">{h.asset_type}</p>
                <h3 className="text-lg font-bold">{h.name}</h3>
              </div>
              <div className="text-right">
                <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${h.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                  {h.status}
                </span>
                <p className="text-[10px] text-zinc-500 mt-1 font-bold">{h.institution}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-4">
              <StatItem label="Current" val={isHidden ? '••••' : h.current_value} />
              <StatItem label="Invested" val={isHidden ? '••••' : h.invested_amount} />
              <StatItem label="CAGR" val={`${h.cagr || 0}%`} />
              <StatItem label="Remaining" val={h.daysRemaining !== undefined ? `${h.daysRemaining} Days` : '--'} />
            </div>
            {h.pctComplete && (
              <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-200" style={{ width: `${h.pctComplete}%` }} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// --- VIEW: MARKET ---
function MarketView() {
  const indices = [
    { label: 'Nifty 50', country: 'India', price: '22,453.20', change: '+0.85%' },
    { label: 'Nasdaq', country: 'US', price: '16,274.90', change: '-0.12%' },
    { label: 'ADX General', country: 'UAE', price: '9,240.50', change: '+0.45%' }
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Global Markets</h2>
      <div className="space-y-3">
        {indices.map(idx => (
          <div key={idx.label} className="p-5 bg-zinc-900/50 rounded-3xl border border-zinc-800 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{idx.country}</p>
              <h3 className="text-sm font-bold">{idx.label}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{idx.price}</p>
              <p className={`text-[10px] font-bold ${idx.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{idx.change}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW: SETTINGS ---
function SettingsView({ theme, setTheme }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="space-y-2">
        <SettingsItem icon={<Zap size={18}/>} label="App Theme" sub={theme} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        <SettingsItem icon={<Download size={18}/>} label="Export to Excel" sub="All values in INR" />
        <SettingsItem icon={<Upload size={18}/>} label="Import Data" sub="Download template" />
        <SettingsItem icon={<Trash2 size={18} className="text-rose-500"/>} label="Delete Account" sub="Permanent Action" color="text-rose-500" />
      </div>
      <div className="text-center pt-10">
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Nexus Build v{BUILD_VERSION}</p>
      </div>
    </div>
  );
}

// --- DRAWER COMPONENT ---
function AddInvestmentDrawer({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    asset_type: 'fd', name: '', invested_amount: '', interest_rate: '', 
    purchase_date: format(new Date(), 'yyyy-MM-dd'), maturity_date: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    fd_investment_type: 'Resident', fd_compounding_period: 'Quarterly', institution: '',
    account_type: 'Cash'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-md z-50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 rounded-t-[40px] z-50 max-w-md mx-auto h-[90vh] p-8 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic">New Asset</h2>
              <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-500"><X size={20}/></button>
            </div>

            <div className="space-y-6 pb-20">
              <SelectInput label="Asset Type" options={['fd', 'cash', 'bond', 'equity', 'crypto', 'gold']} value={formData.asset_type} onChange={v => setFormData({...formData, asset_type: v})} />
              <FormInput label="Investment Label" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
              <FormInput label="Institution / Bank" value={formData.institution} onChange={v => setFormData({...formData, institution: v})} />

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Principal / Invested" type="number" value={formData.invested_amount} onChange={v => setFormData({...formData, invested_amount: v})} />
                <FormInput label="Interest Rate %" type="number" value={formData.interest_rate} onChange={v => setFormData({...formData, interest_rate: v})} />
              </div>

              {formData.asset_type === 'cash' && (
                <SelectInput label="Account Type" options={['Cash', 'Loan']} value={formData.account_type} onChange={v => setFormData({...formData, account_type: v})} />
              )}

              {/* FD/Fixed Income Specifics */}
              {(formData.asset_type === 'fd' || (formData.asset_type === 'cash' && formData.account_type !== 'Loan')) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Start Date" type="date" value={formData.purchase_date} onChange={v => setFormData({...formData, purchase_date: v})} />
                    <FormInput label="End Date" type="date" value={formData.maturity_date} onChange={v => setFormData({...formData, maturity_date: v})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectInput label="Residency" options={['Resident', 'NRI']} value={formData.fd_investment_type} onChange={v => setFormData({...formData, fd_investment_type: v})} />
                    <SelectInput label="Tax Slab" options={['0%', '10%', '20%', '30%']} value={formData.taxSlab || '30%'} disabled={formData.fd_investment_type === 'NRI'} onChange={v => setFormData({...formData, taxSlab: v})} />
                  </div>
                  <SelectInput label="Compounding" options={['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']} value={formData.fd_compounding_period} onChange={v => setFormData({...formData, fd_compounding_period: v})} />
                </>
              )}

              <button 
                onClick={() => onSave(formData)}
                className="w-full py-5 bg-amber-200 text-black font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-amber-500/20 mt-4"
              >
                Secure Holding
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- SHARED UI ---
function StatItem({ label, val }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-bold">{val}</p>
    </div>
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

function TabItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-amber-200' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function SettingsItem({ icon, label, sub, onClick, color="text-zinc-300" }) {
  return (
    <button onClick={onClick} className="w-full p-5 bg-zinc-900/50 rounded-3xl border border-zinc-800 flex items-center justify-between group active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-zinc-950 rounded-xl text-amber-200">{icon}</div>
        <div className="text-left">
          <p className={`text-sm font-bold ${color}`}>{label}</p>
          <p className="text-[10px] text-zinc-500 font-medium">{sub}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400" />
    </button>
  );
}
