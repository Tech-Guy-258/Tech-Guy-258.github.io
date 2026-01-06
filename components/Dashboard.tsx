
import React, { useMemo, useState } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, AuditLogEntry, Expense, PaymentMethod, Appointment, Category, Unit, Customer, AppointmentStatus } from '../types';
import { CURRENCY_SYMBOLS, generateID } from '../constants';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';
import { 
  AlertTriangle, Package, Calendar, TrendingUp, Wallet, ShoppingBag, 
  Clock, X, Receipt, Activity, Smartphone, CreditCard, User, 
  Briefcase, AlertOctagon, CheckCircle, Award, Plus, UserPlus, 
  ArrowUpRight, ArrowDownRight, Search, ArrowDownCircle, Users, Percent, Ticket, AlertCircle, Lock, ArrowRight, ShieldCheck, Trash2
} from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  sales?: SaleRecord[];
  logs?: AuditLogEntry[];
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  onRestock?: (itemId: string, qty: number) => void;
  onCloseRegister?: () => void;
  activeBusinessName?: string;
  currentOperator?: string;
  expenses?: Expense[]; 
  appointments?: Appointment[];
  customers?: Customer[];
  onSaveExpense?: (expense: Expense) => void; 
  onPayExpense?: (expenseId: string, method: PaymentMethod) => void;
  onDeleteExpense?: (id: string) => void;
  onUpdateAppointmentStatus?: (id: string, status: AppointmentStatus) => void;
  onCompleteAppointment?: (appointmentId: string, method: PaymentMethod) => void;
  onSaveAppointment?: (appt: Appointment) => void;
  onAddCustomer?: (name: string, phone: string) => any;
}

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#22C55E'];

const Dashboard: React.FC<DashboardProps> = ({ 
  items, sales = [], logs = [], currency, exchangeRates, onCloseRegister, 
  activeBusinessName = "Negócio", currentOperator = "Operador", expenses = [], 
  appointments = [], customers = [], onSaveExpense, onPayExpense,
  onUpdateAppointmentStatus, onCompleteAppointment, onSaveAppointment, onAddCustomer
}) => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = Number(exchangeRates[currency] || 1);

  // States
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showApptForm, setShowApptForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showApptPaymentModal, setShowApptPaymentModal] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);
  
  // Detail Modal States
  const [detailedSale, setDetailedSale] = useState<SaleRecord | null>(null);
  const [detailedExpense, setDetailedExpense] = useState<Expense | null>(null);
  const [detailedLog, setDetailedLog] = useState<AuditLogEntry | null>(null);

  const [rightPanelTab, setRightPanelTab] = useState<'sales' | 'outflows' | 'audit'>('sales');
  const [selectedProductsForChart, setSelectedProductsForChart] = useState<string[]>([]);

  const [expenseFormData, setExpenseFormData] = useState({
    name: '', amount: '', type: 'variable' as 'fixed' | 'variable', paymentDay: '1'
  });

  const [apptFormData, setApptFormData] = useState({
    customerId: '', serviceIds: [] as string[], date: new Date().toISOString().split('T')[0], time: '09:00', 
    duration: 60, notes: '', isNewCustomer: false, newName: '', newPhone: ''
  });
  
  const [confirmOverlap, setConfirmOverlap] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('pt-PT'),
      time: d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      full: `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    };
  };

  const stats = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    
    const todaysSales = safeSales.filter(s => s.date && s.date.startsWith(todayStr));
    const dailyRevenueValue = todaysSales.reduce((acc, s) => acc + (s.totalRevenue || 0), 0);
    const dailyRevenue: number = Number(dailyRevenueValue) * Number(rate);
    
    const dailyProfitValue = todaysSales.reduce((acc, s) => acc + (s.totalProfit || 0), 0);
    const dailyProfitRaw: number = Number(dailyProfitValue) * Number(rate);
    
    const todaysPaidExpenses = safeExpenses.filter(e => e.lastPaidDate?.startsWith(todayStr));
    const dailyOutflowsValue = todaysPaidExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const dailyOutflows: number = Number(dailyOutflowsValue) * Number(rate);

    const dailyNetBalance: number = Number(dailyRevenue) - Number(dailyOutflows);
    // Fix: Cast dailyProfitRaw and dailyRevenue to Number explicitly to resolve arithmetic type error
    const dailyProfitPercent = Number(dailyRevenue) > 0 ? (Number(dailyProfitRaw) / Number(dailyRevenue)) * 100 : 0;
    const salesCount = new Set(todaysSales.map(s => s.transactionId)).size;
    const avgTicket = salesCount > 0 ? dailyRevenue / salesCount : 0;

    const productsInSales = Array.from(new Set(todaysSales.map(s => s.itemName))).sort();
    const hours = Array.from({ length: 14 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
    
    const hourlyFlowData = hours.map(h => {
        const hourInt = parseInt(h.split(':')[0]);
        const data: any = { time: h };
        productsInSales.forEach(p => {
            const productRevenue = todaysSales
                .filter(s => new Date(s.date).getHours() === hourInt && s.itemName === p)
                .reduce((acc, s) => acc + Number(s.totalRevenue || 0), 0) * Number(rate || 1);
            data[p] = Math.round(productRevenue);
        });
        data.total = productsInSales.reduce((acc, p) => acc + (data[p] || 0), 0);
        return data;
    });

    const topSalesData = Object.entries(todaysSales.reduce((acc, s) => {
        acc[s.itemName] = (acc[s.itemName] || 0) + s.quantity;
        return acc;
    }, {} as Record<string, number>))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topClientsData = Array.from(todaysSales.reduce((acc, s) => {
        const cId = s.customerId || 'Final';
        if (!acc.has(cId)) acc.set(cId, { name: s.customerName || 'Consumidor Final', value: 0 });
        acc.get(cId).value += s.totalRevenue * rate;
        return acc;
    }, new Map()).values()).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

    return { 
      dailyRevenue, dailyOutflows, dailyNetBalance, dailyProfitPercent, 
      avgTicket, salesCount, topSalesData, topClientsData, productsInSales, hourlyFlowData, todaysPaidExpenses,
      clientOfTheDay: topClientsData[0], todaysSales
    };
  }, [sales, expenses, rate, todayStr]);

  const expenseStats = useMemo(() => {
     const safeExpenses = Array.isArray(expenses) ? expenses : [];
     const list = safeExpenses
        .filter(e => {
            const wasPaidToday = e.lastPaidDate?.startsWith(todayStr);
            if (e.type === 'variable') return !e.isPaid || wasPaidToday;
            return true; 
        })
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
     
     const displayExpenses = list.map(exp => {
           const wasPaidToday = exp.lastPaidDate?.startsWith(todayStr);
           let statusColor = ''; let statusLabel = '';
           if (wasPaidToday) { statusColor = 'text-emerald-500 bg-emerald-50'; statusLabel = 'Liquidado Hoje'; }
           else {
              const daysLeft = Math.ceil((new Date(exp.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft < 0) { statusColor = 'text-red-500 bg-red-50'; statusLabel = `Atrasado ${Math.abs(daysLeft)}d`; }
              else if (daysLeft === 0) { statusColor = 'text-orange-600 bg-orange-50'; statusLabel = `Hoje`; }
              else if (daysLeft <= 3) { statusColor = 'text-amber-600 bg-amber-50'; statusLabel = `Vence em ${daysLeft}d`; }
              else { statusColor = 'text-slate-400 bg-slate-50'; statusLabel = new Date(exp.nextDueDate).toLocaleDateString('pt-PT'); }
           }
           return { ...exp, statusColor, statusLabel, wasPaidToday };
        });
     return { list: displayExpenses, pendingCount: displayExpenses.filter(e => !e.wasPaidToday).length };
  }, [expenses, todayStr]);

  const todaysAppointmentsList = useMemo(() => {
    return (appointments || [])
      .filter(a => a.date === todayStr && a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  const services = useMemo(() => items.filter(i => i.type === 'service'), [items]);
  const filteredCustomers = useMemo(() => {
     if (!customerSearch) return [];
     const lower = customerSearch.toLowerCase();
     return (customers || []).filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower));
  }, [customers, customerSearch]);

  const scheduleSlots = useMemo(() => {
    const slots = [];
    const dayAppts = (appointments || []).filter(a => a.date === apptFormData.date && a.status !== 'cancelled' && a.status !== 'completed');
    for (let h = 8; h < 21; h++) {
        [0, 30].forEach(m => {
            const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const appt = dayAppts.find(a => a.time === t);
            slots.push({ time: t, isBusy: !!appt, customerName: appt?.customerName });
        });
    }
    return slots;
  }, [appointments, apptFormData.date]);

  const isTimeOverlapping = useMemo(() => {
    if (!appointments) return false;
    const [h, m] = apptFormData.time.split(':').map(Number);
    const newStartMin = h * 60 + m;
    const newEndMin = newStartMin + apptFormData.duration;
    return appointments.some(a => {
        if (a.date !== apptFormData.date || a.status === 'cancelled' || a.status === 'completed') return false;
        const [ah, am] = a.time.split(':').map(Number);
        const aStartMin = ah * 60 + am;
        const aDur = a.notes?.includes('dur:') ? parseInt(a.notes.split('dur:')[1]) : 60;
        return (newStartMin < aStartMin + aDur && newEndMin > aStartMin);
    });
  }, [appointments, apptFormData.date, apptFormData.time, apptFormData.duration]);

  // Handlers
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseFormData.amount);
    if (!expenseFormData.name || isNaN(amount)) return;
    
    const today = new Date();
    let nextDueDate = today.toISOString();
    if (expenseFormData.type === 'fixed') {
      const day = parseInt(expenseFormData.paymentDay);
      const targetDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (today.getDate() > day) targetDate.setMonth(targetDate.getMonth() + 1);
      nextDueDate = targetDate.toISOString();
    }

    onSaveExpense?.({
      id: generateID(),
      name: expenseFormData.name,
      amount: amount,
      type: expenseFormData.type,
      paymentDay: expenseFormData.type === 'fixed' ? parseInt(expenseFormData.paymentDay) : undefined,
      nextDueDate,
      isPaid: false
    });
    
    setShowExpenseForm(false);
    setExpenseFormData({ name: '', amount: '', type: 'variable', paymentDay: '1' });
  };

  const handleApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apptFormData.serviceIds.length === 0 || (isTimeOverlapping && !confirmOverlap)) return;
    
    let target: any = null;
    if (apptFormData.isNewCustomer) {
       target = onAddCustomer?.(apptFormData.newName, apptFormData.newPhone);
    } else {
       target = (customers || []).find(c => c.id === apptFormData.customerId);
    }
    
    if (!target) return;
    
    const selectedSrvs = items.filter(i => apptFormData.serviceIds.includes(i.id));
    onSaveAppointment?.({
      id: generateID(), customerId: target.id, customerName: target.name, customerPhone: target.phone,
      serviceIds: apptFormData.serviceIds, serviceNames: selectedSrvs.map(s => s.name),
      totalAmount: selectedSrvs.reduce((acc, s) => acc + (s.sellingPrice || s.price), 0),
      date: apptFormData.date, time: apptFormData.time, status: 'scheduled',
      notes: `${apptFormData.notes} | dur:${apptFormData.duration}`,
      createdBy: currentOperator || 'Admin', createdAt: new Date().toISOString()
    });
    
    setShowApptForm(false);
    setApptFormData({ customerId: '', serviceIds: [], date: todayStr, time: '09:00', duration: 60, notes: '', isNewCustomer: false, newName: '', newPhone: '' });
    setCustomerSearch('');
  };

  const toggleProductInChart = (prod: string) => {
    setSelectedProductsForChart(prev => prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]);
  };

  const getMethodIcon = (method: string) => {
    switch(method) {
      case 'mpesa': return <Smartphone size={14} className="text-red-500" />;
      case 'emola': return <Smartphone size={14} className="text-indigo-500" />;
      case 'card': return <CreditCard size={14} className="text-blue-500" />;
      default: return <Wallet size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 relative pb-24 md:pb-8 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Painel de Controlo</h2>
          <p className="text-slate-500 mt-1 flex items-center font-medium">
            <Activity size={14} className="mr-2 text-emerald-500" /> 
            {activeBusinessName} • Auditoria Inteligente
          </p>
        </div>
        {onCloseRegister && (
          <button onClick={() => onCloseRegister()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center active:scale-95">
             <Lock size={18} className="mr-2" /> Fechar Turno
          </button>
        )}
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Receita Bruta', val: `${symbol} ${stats.dailyRevenue.toFixed(0)}`, icon: ArrowUpRight, color: 'emerald' },
          { label: 'Saídas Pagas', val: `${symbol} ${stats.dailyOutflows.toFixed(0)}`, icon: ArrowDownRight, color: 'red' },
          { label: 'Balanço Líquido', val: `${symbol} ${stats.dailyNetBalance.toFixed(0)}`, icon: TrendingUp, color: 'indigo' },
          { label: 'Artigos Ativos', val: items.length, icon: Package, color: 'orange' }
        ].map((k, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 bg-${k.color}-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform opacity-50`}></div>
            <div className="relative">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`text-3xl font-black font-heading ${k.color === 'indigo' && stats.dailyNetBalance < 0 ? 'text-red-500' : 'text-slate-900'}`}>{k.val}</p>
              <div className={`mt-4 flex items-center text-[10px] font-bold text-${k.color}-600 bg-${k.color}-50 w-fit px-2 py-1 rounded-lg`}>
                 <k.icon size={12} className="mr-1" /> Hoje
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operations Grid: Accounts & Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contas Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Receipt size={18} className="text-slate-400 mr-2" /> Contas a Pagar
                  </h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Gestão de Passivo</span>
                </div>
                <button onClick={() => setShowExpenseForm(true)} className="bg-slate-100 hover:bg-slate-900 hover:text-white p-2.5 rounded-2xl transition-all shadow-sm">
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {expenseStats.list.length > 0 ? expenseStats.list.map(exp => (
                  <button 
                    key={exp.id} 
                    disabled={exp.wasPaidToday}
                    onClick={() => { setSelectedExpense(exp); setShowPaymentSelector(true); }} 
                    className={`w-full text-left group border border-slate-50 rounded-2xl p-4 transition-all flex justify-between items-center ${exp.wasPaidToday ? 'bg-emerald-50/50 cursor-default opacity-80' : 'bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${exp.wasPaidToday ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-500'}`}>
                         {exp.wasPaidToday ? <CheckCircle size={18}/> : <Clock size={18}/>}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{exp.name}</div>
                        <div className={`text-[9px] font-black uppercase mt-1 px-2 py-0.5 rounded-full w-fit ${exp.statusColor}`}>{exp.statusLabel}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="font-black text-slate-900 text-base">{symbol}{exp.amount.toFixed(0)}</div>
                    </div>
                  </button>
                )) : <div className="flex flex-col items-center justify-center py-16 opacity-30"><CheckCircle size={40} /><p className="text-[10px] font-black mt-2 uppercase text-slate-400">Tudo liquidado</p></div>}
              </div>
          </div>
        </div>

        {/* Agendamentos Card - Sincronizado TOTAL com AppointmentsPage */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Calendar size={18} className="text-indigo-400 mr-2" /> Agendamentos
                    </h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Fila de Hoje ({todaysAppointmentsList.length})</span>
                </div>
                <button onClick={() => setShowApptForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase flex items-center shadow-lg active:scale-95 transition-all">
                  <Plus size={14} className="mr-1.5" /> Novo
                </button>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {todaysAppointmentsList.length > 0 ? todaysAppointmentsList.map(appt => (
                  <div key={appt.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-200 group">
                    <div className="flex items-start gap-4">
                       {/* Bloco de Hora lateral roxo igual à página operacional */}
                       <div className="bg-indigo-50 text-indigo-700 font-bold px-3 py-2 rounded-xl text-center min-w-[70px] border border-indigo-100 shrink-0">
                          <span className="block text-lg">{appt.time}</span>
                       </div>
                       <div className="overflow-hidden">
                          <h4 className="font-bold text-slate-800 text-base leading-none mb-1 truncate">{appt.customerName}</h4>
                          <p className="text-xs text-slate-400 font-bold flex items-center truncate uppercase tracking-tighter">
                             <Briefcase size={10} className="mr-1.5 opacity-50"/> {appt.serviceNames?.join(', ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                             <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase ${appt.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{appt.status}</span>
                             <span className="text-[9px] font-black text-slate-300">MT {appt.totalAmount?.toFixed(0)}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => { onUpdateAppointmentStatus?.(appt.id, 'confirmed'); if(appt.customerPhone) window.open(`https://wa.me/258${appt.customerPhone.replace(/\s/g,'')}?text=Confirmo o seu agendamento para hoje às ${appt.time}!`, '_blank'); }} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"><CheckCircle size={18}/></button>
                        <button onClick={() => { setAppointmentToComplete(appt); setShowApptPaymentModal(true); }} className="p-1.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors"><Receipt size={18}/></button>
                    </div>
                  </div>
                )) : <div className="flex flex-col items-center justify-center py-16 opacity-30"><Clock size={40} /><p className="text-[10px] font-black mt-2 uppercase text-slate-400">Vazio para hoje</p></div>}
              </div>
          </div>
        </div>
      </div>

      {/* Analytics: Billing Flow & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dynamic Billing Flow Chart */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 lg:col-span-2 min-h-[480px] flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
             <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center font-heading tracking-tight"><TrendingUp className="mr-2 text-emerald-500" size={24} />Fluxo de Faturação</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparativo de desempenho por produto</p>
             </div>
             <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSelectedProductsForChart([])}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${selectedProductsForChart.length === 0 ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
                >Global</button>
                {stats.productsInSales.map((p, i) => (
                  <button 
                    key={p}
                    onClick={() => toggleProductInChart(p)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${selectedProductsForChart.includes(p) ? 'border-slate-800 bg-white text-slate-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                    style={selectedProductsForChart.includes(p) ? { borderColor: CHART_COLORS[i % CHART_COLORS.length], color: CHART_COLORS[i % CHART_COLORS.length] } : {}}
                  >{p}</button>
                ))}
             </div>
          </div>

          <div className="flex-1 w-full h-[320px]">
            {stats.dailyRevenue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.hourlyFlowData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/><stop offset="95%" stopColor="#1e293b" stopOpacity={0}/></linearGradient>
                    {stats.productsInSales.map((p, i) => (
                      <linearGradient key={`grad-${p}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.15}/><stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fontBold: 700, fill: '#94a3b8'}} dy={10} />
                  <YAxis hide />
                  <Tooltip cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px'}} />
                  {selectedProductsForChart.length === 0 ? (
                      <Area name="Total Bruto" type="monotone" dataKey="total" stroke="#1e293b" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" animationDuration={1200} />
                  ) : (
                      selectedProductsForChart.map((p) => {
                          const idx = stats.productsInSales.indexOf(p);
                          return <Area key={p} name={p} type="monotone" dataKey={p} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={3} fillOpacity={1} fill={`url(#grad-${idx})`} animationDuration={800} />
                      })
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold border-2 border-dashed border-slate-50 rounded-[2rem]"><Activity size={48} className="mb-3 opacity-20" /><p className="uppercase tracking-widest text-xs">Aguardando dados</p></div>}
          </div>
        </div>

        {/* Premium Performance Card (Ranking & Highlight) */}
        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white min-h-[480px] flex flex-col">
           <div className="mb-8">
              <h3 className="text-xl font-black font-heading tracking-tight flex items-center">
                 <Award className="mr-2 text-amber-400" size={24} /> Performance
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Destaques do Dia</p>
           </div>
           
           <div className="flex-1 space-y-6">
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Top Vendidos</p>
                 {stats.topSalesData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-slate-600">0{idx+1}</span>
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</span>
                       </div>
                       <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-black text-xs">{item.value} un</span>
                    </div>
                 ))}
                 {stats.topSalesData.length === 0 && <p className="text-xs text-slate-600 italic">Sem dados</p>}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Cliente Premium</p>
                 {stats.clientOfTheDay ? (
                    <div className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] border border-white/5 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-amber-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                             <Users size={24} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-white">{stats.clientOfTheDay.name}</p>
                             <p className="text-lg font-black text-amber-400 mt-0.5">{symbol}{stats.clientOfTheDay.value.toFixed(0)}</p>
                          </div>
                       </div>
                    </div>
                 ) : <div className="text-center py-8 text-slate-600 font-bold uppercase text-[10px] tracking-widest">A aguardar vendas</div>}
              </div>
           </div>
        </div>
      </div>

      {/* History Tabs Card */}
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col h-[480px]">
          <div className="flex items-center space-x-1 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
             <button onClick={() => setRightPanelTab('sales')} className={`px-6 py-2.5 text-[10px] font-black uppercase transition-all rounded-xl ${rightPanelTab === 'sales' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Faturação</button>
             <button onClick={() => setRightPanelTab('outflows')} className={`px-6 py-2.5 text-[10px] font-black uppercase transition-all rounded-xl ${rightPanelTab === 'outflows' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-red-500'}`}>Saídas</button>
             <button onClick={() => setRightPanelTab('audit')} className={`px-6 py-2.5 text-[10px] font-black uppercase transition-all rounded-xl ${rightPanelTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-indigo-500'}`}>Auditoria</button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {rightPanelTab === 'sales' && stats.todaysSales.map((tx) => (
              <div key={tx.id} onClick={() => setDetailedSale(tx)} className="flex justify-between items-center p-4 rounded-2xl border border-slate-50 hover:border-emerald-200 transition-colors cursor-pointer group bg-slate-50/30 hover:bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-all"><ArrowUpRight size={18} /></div>
                  <div><p className="font-bold text-slate-800 text-xs line-clamp-1">{tx.itemName}</p><div className="flex items-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">{getMethodIcon(tx.paymentMethod)} <span className="ml-1.5">{tx.paymentMethod}</span></div></div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-sm">{symbol}{(tx.totalRevenue * rate).toFixed(0)}</p>
                  <p className="text-[8px] text-slate-300 font-bold uppercase">Ver Detalhes</p>
                </div>
              </div>
            ))}
            
            {rightPanelTab === 'outflows' && stats.todaysPaidExpenses.map((expense) => (
              <div key={expense.id} onClick={() => setDetailedExpense(expense)} className="flex justify-between items-center p-4 rounded-2xl border border-slate-50 hover:border-red-200 transition-colors cursor-pointer bg-slate-50/30 hover:bg-white group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 transition-all group-hover:bg-red-100"><ArrowDownCircle size={18} /></div>
                  <div><p className="font-bold text-slate-800 text-xs line-clamp-1">{expense.name}</p><div className="flex items-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">{getMethodIcon(expense.paymentMethod || 'cash')} <span className="ml-1.5">{expense.paymentMethod || 'cash'}</span></div></div>
                </div>
                <div className="text-right">
                  <p className="font-black text-red-600 text-sm">{symbol}{(expense.amount * rate).toFixed(0)}</p>
                  <p className="text-[8px] text-slate-300 font-bold uppercase">Ver Detalhes</p>
                </div>
              </div>
            ))}

            {rightPanelTab === 'audit' && logs.slice(0, 30).map((log) => (
              <div key={log.id} onClick={() => setDetailedLog(log)} className="p-4 rounded-2xl bg-slate-50/30 border border-slate-100 text-[10px] group hover:bg-white hover:border-indigo-200 transition-all cursor-pointer">
                 <div className="flex justify-between mb-1.5">
                    <span className={`font-black uppercase tracking-widest ${log.action === 'SALE' ? 'text-emerald-500' : log.action === 'EXPENSE' ? 'text-red-500' : 'text-indigo-500'}`}>{log.action}</span>
                    <span className="text-slate-400 font-bold">{formatDateTime(log.timestamp).time}</span>
                 </div>
                 <p className="text-slate-600 font-semibold leading-tight line-clamp-1">{log.details}</p>
                 <div className="mt-2 text-[8px] text-slate-400 uppercase font-black opacity-50 flex justify-between items-center">
                    <span>Op: {log.operatorName}</span>
                    <span className="group-hover:text-indigo-500">Detalhes →</span>
                 </div>
              </div>
            ))}
          </div>
      </div>

      {/* --- DETAIL MODALS (RECIBOS/VOUCHERS COM DATA E HORA COMPLETA) --- */}
      
      {/* Detalhe de Venda (Recibo Digital com DATA E HORA) */}
      {detailedSale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] border-4 border-emerald-500/20">
            <div className="p-8 text-center bg-slate-50 border-b border-dashed border-slate-200 relative">
               <div className="absolute -left-3 -bottom-3 w-6 h-6 bg-slate-900/80 rounded-full"></div>
               <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-slate-900/80 rounded-full"></div>
               <Receipt className="mx-auto mb-4 text-emerald-600" size={48} />
               <h3 className="text-xl font-black font-heading text-slate-800">Recibo de Venda</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">ID: #{detailedSale.transactionId.slice(0, 12)}</p>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{detailedSale.quantity}x</div>
                       <div><p className="font-black text-slate-800 text-sm leading-tight">{detailedSale.itemName}</p><p className="text-[10px] font-bold text-slate-400">{detailedSale.itemSize}{detailedSale.itemUnit}</p></div>
                    </div>
                    <p className="font-black text-slate-900 text-lg">{symbol}{(detailedSale.totalRevenue * rate).toFixed(0)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Data e Hora</p>
                          <div className="flex items-center gap-2 font-black text-slate-700 text-xs">
                             <Clock size={12} className="text-emerald-500"/> {formatDateTime(detailedSale.date).full}
                          </div>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pagamento</p>
                          <div className="flex items-center gap-2 font-black text-slate-700 text-xs uppercase">
                             {getMethodIcon(detailedSale.paymentMethod)} {detailedSale.paymentMethod}
                          </div>
                       </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center justify-between">
                     <div><p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">Operador Responsável</p><p className="font-black text-slate-800 text-xs">{detailedSale.operatorName}</p></div>
                     <ShieldCheck className="text-emerald-500" size={24} />
                  </div>
               </div>
               <button onClick={() => setDetailedSale(null)} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all uppercase tracking-widest text-xs">Fechar Recibo</button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe de Despesa (Voucher de Saída com DATA E HORA COMPLETA) */}
      {detailedExpense && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] border-4 border-red-500/20">
            <div className="p-8 text-center bg-red-50 border-b border-dashed border-red-100">
               <AlertOctagon className="mx-auto mb-4 text-red-600" size={48} />
               <h3 className="text-xl font-black font-heading text-slate-800">Comprovativo de Saída</h3>
               <p className="text-[10px] font-black text-red-400 uppercase mt-1 tracking-widest">
                  Transação: {formatDateTime(detailedExpense.lastPaidDate!).full}
               </p>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Valor Retirado</p>
                    <p className="text-4xl font-black text-slate-900">{symbol} {(detailedExpense.amount * rate).toFixed(0)}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2"><span className="text-[10px] font-black text-slate-400 uppercase">Descrição</span><span className="font-bold text-slate-800 text-xs">{detailedExpense.name}</span></div>
                    <div className="flex justify-between items-center px-2"><span className="text-[10px] font-black text-slate-400 uppercase">Categoria</span><span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg font-black text-[10px] uppercase">{detailedExpense.type === 'fixed' ? 'Custo Fixo' : 'Custo Variável'}</span></div>
                    <div className="flex justify-between items-center px-2"><span className="text-[10px] font-black text-slate-400 uppercase">Meio Usado</span><span className="font-bold text-slate-800 text-xs flex items-center gap-1">{getMethodIcon(detailedExpense.paymentMethod || 'cash')} {detailedExpense.paymentMethod?.toUpperCase()}</span></div>
                    <div className="flex justify-between items-center px-2"><span className="text-[10px] font-black text-slate-400 uppercase">Autorizado por</span><span className="font-bold text-slate-800 text-xs">{detailedExpense.operatorName || 'Admin'}</span></div>
                  </div>
               </div>
               <button onClick={() => setDetailedExpense(null)} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all uppercase tracking-widest text-xs">Voltar</button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe de Log (Auditoria com DATA E HORA COMPLETA) */}
      {detailedLog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] border-4 border-indigo-500/20">
            <div className="p-8 text-center bg-indigo-50 border-b border-dashed border-indigo-100">
               <ShieldCheck className="mx-auto mb-4 text-indigo-600" size={48} />
               <h3 className="text-xl font-black font-heading text-slate-800">Registo de Auditoria</h3>
               <p className="text-[10px] font-black text-indigo-400 uppercase mt-1 tracking-widest">Segurança do Sistema</p>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                       <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase ${detailedLog.action === 'SALE' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{detailedLog.action}</span>
                       <span className="text-[10px] font-bold text-slate-400">{formatDateTime(detailedLog.timestamp).full}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{detailedLog.details}"</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Autor do Evento</p>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white"><User size={14}/></div>
                        <p className="font-black text-slate-800 text-xs">{detailedLog.operatorName}</p>
                     </div>
                  </div>
               </div>
               <button onClick={() => setDetailedLog(null)} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all uppercase tracking-widest text-xs">Concluir Verificação</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORM MODALS --- */}
      
      {/* Appointment Pay Modal */}
      {showApptPaymentModal && appointmentToComplete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-10 bg-indigo-600 text-white text-center">
                  <h3 className="font-black text-xl font-heading">Cobrança</h3>
                  <p className="text-indigo-100 text-[10px] mt-2 uppercase font-black tracking-widest">{appointmentToComplete.customerName}</p>
                  <p className="text-3xl font-black mt-6">{symbol} {appointmentToComplete.totalAmount?.toFixed(0)}</p>
               </div>
               <div className="p-8 grid grid-cols-2 gap-4 bg-slate-50">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => { onCompleteAppointment?.(appointmentToComplete.id, m as PaymentMethod); setShowApptPaymentModal(false); }} className="flex flex-col items-center p-6 bg-white hover:bg-emerald-50 rounded-[2rem] border border-white hover:border-emerald-200 transition-all shadow-sm active:scale-95 group">
                       <div className="group-hover:scale-125 transition-transform mb-3">{getMethodIcon(m)}</div>
                       <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowApptPaymentModal(false)} className="w-full py-6 text-slate-400 font-black text-xs uppercase bg-white border-t border-slate-50">Cancelar</button>
            </div>
        </div>
      )}

      {/* Expense Form Modal - Com campo de vencimento para Rendas */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                 <div className="flex items-center"><AlertOctagon size={24} className="mr-4 text-red-500" /><h3 className="font-black text-xl font-heading tracking-tight">Registar Saída</h3></div>
                 <button onClick={() => setShowExpenseForm(false)} className="hover:bg-slate-800 p-2.5 rounded-2xl transition-colors"><X size={24}/></button>
              </div>
              <form onSubmit={handleExpenseSubmit} className="p-10 space-y-6 bg-white">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Descrição</label>
                    <input required className="w-full p-5 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-inner font-bold text-sm outline-none" value={expenseFormData.name} onChange={e => setExpenseFormData({...expenseFormData, name: e.target.value})} placeholder="Ex: Renda Mensal" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Valor ({symbol})</label>
                       <input type="number" required className="w-full p-5 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-inner font-black text-lg outline-none" value={expenseFormData.amount} onChange={e => setExpenseFormData({...expenseFormData, amount: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Tipo</label>
                       <select className="w-full p-5 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-inner font-bold text-sm outline-none" value={expenseFormData.type} onChange={e => setExpenseFormData({...expenseFormData, type: e.target.value as any})}>
                          <option value="fixed">Mensal (Renda)</option>
                          <option value="variable">Pontual (Variável)</option>
                       </select>
                    </div>
                 </div>
                 {expenseFormData.type === 'fixed' && (
                    <div className="animate-[slideIn_0.2s]">
                       <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2.5 px-1 flex items-center"><Clock size={12} className="mr-1"/> Dia de Vencimento</label>
                       <input type="number" min="1" max="31" required className="w-full p-5 border-none rounded-2xl bg-emerald-50 text-emerald-900 shadow-inner font-black text-lg outline-none" value={expenseFormData.paymentDay} onChange={e => setExpenseFormData({...expenseFormData, paymentDay: e.target.value})} />
                       <p className="text-[9px] text-emerald-600/60 font-bold mt-2 px-1 uppercase tracking-tighter">O sistema alertará automaticamente na proximidade deste dia.</p>
                    </div>
                 )}
                 <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl hover:bg-black shadow-2xl transition-all uppercase tracking-widest text-xs">Adicionar ao Fluxo</button>
              </form>
           </div>
        </div>
      )}

      {/* Appointment Form Modal (Professional Sincronizado) */}
      {showApptForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col md:flex-row h-full md:h-auto max-h-[90vh]">
             <div className="w-full md:w-80 bg-slate-50 p-8 border-r border-slate-100 overflow-y-auto shrink-0">
                <h4 className="font-black text-slate-800 mb-6 flex items-center font-heading"><Clock size={20} className="mr-2 text-indigo-600"/> Horários</h4>
                <div className="space-y-2">
                   {scheduleSlots.map(slot => (
                      <button key={slot.time} type="button" onClick={() => { setApptFormData({...apptFormData, time: slot.time}); setConfirmOverlap(slot.isBusy); }} className={`w-full text-left p-3 rounded-2xl border transition-all flex justify-between items-center ${apptFormData.time === slot.time ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : slot.isBusy ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                         <span className="text-xs font-black">{slot.time}</span>
                         {slot.isBusy ? <span className="text-[10px] font-bold truncate max-w-[80px]">{slot.customerName}</span> : <span className="text-[9px] font-black opacity-40 uppercase">Livre</span>}
                      </button>
                   ))}
                </div>
             </div>
             <div className="flex-1 bg-white flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
                   <div className="flex items-center"><Calendar size={28} className="mr-4" /><h3 className="font-black text-xl font-heading">Novo Agendamento</h3></div>
                   <button onClick={() => setShowApptForm(false)} className="hover:bg-indigo-700 p-2 rounded-2xl"><X size={28}/></button>
                </div>
                <form onSubmit={handleApptSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                   {isTimeOverlapping && (
                      <div className="bg-red-50 border border-red-200 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
                         <AlertTriangle className="text-red-600" size={24} />
                         <div className="flex-1"><p className="text-xs font-black text-red-700 uppercase">Sobreposição!</p><label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={confirmOverlap} onChange={e => setConfirmOverlap(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300" /><span className="text-[10px] text-red-600 font-black uppercase">Ignorar conflito</span></label></div>
                      </div>
                   )}
                   <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cliente</span>
                         <button type="button" onClick={() => setApptFormData({...apptFormData, isNewCustomer: !apptFormData.isNewCustomer})} className="text-[10px] font-black text-indigo-600 flex items-center uppercase tracking-tighter">{apptFormData.isNewCustomer ? "Pesquisar Base" : <><UserPlus size={14} className="mr-1.5"/> Registar Novo</>}</button>
                      </div>
                      {apptFormData.isNewCustomer ? (
                         <div className="grid grid-cols-2 gap-4"><input placeholder="Nome" required className="p-5 border-none rounded-2xl bg-white text-sm shadow-sm outline-none font-bold" value={apptFormData.newName} onChange={e => setApptFormData({...apptFormData, newName: e.target.value})} /><input placeholder="Telemóvel" required className="p-5 border-none rounded-2xl bg-white text-sm shadow-sm outline-none font-bold" value={apptFormData.newPhone} onChange={e => setApptFormData({...apptFormData, newPhone: e.target.value})} /></div>
                      ) : (
                         <div className="relative">
                            <input type="text" placeholder="Procurar na base..." className="w-full p-5 pl-14 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 bg-white text-slate-900 shadow-sm text-sm font-bold outline-none" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} />
                            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                            {showCustomerDropdown && customerSearch && (
                               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-48 overflow-y-auto z-50 p-2">
                                  {filteredCustomers.map(c => (
                                     <button key={c.id} type="button" onClick={() => { setApptFormData({...apptFormData, customerId: c.id}); setCustomerSearch(c.name); setShowCustomerDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 text-sm rounded-2xl transition-all"><div className="font-bold text-slate-800">{c.name}</div><div className="text-[10px] text-slate-400 font-black mt-0.5">{c.phone}</div></button>
                                  ))}
                               </div>
                            )}
                         </div>
                      )}
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-2">Serviços Disponíveis</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                         {services.map(s => (
                            <button key={s.id} type="button" onClick={() => setApptFormData(prev => ({...prev, serviceIds: prev.serviceIds.includes(s.id) ? prev.serviceIds.filter(id => id !== s.id) : [...prev.serviceIds, s.id]}))} className={`p-4 rounded-3xl border-2 text-left text-xs font-black transition-all flex flex-col justify-between h-24 ${apptFormData.serviceIds.includes(s.id) ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-white text-slate-500 hover:border-indigo-100'}`}>
                               <span className="line-clamp-2 leading-tight">{s.name}</span>
                               <div className="flex justify-between items-center w-full mt-auto"><span className="opacity-50 text-[10px]">{symbol}{s.sellingPrice.toFixed(0)}</span>{apptFormData.serviceIds.includes(s.id) && <CheckCircle size={16} />}</div>
                            </button>
                         ))}
                      </div>
                   </div>
                   <button type="submit" disabled={isTimeOverlapping && !confirmOverlap} className={`w-full py-6 rounded-[2rem] font-black uppercase text-sm transition-all shadow-2xl ${isTimeOverlapping && !confirmOverlap ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}>Confirmar Agendamento</button>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal (Contas) */}
      {showPaymentSelector && selectedExpense && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-10 text-center border-b border-slate-50">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${selectedExpense.type === 'fixed' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'}`}>
                     <CreditCard size={40} />
                  </div>
                  <h3 className="font-black text-2xl text-slate-800 font-heading">Liquidar Despesa</h3>
                  <p className="text-slate-400 text-[10px] font-black mt-2 uppercase tracking-widest">{selectedExpense.name}</p>
                  <p className="text-4xl font-black text-slate-900 mt-6">{symbol} {selectedExpense.amount.toFixed(0)}</p>
               </div>
               <div className="p-10 grid grid-cols-2 gap-4 bg-slate-50">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => { onPayExpense?.(selectedExpense.id, m as PaymentMethod); setShowPaymentSelector(false); setSelectedExpense(null); }} className="flex flex-col items-center p-6 bg-white hover:bg-emerald-50 rounded-[2rem] border border-white hover:border-emerald-200 transition-all shadow-sm active:scale-95 group">
                       <div className="group-hover:scale-125 transition-transform mb-3">{getMethodIcon(m)}</div>
                       <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowPaymentSelector(false)} className="w-full py-6 text-slate-400 font-black text-xs uppercase bg-white">Voltar</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
