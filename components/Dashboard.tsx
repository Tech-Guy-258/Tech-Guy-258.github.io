import React, { useMemo, useState } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, AuditLogEntry, Expense, PaymentMethod, Customer, Supplier, Appointment, AppointmentStatus } from '../types';
import { CURRENCY_SYMBOLS, generateID } from '../constants';
import { useNavigate } from 'react-router-dom';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  AlertTriangle, TrendingUp, Wallet, ShoppingBag, 
  Clock, X, Receipt, CheckCircle, Award, Plus, ArrowDownCircle, PackagePlus, User, ArrowUpRight, ArrowDownRight, Users, BarChart3, Calculator, Phone, MessageCircle, Truck, Minus, ChevronDown, Calendar, ChevronRight, Smartphone, CalendarDays, Heart, Check
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
  customers?: Customer[];
  suppliers?: Supplier[];
  appointments?: Appointment[];
  onSaveExpense?: (expense: Expense) => void; 
  onPayExpense?: (expenseId: string, method: PaymentMethod, months?: number) => void;
  onDeleteExpense?: (id: string) => void;
  onUpdateAppointmentStatus?: (id: string, status: AppointmentStatus) => void;
  onCompleteAppointment?: (id: string, method: PaymentMethod) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  items, sales = [], logs = [], currency, exchangeRates, onCloseRegister, 
  activeBusinessName = "Negócio", currentOperator = "Operador", expenses = [], 
  customers = [], suppliers = [], appointments = [], onSaveExpense, onPayExpense, onDeleteExpense, onRestock,
  onUpdateAppointmentStatus, onCompleteAppointment
}) => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = Number(exchangeRates[currency] || 1);
  const navigate = useNavigate();

  // States
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({ 
    name: '', amount: 0, type: 'variable', isPaid: false, 
    nextDueDate: new Date().toISOString().split('T')[0], paymentDay: new Date().getDate()
  });
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseActionModal, setShowExpenseActionModal] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [monthsToPay, setMonthsToPay] = useState(1);
  const [showRestockModal, setShowRestockModal] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [contactingSupplier, setContactingSupplier] = useState<{item: InventoryItem, supplier: Supplier} | null>(null);
  const [viewingReceiptGroup, setViewingReceiptGroup] = useState<SaleRecord[] | null>(null);
  const [viewingLog, setViewingLog] = useState<AuditLogEntry | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'sales' | 'audit'>('sales');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'quantity'>('revenue');
  const [selectedChartItem, setSelectedChartItem] = useState<string>('all');
  
  // Appointment States
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showApptActions, setShowApptActions] = useState(false);
  const [agendaDay, setAgendaDay] = useState<'hoje' | 'amanha'>('hoje');
  const [paymentToConfirm, setPaymentToConfirm] = useState<{ id: string, method: PaymentMethod, type: 'appointment' | 'expense' } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('pt-PT'),
      time: d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      full: `${d.toLocaleDateString('pt-PT')} às ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    };
  };

  const lowStockItems = useMemo(() => items.filter(i => i.type === 'product' && i.quantity <= i.lowStockThreshold), [items]);

  const stats = useMemo(() => {
    const todaysSales = sales.filter(s => s.date && s.date.startsWith(todayStr));
    const dailyRevenue = (todaysSales.reduce((acc, s) => acc + (Number(s.totalRevenue) || 0), 0)) * rate;
    const dailyProfitRaw = (todaysSales.reduce((acc, s) => acc + (Number(s.totalProfit) || 0), 0)) * rate;
    
    const paymentMethods: Record<PaymentMethod, number> = { cash: 0, mpesa: 0, emola: 0, card: 0 };
    todaysSales.forEach(s => {
      paymentMethods[s.paymentMethod] = (paymentMethods[s.paymentMethod] || 0) + (Number(s.totalRevenue) * rate);
    });

    const dailyOutflows = (logs || [])
      .filter(l => l.action === 'EXPENSE' && l.timestamp.startsWith(todayStr))
      .reduce((acc, log) => {
          const match = log.details.match(/\((\d+)MT\)/);
          const amount = match ? parseInt(match[1]) : 0;
          return acc + amount;
      }, 0) * rate;

    const dailyNetBalance = dailyRevenue - dailyOutflows;
    const dailyProfitPercent = dailyRevenue > 0 ? (dailyProfitRaw / dailyRevenue) * 100 : 0;
    const salesCount = new Set(todaysSales.map(s => s.transactionId)).size;
    const avgTicket = salesCount > 0 ? dailyRevenue / salesCount : 0;

    const topSalesData = Object.entries(todaysSales.reduce((acc, s) => {
        acc[s.itemName] = (acc[s.itemName] || 0) + (s.quantity || 0);
        return acc;
    }, {} as Record<string, number>))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 3);

    const todayAppts = (appointments || [])
      .filter(a => a.date === todayStr && a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
    const tomorrowAppts = (appointments || [])
      .filter(a => a.date === tomorrowStr && a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
    
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const absentCustomers = (customers || []).filter(c => new Date(c.lastVisit) < thirtyDaysAgo).sort((a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()).slice(0, 5);

    const soldItemsList = Array.from(new Set(todaysSales.map(s => s.itemName))).sort();

    let startHour = 8, endHour = 19;
    if (todaysSales.length > 0) {
      const saleHours = todaysSales.map(s => new Date(s.date).getHours());
      startHour = Math.min(...saleHours);
      endHour = Math.max(...saleHours) + 1;
    }

    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => `${(startHour + i).toString().padStart(2, '0')}:00`);
    const hourlyFlowData = hours.map(h => {
        const hourInt = parseInt(h.split(':')[0]);
        const data: any = { time: h };
        const hourSales = todaysSales.filter(s => new Date(s.date).getHours() === hourInt);
        const filteredSales = selectedChartItem === 'all' ? hourSales : hourSales.filter(s => s.itemName === selectedChartItem);
        data.total = chartMetric === 'revenue' ? filteredSales.reduce((acc, s) => acc + (Number(s.totalRevenue) * rate), 0) : filteredSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
        return data;
    });

    const visibleExpenses = (expenses || []).filter(e => {
       if (e.isPaid) return true;
       const today = new Date();
       const nextDue = new Date(e.nextDueDate);
       const diffTime = nextDue.getTime() - today.getTime();
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       return diffDays <= 30;
    });

    const groupedSales = Object.values(
      todaysSales.reduce((acc, s) => {
        if (!acc[s.transactionId]) acc[s.transactionId] = [];
        acc[s.transactionId].push(s);
        return acc;
      }, {} as Record<string, SaleRecord[]>)
    ).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());

    return { 
      dailyRevenue, dailyOutflows, dailyNetBalance, dailyProfitPercent, 
      salesCount, topSalesData, hourlyFlowData, customersUnique: (customers || []).length,
      todaysSales, groupedSales, avgTicket, visibleExpenses, soldItemsList, todayAppts, tomorrowAppts, absentCustomers,
      paymentMethods
    };
  }, [sales, expenses, logs, rate, todayStr, chartMetric, selectedChartItem, appointments, tomorrowStr, customers]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.name || newExpense.amount <= 0) return;
    onSaveExpense?.({ ...newExpense, id: generateID() } as Expense);
    setShowExpenseForm(false);
    setNewExpense({ name: '', amount: 0, type: 'variable', isPaid: false, nextDueDate: new Date().toISOString().split('T')[0], paymentDay: new Date().getDate() });
  };

  const handleContactSupplier = (item: InventoryItem) => {
    const supplier = suppliers?.find(s => s.id === item.supplierId) || suppliers?.find(s => s.name === item.supplierName);
    if (supplier) setContactingSupplier({ item, supplier });
    else alert("Fornecedor não associado a este produto.");
  };

  const openWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '').startsWith('258') ? phone.replace(/\D/g, '') : `258${phone.replace(/\D/g, '')}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleRemarcar = (appt: Appointment) => {
    setShowApptActions(false);
    navigate('/appointments', { state: { reschedule: appt } }); 
  };

  const handleFinalConfirm = () => {
    if (!paymentToConfirm) return;
    if (paymentToConfirm.type === 'appointment') {
      onCompleteAppointment?.(paymentToConfirm.id, paymentToConfirm.method);
    } else if (paymentToConfirm.type === 'expense') {
      onPayExpense?.(paymentToConfirm.id, paymentToConfirm.method, monthsToPay);
      setMonthsToPay(1);
    }
    setPaymentToConfirm(null);
    setSelectedAppointment(null);
    setSelectedExpense(null);
  };

  const handleAuditClick = (log: AuditLogEntry) => {
    if (log.action === 'SALE') {
      const txIdMatch = log.details.match(/#([a-zA-Z0-9-]+)/);
      if (txIdMatch) {
        const txId = txIdMatch[1];
        const group = (sales || []).filter(s => s.transactionId.startsWith(txId) || txId.startsWith(s.transactionId.slice(0,6)));
        if (group.length > 0) {
          setViewingReceiptGroup(group);
          return;
        }
      }
    }
    setViewingLog(log);
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-10 pb-24 md:pb-10 max-w-[1600px] mx-auto animate-[fadeIn_0.4s_ease-out] bg-slate-50/30">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 font-heading tracking-tight">Consola Global</h2>
          <p className="text-slate-400 mt-2 flex items-center font-bold uppercase text-[9px] tracking-[0.2em]">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shrink-0" /> Operação ativa: <span className="ml-1 text-slate-600 truncate">{currentOperator}</span>
          </p>
        </div>
        <button onClick={() => onCloseRegister?.()} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center active:scale-95 text-xs uppercase tracking-widest">
          <Receipt size={18} className="mr-3 text-emerald-400" /> Fecho Turno PDF
        </button>
      </div>

      {/* Alertas Dinâmicos (Stock e AGENDA) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {lowStockItems.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-red-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg"><AlertTriangle size={24} /></div>
              <div><h4 className="text-xl font-black text-slate-800 font-heading">Reposição</h4><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{lowStockItems.length} urgentes</p></div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {lowStockItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 shrink-0 w-40 shadow-sm group hover:border-red-200 transition-all">
                  <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => setShowRestockModal(item)} className="flex-1 bg-emerald-50 py-2 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"><PackagePlus size={14} className="mx-auto" /></button>
                    <button onClick={() => handleContactSupplier(item)} className="flex-1 bg-blue-50 py-2 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><Truck size={14} className="mx-auto" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/60 backdrop-blur-md border border-emerald-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg"><Clock size={24} /></div>
                <div><h4 className="text-xl font-black text-slate-800 font-heading">Agenda</h4><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{agendaDay === 'hoje' ? stats.todayAppts.length : stats.tomorrowAppts.length} marcados</p></div>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setAgendaDay('hoje')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${agendaDay === 'hoje' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Hoje</button>
                 <button onClick={() => setAgendaDay('amanha')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${agendaDay === 'amanha' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Amanhã</button>
              </div>
            </div>
            <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
              {(agendaDay === 'hoje' ? stats.todayAppts : stats.tomorrowAppts).length > 0 ? (agendaDay === 'hoje' ? stats.todayAppts : stats.tomorrowAppts).map(a => (
                <div key={a.id} onClick={() => { setSelectedAppointment(a); setShowApptActions(true); }} className="bg-white px-5 py-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm cursor-pointer hover:border-emerald-300 transition-all group active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 w-12 py-1.5 rounded-xl text-center">{a.time}</span>
                    <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{a.customerName}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transform transition-all" />
                </div>
              )) : <div className="py-6 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Tudo livre</div>}
            </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-purple-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg"><Heart size={24} /></div>
              <div><h4 className="text-xl font-black text-slate-800 font-heading">Fidelização</h4><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Recuperar clientes</p></div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {stats.absentCustomers.map(c => (
                <div key={c.id} onClick={() => openWhatsApp(c.phone, `Olá ${c.name}, sentimos a sua falta na ${activeBusinessName}! Temos novidades para si.`)} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 shrink-0 w-44 shadow-sm cursor-pointer hover:border-purple-300 transition-all group">
                  <p className="text-xs font-black text-slate-800 truncate">{c.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Última: {new Date(c.lastVisit).toLocaleDateString()}</p>
                  <div className="mt-1 bg-purple-50 text-purple-600 py-1.5 rounded-lg text-[9px] font-black uppercase text-center flex items-center justify-center gap-1"><MessageCircle size={10}/> Notificar</div>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats.paymentMethods).map(([method, value]) => (
          <div key={method} className="bg-white/40 backdrop-blur-sm p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-slate-100 text-slate-500`}>
                {method === 'cash' ? <Wallet size={16} /> : method === 'card' ? <Receipt size={16} /> : <Smartphone size={16} />}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{method}</p>
            </div>
            <p className="text-sm font-black text-slate-700">{symbol} {value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* KPIs Tradicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><TrendingUp size={24}/></div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full">Faturação</span>
           </div>
           <p className="text-4xl font-black font-heading text-slate-900">{symbol} {stats.dailyRevenue.toLocaleString()}</p>
           <div className="flex items-center gap-1.5 mt-4"><ArrowUpRight size={12} className="text-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stats.salesCount} Vendas Hoje</span></div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]"><Award size={24}/></div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full">Líder</span>
           </div>
           <p className="text-xl font-black text-slate-800 truncate mb-1">{stats.topSalesData[0]?.name || "Nenhuma"}</p>
           <p className="text-3xl font-black text-indigo-600">{stats.topSalesData[0]?.value || 0} <span className="text-sm font-bold text-slate-300 tracking-normal font-sans">un</span></p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-red-50 text-red-600 rounded-[1.5rem]"><ArrowDownCircle size={24}/></div>
              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-full">Saídas Turno</span>
           </div>
           <p className="text-4xl font-black font-heading text-slate-900">{symbol} {stats.dailyOutflows.toLocaleString()}</p>
           <div className="flex items-center gap-1.5 mt-4"><ArrowDownRight size={12} className="text-red-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Turno Atual</span></div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl transition-all hover:bg-black">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-emerald-500 text-white rounded-[1.5rem] shadow-lg shadow-emerald-500/20"><Wallet size={24}/></div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Caixa Real</span>
           </div>
           <p className="text-4xl font-black font-heading text-white">{symbol} {stats.dailyNetBalance.toLocaleString()}</p>
           <div className="flex items-center gap-1.5 mt-4 text-emerald-400"><Calculator size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Saldo Líquido</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Margem Bruta', value: `${stats.dailyProfitPercent.toFixed(1)}%`, icon: BarChart3, color: 'text-indigo-500' },
          { label: 'Tkt Médio', value: `${symbol}${stats.avgTicket.toFixed(0)}`, icon: Receipt, color: 'text-emerald-500' },
          { label: 'Atendimentos', value: stats.todayAppts.length, icon: Calendar, color: 'text-blue-500' },
          { label: 'Clientes Reais', value: stats.customersUnique, icon: Users, color: 'text-purple-500' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0"><kpi.icon size={18} className={kpi.color} /></div>
            <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{kpi.label}</p><p className="text-lg font-black text-slate-800 truncate">{kpi.value}</p></div>
          </div>
        ))}
      </div>

      {/* Gráfico Dinâmico */}
      <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-sm border border-slate-50 h-[500px] flex flex-col">
        <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
           <div><h3 className="text-2xl font-black text-slate-900 font-heading">Performance do Dia</h3></div>
           <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button onClick={() => setChartMetric('revenue')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${chartMetric === 'revenue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Faturação</button>
                <button onClick={() => setChartMetric('quantity')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${chartMetric === 'quantity' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Volume</button>
              </div>
           </div>
        </div>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.hourlyFlowData}>
              <defs><linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '800', fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
              <Area type="monotone" dataKey="total" name={chartMetric === 'revenue' ? 'Valor' : 'Qtd'} stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorFlow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listas Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white rounded-[4rem] border border-slate-50 shadow-sm overflow-hidden flex flex-col h-[500px]">
           <div className="p-10 pb-4 flex justify-between items-center">
              <div><h3 className="text-2xl font-black text-slate-800 font-heading">Controlo de Saídas</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo de Caixa</p></div>
              <button onClick={() => setShowExpenseForm(true)} className="bg-red-500 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all hover:bg-red-600"><Plus size={24} /></button>
           </div>
           <div className="flex-1 overflow-y-auto px-10 space-y-3 custom-scrollbar pb-6">
              {(stats.visibleExpenses || []).length > 0 ? stats.visibleExpenses.map(exp => (
                <div key={exp.id} onClick={() => { setSelectedExpense(exp); setShowExpenseActionModal(true); }} className={`p-5 rounded-3xl border transition-all flex justify-between items-center cursor-pointer ${exp.isPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 hover:border-red-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${exp.isPaid ? 'bg-white text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>{exp.isPaid ? <CheckCircle size={18}/> : <Clock size={18}/>}</div>
                    <div><p className="font-black text-slate-800 text-sm">{exp.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{exp.isPaid ? 'PAGO' : `Vence: ${formatDateTime(exp.nextDueDate).date}`}</p></div>
                  </div>
                  <div className="text-right"><p className="font-black text-slate-900 text-base">{symbol}{exp.amount.toLocaleString()}</p></div>
                </div>
              )) : <div className="text-center py-20 opacity-20"><Receipt size={60} className="mx-auto" /></div>}
           </div>
        </div>

        <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-50 flex flex-col h-[500px]">
           <div className="flex items-center space-x-3 mb-6 bg-slate-100 p-1.5 rounded-[2rem] w-fit mx-auto">
             <button onClick={() => setRightPanelTab('sales')} className={`px-8 py-2.5 text-[10px] font-black uppercase transition-all rounded-[1.8rem] ${rightPanelTab === 'sales' ? 'bg-white text-slate-800 shadow-lg' : 'text-slate-400'}`}>Vendas</button>
             <button onClick={() => setRightPanelTab('audit')} className={`px-8 py-2.5 text-[10px] font-black uppercase transition-all rounded-[1.8rem] ${rightPanelTab === 'audit' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'}`}>Auditoria</button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {rightPanelTab === 'sales' ? (
                stats.groupedSales.map(group => {
                  const s = group[0];
                  const totalVal = group.reduce((acc, item) => acc + (Number(item.totalRevenue) * rate), 0);
                  return (
                    <div key={s.transactionId} onClick={() => setViewingReceiptGroup(group)} className="flex justify-between items-center p-5 rounded-3xl bg-slate-50/30 border border-slate-50 hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500 shrink-0"><ShoppingBag size={18} /></div>
                        <div><p className="font-black text-slate-800 text-xs truncate max-w-[120px]">{group.length > 1 ? `${s.itemName} +${group.length - 1}` : s.itemName}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{s.paymentMethod}</p></div>
                      </div>
                      <div className="text-right"><p className="font-black text-slate-900 text-sm">{symbol}{totalVal.toLocaleString()}</p><p className="text-[9px] text-slate-300 font-bold uppercase">{formatDateTime(s.date).time}</p></div>
                    </div>
                  );
                })
              ) : (
                (logs || []).map(l => (
                   <div key={l.id} onClick={() => handleAuditClick(l)} className="p-5 rounded-2xl bg-slate-50/30 border border-slate-100 text-[10px] hover:bg-white transition-all cursor-pointer relative">
                      <div className="flex justify-between mb-1"><span className={`font-black uppercase ${l.action === 'SALE' ? 'text-emerald-600' : 'text-indigo-600'}`}>{l.action}</span><span className="text-slate-400 font-bold">{formatDateTime(l.timestamp).time}</span></div>
                      <p className="text-slate-600 font-bold leading-relaxed truncate">{l.details}</p>
                      {l.action === 'SALE' && <div className="absolute top-2 right-2 p-1 bg-emerald-100 text-emerald-600 rounded-lg"><Receipt size={10} /></div>}
                   </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* MODAL GESTÃO AGENDAMENTO */}
      {showApptActions && selectedAppointment && (
         <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
               <div className="p-8 bg-emerald-600 text-white text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner"><User size={40} /></div>
                  <h3 className="font-black text-2xl font-heading tracking-tight">{selectedAppointment.customerName}</h3>
                  <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1">{selectedAppointment.time}h • {selectedAppointment.serviceNames?.join(', ')}</p>
               </div>
               <div className="p-6 space-y-3">
                  {(agendaDay === 'hoje' || selectedAppointment.status === 'confirmed') ? (
                     <button onClick={() => { setShowApptActions(false); }} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest"><Receipt size={20} className="text-emerald-400" /> Cobrar Atendimento</button>
                  ) : (
                     <button onClick={() => { 
                        if(window.confirm('Confirmar esta marcação?')) {
                          onUpdateAppointmentStatus?.(selectedAppointment.id, 'confirmed'); 
                          setShowApptActions(false); 
                        }
                     }} className="w-full py-5 bg-emerald-50 text-emerald-600 font-black rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest"><Check size={20} /> Confirmar Marcação</button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => handleRemarcar(selectedAppointment)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-slate-200"><CalendarDays size={18}/> Remarcar</button>
                     <button onClick={() => { 
                        if(window.confirm('Tem a certeza que deseja cancelar?')) {
                          onUpdateAppointmentStatus?.(selectedAppointment.id, 'cancelled'); 
                          setShowApptActions(false); 
                        }
                     }} className="w-full py-4 bg-red-50 text-red-600 font-black rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-red-100"><X size={18}/> Cancelar</button>
                  </div>
                  <button onClick={() => { setSelectedAppointment(null); setShowApptActions(false); }} className="w-full py-3 text-slate-300 font-black text-[10px] uppercase tracking-widest mt-2 hover:text-slate-500">Voltar</button>
               </div>
            </div>
         </div>
      )}

      {/* SELEÇÃO DE PAGAMENTO PARA AGENDAMENTO */}
      {selectedAppointment && !showApptActions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 bg-purple-600 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Receipt size={32} /></div>
                  <h3 className="font-black text-xl font-heading">Finalizar Atendimento</h3>
                  <p className="text-purple-100 text-sm mt-1">{selectedAppointment.customerName}</p>
                  <p className="text-3xl font-black mt-4">MT {selectedAppointment.totalAmount?.toFixed(0)}</p>
               </div>
               <div className="p-8 grid grid-cols-2 gap-4 bg-gray-50">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => { setPaymentToConfirm({ id: selectedAppointment.id, method: m as PaymentMethod, type: 'appointment' }); }} className="flex flex-col items-center justify-center p-6 bg-white hover:bg-emerald-600 hover:text-white rounded-[2rem] border border-slate-100 shadow-sm transition-all group active:scale-90">
                       {m === 'cash' ? <Wallet size={24} className="group-hover:text-white text-slate-300 mb-2"/> : <Smartphone size={24} className="group-hover:text-white text-slate-300 mb-2"/>}
                       <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setSelectedAppointment(null)} className="w-full py-5 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] bg-white border-t">Cancelar</button>
            </div>
        </div>
      )}

      {/* MODAL GESTÃO DESPESA / SAÍDA */}
      {showExpenseActionModal && selectedExpense && !selectedExpense.isPaid && (
         <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-[scaleIn_0.2s]">
               <div className="bg-red-50 p-4 rounded-3xl text-red-600 w-fit mx-auto mb-6"><Receipt size={32} /></div>
               <h3 className="text-xl font-black text-slate-900 font-heading">{selectedExpense.name}</h3>
               <p className="text-3xl font-black text-red-600 mt-2">{symbol}{selectedExpense.amount.toLocaleString()}</p>
               <div className="grid grid-cols-1 gap-3 mt-8">
                  <button onClick={() => setShowPaymentSelector(true)} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all text-xs uppercase tracking-widest">Efetuar Pagamento</button>
                  <button onClick={() => { 
                    if(window.confirm('Eliminar registo?')) {
                      onDeleteExpense?.(selectedExpense.id); 
                      setShowExpenseActionModal(false); 
                    }
                  }} className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">Remover Registo</button>
                  <button onClick={() => setShowExpenseActionModal(false)} className="py-3 text-slate-300 font-black text-[10px] uppercase tracking-widest mt-2 hover:text-slate-500">Voltar</button>
               </div>
            </div>
         </div>
      )}

      {/* COMPROVATIVO DE SAÍDA PAGA */}
      {showExpenseActionModal && selectedExpense && selectedExpense.isPaid && (
         <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
               <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
                  <div><h3 className="font-black text-xl font-heading tracking-tight">Recibo de Saída</h3><p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100">Transação Liquidada</p></div>
                  <CheckCircle size={28} className="text-white/40" />
               </div>
               <div className="p-10 space-y-6">
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Identificação</p>
                     <h4 className="text-xl font-black text-slate-900">{selectedExpense.name}</h4>
                     <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500"><span>Valor Pago:</span><span className="text-slate-900 font-black">{symbol} {selectedExpense.amount.toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs font-bold text-slate-500"><span>Data:</span><span className="text-slate-900">{selectedExpense.lastPaidDate ? formatDateTime(selectedExpense.lastPaidDate).date : '-'}</span></div>
                        <div className="flex justify-between text-xs font-bold text-slate-500"><span>Canal:</span><span className="text-slate-900 uppercase">{selectedExpense.paymentMethod || 'cash'}</span></div>
                        <div className="flex justify-between text-xs font-bold text-slate-500"><span>Responsável:</span><span className="text-slate-900 font-black">{selectedExpense.operatorName || 'Administrador'}</span></div>
                     </div>
                  </div>
                  <button onClick={() => setShowExpenseActionModal(false)} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Fechar Documento</button>
               </div>
            </div>
         </div>
      )}

      {/* SELETOR DE CANAL DE PAGAMENTO PARA SAÍDA */}
      {showPaymentSelector && selectedExpense && (
         <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/95 p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-[scaleIn_0.2s]">
               <h3 className="text-xl font-black text-slate-900 mb-6 font-heading uppercase tracking-tight">Canal de Pagamento</h3>
               {selectedExpense.type === 'fixed' && (
                  <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Meses a Liquidar</p>
                     <div className="flex items-center justify-center gap-6">
                        <button onClick={() => setMonthsToPay(Math.max(1, monthsToPay-1))} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 border hover:text-emerald-600 transition-colors"><Minus size={16} /></button>
                        <span className="text-4xl font-black text-slate-900 w-12">{monthsToPay}</span>
                        <button onClick={() => setMonthsToPay(Math.min(12, monthsToPay+1))} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 border hover:text-emerald-600 transition-colors"><Plus size={16} /></button>
                     </div>
                     <p className="text-[10px] font-bold text-emerald-600 mt-4 uppercase tracking-wider">Total: {symbol}{(selectedExpense.amount * monthsToPay).toLocaleString()}</p>
                  </div>
               )}
               <div className="grid grid-cols-2 gap-4">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => {
                        setPaymentToConfirm({ id: selectedExpense.id, method: m as PaymentMethod, type: 'expense' });
                    }} className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-emerald-600 hover:text-white rounded-[2rem] transition-all group border border-slate-100 shadow-inner active:scale-90">
                       {m === 'cash' ? <Wallet size={24} /> : <Smartphone size={24} />}
                       <span className="text-[10px] font-black uppercase mt-2">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => { setShowPaymentSelector(false); setMonthsToPay(1); }} className="w-full py-5 text-slate-400 font-bold mt-6 text-xs uppercase tracking-widest">Voltar</button>
            </div>
         </div>
      )}

      {/* CONFIRMAÇÃO FINAL PADRONIZADA */}
      {paymentToConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
              <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
              <h3 className="text-lg font-black text-slate-800">Confirmar Operação?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Confirmar o {paymentToConfirm.type === 'expense' ? 'pagamento' : 'recebimento'} via 
                <span className="font-black uppercase text-emerald-600 ml-1">{paymentToConfirm.method}</span>?
              </p>
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                 Registado por: {currentOperator}<br/>
                 {formatDateTime(new Date().toISOString()).full}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={() => setPaymentToConfirm(null)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase transition-all">Voltar</button>
                 <button onClick={handleFinalConfirm} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {/* RECIBO VENDAS / AUDITORIA DETALHADO */}
      {viewingReceiptGroup && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                 <div><h3 className="font-black text-xl font-heading tracking-tight">Recibo de Venda</h3><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">TX: #{viewingReceiptGroup[0].transactionId.slice(0,8)}</p></div>
                 <button onClick={() => setViewingReceiptGroup(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Itens da Transação</p>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1 mb-4">
                       {viewingReceiptGroup.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-700">
                             <div className="min-w-0 flex-1">
                                <p className="truncate">{item.itemName}</p>
                                <span className="text-[9px] text-slate-400 font-black uppercase">{item.quantity}x {item.itemSize}{item.itemUnit}</span>
                             </div>
                             <span className="ml-3 text-slate-900 font-black">{symbol}{(Number(item.totalRevenue) * rate).toLocaleString()}</span>
                          </div>
                       ))}
                    </div>
                    <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-slate-400">Operador:</span>
                          <span className="text-slate-900 font-black">{viewingReceiptGroup[0].operatorName}</span>
                       </div>
                       <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-slate-400">Data/Hora:</span>
                          <span className="text-slate-900">{formatDateTime(viewingReceiptGroup[0].date).full}</span>
                       </div>
                       {viewingReceiptGroup[0].customerName && (
                          <div className="flex justify-between text-[10px] font-black uppercase">
                             <span className="text-slate-400">Cliente:</span>
                             <span className="text-purple-600 font-black">{viewingReceiptGroup[0].customerName}</span>
                          </div>
                       )}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-600 uppercase">Total Geral</p><p className="text-xl font-black text-emerald-700">{symbol} {viewingReceiptGroup.reduce((acc, i) => acc + (Number(i.totalRevenue) * rate), 0).toLocaleString()}</p></div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Canal</p><p className="text-xs font-black text-slate-800 uppercase mt-1">{viewingReceiptGroup[0].paymentMethod}</p></div>
                 </div>
                 <button onClick={() => setViewingReceiptGroup(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest font-sans transition-all hover:bg-slate-200">Fechar Documento</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL AUDITORIA LOG DETALHADO */}
      {viewingLog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                 <div><h3 className="font-black text-xl font-heading tracking-tight">Log de Auditoria</h3><p className="text-[9px] font-bold uppercase tracking-widest text-indigo-200">ID: #{viewingLog.id.slice(0,8)}</p></div>
                 <button onClick={() => setViewingLog(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Descrição da Operação</p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{viewingLog.details}"</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Responsável</p><p className="text-[10px] font-black text-slate-800 mt-1 leading-tight uppercase">{viewingLog.operatorName}</p></div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Momento</p><p className="text-[10px] font-black text-slate-800 mt-1 leading-tight">{formatDateTime(viewingLog.timestamp).full}</p></div>
                 </div>
                 <button onClick={() => setViewingLog(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest font-sans transition-all hover:bg-slate-200">Sair</button>
              </div>
           </div>
        </div>
      )}

      {/* FORMULÁRIO DE NOVA SAÍDA */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 bg-red-600 text-white flex justify-between items-center">
                 <div><h3 className="font-black text-xl font-heading tracking-tight">Nova Saída</h3><p className="text-[9px] font-bold uppercase tracking-widest text-red-100">Registo de Despesa</p></div>
                 <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
              </div>
              <form onSubmit={handleSaveExpense} className="p-8 space-y-6 bg-white">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label><input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500 text-gray-900" value={newExpense.name} onChange={e => setNewExpense({...newExpense, name: e.target.value})} placeholder="Ex: Renda da Loja" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (MT)</label><input type="number" required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500 text-gray-900" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo</label><select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500 appearance-none text-gray-900" value={newExpense.type} onChange={e => setNewExpense({...newExpense, type: e.target.value as any})}>
                       <option value="variable">Variável</option>
                       <option value="fixed">Fixa (Mensal)</option>
                    </select></div>
                 </div>
                 {newExpense.type === 'fixed' ? (
                   <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dia do Pagamento</label><input type="number" min="1" max="31" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500 text-gray-900" value={newExpense.paymentDay} onChange={e => setNewExpense({...newExpense, paymentDay: Number(e.target.value)})} /></div>
                 ) : (
                   <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Limite</label><input type="date" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-500 text-gray-900" value={newExpense.nextDueDate} onChange={e => setNewExpense({...newExpense, nextDueDate: e.target.value})} /></div>
                 )}
                 <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Guardar Saída</button>
              </form>
           </div>
        </div>
      )}

      {/* REPOSIÇÃO STOCK MODAL */}
      {showRestockModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-xs text-center animate-[scaleIn_0.2s]">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><PackagePlus size={36}/></div>
              <h3 className="text-xl font-black text-slate-900 font-heading truncate">{showRestockModal.name}</h3>
              <div className="my-10">
                 <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setRestockQty(Math.max(1, restockQty - 1))} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner hover:text-emerald-600 transition-colors"><Minus size={18} /></button>
                    <span className="text-5xl font-black text-slate-900 w-20">{restockQty}</span>
                    <button onClick={() => setRestockQty(restockQty + 1)} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner hover:text-emerald-600 transition-colors"><Plus size={18}/></button>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => { setShowRestockModal(null); setRestockQty(10); }} className="py-4 bg-slate-50 text-slate-400 font-black rounded-2xl text-[10px] uppercase font-sans">Sair</button>
                 <button onClick={() => { 
                    if(window.confirm('Confirmar reposição de stock?')) {
                      onRestock?.(showRestockModal.id, restockQty); 
                      setShowRestockModal(null); 
                      setRestockQty(10);
                    }
                 }} className="py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl font-sans">Repor</button>
              </div>
           </div>
        </div>
      )}

      {/* CONTACTAR FORNECEDOR MODAL */}
      {contactingSupplier && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Truck size={32} /></div>
                 <h3 className="text-xl font-black text-slate-800 font-heading">Contactar Fornecedor</h3>
                 <p className="text-sm text-slate-500 mt-1">{contactingSupplier.supplier.name}</p>
                 <div className="mt-4 bg-white p-3 rounded-2xl border border-slate-200 inline-block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto em falta</p>
                    <p className="text-xs font-bold text-slate-700">{contactingSupplier.item.name}</p>
                 </div>
              </div>
              <div className="p-6 space-y-3">
                 <a 
                    href={`tel:${contactingSupplier.supplier.phone.replace(/\D/g, '')}`}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-lg uppercase text-[10px] tracking-widest font-sans"
                 >
                    <Phone size={20} /> Ligar Agora
                 </a>
                 <button 
                    onClick={() => {
                      const msg = encodeURIComponent(`Olá ${contactingSupplier.supplier.name}, contactamos para reposição do produto ${contactingSupplier.item.name} na ${activeBusinessName}.`);
                      window.open(`https://wa.me/${contactingSupplier.supplier.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                      setContactingSupplier(null);
                    }}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg uppercase text-[10px] tracking-widest font-sans"
                 >
                    <MessageCircle size={22} /> Enviar WhatsApp
                 </button>
                 <button onClick={() => setContactingSupplier(null)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest mt-2">Cancelar</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;