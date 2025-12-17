
import React, { useMemo, useState } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, AuditLogEntry, Expense, PaymentMethod } from '../types';
import { CURRENCY_SYMBOLS, generateID } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import { AlertTriangle, DollarSign, Package, Calendar, TrendingUp, Wallet, ShoppingBag, Clock, PlusCircle, X, Receipt, Activity, Smartphone, CreditCard, User, FileText, ChevronRight, Eye, Box, Briefcase, LayoutDashboard, AlertOctagon, ArrowRight, Lock, CheckCircle, Award, TrendingDown, CheckSquare, Square, Trash2, Plus, Save, Edit2 } from 'lucide-react';

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
  onSaveExpense?: (expense: Expense) => void; 
  onPayExpense?: (expense: Expense, method?: PaymentMethod) => void;
  onDeleteExpense?: (id: string) => void;
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

type DashboardView = 'general' | 'product' | 'service';

const Dashboard: React.FC<DashboardProps> = ({ items, sales = [], logs = [], currency, exchangeRates, onRestock, onCloseRegister, activeBusinessName = "Negócio", currentOperator = "Operador", expenses = [], onSaveExpense, onPayExpense, onDeleteExpense }) => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  const [viewMode, setViewMode] = useState<DashboardView>('general'); 

  const [restockModal, setRestockModal] = useState<{isOpen: boolean, item: InventoryItem | null}>({
    isOpen: false, item: null
  });
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [restockQty, setRestockQty] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<GroupedTransaction | null>(null);
  
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  
  // Tabs: Sales | Expenses History | Audit
  const [rightPanelTab, setRightPanelTab] = useState<'sales' | 'expenses' | 'audit'>('sales');

  // --- EXPENSE STATE & MODALS ---
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null); // For Details Modal
  
  // Payment Method Modal State
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);

  // Form State
  const [expenseFormData, setExpenseFormData] = useState<{id?: string, name: string, amount: string, type: 'fixed' | 'variable', paymentDay: string, isPaid: boolean, paymentMethod?: PaymentMethod}>({
    name: '', amount: '', type: 'fixed', paymentDay: '1', isPaid: false, paymentMethod: undefined
  });

  // --- EXPENSE LOGIC ---
  const expenseStats = useMemo(() => {
     const safeExpenses = Array.isArray(expenses) ? expenses : [];
     const today = new Date();
     
     // Unpaid (for Hero Card)
     const unpaidExpenses = safeExpenses
        .filter(e => !e.isPaid)
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

     // History (for Right Panel)
     const historyExpenses = safeExpenses
        .filter(e => e.isPaid)
        .sort((a, b) => new Date(b.lastPaidDate || b.nextDueDate).getTime() - new Date(a.lastPaidDate || a.nextDueDate).getTime());

     const totalPending = unpaidExpenses.reduce((acc, curr) => acc + curr.amount, 0);

     // Process for Display (Color coding)
     const displayExpenses = unpaidExpenses.map(exp => {
           const dueDate = new Date(exp.nextDueDate);
           const dueZero = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
           const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
           
           const diffTime = dueZero.getTime() - todayZero.getTime();
           const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           
           let statusColor = '';
           let statusLabel = '';

           if (daysLeft < 0) {
              statusColor = 'text-red-600 bg-red-50 border-red-100';
              statusLabel = `Atrasado ${Math.abs(daysLeft)}d`;
           } else if (daysLeft === 0) {
              statusColor = 'text-red-600 bg-red-50 border-red-100';
              statusLabel = `Hoje!`;
           } else if (daysLeft <= 3) {
              statusColor = 'text-orange-600 bg-orange-50 border-orange-100';
              statusLabel = `${daysLeft} dias`;
           } else {
              statusColor = 'text-gray-600 bg-gray-50 border-gray-200';
              statusLabel = dueDate.toLocaleDateString('pt-PT');
           }

           return { ...exp, statusColor, statusLabel };
        });

     return {
        list: displayExpenses,
        history: historyExpenses,
        totalPending
     };
  }, [expenses]);

  const stats = useMemo(() => {
    // Safety check for items array
    const safeItems = Array.isArray(items) ? items : [];
    const safeSales = Array.isArray(sales) ? sales : [];

    const filteredItems = safeItems.filter(i => {
       if (viewMode === 'general') return true;
       return i.type === viewMode;
    });

    const filteredSales = safeSales.filter(s => {
       if (viewMode === 'general') return true;
       const originalItem = safeItems.find(i => i.id === s.itemId);
       return originalItem ? originalItem.type === viewMode : true; 
    });

    const totalItems = filteredItems.length;
    
    const totalValueEUR = filteredItems.reduce((acc, item) => {
      if (item.type === 'service') return acc;
      return acc + (item.price * item.quantity);
    }, 0);
    const totalValue = totalValueEUR * rate;
    
    const lowStockItems = filteredItems.filter(item => item.type === 'product' && item.quantity <= item.lowStockThreshold);
    const lowStockCount = lowStockItems.length;
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringCount = filteredItems.filter(item => {
      if (!item.expiryDate || item.type === 'service') return false;
      const expDate = new Date(item.expiryDate);
      return expDate >= today && expDate <= nextWeek;
    }).length;

    const todayStr = today.toISOString().split('T')[0];
    const todaysSales = filteredSales.filter(s => s.date && s.date.startsWith(todayStr));
    
    const dailyRevenueBase = todaysSales.reduce((acc, s) => acc + s.totalRevenue, 0);
    const dailyProfitBase = todaysSales.reduce((acc, s) => acc + s.totalProfit, 0);

    const dailyRevenue = dailyRevenueBase * rate;
    const dailyProfit = dailyProfitBase * rate;

    const paymentBreakdown = { cash: 0, mpesa: 0, emola: 0, card: 0 };

    todaysSales.forEach(s => {
      const method = s.paymentMethod || 'cash';
      const amount = s.totalRevenue * rate;
      if (paymentBreakdown[method] !== undefined) {
        paymentBreakdown[method] += amount;
      } else {
        paymentBreakdown['cash'] += amount; 
      }
    });

    const salesByProduct: Record<string, number> = {};
    todaysSales.forEach(sale => {
      let name = String(sale.itemName || 'Produto');
      if (sale.itemSize && sale.itemUnit) {
         name = `${name} (${sale.itemSize}${sale.itemUnit})`;
      }
      salesByProduct[name] = (salesByProduct[name] || 0) + Number(sale.quantity);
    });
    
    const salesData = Object.entries(salesByProduct)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { 
      totalItems, totalValue, lowStockItems, lowStockCount, expiringCount, dailyRevenue, dailyProfit, salesData, paymentBreakdown, filteredItems
    };
  }, [items, sales, rate, viewMode]);

  const recentTransactions = useMemo(() => {
    const groups = new Map<string, GroupedTransaction>();
    const safeSales = Array.isArray(sales) ? sales : [];
    
    const filteredSalesRaw = safeSales.filter(s => {
       if (viewMode === 'general') return true;
       const originalItem = items.find(i => i.id === s.itemId);
       return originalItem ? originalItem.type === viewMode : true;
    });

    filteredSalesRaw.forEach(sale => {
      const tId = String(sale.transactionId || sale.id || 'unknown');
      if (!groups.has(tId)) {
        groups.set(tId, {
          transactionId: tId, date: sale.date || new Date().toISOString(), totalRevenue: 0, totalItems: 0, items: [], operatorName: sale.operatorName || 'Admin', paymentMethod: sale.paymentMethod || 'cash', customerName: sale.customerName 
        });
      }
      const group = groups.get(tId)!;
      group.totalRevenue += sale.totalRevenue;
      group.totalItems += Number(sale.quantity);
      group.items.push(sale);
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [sales, viewMode, items]);

  const filteredLogs = useMemo(() => {
    if (viewMode === 'general') return logs;
    const relevantItemNames = items.filter(i => i.type === viewMode).map(i => i.name.toLowerCase());
    return logs.filter(log => {
      const detailsLower = log.details.toLowerCase();
      return relevantItemNames.some(name => detailsLower.includes(name));
    });
  }, [logs, viewMode, items]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (restockModal.item && onRestock && restockQty) {
      onRestock(restockModal.item.id, Number(restockQty));
      setRestockModal({ isOpen: false, item: null });
      setRestockQty('');
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

  // --- EXPENSE HANDLERS ---
  const openNewExpenseModal = () => {
     setExpenseFormData({ name: '', amount: '', type: 'fixed', paymentDay: '1', isPaid: false, paymentMethod: undefined });
     setShowExpenseForm(true);
  };

  const openEditExpenseModal = (expense: Expense) => {
     setExpenseFormData({
        id: expense.id,
        name: expense.name,
        amount: String(expense.amount),
        type: expense.type,
        paymentDay: String(expense.paymentDay || '1'),
        isPaid: expense.isPaid,
        paymentMethod: expense.paymentMethod
     });
     setViewingExpense(null); // Close detail view
     setShowExpenseForm(true);
  };

  const initiatePayment = (expense: Expense) => {
     setExpenseToPay(expense);
     setShowPaymentMethodModal(true);
     setViewingExpense(null);
  };

  const confirmPayment = (method: PaymentMethod) => {
     if (expenseToPay && onPayExpense) {
        onPayExpense(expenseToPay, method);
        setShowPaymentMethodModal(false);
        setExpenseToPay(null);
     }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!expenseFormData.name) {
        alert("O nome da despesa é obrigatório.");
        return;
     }
     
     // Robust parsing
     let amountStr = expenseFormData.amount;
     if (typeof amountStr === 'string') {
        amountStr = amountStr.replace(',', '.');
     }
     const amount = parseFloat(amountStr);
     
     if (isNaN(amount) || amount <= 0) {
        alert("Insira um valor válido para a despesa.");
        return;
     }
     
     if (!expenseFormData.id && expenseFormData.isPaid && !expenseFormData.paymentMethod) {
        alert("Por favor selecione o método de pagamento.");
        return;
     }

     if (onSaveExpense) {
        try {
           const today = new Date();
           let nextDueDateStr = today.toISOString();

           if (expenseFormData.type === 'fixed') {
              const paymentDay = parseInt(expenseFormData.paymentDay);
              const targetDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
              if (today.getDate() > paymentDay && !expenseFormData.id && !expenseFormData.isPaid) {
                 targetDate.setMonth(targetDate.getMonth() + 1);
              }
              nextDueDateStr = targetDate.toISOString();
           }

           const finalMethod = expenseFormData.isPaid ? (expenseFormData.paymentMethod || 'cash') : undefined;

           const expense: Expense = {
              id: expenseFormData.id || generateID(),
              name: expenseFormData.name,
              amount: amount,
              type: expenseFormData.type,
              paymentDay: expenseFormData.type === 'fixed' ? parseInt(expenseFormData.paymentDay) : undefined,
              nextDueDate: nextDueDateStr,
              isPaid: expenseFormData.isPaid,
              lastPaidDate: expenseFormData.isPaid ? today.toISOString() : undefined,
              paymentMethod: finalMethod
           };

           onSaveExpense(expense);
           setShowExpenseForm(false);
        } catch (err) {
           console.error("Critical error in form submit:", err);
           alert("Erro inesperado ao guardar.");
        }
     }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpenseFormData(prev => ({...prev, amount: e.target.value}));
  };

  return (
    <div className="p-4 md:p-8 space-y-8 relative pb-24 md:pb-8 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 font-heading">Dashboard</h2>
          <p className="text-gray-500 mt-1">Visão geral do negócio</p>
        </div>
        {onCloseRegister && (
          <button onClick={() => setShowCloseRegisterModal(true)} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black transition-colors flex items-center">
             <Lock size={18} className="mr-2" /> Fechar Caixa
          </button>
        )}
      </div>

      {/* --- HERO EXPENSE SECTION --- */}
      <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden mb-6 relative">
         <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
         <div className="p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <AlertOctagon size={20} className="text-red-500 mr-2" /> 
                  Contas a Pagar
                  {expenseStats.totalPending > 0 && <span className="ml-3 text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Total: {symbol} {expenseStats.totalPending.toFixed(2)}</span>}
               </h3>
               <button 
                  onClick={openNewExpenseModal}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors shadow-sm"
               >
                  <Plus size={16} className="mr-2" /> Nova Despesa
               </button>
            </div>

            {expenseStats.list.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {expenseStats.list.map(exp => (
                     <div 
                        key={exp.id} 
                        onClick={() => setViewingExpense(exp)}
                        className="border rounded-2xl p-4 flex flex-col justify-between hover:border-red-300 transition-colors bg-white shadow-sm cursor-pointer group relative overflow-hidden"
                     >
                        <div className="flex justify-between items-start mb-2">
                           <div className="font-bold text-gray-800 line-clamp-1" title={exp.name}>{exp.name}</div>
                           <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${exp.statusColor}`}>
                              {exp.statusLabel}
                           </div>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                           <div className="text-xl font-bold text-gray-900">{symbol} {exp.amount.toFixed(2)}</div>
                           <div className="text-gray-300 group-hover:text-red-500 transition-colors">
                              <ChevronRight size={20} />
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <div className="bg-emerald-100 p-3 rounded-full mb-3 text-emerald-600">
                     <CheckCircle size={28} />
                  </div>
                  <p className="text-gray-800 font-bold">Tudo em dia!</p>
                  <p className="text-sm text-gray-500">Nenhuma conta pendente para pagamento.</p>
               </div>
            )}
         </div>
      </div>
      
      {/* CENTRALIZED TAB SELECTOR */}
      <div className="flex justify-center w-full mb-6">
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
             <button onClick={() => setViewMode('general')} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'general' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <LayoutDashboard size={16} className="mr-2" /> Geral
             </button>
             <button onClick={() => setViewMode('product')} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Box size={16} className="mr-2" /> Produtos
             </button>
             <button onClick={() => setViewMode('service')} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Briefcase size={16} className="mr-2" /> Serviços
             </button>
        </div>
      </div>
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Revenue */}
        <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Receita Hoje</p>
              <p className="text-3xl font-bold text-gray-800">{symbol} {stats.dailyRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="space-y-2 border-t border-gray-100 pt-3 mt-auto">
             <div className="flex justify-between items-center text-xs">
                <div className="flex items-center text-gray-600"><Wallet size={12} className="mr-2" /><span>Numerário</span></div>
                <span className="font-bold text-gray-800">{symbol} {stats.paymentBreakdown.cash.toFixed(2)}</span>
             </div>
          </div>
        </div>

        {/* Daily Profit */}
        <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Lucro Hoje</p>
              <p className={`text-3xl font-bold ${stats.dailyProfit < 0 ? 'text-red-600' : 'text-gray-800'}`}>{symbol} {stats.dailyProfit.toFixed(2)}</p>
              <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-full w-fit ${stats.dailyProfit < 0 ? 'text-red-600 bg-red-50' : 'text-indigo-600 bg-indigo-50'}`}>
                {stats.dailyProfit < 0 ? 'Margem Negativa' : 'Margem Saudável'}
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Wallet size={24} />
            </div>
          </div>
        </div>

        {/* Total Items Card */}
        <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                 {viewMode === 'service' ? 'Serviços' : (viewMode === 'product' ? 'Produtos' : 'Itens')}
              </p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalItems}</p>
              <button 
                onClick={() => { if (viewMode !== 'service' && stats.lowStockCount > 0) setShowLowStockModal(true); }}
                disabled={viewMode === 'service' || stats.lowStockCount === 0}
                className={`mt-2 text-xs font-medium px-2 py-1 rounded-full w-fit flex items-center transition-all ${
                   viewMode === 'service' ? 'bg-emerald-50 text-emerald-600 cursor-default' : stats.lowStockCount > 0 ? 'bg-red-50 text-red-600 cursor-pointer hover:bg-red-100 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-600 cursor-default'
                }`}
              >
                 {viewMode === 'service' ? 'Ativos' : (stats.lowStockCount > 0 ? <><AlertTriangle size={12} className="mr-1" />{stats.lowStockCount} Stock Baixo<ChevronRight size={12} className="ml-1 opacity-70" /></> : 'Stock Saudável')}
              </button>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl text-white shadow-lg shadow-orange-200">
              <Package size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <ShoppingBag className="mr-2 text-emerald-500" size={20} />
              Top {viewMode === 'general' ? 'Vendas' : (viewMode === 'product' ? 'Produtos' : 'Serviços')} (Hoje)
            </h3>
          </div>
          <div className="h-72 w-full">
            {stats.salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.salesData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: number) => [`${value} un`, 'Vendas']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {stats.salesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="bg-gray-50 p-4 rounded-full mb-3"><Activity size={32} className="opacity-20 text-gray-500" /></div>
                <p>Sem dados de vendas hoje.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Tabs for Sales / Expenses / Audit */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col h-[26rem]">
          
          <div className="flex items-center space-x-1 mb-4 bg-gray-100 p-1 rounded-xl">
             <button 
                onClick={() => setRightPanelTab('sales')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${rightPanelTab === 'sales' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Receipt size={14} className="mr-1.5" /> Vendas
             </button>
             <button 
                onClick={() => setRightPanelTab('expenses')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${rightPanelTab === 'expenses' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <TrendingDown size={14} className="mr-1.5" /> Histórico
             </button>
             <button 
                onClick={() => setRightPanelTab('audit')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${rightPanelTab === 'audit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <FileText size={14} className="mr-1.5" /> Logs
             </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {rightPanelTab === 'sales' && (
               recentTransactions.length > 0 ? (
                 recentTransactions.map((transaction) => (
                   <div key={transaction.transactionId} onClick={() => setSelectedTransaction(transaction)} className="flex justify-between items-center p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50/50 cursor-pointer transition-colors group border border-gray-100 hover:border-emerald-100">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-emerald-600 shadow-sm"><ShoppingBag size={16} /></div>
                       <div>
                         <div className="flex items-center">
                            <p className="font-bold text-gray-800 text-sm">#{transaction.transactionId.slice(0,6).toUpperCase()}</p>
                            <span className="text-[10px] text-gray-400 ml-2">{new Date(transaction.date).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>
                         </div>
                         <div className="flex items-center text-xs text-gray-500 mt-0.5">
                           {getMethodIcon(transaction.paymentMethod)}
                           <span className="ml-1 capitalize">{transaction.paymentMethod}</span>
                           <span className="mx-1">•</span>
                           <span>{transaction.totalItems} itens</span>
                         </div>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-bold text-gray-800 text-sm">{symbol} {(transaction.totalRevenue * rate).toFixed(2)}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                   <Receipt className="mb-2 opacity-20" size={32} />
                   Nenhuma venda recente.
                 </div>
               )
            )}

            {rightPanelTab === 'expenses' && (
               expenseStats.history.length > 0 ? (
                  expenseStats.history.map(exp => (
                     <div key={exp.id} className="p-3 rounded-2xl border flex justify-between items-center bg-gray-50 border-gray-100">
                        <div>
                           <p className="font-bold text-sm text-gray-700">{exp.name}</p>
                           <p className="text-[10px] text-gray-400 flex items-center mt-0.5">
                              <CheckCircle size={10} className="mr-1 text-emerald-500" /> 
                              {new Date(exp.lastPaidDate || exp.nextDueDate).toLocaleDateString()}
                              {exp.paymentMethod && <span className="ml-1 capitalize font-bold">({exp.paymentMethod})</span>}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="font-bold text-gray-800">{symbol} {exp.amount.toFixed(2)}</p>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                     <TrendingDown className="mb-2 opacity-20" size={32} />
                     <p>Sem histórico de pagamentos.</p>
                  </div>
               )
            )}

            {rightPanelTab === 'audit' && (
               filteredLogs && filteredLogs.length > 0 ? (
                 filteredLogs.map((log) => (
                   <div key={log.id} onClick={() => setSelectedLog(log)} className="flex flex-col p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                         <span className={`font-bold uppercase tracking-wider text-[10px] ${log.action === 'CREATE' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded' : log.action === 'DELETE' ? 'text-red-600 bg-red-50 px-1.5 py-0.5 rounded' : log.action === 'SALE' ? 'text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded' : log.action === 'UPDATE' ? 'text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded' : log.action === 'CLOSE_REGISTER' ? 'text-gray-100 bg-gray-800 px-1.5 py-0.5 rounded' : log.action === 'EXPENSE' ? 'text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' : 'text-gray-600'}`}>{log.action}</span>
                         <span className="text-gray-400">{new Date(log.timestamp).toLocaleString('pt-PT')}</span>
                      </div>
                      <p className="text-gray-700 font-medium mb-1 line-clamp-2">{log.details}</p>
                      <p className="text-gray-500 flex items-center justify-end text-[10px]"><User size={10} className="mr-1" /> {log.operatorName}</p>
                   </div>
                 ))
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                   <FileText className="mb-2 opacity-20" size={32} />
                   Nenhuma atividade registada.
                 </div>
               )
            )}
          </div>
        </div>
      </div>
      
      {/* --- ADD/EDIT EXPENSE FORM MODAL --- */}
      {showExpenseForm && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
                  <h3 className="font-bold text-lg font-heading">{expenseFormData.id ? 'Editar Despesa' : 'Nova Despesa'}</h3>
                  <button onClick={() => setShowExpenseForm(false)} className="hover:bg-gray-800 p-2 rounded-full transition-colors"><X size={20} /></button>
               </div>
               <form onSubmit={handleExpenseSubmit} className="p-6">
                  <div className="space-y-4 mb-6">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                        <input required placeholder="Ex: Energia, Transporte" className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 font-medium" value={expenseFormData.name} onChange={e => setExpenseFormData({...expenseFormData, name: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor ({symbol})</label>
                        <input 
                           type="text" 
                           inputMode="decimal"
                           required 
                           placeholder="0.00" 
                           className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 font-bold text-lg" 
                           value={expenseFormData.amount} 
                           onChange={handleAmountChange} 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                           <select className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 text-sm font-medium" value={expenseFormData.type} onChange={e => setExpenseFormData({...expenseFormData, type: e.target.value as 'fixed' | 'variable'})}>
                              <option value="fixed">Fixa (Mensal)</option>
                              <option value="variable">Variável (Pontual)</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{expenseFormData.type === 'fixed' ? 'Dia Vencimento' : 'Data Prevista'}</label>
                           {expenseFormData.type === 'fixed' ? (
                              <select className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 text-sm font-medium" value={expenseFormData.paymentDay} onChange={e => setExpenseFormData({...expenseFormData, paymentDay: e.target.value})}>
                                 {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>Dia {i+1}</option>)}
                              </select>
                           ) : (
                              <div className="flex items-center h-full pt-2">
                                 <span className="text-xs text-gray-400">Hoje</span>
                              </div>
                           )}
                        </div>
                     </div>
                     
                     {/* One-Time Payment Toggle & Method Selector */}
                     {expenseFormData.type === 'variable' && !expenseFormData.id && (
                        <div className="space-y-3">
                           <div className="flex items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer" onClick={() => setExpenseFormData(prev => ({...prev, isPaid: !prev.isPaid}))}>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${expenseFormData.isPaid ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                                 {expenseFormData.isPaid && <CheckCircle size={14} className="text-white" />}
                              </div>
                              <span className="text-sm font-bold text-emerald-800">Pago Imediatamente</span>
                           </div>

                           {/* Show Payment Methods if Paid Immediately */}
                           {expenseFormData.isPaid && (
                              <div className="grid grid-cols-4 gap-2 animate-[fadeIn_0.2s]">
                                 {(['cash', 'mpesa', 'emola', 'card'] as PaymentMethod[]).map(method => (
                                    <button 
                                       key={method}
                                       type="button"
                                       onClick={() => setExpenseFormData(prev => ({...prev, paymentMethod: method}))}
                                       className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                          expenseFormData.paymentMethod === method 
                                             ? 'bg-gray-800 border-gray-800 text-white' 
                                             : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                       }`}
                                    >
                                       {method === 'cash' ? <Wallet size={16} /> : method === 'card' ? <CreditCard size={16} /> : <Smartphone size={16} />}
                                       <span className="text-[9px] font-bold mt-1 capitalize">{method}</span>
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                     )}
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition-all flex items-center justify-center">
                    <Save size={18} className="mr-2" /> Guardar
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* --- PAYMENT METHOD MODAL (FOR EXISTING EXPENSES) --- */}
      {showPaymentMethodModal && expenseToPay && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
               <div className="p-5 border-b border-gray-100 text-center">
                  <h3 className="font-bold text-lg font-heading text-gray-900">Como foi pago?</h3>
                  <p className="text-gray-500 text-sm mt-1">{expenseToPay.name} - {symbol} {expenseToPay.amount.toFixed(2)}</p>
               </div>
               <div className="p-4 grid grid-cols-2 gap-3">
                  <button onClick={() => confirmPayment('cash')} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-gray-100 rounded-2xl transition-all group">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 group-hover:text-emerald-600 mb-2">
                        <Wallet size={20} />
                     </div>
                     <span className="font-bold text-gray-700 text-sm">Numerário</span>
                  </button>
                  <button onClick={() => confirmPayment('mpesa')} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-red-50 hover:border-red-200 border border-gray-100 rounded-2xl transition-all group">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 group-hover:text-red-600 mb-2">
                        <Smartphone size={20} />
                     </div>
                     <span className="font-bold text-gray-700 text-sm">M-Pesa</span>
                  </button>
                  <button onClick={() => confirmPayment('emola')} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border border-gray-100 rounded-2xl transition-all group">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 group-hover:text-indigo-600 mb-2">
                        <Smartphone size={20} />
                     </div>
                     <span className="font-bold text-gray-700 text-sm">E-Mola</span>
                  </button>
                  <button onClick={() => confirmPayment('card')} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-100 rounded-2xl transition-all group">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 group-hover:text-blue-600 mb-2">
                        <CreditCard size={20} />
                     </div>
                     <span className="font-bold text-gray-700 text-sm">Cartão</span>
                  </button>
               </div>
               <div className="p-3 border-t border-gray-100">
                  <button onClick={() => { setShowPaymentMethodModal(false); setExpenseToPay(null); }} className="w-full py-3 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-xl">Cancelar</button>
               </div>
            </div>
         </div>
      )}

      {/* --- VIEW EXPENSE DETAIL MODAL --- */}
      {viewingExpense && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                  <div>
                     <h3 className="font-bold text-xl text-gray-900">{viewingExpense.name}</h3>
                     <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mt-1">{viewingExpense.type === 'fixed' ? 'Despesa Fixa' : 'Despesa Variável'}</p>
                  </div>
                  <button onClick={() => setViewingExpense(null)} className="hover:bg-gray-100 p-2 rounded-full text-gray-500"><X size={24}/></button>
               </div>
               
               <div className="p-6 bg-gray-50">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center mb-6">
                     <p className="text-sm text-gray-500 mb-1">Valor a Pagar</p>
                     <p className="text-4xl font-bold text-gray-900">{symbol} {viewingExpense.amount.toFixed(2)}</p>
                     <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                        <Calendar size={12} className="mr-1.5" />
                        Vence: {new Date(viewingExpense.nextDueDate).toLocaleDateString()}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                     <button 
                        onClick={() => initiatePayment(viewingExpense)}
                        className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center"
                     >
                        <CheckCircle size={20} className="mr-2" /> Pagar Agora
                     </button>
                     
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                           onClick={() => openEditExpenseModal(viewingExpense)}
                           className="py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center"
                        >
                           <Edit2 size={18} className="mr-2" /> Editar
                        </button>
                        <button 
                           onClick={() => {
                              if (onDeleteExpense) {
                                 onDeleteExpense(viewingExpense.id);
                                 setViewingExpense(null);
                              }
                           }}
                           className="py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center"
                        >
                           <Trash2 size={18} className="mr-2" /> Eliminar
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- LOW STOCK ALERT MODAL (NEW) --- */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[85vh]">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-red-500 text-white shrink-0">
               <div>
                 <h3 className="font-bold text-lg font-heading">Stock Crítico</h3>
                 <p className="text-red-100 text-xs">Itens abaixo do nível mínimo ({stats.lowStockCount})</p>
               </div>
               <button onClick={() => setShowLowStockModal(false)} className="hover:bg-red-600 p-2 rounded-full transition-colors"><X size={20} /></button>
             </div>
             
             <div className="p-4 bg-gray-50 overflow-y-auto flex-1 custom-scrollbar">
                {stats.lowStockItems.length > 0 ? (
                   <div className="space-y-3">
                      {stats.lowStockItems.map(item => (
                         <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="bg-red-50 p-2 rounded-lg text-red-500"><AlertTriangle size={20} /></div>
                               <div>
                                  <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                     Stock: <span className="font-bold text-red-600">{item.quantity}</span> / Min: {item.lowStockThreshold}
                                  </p>
                               </div>
                            </div>
                            <button 
                               onClick={() => {
                                  setRestockModal({ isOpen: true, item: item });
                                  setShowLowStockModal(false);
                               }}
                               className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                            >
                               Repor
                            </button>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="text-center py-8 text-gray-400">
                      <CheckCircle size={40} className="mx-auto mb-2 text-emerald-400" />
                      <p>Tudo em ordem!</p>
                   </div>
                )}
             </div>
             <div className="p-4 bg-white border-t border-gray-100 text-center shrink-0">
                <button onClick={() => setShowLowStockModal(false)} className="text-gray-500 font-bold text-sm hover:text-gray-800">Fechar</button>
             </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModal.isOpen && restockModal.item && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-bold text-lg font-heading">Repor Stock</h3>
              <button onClick={() => setRestockModal({ isOpen: false, item: null })} className="hover:bg-emerald-700 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
               <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="bg-white p-2 rounded-lg shadow-sm text-emerald-600"><Package size={24} /></div>
                  <div><p className="font-bold text-gray-800">{restockModal.item.name}</p><p className="text-xs text-gray-500">Atual: {restockModal.item.quantity} {restockModal.item.unit}</p></div>
               </div>
               <form onSubmit={handleConfirmRestock}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantidade a Adicionar</label>
                  <div className="flex gap-2 mb-6">
                     <input type="number" autoFocus required min="1" placeholder="0" className="flex-1 p-3 border border-gray-300 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
                     <div className="flex flex-col justify-center bg-gray-100 px-4 rounded-xl font-bold text-gray-500 text-sm">{restockModal.item.unit}</div>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center"><CheckCircle size={18} className="mr-2" /> Confirmar Entrada</button>
               </form>
            </div>
          </div>
        </div>
      )}

      {selectedLog && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-800 font-heading">Detalhe de Auditoria</h3>
                  <button onClick={() => setSelectedLog(null)} className="hover:bg-gray-200 p-2 rounded-full text-gray-500"><X size={20}/></button>
               </div>
               <div className="p-6">
                  <div className="mb-4">
                     <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wide mb-2 ${selectedLog.action === 'CREATE' ? 'text-green-600 bg-green-50' : selectedLog.action === 'DELETE' ? 'text-red-600 bg-red-50' : selectedLog.action === 'UPDATE' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 bg-gray-50'}`}>{selectedLog.action}</span>
                     <p className="text-sm text-gray-500 mb-1">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                     <p className="text-sm text-gray-800 font-bold flex items-center"><User size={14} className="mr-1.5 text-gray-400" /> {selectedLog.operatorName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedLog.details.split('; ').join('\n• ')}</p>
                  </div>
                  <button onClick={() => setSelectedLog(null)} className="mt-6 w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black">Fechar</button>
               </div>
            </div>
         </div>
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] relative flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white relative shrink-0">
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setSelectedTransaction(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="flex flex-col items-center">
                 <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm shadow-inner"><Receipt size={32} /></div>
                 <h3 className="text-2xl font-bold font-heading tracking-tight">Recibo de Venda</h3>
                 <p className="text-indigo-200 text-xs mt-1 font-mono tracking-widest opacity-80 bg-indigo-800/30 px-2 py-0.5 rounded">#{selectedTransaction.transactionId.slice(0, 8).toUpperCase()}</p>
                 <p className="text-indigo-100 text-xs mt-2">{new Date(selectedTransaction.date).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-white custom-scrollbar">
               <div className="space-y-4">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                     <span className="text-xs text-gray-500 font-bold uppercase">Itens</span>
                     <span className="text-xs text-gray-500 font-bold uppercase">Valor</span>
                  </div>
                  {selectedTransaction.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm">
                        <div className="flex gap-2">
                           <span className="font-bold text-gray-400">{item.quantity}x</span>
                           <span className="text-gray-800 font-medium">{item.itemName}</span>
                        </div>
                        <span className="font-mono text-gray-600">{symbol} {(item.totalRevenue * rate).toFixed(2)}</span>
                     </div>
                  ))}
                  
                  <div className="border-t border-dashed border-gray-200 my-4 pt-4">
                     <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-gray-800">Total Pago</span>
                        <span className="text-indigo-600">{symbol} {(selectedTransaction.totalRevenue * rate).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="text-gray-500">Método</span>
                        <span className="font-bold capitalize bg-gray-100 px-2 py-0.5 rounded text-gray-600">{selectedTransaction.paymentMethod}</span>
                     </div>
                     {selectedTransaction.customerName && (
                        <div className="flex justify-between items-center mt-1 text-xs">
                           <span className="text-gray-500">Cliente</span>
                           <span className="font-bold text-purple-600">{selectedTransaction.customerName}</span>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
               <button onClick={() => setSelectedTransaction(null)} className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors">Fechar Recibo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
