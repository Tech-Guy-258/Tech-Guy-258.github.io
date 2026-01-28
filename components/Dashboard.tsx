
import React, { useMemo, useState } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, AuditLogEntry, Expense, PaymentMethod, Customer, Supplier, Appointment, AppointmentStatus } from '../types';
import { CURRENCY_SYMBOLS, generateID } from '../constants';
import { useNavigate } from 'react-router-dom';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { 
  AlertTriangle, TrendingUp, Wallet, ShoppingBag, 
  Clock, X, Receipt, CheckCircle, Award, Plus, ArrowDownCircle, PackagePlus, User, ArrowUpRight, ArrowDownRight, Users, BarChart3, Calculator, Phone, MessageCircle, Truck, Minus, Calendar, ChevronRight, Smartphone, CalendarDays, Heart, Check, Percent, Filter, ListFilter, Activity, Hash, Info, ShoppingCart, Building2, Star, BellRing
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
  items = [], sales = [], logs = [], currency, exchangeRates, onCloseRegister, 
  activeBusinessName = "Negócio", currentOperator = "Operador", expenses = [], 
  customers = [], suppliers = [], appointments = [], onSaveExpense, onPayExpense, onDeleteExpense, onRestock,
  onUpdateAppointmentStatus, onCompleteAppointment
}) => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = Number(exchangeRates[currency] || 1);
  const navigate = useNavigate();

  // Estados de UI
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({ 
    name: '', amount: 0, type: 'variable', isPaid: false, 
    nextDueDate: new Date().toISOString().split('T')[0],
    alertThreshold: 3 // Default 3 dias antes
  });
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseActionModal, setShowExpenseActionModal] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [contactingSupplier, setContactingSupplier] = useState<{item: InventoryItem, supplier: Supplier} | null>(null);
  const [viewingReceiptGroup, setViewingReceiptGroup] = useState<SaleRecord[] | null>(null);
  const [viewingLog, setViewingLog] = useState<AuditLogEntry | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'sales' | 'audit'>('sales');
  const [agendaTab, setAgendaTab] = useState<'today' | 'tomorrow'>('today');
  
  // Confirmação final de saída
  const [expensePaymentToConfirm, setExpensePaymentToConfirm] = useState<{ expense: Expense, method: PaymentMethod } | null>(null);
  
  // Ações de Agendamento
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showApptPaymentSelector, setShowApptPaymentSelector] = useState(false);
  const [apptPaymentToConfirm, setApptPaymentToConfirm] = useState<{ appt: Appointment, method: PaymentMethod } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('pt-PT'),
      time: d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const lowStockItems = useMemo(() => items.filter(i => i.type === 'product' && i.quantity <= i.lowStockThreshold), [items]);

  const stats = useMemo(() => {
    const todaysSales = (sales || []).filter(s => s.date && s.date.startsWith(todayStr));
    
    // Canais de Entrada
    const channelFlow: Record<PaymentMethod, number> = { cash: 0, mpesa: 0, emola: 0, card: 0 };
    todaysSales.forEach(s => {
      if (channelFlow[s.paymentMethod] !== undefined) {
        channelFlow[s.paymentMethod] += (Number(s.totalRevenue) * rate);
      }
    });

    // Canais de Saída
    const outflowChannelFlow: Record<PaymentMethod, number> = { cash: 0, mpesa: 0, emola: 0, card: 0 };
    const paidExpensesToday = (expenses || []).filter(e => e.isPaid && e.lastPaidDate?.startsWith(todayStr));
    paidExpensesToday.forEach(e => {
       if (e.paymentMethod && outflowChannelFlow[e.paymentMethod] !== undefined) {
          outflowChannelFlow[e.paymentMethod] += (Number(e.amount) * rate);
       }
    });

    const dailyRevenue = Object.values(channelFlow).reduce((a, b) => a + b, 0);
    const dailyProfitRaw = todaysSales.reduce((acc, s) => acc + (Number(s.totalProfit) || 0), 0) * rate;
    const dailyMarginPercent = dailyRevenue > 0 ? (dailyProfitRaw / dailyRevenue) * 100 : 0;
    const dailyOutflows = Object.values(outflowChannelFlow).reduce((a, b) => a + b, 0);
    const dailyNetBalance = dailyRevenue - dailyOutflows;

    // Cliente do Dia
    const customerMap: Record<string, {name: string, total: number}> = {};
    todaysSales.forEach(s => {
       if (s.customerId) {
          if (!customerMap[s.customerId]) customerMap[s.customerId] = { name: s.customerName || 'Cliente', total: 0 };
          customerMap[s.customerId].total += (s.totalRevenue * rate);
       }
    });
    const customerOfTheDay = Object.values(customerMap).sort((a,b) => b.total - a.total)[0] || null;

    // Top 5 Performance
    const getTop5 = (type: 'product' | 'service') => {
       const map: Record<string, {name: string, qty: number, revenue: number}> = {};
       todaysSales.forEach(s => {
          const item = items.find(i => i.id === s.itemId);
          if (item?.type === type) {
             if (!map[s.itemId]) map[s.itemId] = { name: s.itemName, qty: 0, revenue: 0 };
             map[s.itemId].qty += s.quantity;
             map[s.itemId].revenue += (s.totalRevenue * rate);
          }
       });
       return Object.values(map).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    };

    const topProducts = getTop5('product');
    const topServices = getTop5('service');

    const groupedSales = Object.values(
      todaysSales.reduce((acc, s) => {
        if (!acc[s.transactionId]) acc[s.transactionId] = [];
        acc[s.transactionId].push(s);
        return acc;
      }, {} as Record<string, SaleRecord[]>)
    ).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());

    const activeAppts = (appointments || []).filter(a => a.status !== 'completed' && a.status !== 'cancelled');
    const todayAppts = activeAppts.filter(a => a.date === todayStr);
    const tomorrowAppts = activeAppts.filter(a => a.date === tomorrowStr);

    return { 
      dailyRevenue, dailyProfitRaw, dailyMarginPercent, dailyOutflows, dailyNetBalance, 
      groupedSales, channelFlow, outflowChannelFlow, customerOfTheDay, topProducts, topServices,
      todayAppts, tomorrowAppts,
      allExpenses: (expenses || []).sort((a, b) => {
        // Ordenação inteligente: primeiro as vencidas ou em alerta, depois as pagas hoje
        const isPaidTodayA = a.isPaid && a.lastPaidDate?.startsWith(todayStr);
        const isPaidTodayB = b.isPaid && b.lastPaidDate?.startsWith(todayStr);
        if (isPaidTodayA && !isPaidTodayB) return 1;
        if (!isPaidTodayA && isPaidTodayB) return -1;
        
        const dateA = new Date(a.nextDueDate).getTime();
        const dateB = new Date(b.nextDueDate).getTime();
        return dateA - dateB;
      })
    };
  }, [sales, expenses, rate, todayStr, tomorrowStr, appointments, items]);

  const handleSaveNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.name || newExpense.amount <= 0) return;
    onSaveExpense?.({ ...newExpense, id: generateID() } as Expense);
    setShowExpenseForm(false);
    setNewExpense({ name: '', amount: 0, type: 'variable', isPaid: false, nextDueDate: todayStr, alertThreshold: 3 });
  };

  const confirmExpensePayment = (method: PaymentMethod) => {
    if (selectedExpense) {
      setExpensePaymentToConfirm({ expense: selectedExpense, method });
      setShowPaymentSelector(false);
    }
  };

  const handleFinalExpensePayment = () => {
    if (expensePaymentToConfirm) {
      onPayExpense?.(expensePaymentToConfirm.expense.id, expensePaymentToConfirm.method, 1);
      setExpensePaymentToConfirm(null);
      setShowExpenseActionModal(false);
      setSelectedExpense(null);
    }
  };

  const handleApptPaymentSelection = (method: PaymentMethod) => {
    if (selectedAppt) {
      setApptPaymentToConfirm({ appt: selectedAppt, method });
      setShowApptPaymentSelector(false);
    }
  };

  const handleFinalApptPayment = () => {
    if (apptPaymentToConfirm && onCompleteAppointment) {
      onCompleteAppointment(apptPaymentToConfirm.appt.id, apptPaymentToConfirm.method);
      setApptPaymentToConfirm(null);
      setSelectedAppt(null);
    }
  };

  const handleContactSupplier = (item: InventoryItem) => {
    const supplier = suppliers.find(s => s.id === item.supplierId) || suppliers.find(s => s.name === item.supplierName);
    if (supplier) setContactingSupplier({ item, supplier });
  };

  const openWhatsApp = (phone: string, itemName: string, supplierName: string) => {
    const msg = encodeURIComponent(`Olá ${supplierName}, precisamos de reposição urgente do produto: ${itemName}.`);
    window.open(`https://wa.me/258${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    setContactingSupplier(null);
  };

  // Helper para verificar alerta de vencimento
  const getExpenseAlertStatus = (e: Expense) => {
    if (e.isPaid && e.lastPaidDate?.startsWith(todayStr)) return 'paid';
    
    const dueDate = new Date(e.nextDueDate);
    const today = new Date(todayStr);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= (e.alertThreshold || 0)) return 'warning';
    return 'pending';
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 pb-24 md:pb-10 max-w-[1600px] mx-auto animate-[fadeIn_0.4s_ease-out] bg-slate-50/30 text-gray-900">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 font-heading tracking-tight">Consola Global</h2>
          <p className="text-slate-400 mt-2 flex items-center font-bold uppercase text-[9px] tracking-[0.2em]">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shrink-0" /> Operação ativa: <span className="ml-1 text-slate-600 truncate">{currentOperator}</span>
          </p>
        </div>
        <button onClick={() => onCloseRegister?.()} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center active:scale-95 text-xs uppercase tracking-widest">
          <Receipt size={18} className="mr-3 text-emerald-400" /> Fecho de Caixa
        </button>
      </div>

      {/* Grade de KPIs Atómicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI: Faturação Bruta */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
           <div>
              <div className="flex justify-between items-start mb-4">
                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><TrendingUp size={24}/></div>
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Faturação Bruta</span>
              </div>
              <p className="text-5xl font-black font-heading text-slate-900">{symbol} {stats.dailyRevenue.toLocaleString()}</p>
           </div>
           <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Canais de Receita</span>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Cash</span><span className="text-sm font-black text-slate-800">{symbol}{stats.channelFlow.cash.toLocaleString()}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">M-Pesa</span><span className="text-sm font-black text-emerald-600">{symbol}{stats.channelFlow.mpesa.toLocaleString()}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">E-mola</span><span className="text-sm font-black text-orange-600">{symbol}{stats.channelFlow.emola.toLocaleString()}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Cartão</span><span className="text-sm font-black text-blue-600">{symbol}{stats.channelFlow.card.toLocaleString()}</span></div>
              </div>
           </div>
        </div>

        {/* KPI: Saídas de Caixa */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
           <div>
              <div className="flex justify-between items-start mb-4">
                 <div className="p-4 bg-red-50 text-red-600 rounded-[1.5rem]"><ArrowDownCircle size={24}/></div>
                 <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Saídas de Caixa</span>
              </div>
              <p className="text-5xl font-black font-heading text-slate-900">{symbol} {stats.dailyOutflows.toLocaleString()}</p>
           </div>
           <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Canais de Saída</span>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Cash</span><span className="text-sm font-black text-slate-800">{symbol}{stats.outflowChannelFlow.cash.toLocaleString()}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">M-Pesa</span><span className="text-sm font-black text-emerald-600">{symbol}{stats.outflowChannelFlow.mpesa.toLocaleString()}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">E-mola</span><span className="text-sm font-black text-orange-600">{symbol}{stats.outflowChannelFlow.emola.toLocaleString()}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Cartão</span><span className="text-sm font-black text-blue-600">{symbol}{stats.outflowChannelFlow.card.toLocaleString()}</span></div>
              </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]"><Award size={24}/></div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Lucro do Dia</span>
           </div>
           <p className="text-4xl font-black font-heading text-slate-900">{symbol} {stats.dailyProfitRaw.toLocaleString()}</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.5rem]"><Star size={24}/></div>
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Cliente do Dia</span>
           </div>
           <p className="text-xl font-black text-slate-900 truncate">{stats.customerOfTheDay?.name || '—'}</p>
           <p className="text-[10px] text-slate-400 font-bold mt-1">{stats.customerOfTheDay ? `${symbol} ${stats.customerOfTheDay.total.toLocaleString()}` : 'Sem registos'}</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl group lg:col-span-2">
           <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-emerald-500 text-white rounded-[1.5rem] shadow-lg"><Wallet size={24}/></div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Saldo Líquido em Caixa</span>
           </div>
           <p className="text-5xl font-black font-heading text-white">{symbol} {stats.dailyNetBalance.toLocaleString()}</p>
           <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-2">Pronto para fecho de turno</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Alerta de Stock com Contacto */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[520px]">
           <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg"><AlertTriangle size={24} /></div>
              <div><h4 className="text-xl font-black text-slate-800 font-heading">Reposição</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lowStockItems.length} alertas ativos</p></div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {lowStockItems.length > 0 ? lowStockItems.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm hover:border-red-200 transition-all group">
                   <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-sm truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Stock: {item.quantity} {item.unit}</p>
                   </div>
                   <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => setShowRestockModal(item)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><PackagePlus size={18}/></button>
                      <button onClick={() => handleContactSupplier(item)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Phone size={18}/></button>
                   </div>
                </div>
              )) : <div className="h-full flex flex-col items-center justify-center opacity-30"><CheckCircle size={48} className="mb-2"/><p className="text-[10px] font-black uppercase tracking-widest">Stock em dia</p></div>}
           </div>
        </div>

        {/* CRM / Agenda com Ações Contextuais */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[520px]">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                 <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
                 <div><h4 className="text-xl font-black text-slate-800 font-heading">Agenda CRM</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{agendaTab === 'today' ? stats.todayAppts.length : stats.tomorrowAppts.length} marcações</p></div>
              </div>
           </div>

           <div className="flex bg-slate-100 p-1 rounded-xl mb-6 shadow-inner">
              <button onClick={() => setAgendaTab('today')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${agendaTab === 'today' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>Hoje</button>
              <button onClick={() => setAgendaTab('tomorrow')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${agendaTab === 'tomorrow' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>Amanhã</button>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {(agendaTab === 'today' ? stats.todayAppts : stats.tomorrowAppts).length > 0 ? (
                (agendaTab === 'today' ? stats.todayAppts : stats.tomorrowAppts).map(a => (
                  <div key={a.id} onClick={() => setSelectedAppt(a)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm cursor-pointer hover:border-purple-300 transition-all group">
                     <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-purple-600 bg-purple-50 w-12 py-2 rounded-xl text-center group-hover:bg-purple-600 group-hover:text-white transition-all">{a.time}</span>
                        <div className="min-w-0">
                           <p className="text-sm font-bold text-slate-700 truncate">{a.customerName}</p>
                           <p className={`text-[9px] font-black uppercase ${a.status === 'confirmed' ? 'text-emerald-500' : 'text-blue-500'}`}>{a.status === 'confirmed' ? 'Confirmado' : 'Agendado'}</p>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-slate-200" />
                  </div>
                ))
              ) : <div className="h-full flex flex-col items-center justify-center opacity-30"><Calendar size={48} className="text-slate-200 mb-2" /><p className="text-[10px] font-black uppercase">Sem agendamentos</p></div>}
           </div>
        </div>

        {/* Top 5 Performance */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[520px]">
           <div className="flex items-center gap-4 mb-6">
              <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><BarChart3 size={24} /></div>
              <div><h4 className="text-xl font-black text-slate-800 font-heading">Top 5</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mais Rentáveis Hoje</p></div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
              <section>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Produtos Líderes</span>
                 <div className="space-y-3">
                    {stats.topProducts.map((p, i) => (
                       <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                          <div className="flex items-center gap-3">
                             <span className="w-6 h-6 bg-slate-100 text-[10px] font-black flex items-center justify-center rounded-lg text-slate-400">{i+1}</span>
                             <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{p.name}</p>
                          </div>
                          <span className="text-xs font-black text-emerald-600">{symbol} {p.revenue.toLocaleString()}</span>
                       </div>
                    ))}
                    {stats.topProducts.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-4">Sem vendas de produtos</p>}
                 </div>
              </section>
              <section>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Serviços Procura</span>
                 <div className="space-y-3">
                    {stats.topServices.map((p, i) => (
                       <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                          <div className="flex items-center gap-3">
                             <span className="w-6 h-6 bg-indigo-50 text-[10px] font-black flex items-center justify-center rounded-lg text-indigo-400">{i+1}</span>
                             <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{p.name}</p>
                          </div>
                          <span className="text-xs font-black text-indigo-600">{symbol} {p.revenue.toLocaleString()}</span>
                       </div>
                    ))}
                    {stats.topServices.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-4">Sem vendas de serviços</p>}
                 </div>
              </section>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gestão de Saídas / Despesas */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[520px]">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                 <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg"><Calculator size={24} /></div>
                 <div><h4 className="text-xl font-black text-slate-800 font-heading">Saídas</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fluxo do Dia</p></div>
              </div>
              <button onClick={() => setShowExpenseForm(true)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Plus size={20}/></button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {stats.allExpenses.map(e => {
                 const status = getExpenseAlertStatus(e);
                 const isPaidToday = status === 'paid';
                 
                 return (
                    <div 
                      key={e.id} 
                      onClick={() => { if(!isPaidToday) { setSelectedExpense(e); setShowExpenseActionModal(true); } }} 
                      className={`p-5 rounded-3xl border flex items-center justify-between shadow-sm transition-all ${
                        isPaidToday ? 'bg-emerald-50 border-emerald-100 opacity-80 cursor-not-allowed' : 
                        status === 'overdue' ? 'bg-red-50 border-red-200 cursor-pointer animate-pulse' :
                        status === 'warning' ? 'bg-amber-50 border-amber-200 cursor-pointer' :
                        'bg-white border-slate-100 cursor-pointer hover:border-red-300'
                      }`}
                    >
                       <div className="min-w-0 flex-1">
                          <p className={`font-black text-sm truncate ${
                            isPaidToday ? 'text-emerald-700' : 
                            status === 'overdue' ? 'text-red-800' :
                            status === 'warning' ? 'text-amber-800' :
                            'text-slate-800'
                          }`}>{e.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${e.type === 'fixed' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>{e.type === 'fixed' ? 'FIXA' : 'PONTUAL'}</span>
                             {isPaidToday && <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle size={10} /> JÁ PAGO HOJE</span>}
                             {status === 'overdue' && <span className="text-[9px] font-black text-red-600 flex items-center gap-1"><AlertTriangle size={10} /> VENCIDO EM {new Date(e.nextDueDate).toLocaleDateString()}</span>}
                             {status === 'warning' && <span className="text-[9px] font-black text-amber-600 flex items-center gap-1"><Clock size={10} /> VENCE EM BREVE: {new Date(e.nextDueDate).toLocaleDateString()}</span>}
                             {status === 'pending' && <span className="text-[9px] font-black text-slate-400">Vencimento: {new Date(e.nextDueDate).toLocaleDateString()}</span>}
                          </div>
                       </div>
                       <p className={`text-sm font-black ml-4 shrink-0 ${isPaidToday ? 'text-emerald-600' : status === 'overdue' ? 'text-red-600' : 'text-slate-900'}`}>{symbol} {e.amount.toLocaleString()}</p>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Auditoria / Histórico de Vendas */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[3rem] p-8 shadow-sm flex flex-col h-[520px]">
           <div className="flex border-b border-slate-100 mb-6 gap-8">
              <button onClick={() => setRightPanelTab('sales')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${rightPanelTab === 'sales' ? 'text-slate-900 border-b-4 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Vendas Diárias</button>
              <button onClick={() => setRightPanelTab('audit')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${rightPanelTab === 'audit' ? 'text-slate-900 border-b-4 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Auditoria de Fluxo</button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {rightPanelTab === 'sales' ? (
                stats.groupedSales.map((group, idx) => (
                  <div key={idx} onClick={() => setViewingReceiptGroup(group)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-300 transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all"><Receipt size={20}/></div>
                        <div>
                           <p className="font-black text-slate-800 text-sm">TX #{group[0].transactionId.slice(0,8)}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDateTime(group[0].date).time} • {group[0].paymentMethod}</p>
                        </div>
                     </div>
                     <p className="font-black text-slate-900 text-sm">{symbol} {group.reduce((acc, s) => acc + (Number(s.totalRevenue) * rate), 0).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                (logs || []).slice(0, 50).map(log => (
                  <div key={log.id} onClick={() => setViewingLog(log)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm cursor-pointer hover:border-blue-200 transition-all">
                     <div className={`p-3 rounded-2xl ${log.action === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}><Activity size={18}/></div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{log.details}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDateTime(log.timestamp).time}</p>
                     </div>
                     <ChevronRight size={16} className="text-slate-200" />
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* MODAL REPOSIÇÃO */}
      {showRestockModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-xs text-center animate-[scaleIn_0.2s]">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><PackagePlus size={36}/></div>
              <h3 className="text-xl font-black text-slate-900 font-heading truncate">{showRestockModal.name}</h3>
              <div className="my-10 flex items-center justify-center gap-6">
                 <button onClick={() => setRestockQty(Math.max(1, restockQty - 1))} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner hover:text-emerald-600 transition-colors"><Minus size={18} /></button>
                 <span className="text-5xl font-black text-slate-900 w-20">{restockQty}</span>
                 <button onClick={() => setRestockQty(restockQty + 1)} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner hover:text-emerald-600 transition-colors"><Plus size={18}/></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowRestockModal(null)} className="py-4 bg-slate-50 text-slate-400 font-black rounded-2xl text-[10px] uppercase">Sair</button>
                 <button onClick={() => { onRestock?.(showRestockModal.id, restockQty); setShowRestockModal(null); }} className="py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl">Repor</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL SELETOR DE CONTACTO FORNECEDOR */}
      {contactingSupplier && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Truck size={32} /></div>
                 <h3 className="text-xl font-black text-slate-800 font-heading">Contactar Fornecedor</h3>
                 <p className="text-sm text-slate-500 mt-1">{contactingSupplier.supplier.name}</p>
              </div>
              <div className="p-6 space-y-3">
                 <a 
                    href={`tel:${contactingSupplier.supplier.phone.replace(/\D/g, '')}`}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                 >
                    <Phone size={20} /> Ligar Agora
                 </a>
                 <button 
                    onClick={() => openWhatsApp(contactingSupplier.supplier.phone, contactingSupplier.item.name, contactingSupplier.supplier.name)}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                 >
                    <MessageCircle size={22} /> Enviar WhatsApp
                 </button>
                 <button onClick={() => setContactingSupplier(null)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest mt-2">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DETALHE AGENDAMENTO - DINÂMICO HOJE/AMANHÃ */}
      {selectedAppt && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 bg-purple-600 text-white">
                  <div className="flex items-center gap-2 text-purple-200 mb-1"><Calendar size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Ações de Agenda</span></div>
                  <h3 className="font-black text-2xl font-heading truncate">{selectedAppt.customerName}</h3>
                  <p className="text-sm font-bold text-purple-100 mt-1 uppercase tracking-widest">{selectedAppt.date === todayStr ? 'Hoje' : 'Amanhã'} às {selectedAppt.time}</p>
               </div>
               <div className="p-8 space-y-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner mb-4">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Serviços</span>
                     <p className="text-sm font-bold text-slate-800 mt-1">{selectedAppt.serviceNames?.join(', ')}</p>
                     <p className="text-xl font-black text-emerald-600 mt-3">{symbol} {selectedAppt.totalAmount.toLocaleString()}</p>
                  </div>

                  {selectedAppt.date === todayStr ? (
                    <div className="space-y-3">
                       <button onClick={() => setShowApptPaymentSelector(true)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase text-xs tracking-widest"><ShoppingCart size={18}/> Efectuar Venda</button>
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { navigate('/appointments', { state: { reschedule: selectedAppt } }); setSelectedAppt(null); }} className="py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase border border-slate-200">Remarcar</button>
                          <button onClick={() => { onUpdateAppointmentStatus?.(selectedAppt.id, 'cancelled'); setSelectedAppt(null); }} className="py-4 bg-red-50 text-red-400 font-black rounded-2xl text-[10px] uppercase border border-red-100">Cancelar</button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       <button onClick={() => { onUpdateAppointmentStatus?.(selectedAppt.id, 'confirmed'); setSelectedAppt(null); }} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase text-xs tracking-widest"><CheckCircle size={18}/> Confirmar Presença</button>
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { navigate('/appointments', { state: { reschedule: selectedAppt } }); setSelectedAppt(null); }} className="py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase border border-slate-200">Remarcar</button>
                          <button onClick={() => { onUpdateAppointmentStatus?.(selectedAppt.id, 'cancelled'); setSelectedAppt(null); }} className="py-4 bg-red-50 text-red-400 font-black rounded-2xl text-[10px] uppercase border border-red-100">Cancelar</button>
                       </div>
                    </div>
                  )}
                  <button onClick={() => setSelectedAppt(null)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase mt-2">Fechar</button>
               </div>
            </div>
         </div>
      )}

      {/* SELETOR DE PAGAMENTO AGENDAMENTO */}
      {showApptPaymentSelector && selectedAppt && (
         <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
               <h3 className="text-xl font-black text-slate-800 font-heading mb-8">Canal de Recebimento</h3>
               <div className="grid grid-cols-2 gap-4 mb-8">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => handleApptPaymentSelection(m as PaymentMethod)} className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-[2rem] border border-slate-100 transition-all active:scale-90 group">
                       {m === 'cash' ? <Wallet size={24} className="group-hover:text-white text-slate-300 mb-2"/> : <Smartphone size={24} className="group-hover:text-white text-slate-300 mb-2"/>}
                       <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowApptPaymentSelector(false)} className="py-4 text-slate-400 font-black text-[10px] uppercase">Voltar</button>
            </div>
         </div>
      )}

      {/* CONFIRMAÇÃO FINAL AGENDAMENTO */}
      {apptPaymentToConfirm && (
         <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
               <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
               <h3 className="text-lg font-black text-slate-800">Finalizar Venda?</h3>
               <p className="text-xs text-slate-500 mt-2">Receber <span className="font-black text-slate-900">{symbol} {apptPaymentToConfirm.appt.totalAmount.toLocaleString()}</span> via <span className="font-black uppercase text-emerald-600">{apptPaymentToConfirm.method}</span>?</p>
               <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => setApptPaymentToConfirm(null)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase">Ajustar</button>
                  <button onClick={handleFinalApptPayment} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-200">Confirmar</button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL RECIBO PREMIUM PADRONIZADO (VENDAS HISTÓRICAS) */}
      {viewingReceiptGroup && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-[fadeIn_0.2s]">
             <div className="bg-white w-full max-w-sm rounded-[4rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
                <div className="p-10 bg-emerald-600 text-white text-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-pulse"></div>
                   <CheckCircle className="mx-auto mb-4" size={56} />
                   <h3 className="text-2xl font-black font-heading tracking-tight">Transação Concluída</h3>
                   <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Documento Digital #{(viewingReceiptGroup[0]?.transactionId || '000').slice(0,8)}</p>
                </div>
                
                <div className="p-8 space-y-6">
                   <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 shadow-inner">
                      <div className="flex justify-between items-start mb-6 border-b border-dashed border-slate-200 pb-4">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Building2 size={10}/> Empresa</p>
                            <p className="text-sm font-bold text-slate-800">{activeBusinessName}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 justify-end"><Clock size={10}/> Data</p>
                            <p className="text-sm font-bold text-slate-800">{formatDateTime(viewingReceiptGroup[0].date).date}</p>
                         </div>
                      </div>

                      <div className="space-y-3 mb-6 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                         {viewingReceiptGroup.map((r, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                               <div className="min-w-0 flex-1"><p className="font-bold text-slate-700 truncate">{r.itemName}</p><p className="text-[9px] text-slate-400 uppercase">{r.quantity}x {r.itemUnit || 'un'}</p></div>
                               <span className="ml-4 font-black text-slate-900">{symbol} {(r.totalRevenue * rate).toLocaleString()}</span>
                            </div>
                         ))}
                      </div>

                      <div className="space-y-2 border-t border-dashed border-slate-200 pt-4 mb-6">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                            <span>Canal</span>
                            <span className="text-emerald-600 flex items-center gap-1.5"><Smartphone size={12}/> {viewingReceiptGroup[0].paymentMethod}</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                            <span>Operador</span>
                            <span className="text-slate-800">{viewingReceiptGroup[0].operatorName}</span>
                         </div>
                         {viewingReceiptGroup[0].customerName && (
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                               <span>Cliente</span>
                               <span className="text-indigo-600 flex items-center gap-1.5"><User size={12}/> {viewingReceiptGroup[0].customerName}</span>
                            </div>
                         )}
                      </div>

                      <div className="flex justify-between items-center pt-2">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Pago</span>
                         <span className="text-3xl font-black text-emerald-600">{symbol} {viewingReceiptGroup.reduce((acc, i) => acc + (Number(i.totalRevenue) * rate), 0).toLocaleString()}</span>
                      </div>
                   </div>

                   <button onClick={() => setViewingReceiptGroup(null)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center">
                      <Receipt size={18} className="mr-3 text-emerald-400" /> Sair do Recibo
                   </button>
                </div>
             </div>
          </div>
      )}

      {/* MODAL NOVO REGISTO DE SAÍDA */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
              <div className="p-8 bg-red-600 text-white flex justify-between items-center">
                 <h3 className="font-black text-xl font-heading">Nova Saída</h3>
                 <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveNewExpense} className="p-8 space-y-5">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Descrição</label>
                    <input placeholder="Ex: Compra de Pão" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner" value={newExpense.name} onChange={e => setNewExpense({...newExpense, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Montante (MT)</label>
                    <input type="number" placeholder="0.00" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner text-red-600" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
                 </div>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setNewExpense({...newExpense, type: 'fixed'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newExpense.type === 'fixed' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Fixa</button>
                    <button type="button" onClick={() => setNewExpense({...newExpense, type: 'variable'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newExpense.type === 'variable' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Pontual</button>
                 </div>

                 {newExpense.type === 'fixed' && (
                    <div className="space-y-4 animate-[fadeIn_0.3s]">
                       <div>
                          <label className="text-[10px] font-black uppercase text-red-600 mb-2 block">Data de Vencimento</label>
                          <input type="date" required className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl font-bold shadow-inner text-red-800" value={newExpense.nextDueDate} onChange={e => setNewExpense({...newExpense, nextDueDate: e.target.value})} />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-amber-600 mb-2 block flex justify-between">
                            Alertar antecipadamente <span>{newExpense.alertThreshold} dias</span>
                          </label>
                          <input type="range" min="1" max="15" className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600" value={newExpense.alertThreshold} onChange={e => setNewExpense({...newExpense, alertThreshold: parseInt(e.target.value)})} />
                       </div>
                    </div>
                 )}

                 <button type="submit" className="w-full py-5 bg-red-600 text-white font-black rounded-3xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Registar no Fluxo</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL AÇÕES DESPESA */}
      {showExpenseActionModal && selectedExpense && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Calculator size={40}/></div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading">{selectedExpense.name}</h3>
                  <p className="text-4xl font-black text-red-600 mt-2">{symbol} {selectedExpense.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest">ESTADO: {getExpenseAlertStatus(selectedExpense).toUpperCase()}</p>
                  {selectedExpense.type === 'fixed' && <p className="text-xs text-slate-500 mt-2 font-bold uppercase">Vencimento: {new Date(selectedExpense.nextDueDate).toLocaleDateString()}</p>}
               </div>
               <div className="p-8 pt-0 grid grid-cols-2 gap-3">
                  <button onClick={() => { onDeleteExpense?.(selectedExpense.id); setShowExpenseActionModal(false); }} className="py-4 bg-slate-50 text-red-400 font-black rounded-2xl text-[10px] uppercase">Eliminar</button>
                  <button onClick={() => setShowPaymentSelector(true)} className="py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg">Pagar Agora</button>
               </div>
               <button onClick={() => setShowExpenseActionModal(false)} className="w-full py-5 text-slate-400 font-black text-[10px] uppercase border-t">Fechar</button>
            </div>
         </div>
      )}

      {/* SELETOR DE PAGAMENTO DESPESA */}
      {showPaymentSelector && (
         <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
               <h3 className="text-xl font-black text-slate-800 font-heading mb-8">Canal de Saída</h3>
               <div className="grid grid-cols-2 gap-4 mb-8">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => confirmExpensePayment(m as PaymentMethod)} className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-[2rem] border border-slate-100 transition-all active:scale-90 group">
                       {m === 'cash' ? <Wallet size={24} className="group-hover:text-white text-slate-300 mb-2"/> : <Smartphone size={24} className="group-hover:text-white text-slate-300 mb-2"/>}
                       <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowPaymentSelector(false)} className="py-4 text-slate-400 font-black text-[10px] uppercase">Voltar</button>
            </div>
         </div>
      )}

      {/* MODAL CONFIRMAÇÃO FINAL DE SAÍDA */}
      {expensePaymentToConfirm && (
         <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
               <div className="bg-red-50 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
               <h3 className="text-lg font-black text-slate-800">Confirmar Saída?</h3>
               <p className="text-xs text-slate-500 mt-2">Deseja autorizar o pagamento de <span className="font-black text-slate-900">{symbol} {expensePaymentToConfirm.expense.amount.toLocaleString()}</span> para <span className="font-bold text-slate-800">{expensePaymentToConfirm.expense.name}</span> via <span className="font-black uppercase text-emerald-600">{expensePaymentToConfirm.method}</span>?</p>
               <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => setExpensePaymentToConfirm(null)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase">Voltar</button>
                  <button onClick={handleFinalExpensePayment} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-200">Confirmar</button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL DETALHE DE AUDITORIA */}
      {viewingLog && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3"><Activity size={24} /><h3 className="font-black text-xl font-heading">Operação</h3></div>
                 <button onClick={() => setViewingLog(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</span><p className="text-lg font-bold text-slate-800 mt-1">{viewingLog.details}</p></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</span><p className="text-sm font-bold text-slate-800 mt-1">{viewingLog.operatorName}</p></div>
                    <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</span><p className="text-sm font-black text-blue-600 mt-1 uppercase">{formatDateTime(viewingLog.timestamp).time}</p></div>
                 </div>
                 <button onClick={() => setViewingLog(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest">Fechar</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
