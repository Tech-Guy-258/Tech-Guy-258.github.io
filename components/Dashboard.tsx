
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
    alertThreshold: 3 // Padrão: 3 dias antes
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
    const dailyOutflows = Object.values(outflowChannelFlow).reduce((a, b) => a + b, 0);
    const dailyNetBalance = dailyRevenue - dailyOutflows;

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
      dailyRevenue, dailyProfitRaw, dailyOutflows, dailyNetBalance, 
      groupedSales, channelFlow, outflowChannelFlow,
      todayAppts, tomorrowAppts,
      allExpenses: (expenses || []).sort((a, b) => {
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

  const getExpenseAlertStatus = (e: Expense) => {
    if (e.isPaid && e.lastPaidDate?.startsWith(todayStr)) return 'paid';
    
    const dueDate = new Date(e.nextDueDate);
    dueDate.setHours(0,0,0,0);
    const today = new Date(todayStr);
    today.setHours(0,0,0,0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= (e.alertThreshold || 0)) return 'warning';
    return 'pending';
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

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 pb-24 md:pb-10 max-w-[1600px] mx-auto animate-[fadeIn_0.4s_ease-out] bg-slate-50/30 text-gray-900">
      
      {/* Header */}
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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 xl:col-span-2 flex flex-col justify-center">
           <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><TrendingUp size={24}/></div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Faturação Hoje</span>
           </div>
           <p className="text-5xl font-black font-heading text-slate-900">{symbol} {stats.dailyRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-[1.5rem]"><ArrowDownCircle size={24}/></div>
              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Saídas Hoje</span>
           </div>
           <p className="text-4xl font-black font-heading text-slate-900">{symbol} {stats.dailyOutflows.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl group flex flex-col justify-center">
           <div className="flex justify-between items-start mb-4">
              <div className="p-4 bg-emerald-500 text-white rounded-[1.5rem] shadow-lg"><Wallet size={24}/></div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Saldo em Caixa</span>
           </div>
           <p className="text-4xl font-black font-heading text-white">{symbol} {stats.dailyNetBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gestão de Despesas com Alertas */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[600px]">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                 <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg"><Calculator size={24} /></div>
                 <div><h4 className="text-xl font-black text-slate-800 font-heading">Saídas & Alertas</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestão de Vencimentos</p></div>
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
                             {isPaidToday && <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle size={10} /> PAGO</span>}
                             {status === 'overdue' && <span className="text-[9px] font-black text-red-600 flex items-center gap-1"><AlertTriangle size={10} /> VENCIDO</span>}
                             {status === 'warning' && <span className="text-[9px] font-black text-amber-600 flex items-center gap-1"><Clock size={10} /> VENCE EM BREVE</span>}
                             <span className="text-[9px] font-bold text-slate-400">Vencimento: {new Date(e.nextDueDate).toLocaleDateString()}</span>
                          </div>
                       </div>
                       <p className={`text-sm font-black ml-4 shrink-0 ${isPaidToday ? 'text-emerald-600' : status === 'overdue' ? 'text-red-600' : 'text-slate-900'}`}>{symbol} {e.amount.toLocaleString()}</p>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Auditoria */}
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[3rem] p-8 shadow-sm flex flex-col h-[600px]">
           <div className="flex border-b border-slate-100 mb-6 gap-8">
              <button onClick={() => setRightPanelTab('sales')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${rightPanelTab === 'sales' ? 'text-slate-900 border-b-4 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Vendas</button>
              <button onClick={() => setRightPanelTab('audit')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${rightPanelTab === 'audit' ? 'text-slate-900 border-b-4 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Auditoria</button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {rightPanelTab === 'sales' ? (
                stats.groupedSales.map((group, idx) => (
                  <div key={idx} onClick={() => setViewingReceiptGroup(group)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-300 transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all"><Receipt size={20}/></div>
                        <div><p className="font-black text-slate-800 text-sm truncate">TX #{group[0].transactionId.slice(0,8)}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDateTime(group[0].date).time}</p></div>
                     </div>
                     <p className="font-black text-slate-900 text-sm">{symbol} {group.reduce((acc, s) => acc + (Number(s.totalRevenue) * rate), 0).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                (logs || []).slice(0, 50).map(log => (
                  <div key={log.id} onClick={() => setViewingLog(log)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm cursor-pointer hover:border-blue-200 transition-all">
                     <div className={`p-3 rounded-2xl ${log.action === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}><Activity size={18}/></div>
                     <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{log.details}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDateTime(log.timestamp).time}</p></div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* Modal Nova Despesa */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
              <div className="p-8 bg-red-600 text-white flex justify-between items-center">
                 <h3 className="font-black text-xl font-heading">Registar Saída</h3>
                 <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveNewExpense} className="p-8 space-y-5">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Descrição</label>
                    <input placeholder="Ex: Renda" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner" value={newExpense.name} onChange={e => setNewExpense({...newExpense, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Valor ({symbol})</label>
                    <input type="number" placeholder="0.00" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
                 </div>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setNewExpense({...newExpense, type: 'fixed'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newExpense.type === 'fixed' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Fixa</button>
                    <button type="button" onClick={() => setNewExpense({...newExpense, type: 'variable'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newExpense.type === 'variable' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Pontual</button>
                 </div>

                 {newExpense.type === 'fixed' && (
                    <div className="space-y-4 animate-[fadeIn_0.3s]">
                       <div>
                          <label className="text-[10px] font-black uppercase text-red-600 mb-2 block">Data Limite / Vencimento</label>
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

                 <button type="submit" className="w-full py-5 bg-red-600 text-white font-black rounded-3xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Registar Saída</button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Ações Despesa */}
      {showExpenseActionModal && selectedExpense && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Calculator size={40}/></div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading">{selectedExpense.name}</h3>
                  <p className="text-4xl font-black text-red-600 mt-2">{symbol} {selectedExpense.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest">Vencimento: {new Date(selectedExpense.nextDueDate).toLocaleDateString()}</p>
               </div>
               <div className="p-8 pt-0 grid grid-cols-2 gap-3">
                  <button onClick={() => { onDeleteExpense?.(selectedExpense.id); setShowExpenseActionModal(false); }} className="py-4 bg-slate-50 text-red-400 font-black rounded-2xl text-[10px] uppercase">Eliminar</button>
                  <button onClick={() => setShowPaymentSelector(true)} className="py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg">Pagar Agora</button>
               </div>
               <button onClick={() => setShowExpenseActionModal(false)} className="w-full py-5 text-slate-400 font-black text-[10px] uppercase border-t">Fechar</button>
            </div>
         </div>
      )}

      {/* Seletor de Pagamento */}
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

      {/* Confirmação Final Pagamento */}
      {expensePaymentToConfirm && (
         <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
               <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
               <h3 className="text-lg font-black text-slate-800">Confirmar Saída?</h3>
               <p className="text-xs text-slate-500 mt-2">Deseja autorizar o pagamento de <span className="font-black text-slate-900">{symbol} {expensePaymentToConfirm.expense.amount.toLocaleString()}</span> via <span className="font-black uppercase text-emerald-600">{expensePaymentToConfirm.method}</span>?</p>
               <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => setExpensePaymentToConfirm(null)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase">Voltar</button>
                  <button onClick={handleFinalExpensePayment} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-200">Confirmar</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default Dashboard;
