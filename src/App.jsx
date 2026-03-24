import React, { useState, useMemo } from 'react';
import { Home as HomeIcon, Briefcase, BarChart2, Settings as SettingsIcon, Eye, EyeOff, Shield, TrendingUp, Plus, ChevronRight, User, Download, Smartphone, Monitor, Bell, X, Calendar, RefreshCcw } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis } from 'recharts';
import { differenceInDays, format, parseISO, isAfter, isValid, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const VERSION = "1.14"; // Automatic Build Versioning (Note #20)
const DIGITAL_AED = "󱵎";

// --- FINANCIAL CALCULATOR ENGINE ---
const calculateInvestment = (data) => {
  const { principal, rate, startDate, endDate, invType, taxSlab, compounding, category, accountType } = data;
  
  if (category === 'Cash Account' && accountType === 'Loan') return { ...data, status: 'ACTIVE' };

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

  // Compounding Frequency
  const nMap = { 'Monthly': 12, 'Quarterly': 4, 'Half Yearly': 2, 'Yearly': 1 };
  const n = nMap[compounding] || 4;

  // Maturity Amount (Pre-Tax)
  const maturityAmount = P * Math.pow((1 + R / n), (n * t));
  const interestEarned = maturityAmount - P;

  // Tax Logic (Note #2)
  const actualTaxSlab = invType === 'NRI' ? 0 : parseFloat(taxSlab) / 100;
  const taxAmount = interestEarned * actualTaxSlab;
  const postTaxMaturity = maturityAmount - taxAmount;

  // Current Value (Estimated based on days passed)
  const tPassed = daysCompleted / 365;
  const currentValue = daysCompleted > 0 ? P * Math.pow((1 + R / n), (n * tPassed)) : P;

  // CAGR Calculation (Note #3)
  const cagr = ((Math.pow((maturityAmount / P), (1 / t)) - 1) * 100).toFixed(2);

  return {
    ...data,
    maturityAmount: maturityAmount.toFixed(2),
    postTaxMaturity: postTaxMaturity.toFixed(2),
    interestEarned: interestEarned.toFixed(2),
    currentValue: currentValue.toFixed(2),
    daysCompleted: Math.max(0, daysCompleted),
    daysRemaining: Math.max(0, daysRemaining),
    pctComplete: Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100)).toFixed(1),
    status: isAfter(today, end) ? 'MATURED' : 'ACTIVE',
    cagr: cagr,
    taxRate: (actualTaxSlab * 100) + "%"
  };
};

export default function NexusWM() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currency, setCurrency] = useState('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [viewMode, setViewMode] = useState('mobile');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [holdings, setHoldings] = useState([]);

  const handleSave = (rawData) => {
    const computedData = calculateInvestment(rawData);
    setHoldings([...holdings, computedData]);
    setIsDrawerOpen(false);
  };

  return (
    <div className={`min-h-screen bg-black text-white ${viewMode === 'mobile' ? 'max-w-md mx-auto border-x border-zinc-800' : 'w-full'}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 safe-pt">
        <div>
          <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Welcome, First Last</h2>
          <h1 className="text-xl font-bold">NEXUS WM</h1>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
            {viewMode === 'mobile' ? <Monitor size={18}/> : <Smartphone size={18}/>}
          </button>
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-amber-500/20">
            <User size={20} className="text-amber-200" />
          </div>
        </div>
      </div>

      <main className="pb-28 px-6 no-scrollbar h-[calc(100vh-100px)] overflow-y-auto">
        {activeTab === 'Home' && <HomeView currency={currency} setCurrency={setCurrency} isHidden={isHidden} setIsHidden={setIsHidden} />}
        {activeTab === 'Portfolio' && <PortfolioView isHidden={isHidden} holdings={holdings} onAdd={() => setIsDrawerOpen(true)} />}
        {activeTab === 'Market' && <MarketView />}
        {activeTab === 'Settings' && <SettingsView />}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 safe-pb flex justify-around py-4 z-40">
        <TabItem icon={<HomeIcon />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
        <TabItem icon={<Briefcase />} label="Portfolio" active={activeTab === 'Portfolio'} onClick={() => setActiveTab('Portfolio')} />
        <TabItem icon={<BarChart2 />} label="Market" active={activeTab === 'Market'} onClick={() => setActiveTab('Market')} />
        <TabItem icon={<SettingsIcon />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
      </nav>

      <AddInvestmentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSave} />
    </div>
  );
}

// --- SUB-VIEWS ---

function HomeView({ currency, setCurrency, isHidden, setIsHidden }) {
  return (
    <div className="space-y-8">
      <header>
        <h3 className="text-2xl font-bold leading-tight italic">A single view of your cross-border wealth.</h3>
        <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-tighter">Live Ready • {format(new Date(), 'dd-MMM-yy')}</p>
      </header>

      <div className="flex gap-2">
        {['USD', 'INR', 'AED'].map(c => (
          <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-2 rounded-2xl text-[10px] font-bold ${currency === c ? 'bg-amber-200 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
            {c === 'AED' ? DIGITAL_AED : c}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 p-7 rounded-[40px] border border-zinc-800/50">
        <div className="flex justify-between items-center opacity-40 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest">Total Net Worth</span>
          <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
        <div className="text-4xl font-bold tracking-tight">{isHidden ? '••••••••' : `$ 0.00`}</div>
      </div>
    </div>
  );
}

function PortfolioView({ isHidden, holdings, onAdd }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="text-2xl font-bold">Investments</h1>
        <div className="flex gap-2">
          <button className="bg-zinc-900 p-3 rounded-full text-zinc-500"><RefreshCcw size={20}/></button>
          <button onClick={onAdd} className="bg-amber-200 text-black p-3 rounded-full"><Plus size={24}/></button>
        </div>
      </div>
      
      <div className="space-y-3">
        {holdings.map((h, i) => (
          <div key={i} className="p-6 bg-zinc-900/40 rounded-[32px] border border-zinc-800/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">{h.category}</p>
                <h3 className="text-lg font-bold">{h.bankName}</h3>
              </div>
              <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${h.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                {h.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4">
              <DataPoint label="Current Value" value={isHidden ? '••••' : h.currentValue} />
              <DataPoint label="Post-Tax Maturity" value={isHidden ? '••••' : h.postTaxMaturity} />
              <DataPoint label="CAGR / Return" value={`${h.cagr}%`} />
              <DataPoint label="Remaining" value={`${h.daysRemaining} Days`} />
            </div>

            <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-200" style={{ width: `${h.pctComplete}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SHARED UI COMPONENTS ---

function DataPoint({ label, value }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-500 font-bold uppercase">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function AddInvestmentDrawer({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    category: 'Fixed Deposit', bankName: '', principal: '', rate: '', 
    startDate: '', endDate: '', invType: 'Resident', taxSlab: '30%', 
    interestType: 'Reinvestment', compounding: 'Quarterly', accountType: 'Cash'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 rounded-t-[40px] z-50 max-w-md mx-auto h-[90vh] overflow-y-auto no-scrollbar p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold italic">Add Investment</h2>
              <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X size={20}/></button>
            </div>

            <div className="space-y-5 pb-10">
              <Select label="Category" options={['Fixed Deposit', 'Cash Account']} value={formData.category} onChange={v => setFormData({...formData, category: v})} />
              <Input label="Label / Bank Name" value={formData.bankName} onChange={v => setFormData({...formData, bankName: v})} />
              
              <div className="grid grid-cols-2 gap-4">
                <Input label="Principal" type="number" value={formData.principal} onChange={v => setFormData({...formData, principal: v})} />
                <Input label="Interest Rate %" type="number" value={formData.rate} onChange={v => setFormData({...formData, rate: v})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Date" type="date" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
                <Input label="End Date" type="date" value={formData.endDate} onChange={v => setFormData({...formData, endDate: v})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Tax Residency" options={['Resident', 'NRI']} value={formData.invType} onChange={v => setFormData({...formData, invType: v, taxSlab: v === 'NRI' ? '0%' : '30%'})} />
                <Select label="Tax Slab" options={['0%', '5%', '10%', '15%', '20%', '25%', '30%']} value={formData.taxSlab} disabled={formData.invType === 'NRI'} onChange={v => setFormData({...formData, taxSlab: v})} />
              </div>

              <Select label="Compounding Frequency" options={['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']} value={formData.compounding} onChange={v => setFormData({...formData, compounding: v})} />
              
              <button onClick={() => onSave(formData)} className="w-full mt-4 py-5 bg-amber-200 text-black font-bold rounded-[32px] text-lg">Save & Calculate</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Custom Form Components
function Input({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-zinc-500 font-bold uppercase ml-3">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-bold focus:border-amber-500/50 outline-none" />
    </div>
  );
}

function Select({ label, options, value, onChange, disabled }) {
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
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-amber-200' : 'text-zinc-600'}`}>
      {React.cloneElement(icon, { size: 22 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function MarketView() { return <div className="p-10 text-center text-zinc-600">Market Indices Coming Soon</div> }
function SettingsView() { return <div className="p-10 text-center text-zinc-600 italic">Build Version {VERSION}</div> }
