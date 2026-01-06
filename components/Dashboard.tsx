
import React, { useMemo, useState } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, AuditLogEntry, Expense, PaymentMethod, Appointment, Category, Unit } from '../types';
import { CURRENCY_SYMBOLS, generateID } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  AlertTriangle, DollarSign, Package, Calendar, TrendingUp, Wallet, ShoppingBag, 
  Clock, PlusCircle, X, Receipt, Activity, Smartphone, CreditCard, User, 
  Briefcase, LayoutDashboard, AlertOctagon, ArrowRight, Lock, CheckCircle, 
  Award, TrendingDown, Trash2, Plus, UserPlus, ArrowUpRight, ArrowDownRight, 
  CreditCard as CardIcon, Search, ArrowDownCircle, Users, Percent, Ticket
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
  customers?: any[];
  onSaveExpense?: (expense: Expense) => void; 
  onPayExpense?: (expenseId: string, method: PaymentMethod) => void;
  onDeleteExpense?: (id: string) => void;
  onUpdateAppointmentStatus?: (id: string, status: any) => void;
  onCompleteAppointment?: (appointmentId: string, method: PaymentMethod) => void;
  onSaveAppointment?: (appt: Appointment) => void;
  onAddCustomer?: (name: string, phone: string) => any;
}

interface GroupedTransaction {
  transactionId: string;
  date: string;
  totalRevenue: number;
  totalItems: number;
  items: SaleRecord[];
  operatorName: string;
  paymentMethod: string;
  customerName?: string; 
}

const Dashboard: React.FC<DashboardProps> = ({ 
  items, sales = [], logs = [], currency, exchangeRates, onCloseRegister, 
  activeBusinessName = "Negócio", currentOperator = "Operador", expenses = [], 
  appointments = [], customers = [], onSaveExpense, onPayExpense,
  onUpdateAppointmentStatus, onCompleteAppointment, onSaveAppointment, onAddCustomer
}) => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  // Modal States
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showApptForm, setShowApptForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showApptPaymentModal, setShowApptPaymentModal] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<GroupedTransaction | null>(null);
  const [selectedExpenseReceipt, setSelectedExpenseReceipt] = useState<Expense | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'sales' | 'outflows' | 'audit'>('sales');

  // Form Data States
  const [expenseFormData, setExpenseFormData] = useState({
    id: '', name: '', amount: '', type: 'fixed' as 'fixed' | 'variable', paymentDay: '1'
  });

  const [apptFormData, setApptFormData] = useState({
    customerId: '', serviceIds: [] as string[], date: new Date().toISOString().split('T')[0], time: '09:00', 
    isNewCustomer: false, newName: '', newPhone: ''
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Advanced Stats Logic
  const stats = useMemo(() => {
    const safeSales = Array.isArray(sales) ? sales : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    
    const todaysSales = safeSales.filter(s => s.date && s.date.startsWith(todayStr));
    const dailyRevenue = todaysSales.reduce((acc, s) => acc + s.totalRevenue, 0) * rate;
    const dailyProfitRaw = todaysSales.reduce((acc, s) => acc + s.totalProfit, 0) * rate;
    
    // Outflows
    const todaysPaidExpenses = safeExpenses.filter(e => e.isPaid && e.lastPaidDate?.startsWith(todayStr));
    const dailyOutflows = todaysPaidExpenses.reduce((acc, e) => acc + e.amount, 0) * rate;

    const dailyNetBalance = dailyRevenue - dailyOutflows;
    const dailyProfitPercent = dailyRevenue > 0 ? (dailyProfitRaw / dailyRevenue) * 100 : 0;
    const avgTicket = todaysSales.length > 0 ? dailyRevenue / new Set(todaysSales.map(s => s.transactionId)).size : 0;

    // Top Products
    const salesByProduct: Record<string, number> = {};
    todaysSales.forEach(sale => {
      let name = String(sale.itemName || 'Produto');
      salesByProduct[name] = (salesByProduct[name] || 0) + Number(sale.quantity);
    });
    const salesData = Object.entries(salesByProduct)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top Clients
    const salesByClient: Record<string, { name: string, total: number }> = {};
    todaysSales.forEach(sale => {
      const cId = sale.customerId || 'Final';
      const cName = sale.customerName || 'Consumidor Final';
      if (!salesByClient[cId]) salesByClient[cId] = { name: cName, total: 0 };
      salesByClient[cId].total += sale.totalRevenue * rate;
    });
    const clientsData = Object.entries(salesByClient)
      .map(([id, data]) => ({ name: data.name, value: data.total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const clientOfTheDay = clientsData[0] || null;

    // Cash Flow Chart Data (Last 7 Days)
    const cashFlowData = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split('T')[0];
        const rev = safeSales.filter(s => s.date.startsWith(ds)).reduce((acc, s) => acc + s.totalRevenue, 0) * rate;
        const exp = safeExpenses.filter(e => e.isPaid && e.lastPaidDate?.startsWith(ds)).reduce((acc, e) => acc + e.amount, 0) * rate;
        return {
            name: d.toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit'}),
            entradas: Number(rev.toFixed(0)),
            saidas: Number(exp.toFixed(0))
        };
    });

    return { 
      totalItems: items.length, dailyRevenue, dailyOutflows, dailyNetBalance, dailyProfitPercent, 
      avgTicket, salesCount: new Set(todaysSales.map(s => s.transactionId)).size,
      salesData, clientsData, clientOfTheDay, cashFlowData, todaysPaidExpenses 
    };
  }, [items, sales, expenses, rate, todayStr]);

  const expenseStats = useMemo(() => {
     const safeExpenses = Array.isArray(expenses) ? expenses : [];
     const today = new Date();
     const unpaidExpenses = safeExpenses
        .filter(e => !e.isPaid)
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
     const totalPending = unpaidExpenses.reduce((acc, curr) => acc + curr.amount, 0);

     const displayExpenses = unpaidExpenses.map(exp => {
           const dueDate = new Date(exp.nextDueDate);
           const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
           let statusColor = ''; let statusLabel = '';
           if (daysLeft < 0) { statusColor = 'text-red-500 bg-red-50'; statusLabel = `Atrasado ${Math.abs(daysLeft)}d`; }
           else if (daysLeft === 0) { statusColor = 'text-orange-600 bg-orange-50'; statusLabel = `Hoje`; }
           else if (daysLeft <= 3) { statusColor = 'text-orange-400 bg-orange-50'; statusLabel = `${daysLeft} dias`; }
           else { statusColor = 'text-slate-400 bg-slate-50'; statusLabel = dueDate.toLocaleDateString('pt-PT'); }
           return { ...exp, statusColor, statusLabel };
        });

     return { list: displayExpenses, totalPending, pendingCount: displayExpenses.length };
  }, [expenses]);

  const todaysAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === todayStr && a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  const services = useMemo(() => items.filter(i => i.type === 'service'), [items]);
  const filteredCustomers = useMemo(() => {
     if (!customerSearch) return [];
     const lower = customerSearch.toLowerCase();
     return customers.filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower));
  }, [customers, customerSearch]);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseFormData.amount);
    if (isNaN(amount) || amount <= 0 || !expenseFormData.name) return;
    if (onSaveExpense) {
      const today = new Date();
      let nextDueDateStr = today.toISOString();
      if (expenseFormData.type === 'fixed') {
        const paymentDay = parseInt(expenseFormData.paymentDay);
        const targetDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
        if (today.getDate() > paymentDay) targetDate.setMonth(targetDate.getMonth() + 1);
        nextDueDateStr = targetDate.toISOString();
      }
      onSaveExpense({
        id: generateID(), name: expenseFormData.name, amount: amount, type: expenseFormData.type,
        paymentDay: expenseFormData.type === 'fixed' ? parseInt(expenseFormData.paymentDay) : undefined,
        nextDueDate: nextDueDateStr, isPaid: false
      });
      setShowExpenseForm(false);
      setExpenseFormData({ id: '', name: '', amount: '', type: 'fixed', paymentDay: '1' });
    }
  };

  const handlePayExpense = (method: PaymentMethod) => {
    if (selectedExpense && onPayExpense) {
      onPayExpense(selectedExpense.id, method);
      setShowPaymentSelector(false);
      setSelectedExpense(null);
    }
  };

  const toggleServiceSelection = (id: string) => {
    setApptFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter(sid => sid !== id) : [...prev.serviceIds, id]
    }));
  };

  const handleApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apptFormData.serviceIds.length === 0) return;
    let targetCustomer: any = null;
    if (apptFormData.isNewCustomer) {
       if (!apptFormData.newName || !apptFormData.newPhone) return;
       targetCustomer = onAddCustomer?.(apptFormData.newName, apptFormData.newPhone);
    } else {
       targetCustomer = customers.find(c => c.id === apptFormData.customerId);
    }
    if (!targetCustomer) return;
    const selectedServices = services.filter(s => apptFormData.serviceIds.includes(s.id));
    const totalAmount = selectedServices.reduce((acc, s) => acc + (s.sellingPrice || s.price), 0);
    if (onSaveAppointment) {
      onSaveAppointment({
        id: generateID(), customerId: targetCustomer.id, customerName: targetCustomer.name, customerPhone: targetCustomer.phone,
        serviceIds: apptFormData.serviceIds, serviceNames: selectedServices.map(s => s.name),
        totalAmount, date: apptFormData.date, time: apptFormData.time, status: 'scheduled',
        createdBy: currentOperator || 'Admin', createdAt: new Date().toISOString()
      });
      setShowApptForm(false);
      setApptFormData({ customerId: '', serviceIds: [], date: todayStr, time: '09:00', isNewCustomer: false, newName: '', newPhone: '' });
      setCustomerSearch('');
    }
  };

  const getMethodIcon = (method: string) => {
    switch(method) {
      case 'mpesa': return <Smartphone size={10} className="text-red-500" />;
      case 'emola': return <Smartphone size={10} className="text-indigo-500" />;
      case 'card': return <CreditCard size={10} className="text-blue-500" />;
      default: return <Wallet size={10} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 relative pb-24 md:pb-8 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 font-heading tracking-tight">Consola de Gestão</h2>
          <p className="text-slate-500 mt-1 flex items-center">
            <Activity size={14} className="mr-2 text-emerald-500" /> 
            {activeBusinessName} • Fluxo Operacional
          </p>
        </div>
        {onCloseRegister && (
          <button onClick={() => onCloseRegister()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center active:scale-95">
             <Lock size={18} className="mr-2" /> Fechar Caixa
          </button>
        )}
      </div>

      {/* Primary KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 bg-emerald-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform opacity-50"></div>
          <div className="relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita (Hoje)</p>
            <p className="text-3xl font-black text-slate-900 font-heading">{symbol} {stats.dailyRevenue.toFixed(0)}</p>
            <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
               <ArrowUpRight size={12} className="mr-1" /> Faturação Bruta
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform opacity-50"></div>
          <div className="relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saídas (Hoje)</p>
            <p className="text-3xl font-black text-slate-900 font-heading">{symbol} {stats.dailyOutflows.toFixed(0)}</p>
            <div className="mt-4 flex items-center text-[10px] font-bold text-red-600 bg-red-50 w-fit px-2 py-1 rounded-lg">
               <ArrowDownRight size={12} className="mr-1" /> Custos Pagos
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 bg-indigo-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform opacity-50"></div>
          <div className="relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lucro Estimado</p>
            <p className={`text-3xl font-black font-heading ${stats.dailyNetBalance < 0 ? 'text-red-500' : 'text-slate-900'}`}>{symbol} {stats.dailyNetBalance.toFixed(0)}</p>
            <div className="mt-4 flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 w-fit px-2 py-1 rounded-lg">
               <TrendingUp size={12} className="mr-1" /> Balanço Líquido
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 bg-orange-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform opacity-50"></div>
          <div className="relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Ativo</p>
            <p className="text-3xl font-black text-slate-900 font-heading">{stats.totalItems}</p>
            <div className="mt-4 flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded-lg">
               <Package size={12} className="mr-1" /> Artigos no Catálogo
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Performance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-lg">
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ticket Médio</p>
           <div className="flex items-center justify-between">
              <span className="text-xl font-black">{symbol}{stats.avgTicket.toFixed(0)}</span>
              <Ticket size={16} className="text-emerald-400" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Margem Líquida</p>
           <div className="flex items-center justify-between">
              <span className="text-xl font-black text-slate-800">{stats.dailyProfitPercent.toFixed(1)}%</span>
              <Percent size={16} className="text-indigo-500" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendas (Qtd)</p>
           <div className="flex items-center justify-between">
              <span className="text-xl font-black text-slate-800">{stats.salesCount}</span>
              <ShoppingBag size={16} className="text-slate-400" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contas Pendentes</p>
           <div className="flex items-center justify-between">
              <span className="text-xl font-black text-red-500">{expenseStats.pendingCount}</span>
              <Receipt size={16} className="text-red-200" />
           </div>
        </div>
      </div>

      {/* Main Grid: Accounts & Appointments - Compact (320px) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[320px]">
          <div className="p-6 pb-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Receipt size={18} className="text-slate-400 mr-2" /> Contas a Pagar
                  </h3>
                  {expenseStats.totalPending > 0 && (
                    <span className="text-[10px] font-bold text-red-500 mt-0.5 block">
                      Vencendo: <span className="font-black">{symbol} {expenseStats.totalPending.toFixed(0)}</span>
                    </span>
                  )}
                </div>
                <button onClick={() => setShowExpenseForm(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-xl transition-all active:scale-95">
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                {expenseStats.list.length > 0 ? expenseStats.list.map(exp => (
                  <div key={exp.id} onClick={() => { setSelectedExpense(exp); setShowPaymentSelector(true); }} className="group border border-slate-50 rounded-xl p-3 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all cursor-pointer flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${exp.type === 'fixed' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200 text-slate-500'}`}>
                         {exp.type === 'fixed' ? <Clock size={16}/> : <Briefcase size={16}/>}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 text-xs">{exp.name}</div>
                        <div className={`text-[8px] font-bold ${exp.statusColor} mt-0.5 w-fit px-1.5 py-0.5 rounded-full`}>{exp.statusLabel}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="font-black text-slate-900 text-xs">{symbol}{exp.amount.toFixed(0)}</div>
                       <div className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 group-hover:text-emerald-500 transition-colors">Pagar</div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <CheckCircle size={32} />
                    <p className="text-[10px] font-black mt-1 uppercase">Tudo liquidado</p>
                  </div>
                )}
              </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[320px]">
          <div className="p-6 pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Calendar size={18} className="text-indigo-400 mr-2" /> Agendamentos
                </h3>
                <button onClick={() => setShowApptForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center transition-all active:scale-95 shadow-md">
                  <Plus size={12} className="mr-1" /> Novo
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                {todaysAppointments.length > 0 ? todaysAppointments.map(appt => (
                  <div key={appt.id} className="border border-slate-50 rounded-xl p-3 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1.5">
                       <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">{appt.time}</span>
                       <div className="flex gap-1.5">
                          <button onClick={() => { onUpdateAppointmentStatus?.(appt.id, 'confirmed'); if(appt.customerPhone) window.open(`https://wa.me/258${appt.customerPhone.replace(/\s/g,'')}?text=Confirmado!`, '_blank'); }} className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"><CheckCircle size={12}/></button>
                          <button onClick={() => { setAppointmentToComplete(appt); setShowApptPaymentModal(true); }} className="p-1 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"><Receipt size={12}/></button>
                       </div>
                    </div>
                    <div className="font-bold text-slate-800 text-xs truncate">{appt.customerName}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-medium flex items-center truncate">
                       <Briefcase size={8} className="mr-1 opacity-50"/> {appt.serviceNames?.join(', ')}
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <Clock size={32} />
                    <p className="text-[10px] font-black mt-1 uppercase tracking-widest">Sem marcações para hoje</p>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* Advanced Performance Analytics: Sales & Clients Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Daily Sales Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 lg:col-span-2 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-bold text-slate-800 flex items-center"><ShoppingBag className="mr-2 text-emerald-500" size={20} />Top Vendas (Hoje)</h3>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Volumes por Artigo</div>
          </div>
          <div className="h-64 w-full">
            {stats.salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.salesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                    {stats.salesData.map((_, index) => <Cell key={`cell-${index}`} fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold"><Activity size={40} className="mb-2 opacity-20" />Sem vendas hoje</div>}
          </div>
        </div>

        {/* Top Clients Ranking */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px]">
           <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center mb-1"><Users className="mr-2 text-indigo-500" size={20} />Top Clientes</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maiores compradores do dia</p>
           </div>
           
           <div className="space-y-4">
              {stats.clientsData.length > 0 ? stats.clientsData.map((client, idx) => (
                 <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                          {idx + 1}
                       </div>
                       <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{client.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{symbol}{client.value.toFixed(0)}</span>
                 </div>
              )) : (
                 <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px]">A aguardar clientes...</div>
              )}
           </div>

           {stats.clientOfTheDay && (
              <div className="mt-8 pt-6 border-t border-dashed border-slate-100">
                 <div className="bg-indigo-50 p-4 rounded-3xl flex items-center gap-4 border border-indigo-100">
                    <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm"><Award size={20}/></div>
                    <div>
                       <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Cliente do Dia</p>
                       <p className="text-sm font-black text-indigo-700">{stats.clientOfTheDay.name}</p>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Cash Flow History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 lg:col-span-2 h-[400px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center"><TrendingUp className="mr-2 text-indigo-500" size={20} />Balanço Semanal</h3>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Fluxo de Caixa</div>
           </div>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={stats.cashFlowData}>
                 <defs>
                   <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                   <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                 <YAxis hide />
                 <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} itemStyle={{fontSize: '11px', fontWeight: 'bold'}} />
                 <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '20px'}} />
                 <Area type="monotone" dataKey="entradas" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" />
                 <Area type="monotone" dataKey="saidas" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSaidas)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[400px]">
          <div className="flex items-center space-x-1 mb-6 bg-slate-100 p-1 rounded-2xl">
             <button onClick={() => setRightPanelTab('sales')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-all ${rightPanelTab === 'sales' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Vendas</button>
             <button onClick={() => setRightPanelTab('outflows')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-all ${rightPanelTab === 'outflows' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>Saídas</button>
             <button onClick={() => setRightPanelTab('audit')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-all ${rightPanelTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Log</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {rightPanelTab === 'sales' && sales.filter(s => s.date.startsWith(todayStr)).map((transaction) => (
              <div key={transaction.id} onClick={() => setSelectedTransaction({ transactionId: transaction.transactionId, date: transaction.date, totalRevenue: transaction.totalRevenue, totalItems: transaction.quantity, items: [transaction], operatorName: transaction.operatorName, paymentMethod: transaction.paymentMethod, customerName: transaction.customerName })} className="flex justify-between items-center p-3 rounded-2xl border border-slate-50 hover:border-slate-200 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100"><ArrowUpRight size={14} /></div>
                  <div><p className="font-bold text-slate-800 text-xs line-clamp-1">{transaction.itemName}</p><div className="flex items-center text-[9px] font-bold text-slate-400 uppercase">{getMethodIcon(transaction.paymentMethod)} <span className="ml-1">{transaction.paymentMethod}</span></div></div>
                </div>
                <div className="text-right"><p className="font-black text-slate-900 text-xs">{symbol}{(transaction.totalRevenue * rate).toFixed(0)}</p></div>
              </div>
            ))}
            {rightPanelTab === 'outflows' && stats.todaysPaidExpenses.map((expense) => (
              <div key={expense.id} onClick={() => setSelectedExpenseReceipt(expense)} className="flex justify-between items-center p-3 rounded-2xl border border-slate-50 hover:border-red-200 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100"><ArrowDownCircle size={14} /></div>
                  <div><p className="font-bold text-slate-800 text-xs line-clamp-1">{expense.name}</p><div className="flex items-center text-[9px] font-bold text-slate-400 uppercase">{getMethodIcon(expense.paymentMethod || 'cash')} <span className="ml-1">{expense.paymentMethod || 'Numerário'}</span></div></div>
                </div>
                <div className="text-right"><p className="font-black text-red-600 text-xs">{symbol}{(expense.amount * rate).toFixed(0)}</p></div>
              </div>
            ))}
            {rightPanelTab === 'audit' && logs.slice(0, 20).map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 text-[10px]">
                 <div className="flex justify-between mb-1"><span className={`font-black uppercase ${log.action === 'SALE' ? 'text-emerald-500' : log.action === 'EXPENSE' ? 'text-red-500' : 'text-indigo-500'}`}>{log.action}</span><span className="text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span></div>
                 <p className="text-slate-600 font-medium leading-tight">{log.details}</p>
                 <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Op: {log.operatorName}</p>
              </div>
            ))}
            {((rightPanelTab === 'outflows' && stats.todaysPaidExpenses.length === 0) || (rightPanelTab === 'sales' && sales.filter(s => s.date.startsWith(todayStr)).length === 0)) && (
               <div className="text-center py-12 text-slate-300 font-bold text-[10px] uppercase tracking-widest">Sem movimentos</div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      {/* Receipts, Forms etc follow here, same logic as before but showing time/date in sale receipts */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[90vh]">
            <div className="bg-emerald-500 p-8 text-white text-center">
              <Receipt size={40} className="mx-auto mb-4 opacity-40" />
              <h3 className="text-2xl font-black font-heading uppercase tracking-tighter">Recibo Digital</h3>
              <p className="text-emerald-100 text-[10px] font-mono mt-1">ID: {selectedTransaction.transactionId.toUpperCase()}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
               <div className="border-b border-dashed border-slate-200 pb-4">
                  {selectedTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 text-sm font-bold text-slate-600">
                       <span className="flex-1 pr-4">{item.quantity}x {item.itemName}</span>
                       <span className="text-slate-900">{symbol}{(item.totalRevenue * rate).toFixed(0)}</span>
                    </div>
                  ))}
               </div>
               <div className="pt-2">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Líquido</span>
                     <span className="text-2xl font-black text-emerald-600">{symbol}{(selectedTransaction.totalRevenue * rate).toFixed(0)}</span>
                  </div>
                  <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex flex-col gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <div className="flex justify-between"><span>Método:</span> <span>{selectedTransaction.paymentMethod}</span></div>
                     <div className="flex justify-between"><span>Operador:</span> <span>{selectedTransaction.operatorName}</span></div>
                     <div className="flex justify-between"><span>Data/Hora:</span> <span>{new Date(selectedTransaction.date).toLocaleString('pt-PT')}</span></div>
                  </div>
               </div>
            </div>
            <button onClick={() => setSelectedTransaction(null)} className="p-6 w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs">Concluído</button>
          </div>
        </div>
      )}

      {/* Appointment Charge Modal */}
      {showApptPaymentModal && appointmentToComplete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 bg-indigo-600 text-white text-center">
                  <h3 className="font-bold text-lg font-heading tracking-tight">Fechar Agendamento</h3>
                  <p className="text-indigo-100 text-xs mt-2 uppercase font-bold tracking-widest">{appointmentToComplete.customerName}</p>
                  <p className="text-2xl font-black mt-4">{symbol} {appointmentToComplete.totalAmount?.toFixed(0)}</p>
               </div>
               <div className="p-6 grid grid-cols-2 gap-3 bg-slate-50">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => { onCompleteAppointment?.(appointmentToComplete.id, m as PaymentMethod); setShowApptPaymentModal(false); }} className="flex flex-col items-center p-4 bg-white hover:bg-emerald-50 rounded-2xl border border-white hover:border-emerald-200 transition-all shadow-sm group">
                       <div className="group-hover:scale-110 transition-transform">{getMethodIcon(m)}</div>
                       <span className="text-[10px] font-black uppercase mt-2 text-slate-600">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowApptPaymentModal(false)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest bg-white border-t border-slate-50">Cancelar</button>
            </div>
        </div>
      )}

      {/* Expense Payment Selector */}
      {showPaymentSelector && selectedExpense && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 text-center border-b border-slate-50">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${selectedExpense.type === 'fixed' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'}`}>
                     <CardIcon size={32} />
                  </div>
                  <h3 className="font-bold text-xl text-slate-800">Liquidando Despesa</h3>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{selectedExpense.name}</p>
                  <p className="text-3xl font-black text-slate-900 mt-4">{symbol} {selectedExpense.amount.toFixed(0)}</p>
               </div>
               <div className="p-8 grid grid-cols-2 gap-4 bg-slate-50">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => handlePayExpense(m as PaymentMethod)} className="flex flex-col items-center p-5 bg-white hover:bg-emerald-50 rounded-3xl border border-white hover:border-emerald-200 transition-all shadow-sm active:scale-95 group">
                       <div className="group-hover:scale-110 transition-transform">{getMethodIcon(m)}</div>
                       <span className="text-[10px] font-black uppercase mt-2 text-slate-600">{m}</span>
                    </button>
                  ))}
               </div>
               <div className="p-4 bg-white text-center">
                  <p className="text-[9px] text-slate-400 font-bold mb-4 uppercase">Autorizado por: {currentOperator}</p>
                  <button onClick={() => setShowPaymentSelector(false)} className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
               </div>
            </div>
         </div>
      )}

      {/* Forms (Minimal Change to Keep Focus) */}
      {showExpenseForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                  <div className="flex items-center"><AlertOctagon size={24} className="mr-3 text-red-500" /><h3 className="font-bold text-xl font-heading">Registar Saída</h3></div>
                  <button onClick={() => setShowExpenseForm(false)} className="hover:bg-slate-800 p-2 rounded-2xl transition-colors"><X size={24}/></button>
               </div>
               <form onSubmit={handleExpenseSubmit} className="p-8 space-y-6 bg-white">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Descrição</label>
                    <input required className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-sm font-bold" value={expenseFormData.name} onChange={e => setExpenseFormData({...expenseFormData, name: e.target.value})} placeholder="Ex: Renda" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Valor ({symbol})</label>
                        <input type="number" step="1" required className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-sm font-black" value={expenseFormData.amount} onChange={e => setExpenseFormData({...expenseFormData, amount: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tipo</label>
                        <select className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-sm font-bold" value={expenseFormData.type} onChange={e => setExpenseFormData({...expenseFormData, type: e.target.value as any})}>
                           <option value="fixed">Fixa (Mensal)</option>
                           <option value="variable">Variável (Pontual)</option>
                        </select>
                     </div>
                  </div>
                  {expenseFormData.type === 'fixed' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Dia Vencimento</label>
                      <input type="number" min="1" max="31" className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-sm font-bold" value={expenseFormData.paymentDay} onChange={e => setExpenseFormData({...expenseFormData, paymentDay: e.target.value})} />
                    </div>
                  )}
                  <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black shadow-2xl transition-all uppercase tracking-widest text-xs active:scale-95">Adicionar Despesa</button>
               </form>
            </div>
         </div>
      )}

      {/* Appointment Form */}
      {showApptForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
                  <div className="flex items-center"><Calendar size={24} className="mr-3" /><h3 className="font-bold text-xl font-heading">Novo Agendamento</h3></div>
                  <button onClick={() => setShowApptForm(false)} className="hover:bg-indigo-700 p-2 rounded-2xl transition-colors"><X size={24}/></button>
               </div>
               <form onSubmit={handleApptSubmit} className="p-8 space-y-6 bg-white overflow-y-auto max-h-[80vh] custom-scrollbar">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</span>
                       <button type="button" onClick={() => setApptFormData({...apptFormData, isNewCustomer: !apptFormData.isNewCustomer})} className="text-[10px] font-bold text-indigo-600 flex items-center">
                          {apptFormData.isNewCustomer ? "Selecionar Existente" : <><UserPlus size={12} className="mr-1"/> Registar Novo</>}
                       </button>
                    </div>
                    {apptFormData.isNewCustomer ? (
                       <div className="grid grid-cols-2 gap-3">
                          <input placeholder="Nome" required className="p-4 border-none rounded-2xl bg-white text-sm shadow-sm" value={apptFormData.newName} onChange={e => setApptFormData({...apptFormData, newName: e.target.value})} />
                          <input placeholder="Telemóvel" required className="p-4 border-none rounded-2xl bg-white text-sm shadow-sm" value={apptFormData.newPhone} onChange={e => setApptFormData({...apptFormData, newPhone: e.target.value})} />
                       </div>
                    ) : (
                       <div className="relative">
                          <input type="text" placeholder="Procurar cliente..." className="w-full p-4 pl-12 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 shadow-sm text-sm" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} />
                          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          {showCustomerDropdown && customerSearch && (
                             <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-40 overflow-y-auto z-50 p-2">
                                {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                   <button key={c.id} type="button" onClick={() => { setApptFormData({...apptFormData, customerId: c.id}); setCustomerSearch(c.name); setShowCustomerDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm rounded-xl transition-colors"><div className="font-bold text-slate-800">{c.name}</div><div className="text-[10px] text-slate-400">{c.phone}</div></button>
                                )) : <div className="p-3 text-xs text-slate-400 text-center">Não encontrado</div>}
                             </div>
                          )}
                       </div>
                    )}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Escolha os Serviços</span>
                     <div className="grid grid-cols-2 gap-3">
                        {services.map(s => (
                           <button key={s.id} type="button" onClick={() => toggleServiceSelection(s.id)} className={`p-4 rounded-2xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between h-24 ${apptFormData.serviceIds.includes(s.id) ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-white text-slate-500 hover:border-indigo-100 shadow-sm'}`}>
                              <span className="line-clamp-2">{s.name}</span>
                              <div className="flex justify-between items-center w-full mt-auto">
                                 <span className="opacity-60">{symbol}{s.sellingPrice.toFixed(0)}</span>
                                 {apptFormData.serviceIds.includes(s.id) && <CheckCircle size={16} />}
                              </div>
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Data</label><input type="date" required className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-sm" value={apptFormData.date} onChange={(e) => setApptFormData({...apptFormData, date: e.target.value})} /></div>
                     <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Hora</label><input type="time" required className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-sm" value={apptFormData.time} onChange={(e) => setApptFormData({...apptFormData, time: e.target.value})} /></div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl transition-all uppercase tracking-widest text-sm active:scale-95">Confirmar Agendamento</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
