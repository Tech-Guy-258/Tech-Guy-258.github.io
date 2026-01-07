
import React, { useMemo, useState } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, AuditLogEntry, Expense, PaymentMethod, Customer, Supplier } from '../types';
import { CURRENCY_SYMBOLS, generateID } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  AlertTriangle, TrendingUp, Wallet, ShoppingBag, 
  Clock, X, Receipt, Activity, Smartphone, CreditCard, 
  CheckCircle, Award, Plus, ArrowDownCircle, Star, Zap, Info, Trash2, PackagePlus, User, ArrowUpRight, ArrowDownRight, Target, Users, BarChart3, Calculator, Phone, MessageCircle, Truck
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
  onSaveExpense?: (expense: Expense) => void; 
  onPayExpense?: (expenseId: string, method: PaymentMethod) => void;
  onDeleteExpense?: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  items, sales = [], logs = [], currency, exchangeRates, onCloseRegister, 
  activeBusinessName = "Negócio", currentOperator = "Operador", expenses = [], 
  customers = [], suppliers = [], onSaveExpense, onPayExpense, onDeleteExpense, onRestock
}) => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = Number(exchangeRates[currency] || 1);

  // States
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseActionModal, setShowExpenseActionModal] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  
  // Contact State
  const [contactingSupplier, setContactingSupplier] = useState<{item: InventoryItem, supplier: Supplier} | null>(null);
  
  const [detailModal, setDetailModal] = useState<{type: 'sale' | 'expense' | 'log', data: any} | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'sales' | 'audit'>('sales');
  const [activeChartProducts, setActiveChartProducts] = useState<string[]>([]);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'quantity'>('revenue');

  const todayStr = new Date().toISOString().split('T')[0];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('pt-PT'),
      time: d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      full: `${d.toLocaleDateString('pt-PT')} às ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    };
  };

  const lowStockItems = useMemo(() => items.filter(i => i.type === 'product' && i.quantity <= i.lowStockThreshold), [items]);

  const stats = useMemo(() => {
    const todaysSales = sales.filter(s => s.date && s.date.startsWith(todayStr));
    const dailyRevenue = todaysSales.reduce((acc, s) => acc + (Number(s.totalRevenue) || 0), 0) * rate;
    const dailyProfitRaw = todaysSales.reduce((acc, s) => acc + (Number(s.totalProfit) || 0), 0) * rate;
    
    const todaysPaidExpenses = expenses.filter(e => e.lastPaidDate?.startsWith(todayStr) && e.isPaid);
    const dailyOutflows = todaysPaidExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0) * rate;

    // Fixed: Cast operands to Number to ensure they are treated as numeric for the arithmetic operation
    const dailyNetBalance = Number(dailyRevenue) - Number(dailyOutflows);
    const dailyProfitPercent = dailyRevenue > 0 ? (dailyProfitRaw / dailyRevenue) * 100 : 0;
    const salesCount = new Set(todaysSales.map(s => s.transactionId)).size;
    const avgTicket = salesCount > 0 ? dailyRevenue / salesCount : 0;

    const topSalesData = Object.entries(todaysSales.reduce((acc, s) => {
        acc[s.itemName] = (acc[s.itemName] || 0) + (Number(s.quantity) || 0);
        return acc;
    }, {} as Record<string, number>))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 3);

    const topCustomer = Object.entries(todaysSales.reduce((acc, s) => {
        if (!s.customerName) return acc;
        // Fixed: Ensure multiplication operands are treated as numbers
        acc[s.customerName] = Number(acc[s.customerName] || 0) + (Number(s.totalRevenue) * Number(rate));
        return acc;
    }, {} as Record<string, number>))
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)[0];

    const productsInSales = Array.from(new Set(todaysSales.map(s => s.itemName))).slice(0, 5);
    const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
    
    const hourlyFlowData = hours.map(h => {
        const hourInt = parseInt(h.split(':')[0]);
        const data: any = { time: h };
        
        productsInSales.forEach(p => {
            const match = todaysSales.filter(s => {
                const sHour = new Date(s.date).getHours();
                return sHour === hourInt && s.itemName === p;
            });
            data[p] = chartMetric === 'revenue' 
              ? match.reduce((acc, s) => acc + (Number(s.totalRevenue) * rate), 0)
              : match.reduce((acc, s) => acc + Number(s.quantity), 0);
        });

        const totalMatch = todaysSales.filter(s => new Date(s.date).getHours() === hourInt);
        data.total = chartMetric === 'revenue'
          ? totalMatch.reduce((acc, s) => acc + (Number(s.totalRevenue) * rate), 0)
          : totalMatch.reduce((acc, s) => acc + Number(s.quantity), 0);
        
        return data;
    });

    return { 
      dailyRevenue, dailyOutflows, dailyNetBalance, dailyProfitPercent, 
      salesCount, topSalesData, topCustomer, hourlyFlowData, productsInSales,
      todaysPaidExpenses, todaysSales, avgTicket
    };
  }, [sales, expenses, rate, todayStr, chartMetric]);

  const handleRestockClick = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setShowRestockModal(item);
  };

  const handleContactClick = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    const supplier = suppliers.find(s => s.id === item.supplierId) || suppliers.find(s => s.name === item.supplierName);
    if (supplier && supplier.phone) {
      setContactingSupplier({ item, supplier });
    } else {
      alert("Não foi encontrado o contacto do fornecedor deste produto. Verifique o registo na aba Fornecedores.");
    }
  };

  const openWhatsApp = (phone: string, itemName: string, supplierName: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('258') && cleanPhone.length === 9) {
      cleanPhone = '258' + cleanPhone;
    }
    const message = encodeURIComponent(`Olá ${supplierName}, aqui é da loja ${activeBusinessName}. O nosso stock do produto "${itemName}" está baixo. Poderia verificar a disponibilidade de reposição?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    setContactingSupplier(null);
  };

  const confirmRestock = () => {
    if (showRestockModal && onRestock) {
      onRestock(showRestockModal.id, restockQty);
      setShowRestockModal(null);
    }
  };

  const getMethodIcon = (method?: string) => {
    switch(method) {
      case 'mpesa': return <Smartphone size={14} className="text-red-500" />;
      case 'emola': return <Smartphone size={14} className="text-indigo-500" />;
      case 'card': return <CreditCard size={14} className="text-blue-500" />;
      default: return <Wallet size={14} className="text-emerald-500" />;
    }
  };

  const generateCloseRegisterPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text(activeBusinessName?.toUpperCase() || "RELATÓRIO", 15, 25);
      doc.setFontSize(10);
      doc.text(`FECHO DE TURNO: ${new Date().toLocaleString()}`, 15, 33);
      
      autoTable(doc, {
        startY: 50,
        head: [['KPI', 'Valor']],
        body: [
          ['Faturação Bruta', `${symbol} ${stats.dailyRevenue.toFixed(2)}`],
          ['Saídas Liquidadas', `${symbol} ${stats.dailyOutflows.toFixed(2)}`],
          ['Saldo Líquido em Caixa', `${symbol} ${stats.dailyNetBalance.toFixed(2)}`],
          ['Transações', `${stats.salesCount}`],
          ['Ticket Médio', `${symbol} ${stats.avgTicket.toFixed(2)}`],
          ['Margem Operacional', `${stats.dailyProfitPercent.toFixed(1)}%`]
        ],
        theme: 'striped'
      });
      doc.save(`Fecho_${activeBusinessName}_${todayStr}.pdf`);
      onCloseRegister?.();
    } catch (e) { alert("Erro ao gerar PDF."); }
    finally { setIsGeneratingPDF(false); }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-10 pb-24 md:pb-10 max-w-[1600px] mx-auto animate-[fadeIn_0.4s_ease-out] bg-slate-50/30">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="w-full md:w-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 font-heading tracking-tight">Consola Global</h2>
          <p className="text-slate-400 mt-2 flex items-center font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em]">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shrink-0" /> Operação ativa: <span className="ml-1 text-slate-600 truncate">{currentOperator}</span>
          </p>
        </div>
        <div className="w-full md:w-auto flex gap-3">
          <button 
            onClick={generateCloseRegisterPDF} 
            className="flex-1 md:flex-none bg-slate-900 text-white px-5 sm:px-8 py-3.5 sm:py-4 rounded-[1.2rem] sm:rounded-[1.5rem] font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center active:scale-95 text-[10px] sm:text-xs uppercase tracking-widest"
          >
            <Receipt size={18} className="mr-2 sm:mr-3 text-emerald-400" /> Auditoria PDF
          </button>
        </div>
      </div>

      {/* Alerta de Stock com Reposição e Contacto */}
      {lowStockItems.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-red-100 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-2xl shadow-red-50/40 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-5 w-full md:w-auto">
            <div className="bg-red-500 p-3 sm:p-4 rounded-[1.4rem] sm:rounded-[1.8rem] text-white shadow-xl shadow-red-200"><AlertTriangle size={20} className="sm:w-6 sm:h-6" /></div>
            <div>
              <h4 className="text-base sm:text-xl font-black text-slate-800">Urgência de Stock</h4>
              <p className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">{lowStockItems.length} itens precisam de atenção</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto w-full md:max-w-2xl pb-2 no-scrollbar scroll-smooth">
            {lowStockItems.slice(0, 8).map(item => (
              <div key={item.id} className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-[1.2rem] sm:rounded-[1.5rem] border border-slate-100 flex items-center gap-3 sm:gap-5 shrink-0 hover:border-red-300 transition-all shadow-sm">
                <div>
                   <p className="text-[10px] sm:text-xs font-black text-slate-800 truncate max-w-[100px]">{item.name}</p>
                   <p className="text-[9px] sm:text-[10px] text-red-500 font-bold mt-0.5 sm:mt-1">Apenas {item.quantity} un</p>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={(e) => handleContactClick(e, item)}
                    className="bg-blue-50 p-2 sm:p-2.5 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                    title="Contactar Fornecedor"
                  >
                    <Truck size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button 
                    onClick={(e) => handleRestockClick(e, item)}
                    className="bg-emerald-50 p-2 sm:p-2.5 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
                    title="Reposição Rápida"
                  >
                    <PackagePlus size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-slate-100 group hover:shadow-2xl hover:-translate-y-1 transition-all">
           <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-emerald-50 text-emerald-600 rounded-[1.2rem] sm:rounded-[1.5rem]"><TrendingUp size={20} className="sm:w-6 sm:h-6"/></div>
              <span className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 sm:px-3 py-1.5 sm:py-1.5 rounded-full">Bruto</span>
           </div>
           <p className="text-3xl sm:text-4xl font-black font-heading text-slate-900">{symbol} {stats.dailyRevenue.toLocaleString()}</p>
           <div className="flex items-center gap-1.5 mt-3 sm:mt-4">
              <ArrowUpRight size={12} className="text-emerald-500" />
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stats.salesCount} Vendas Hoje</span>
           </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-slate-100 group hover:shadow-2xl hover:-translate-y-1 transition-all">
           <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-indigo-50 text-indigo-600 rounded-[1.2rem] sm:rounded-[1.5rem]"><Award size={20} className="sm:w-6 sm:h-6"/></div>
              <span className="text-[8px] sm:text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 sm:px-3 py-1.5 sm:py-1.5 rounded-full">Líder</span>
           </div>
           <p className="text-base sm:text-xl font-black text-slate-800 truncate mb-1">{stats.topSalesData[0]?.name || "Nenhuma"}</p>
           <p className="text-2xl sm:text-3xl font-black text-indigo-600">{stats.topSalesData[0]?.value || 0} <span className="text-xs sm:text-sm font-bold text-slate-300 tracking-normal font-sans">unidades</span></p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-slate-100 group hover:shadow-2xl hover:-translate-y-1 transition-all">
           <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-purple-50 text-purple-600 rounded-[1.2rem] sm:rounded-[1.5rem]"><Star size={20} className="sm:w-6 sm:h-6"/></div>
              <span className="text-[8px] sm:text-[9px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2.5 sm:px-3 py-1.5 sm:py-1.5 rounded-full">VIP</span>
           </div>
           <p className="text-base sm:text-xl font-black text-slate-800 truncate mb-1">{stats.topCustomer?.name || "Consumidor Final"}</p>
           <p className="text-xl sm:text-2xl font-black text-purple-600">{symbol} {stats.topCustomer?.total.toLocaleString() || "0"}</p>
        </div>

        <div className="bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl group hover:bg-black transition-all">
           <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-emerald-500 text-white rounded-[1.2rem] sm:rounded-[1.5rem] shadow-lg shadow-emerald-500/20"><Wallet size={20} className="sm:w-6 sm:h-6"/></div>
              <span className="text-[8px] sm:text-[9px] font-black text-emerald-400 uppercase tracking-widest">Caixa Real</span>
           </div>
           <p className="text-3xl sm:text-4xl font-black font-heading text-white">{symbol} {stats.dailyNetBalance.toLocaleString()}</p>
           <div className="flex items-center gap-1.5 mt-3 sm:mt-4 text-emerald-400">
              <Calculator size={12} />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Saldo Líquido</span>
           </div>
        </div>
      </div>

      {/* KPI Line 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Margem', value: `${stats.dailyProfitPercent.toFixed(1)}%`, icon: BarChart3, color: 'text-indigo-500' },
          { label: 'Tkt Médio', value: `${symbol}${stats.avgTicket.toFixed(0)}`, icon: Receipt, color: 'text-emerald-500' },
          { label: 'Saídas', value: `${symbol}${stats.dailyOutflows.toLocaleString()}`, icon: ArrowDownRight, color: 'text-red-500' },
          { label: 'Clientes', value: new Set(stats.todaysSales.map(s => s.customerId)).size, icon: Users, color: 'text-blue-500' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] border border-slate-100 flex items-center gap-3 sm:gap-4 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><kpi.icon size={16} className={`${kpi.color} sm:w-[18px] sm:h-[18px]`} /></div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{kpi.label}</p>
              <p className="text-sm sm:text-lg font-black text-slate-800 truncate">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 sm:p-8 md:p-12 rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-slate-50 flex flex-col h-[400px] sm:h-[500px] md:h-[650px]">
        <div className="mb-6 sm:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8">
           <div className="space-y-2 w-full sm:w-auto">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 font-heading">Performance</h3>
              <div className="flex bg-slate-100 p-1 rounded-[1rem] sm:rounded-[1.2rem] w-full sm:w-fit">
                <button onClick={() => setChartMetric('revenue')} className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase transition-all ${chartMetric === 'revenue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Faturação</button>
                <button onClick={() => setChartMetric('quantity')} className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase transition-all ${chartMetric === 'quantity' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Volume</button>
              </div>
           </div>
           <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveChartProducts([])}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase transition-all ${activeChartProducts.length === 0 ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
              >
                Geral
              </button>
              {stats.productsInSales.map((p) => (
                <button 
                  key={p}
                  onClick={() => setActiveChartProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase transition-all ${activeChartProducts.includes(p) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {p.split(' ')[0]}
                </button>
              ))}
           </div>
        </div>
        <div className="flex-1 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.hourlyFlowData}>
              <defs>
                <linearGradient id="colorDynamic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeChartProducts.length > 0 ? "#6366f1" : "#10b981"} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={activeChartProducts.length > 0 ? "#6366f1" : "#10b981"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '800', fill: '#94a3b8'}} dy={15} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '15px'}}
                itemStyle={{fontSize: '11px', padding: '2px 0'}}
              />
              {activeChartProducts.length > 0 ? (
                activeChartProducts.map((p, i) => (
                  <Area key={p} name={p} type="monotone" dataKey={p} stroke={['#6366f1', '#ec4899', '#f59e0b', '#10b981'][i % 4]} strokeWidth={3} fillOpacity={1} fill="transparent" />
                ))
              ) : (
                <Area name={chartMetric === 'revenue' ? "Receita Total" : "Volume Total"} type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorDynamic)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        {/* Saídas / Despesas */}
        <div className="bg-white rounded-[2.5rem] sm:rounded-[4rem] border border-slate-50 shadow-sm overflow-hidden flex flex-col h-[500px] sm:h-[580px]">
          <div className="p-6 sm:p-12 pb-4 sm:pb-6">
            <div className="flex justify-between items-center mb-6 sm:mb-10">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-heading">Saídas</h3>
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de Tesouraria</p>
              </div>
              <button onClick={() => setShowExpenseForm(true)} className="bg-red-500 text-white p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[2rem] hover:bg-red-600 transition-all shadow-2xl active:scale-95"><Plus size={20} className="sm:w-6 sm:h-6" /></button>
            </div>
            <div className="space-y-3 sm:space-y-4 overflow-y-auto max-h-[350px] sm:max-h-[380px] pr-2 custom-scrollbar">
              {expenses.length > 0 ? expenses.map(exp => (
                <div 
                  key={exp.id} 
                  onClick={() => { setSelectedExpense(exp); setShowExpenseActionModal(true); }} 
                  className={`w-full p-5 sm:p-7 rounded-[1.8rem] sm:rounded-[2.5rem] border transition-all flex justify-between items-center cursor-pointer active:scale-[0.98] ${exp.isPaid ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-100 hover:border-red-200 hover:shadow-lg'}`}
                >
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className={`p-3 sm:p-4 rounded-[1rem] sm:rounded-2xl transition-all ${exp.isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>{exp.isPaid ? <CheckCircle size={18} className="sm:w-[22px] sm:h-[22px]"/> : <Clock size={18} className="sm:w-[22px] sm:h-[22px]"/>}</div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 text-xs sm:text-base truncate max-w-[120px] sm:max-w-none">{exp.name}</div>
                      <div className="text-[8px] sm:text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">{exp.type === 'fixed' ? 'Fixa/Mensal' : 'Pontual'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-base sm:text-xl">{symbol}{exp.amount.toLocaleString() || 0}</div>
                    {exp.paymentMethod && <div className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase flex items-center justify-end mt-1 truncate">{exp.paymentMethod}</div>}
                  </div>
                </div>
              )) : <div className="text-center py-20 opacity-20"><Receipt size={60} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase tracking-widest">Sem custos</p></div>}
            </div>
          </div>
        </div>

        {/* Auditoria Tabbed Panel */}
        <div className="bg-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-slate-50 flex flex-col h-[500px] sm:h-[580px]">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-10 bg-slate-100 p-1.5 rounded-[1.8rem] sm:rounded-[2.2rem] w-full sm:w-fit mx-auto shadow-inner">
             <button onClick={() => setRightPanelTab('sales')} className={`flex-1 sm:flex-none px-6 sm:px-12 py-2.5 sm:py-3.5 text-[9px] sm:text-[11px] font-black uppercase transition-all rounded-[1.5rem] sm:rounded-[1.8rem] ${rightPanelTab === 'sales' ? 'bg-white text-slate-800 shadow-lg' : 'text-slate-400'}`}>Vendas</button>
             <button onClick={() => setRightPanelTab('audit')} className={`flex-1 sm:flex-none px-6 sm:px-12 py-2.5 sm:py-3.5 text-[9px] sm:text-[11px] font-black uppercase transition-all rounded-[1.5rem] sm:rounded-[1.8rem] ${rightPanelTab === 'audit' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'}`}>Logs</button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 custom-scrollbar">
            {rightPanelTab === 'sales' ? (
              stats.todaysSales.length > 0 ? stats.todaysSales.map((tx) => (
                <div key={tx.id} onClick={() => setDetailModal({type: 'sale', data: tx})} className="flex justify-between items-center p-4 sm:p-7 rounded-[1.8rem] sm:rounded-[2.8rem] border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-[1.1rem] sm:rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-500 shrink-0"><ShoppingBag size={18} className="sm:w-6 sm:h-6" /></div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-[11px] sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">{tx.itemName}</p>
                      <div className="flex items-center text-[8px] sm:text-[10px] font-black text-slate-400 uppercase mt-1 truncate">
                        {tx.paymentMethod} • <span className="ml-1 text-slate-500">{tx.operatorName.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 text-sm sm:text-lg">{symbol}{(tx.totalRevenue * rate).toLocaleString()}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-300 font-black uppercase tracking-tighter">{formatDateTime(tx.date).time}</p>
                  </div>
                </div>
              )) : <div className="py-20 text-center opacity-20 font-black uppercase text-[10px] tracking-widest">Sem vendas</div>
            ) : (
              logs.slice(0, 30).map((log) => (
                <div key={log.id} onClick={() => setDetailModal({type: 'log', data: log})} className="p-5 sm:p-7 rounded-[1.8rem] sm:rounded-[2.8rem] bg-slate-50/30 border border-slate-100 text-[9px] sm:text-[11px] hover:bg-white transition-all cursor-pointer">
                   <div className="flex justify-between mb-3 sm:mb-4">
                      <span className={`font-black uppercase tracking-widest px-2 sm:px-3.5 py-1 rounded-full text-[8px] sm:text-[9px] ${log.action === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>{log.action}</span>
                      <span className="text-slate-400 font-black">{formatDateTime(log.timestamp).full}</span>
                   </div>
                   <p className="text-slate-600 font-bold leading-relaxed truncate">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recibo Auditoria Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4 sm:p-6 animate-[fadeIn_0.3s]">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
            <div className="p-8 sm:p-12 text-center bg-slate-50/50 relative border-b border-slate-100">
               <button onClick={() => setDetailModal(null)} className="absolute top-6 sm:top-10 right-6 sm:right-10 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-slate-900 transition-all active:scale-90"><X size={18}/></button>
               <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-slate-50 shrink-0">
                  {detailModal.type === 'sale' ? <ShoppingBag className="text-emerald-500" size={30} /> : <Info className="text-indigo-500" size={30} />}
               </div>
               <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">Registo Oficial</h3>
               <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 sm:mt-3">Audit Log ID: {detailModal.data.id.slice(0,5)}</p>
            </div>
            
            <div className="p-8 sm:p-12 space-y-8 sm:space-y-10">
               <div className="space-y-4 sm:space-y-6">
                  {detailModal.type === 'sale' ? (
                     <>
                        <div className="flex justify-between items-center text-xs sm:text-sm font-bold"><span className="text-slate-400 uppercase text-[9px] sm:text-[10px]">Item</span><span className="text-slate-900 text-right truncate max-w-[150px]">{detailModal.data.itemName}</span></div>
                        <div className="flex justify-between items-center text-xs sm:text-sm font-bold"><span className="text-slate-400 uppercase text-[9px] sm:text-[10px]">Total</span><span className="text-emerald-600 text-2xl sm:text-3xl font-black">{symbol} {(detailModal.data.totalRevenue * rate).toLocaleString()}</span></div>
                        <div className="pt-6 sm:pt-8 border-t border-slate-100 space-y-3 sm:space-y-4">
                          <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold"><span className="text-slate-400 uppercase">Data</span><span className="text-slate-800">{formatDateTime(detailModal.data.date).full}</span></div>
                          <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold"><span className="text-slate-400 uppercase">Operador</span><span className="text-slate-800">{detailModal.data.operatorName}</span></div>
                        </div>
                     </>
                  ) : (
                     <>
                        <p className="bg-slate-50 p-6 sm:p-8 rounded-[1.8rem] sm:rounded-[2.5rem] text-slate-700 font-bold text-xs sm:text-sm leading-relaxed border border-slate-100 shadow-inner">{detailModal.data.details}</p>
                        <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
                          <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold"><span className="text-slate-400 uppercase">Ocorrência</span><span className="text-slate-800">{formatDateTime(detailModal.data.timestamp).full}</span></div>
                          <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold"><span className="text-slate-400 uppercase">Responsável</span><span className="text-slate-800">{detailModal.data.operatorName}</span></div>
                        </div>
                     </>
                  )}
               </div>
               <button onClick={() => setDetailModal(null)} className="w-full py-4 sm:py-6 bg-slate-900 text-white font-black rounded-[1.5rem] sm:rounded-[2rem] hover:bg-black uppercase text-[10px] sm:text-[11px] tracking-[0.4em] transition-all shadow-2xl active:scale-95">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4 sm:p-6 animate-[fadeIn_0.3s]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
               <div className="p-8 sm:p-12 bg-red-600 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4 sm:gap-5"><ArrowDownCircle size={28} className="sm:w-8 sm:h-8" /> <h3 className="font-black text-2xl sm:text-3xl font-heading tracking-tight">Nova Saída</h3></div>
                  <button onClick={() => setShowExpenseForm(false)} className="bg-white/20 p-2 sm:p-2.5 rounded-full hover:bg-white/40 transition-all"><X size={20}/></button>
               </div>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const type = fd.get('type') as 'fixed' | 'variable';
                 const newExpense: Expense = {
                    id: generateID(),
                    name: fd.get('name') as string,
                    amount: parseFloat(fd.get('amount') as string),
                    type,
                    nextDueDate: fd.get('dueDate') as string || new Date().toISOString(),
                    isPaid: type === 'variable',
                    lastPaidDate: type === 'variable' ? new Date().toISOString() : undefined,
                    paymentMethod: type === 'variable' ? fd.get('method') as PaymentMethod : undefined,
                    operatorName: currentOperator
                 };
                 onSaveExpense?.(newExpense);
                 setShowExpenseForm(false);
               }} className="p-8 sm:p-12 space-y-8 sm:space-y-10 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-4 sm:space-y-5">
                    <input required name="name" placeholder="Descrição do Gasto" className="w-full p-4 sm:p-6 bg-slate-50 rounded-[1.2rem] sm:rounded-[2rem] font-bold outline-none border border-transparent focus:border-red-100 shadow-inner transition-all text-xs sm:text-sm text-gray-900" />
                    <input required name="amount" type="number" placeholder="0.00 MT" className="w-full p-4 sm:p-6 bg-slate-50 rounded-[1.2rem] sm:rounded-[2rem] font-black text-2xl sm:text-4xl outline-none border border-transparent focus:border-red-100 shadow-inner transition-all text-red-600 text-center" />
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 block">Tipo de Movimento</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-[1.4rem] sm:rounded-[1.8rem] shadow-inner">
                       <button type="button" onClick={() => setSelectedExpense(prev => (prev ? {...prev, type: 'variable'} : null))} className={`py-3 rounded-[1rem] sm:rounded-[1.4rem] text-[9px] sm:text-[10px] font-black uppercase transition-all ${(selectedExpense?.type || 'variable') !== 'fixed' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-400'}`}>Pontual</button>
                       <button type="button" onClick={() => setSelectedExpense(prev => (prev ? {...prev, type: 'fixed'} : null))} className={`py-3 rounded-[1rem] sm:rounded-[1.4rem] text-[9px] sm:text-[10px] font-black uppercase transition-all ${selectedExpense?.type === 'fixed' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-400'}`}>Fixa</button>
                       <input type="hidden" name="type" value={selectedExpense?.type || 'variable'} />
                    </div>
                  </div>

                  <div className="animate-[slideIn_0.3s_ease-out]">
                    {selectedExpense?.type === 'fixed' ? (
                       <div className="space-y-3 sm:space-y-4">
                          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 block">Vencimento</label>
                          <input required type="date" name="dueDate" className="w-full p-4 sm:p-6 bg-slate-50 rounded-[1.2rem] sm:rounded-[2rem] font-bold outline-none border border-red-100 shadow-inner text-xs sm:text-sm text-gray-900" />
                       </div>
                    ) : (
                       <div className="space-y-3 sm:space-y-4">
                          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 block">Meio de Pagamento</label>
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
                             {['cash', 'mpesa', 'emola', 'card'].map(m => (
                                <label key={m} className="flex items-center justify-center p-3 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all">
                                   <input required type="radio" name="method" value={m} className="hidden peer" />
                                   <div className="flex flex-col items-center peer-checked:text-red-600 peer-checked:scale-110 transition-all">
                                      {getMethodIcon(m)} <span className="text-[8px] sm:text-[9px] font-black uppercase mt-2 tracking-widest">{m}</span>
                                   </div>
                                </label>
                             ))}
                          </div>
                       </div>
                    )}
                  </div>

                  <button type="submit" className="w-full py-4 sm:py-6 bg-red-600 text-white font-black rounded-[1.5rem] sm:rounded-[2.5rem] hover:bg-red-700 shadow-2xl transition-all uppercase text-[10px] sm:text-[11px] tracking-[0.4em] active:scale-95">Confirmar</button>
               </form>
            </div>
         </div>
      )}

      {/* Expense Action Modal */}
      {showExpenseActionModal && selectedExpense && (
         <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[4rem] shadow-2xl overflow-hidden p-14 text-center animate-[scaleIn_0.3s_ease-out]">
               <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.8rem] flex items-center justify-center mx-auto mb-10 border border-red-100 shadow-inner"><Receipt size={44}/></div>
               <h3 className="text-2xl font-black text-slate-900">{selectedExpense.name}</h3>
               <p className="text-red-600 font-black text-4xl mt-4">{symbol}{selectedExpense.amount.toLocaleString()}</p>
               
               <div className="space-y-4 mt-12">
                  {!selectedExpense.isPaid && (
                     <button 
                        onClick={() => setShowPaymentSelector(true)} 
                        className="w-full py-6 bg-emerald-600 text-white font-black rounded-[2.2rem] hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-100 active:scale-95"
                     >
                        <CheckCircle size={22}/> Liquidar Turno
                     </button>
                  )}
                  <button 
                     onClick={() => { onDeleteExpense?.(selectedExpense.id); setShowExpenseActionModal(false); }} 
                     className="w-full py-6 bg-slate-50 text-slate-400 font-black rounded-[2.2rem] hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-3"
                  >
                     <Trash2 size={20}/> Eliminar Registo
                  </button>
                  <button onClick={() => setShowExpenseActionModal(false)} className="w-full py-4 text-slate-300 font-black text-[10px] uppercase tracking-[0.4em] mt-5">Fechar Menu</button>
               </div>
            </div>
         </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4 sm:p-6">
           <div className="bg-white p-8 sm:p-12 rounded-[3rem] sm:rounded-[4.5rem] shadow-2xl w-full max-w-xs text-center animate-[scaleIn_0.3s_ease-out]">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-50 text-emerald-600 rounded-[1.5rem] sm:rounded-[2.8rem] flex items-center justify-center mx-auto mb-6 sm:mb-10 shadow-inner"><PackagePlus size={36} className="sm:w-12 sm:h-12"/></div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading truncate">{showRestockModal.name}</h3>
              <p className="text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-2 sm:mt-3">Reposição Rápida</p>
              
              <div className="my-8 sm:my-12">
                 <div className="flex items-center justify-center gap-5 sm:gap-8">
                    <button onClick={() => setRestockQty(Math.max(1, restockQty-1))} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-inner active:scale-90"><Minus size={18} /></button>
                    <span className="text-4xl sm:text-6xl font-black text-slate-900 w-16 sm:w-24">{restockQty}</span>
                    <button onClick={() => setRestockQty(restockQty+1)} className="w-10 h-10 sm:w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-inner active:scale-90"><Plus size={18} className="sm:w-5 sm:h-5"/></button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                 <button onClick={() => setShowRestockModal(null)} className="py-4 sm:py-6 bg-slate-50 text-slate-400 font-black rounded-[1.2rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] uppercase tracking-widest">Voltar</button>
                 <button onClick={confirmRestock} className="py-4 sm:py-6 bg-emerald-600 text-white font-black rounded-[1.2rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl active:scale-95">Repor</button>
              </div>
           </div>
        </div>
      )}

      {/* Supplier Contact Modal */}
      {contactingSupplier && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Truck size={32} />
                 </div>
                 <h3 className="text-xl font-black text-slate-800 font-heading">Contactar Fornecedor</h3>
                 <p className="text-sm text-slate-500 mt-1">{contactingSupplier.supplier.name}</p>
                 <div className="mt-4 bg-white p-3 rounded-2xl border border-slate-200 inline-block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto Alvo</p>
                    <p className="text-xs font-bold text-slate-700">{contactingSupplier.item.name}</p>
                 </div>
              </div>
              <div className="p-6 space-y-3">
                 <a 
                    href={`tel:${contactingSupplier.supplier.phone.replace(/\D/g, '')}`}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                 >
                    <Phone size={20} /> Chamada Direta
                 </a>
                 <button 
                    onClick={() => openWhatsApp(contactingSupplier.supplier.phone, contactingSupplier.item.name, contactingSupplier.supplier.name)}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                 >
                    <MessageCircle size={22} /> Enviar WhatsApp
                 </button>
                 <button 
                    onClick={() => setContactingSupplier(null)}
                    className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest mt-2"
                 >
                    Cancelar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/95 backdrop-blur-3xl">
           <div className="bg-white p-12 sm:p-24 rounded-[3rem] sm:rounded-[6rem] shadow-2xl flex flex-col items-center text-center animate-[scaleIn_0.4s_ease-out] mx-4">
              <div className="w-24 h-24 sm:w-40 sm:h-40 border-[8px] sm:border-[12px] border-emerald-50 border-t-emerald-600 rounded-full animate-spin mb-8 sm:mb-14 shadow-inner"></div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">Sincronizando Auditoria</h3>
              <p className="text-slate-400 mt-4 max-w-xs font-bold uppercase text-[8px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.5em]">A preparar ficheiro de fecho...</p>
           </div>
        </div>
      )}
    </div>
  );
};

const Minus = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default Dashboard;
