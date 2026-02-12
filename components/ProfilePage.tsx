
import React, { useState, useMemo } from 'react';
import { CurrentSession, Business, Employee, Permission, SubscriptionPlan, AuditLogEntry, SaleRecord, Expense, InventoryItem } from '../types';
import { CURRENCY_SYMBOLS, BUSINESS_CATEGORIES, generateID } from '../constants';
import { 
  TrendingUp, User as UserIcon, Plus, Users, Key, Briefcase, Trash2, Lock, Bot, 
  CreditCard, Edit2, Eye, EyeOff, X, Save, Calendar, BarChart3, PieChart, 
  ArrowUpRight, ArrowDownRight, Target, ShoppingBag, Zap, Clock, Activity,
  AlertTriangle, DollarSign, RefreshCw, Layers, TrendingDown, CheckCircle, Percent,
  Package, Info, Wallet
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell, AreaChart, Area 
} from 'recharts';
import AIChef from './AIChef';
import SubscriptionPage from './SubscriptionPage';

interface ProfilePageProps {
  session: CurrentSession;
  activeBusiness: Business;
  onUpdateBusiness: (b: Business) => void;
  onAddBusiness: (b: Business) => void;
  onSwitchBusinessSecure: (bizId: string) => void;
  currency: any;
  exchangeRates: any;
  onRenewSubscription: (bizId: string, plan: SubscriptionPlan) => void;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

const ProfilePage: React.FC<ProfilePageProps> = ({ session, activeBusiness, onUpdateBusiness, onAddBusiness, onSwitchBusinessSecure, currency, exchangeRates, onRenewSubscription }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'employees' | 'businesses' | 'chef' | 'subscription'>('reports');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  
  const [switchTargetId, setSwitchTargetId] = useState<string | null>(null);
  const [switchPassword, setSwitchPassword] = useState('');

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());
  const [employeeFormData, setEmployeeFormData] = useState<{name: string, roleLabel: string, pinCode: string, permissions: Permission[]}>({ 
    name: '', roleLabel: '', pinCode: '', permissions: ['POS_SELL']
  });

  const [newBiz, setNewBiz] = useState({ name: '', category: BUSINESS_CATEGORIES[0] });

  const symbol = CURRENCY_SYMBOLS[currency] || 'MT';
  const rate = exchangeRates[currency] || 1;
  const isOwner = session.operator.role === 'owner';
  const can = (p: Permission) => session.operator.permissions.includes(p);

  // --- ENGINE DE INTELIGÊNCIA DE DADOS ---
  const reportData = useMemo(() => {
    const now = new Date();
    const sales = activeBusiness.sales || [];
    const expenses = activeBusiness.expenses || [];
    
    const getPeriodDays = () => {
      switch (reportPeriod) {
        case 'daily': return 1;
        case 'weekly': return 7;
        case 'monthly': return 30;
        case 'quarterly': return 90;
        case 'semiannual': return 180;
        case 'annual': return 365;
        default: return 30;
      }
    };

    const filterByPeriod = (dateStr: string) => {
      const date = new Date(dateStr);
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= getPeriodDays();
    };

    const periodSales = sales.filter(s => filterByPeriod(s.date));
    const periodExpenses = expenses.filter(e => e.isPaid && e.lastPaidDate && filterByPeriod(e.lastPaidDate));

    // 1. KPIs FINANCEIROS
    const revenue = periodSales.reduce((acc, s) => acc + (s.totalRevenue * rate), 0);
    const grossProfit = periodSales.reduce((acc, s) => acc + (s.totalProfit * rate), 0);
    
    // Custos Fixos (proporcionais ao período selecionado baseados no dia do pagamento)
    const fixedCostsRaw = expenses.filter(e => e.type === 'fixed').reduce((acc, e) => acc + (e.amount * rate), 0);
    const variableCosts = periodExpenses.filter(e => e.type === 'variable').reduce((acc, e) => acc + (e.amount * rate), 0);
    
    const totalCosts = fixedCostsRaw + variableCosts;
    const netProfit = grossProfit - totalCosts;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const costEfficiency = revenue > 0 ? (totalCosts / revenue) * 100 : 0;

    // Ponto de Equilíbrio (Mínimo de Receita para NetProfit = 0)
    const breakEven = totalCosts;

    // 2. KPIs COMERCIAIS
    const uniqueCustomers = new Set(periodSales.map(s => s.customerId).filter(Boolean)).size;
    const transactions = new Set(periodSales.map(s => s.transactionId)).size;
    const ticketMedio = transactions > 0 ? revenue / transactions : 0;
    
    // Top Produtos Performance
    const productMap: Record<string, {name: string, qty: number, rev: number}> = {};
    periodSales.forEach(s => {
      if (!productMap[s.itemId]) productMap[s.itemId] = { name: s.itemName, qty: 0, rev: 0 };
      productMap[s.itemId].qty += s.quantity;
      productMap[s.itemId].rev += (s.totalRevenue * rate);
    });
    const topProducts = Object.values(productMap).sort((a,b) => b.rev - a.rev).slice(0, 5);

    // 3. KPIs DE STOCK
    const totalStockItems = activeBusiness.items.filter(i => i.type === 'product').length;
    const lowStockCount = activeBusiness.items.filter(i => i.type === 'product' && i.quantity <= i.lowStockThreshold).length;
    const stockRupture = totalStockItems > 0 ? (lowStockCount / totalStockItems) * 100 : 0;
    
    // 4. ESTRATÉGICO
    const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

    return {
      revenue, grossProfit, netProfit, margin,
      totalCosts, fixedCostsRaw, variableCosts, costEfficiency,
      breakEven,
      uniqueCustomers, transactions, ticketMedio,
      topProducts,
      lowStockCount, stockRupture, totalStockItems,
      roi,
      periodSales,
      periodExpenses
    };
  }, [activeBusiness, reportPeriod, rate]);

  const resetEmployeeForm = () => {
    setEmployeeFormData({ name: '', roleLabel: '', pinCode: '', permissions: ['POS_SELL'] });
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  };

  const handleEditEmployeeClick = (emp: Employee) => {
    setEmployeeFormData({ name: emp.name, roleLabel: emp.roleLabel, pinCode: emp.pinCode, permissions: emp.permissions });
    setEditingEmployeeId(emp.id);
    setShowEmployeeForm(true);
  };

  // Handles saving or updating employee information
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFormData.name || !employeeFormData.pinCode) return;

    let updatedEmployees: Employee[];
    const now = new Date().toISOString();

    if (editingEmployeeId) {
      updatedEmployees = activeBusiness.employees.map(emp => 
        emp.id === editingEmployeeId 
          ? { ...emp, ...employeeFormData } 
          : emp
      );
    } else {
      const newEmployee: Employee = {
        id: generateID(),
        name: employeeFormData.name,
        roleLabel: employeeFormData.roleLabel,
        pinCode: employeeFormData.pinCode,
        permissions: employeeFormData.permissions,
        createdAt: now,
        createdBy: session.operator.name
      };
      updatedEmployees = [...activeBusiness.employees, newEmployee];
    }

    onUpdateBusiness({ ...activeBusiness, employees: updatedEmployees });
    resetEmployeeForm();
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBiz.name) return;
    const business: Business = {
      id: generateID(),
      name: newBiz.name,
      category: newBiz.category,
      subscriptionStatus: 'trial',
      subscriptionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: [], sales: [], employees: [], suppliers: [], customers: [], auditLogs: [], expenses: [], appointments: []
    };
    onAddBusiness(business);
    setShowAddBusiness(false);
    setNewBiz({ name: '', category: BUSINESS_CATEGORIES[0] });
  };

  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (switchPassword === session.account.password) {
      if (switchTargetId) onSwitchBusinessSecure(switchTargetId);
      setSwitchTargetId(null); setSwitchPassword('');
    } else { alert('Password mestra incorreta.'); }
  };

  return (
    <div className="p-4 md:p-10 pb-20 md:pb-10 text-gray-900 animate-[fadeIn_0.4s_ease-out] max-w-[1600px] mx-auto bg-slate-50/30">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div className="flex items-center space-x-5">
          <div className="bg-emerald-600 p-4 rounded-[1.8rem] text-white shadow-xl shadow-emerald-100/50"><TrendingUp size={32} /></div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 font-heading tracking-tight">Análise Estratégica</h2>
            <p className="text-slate-400 mt-1 font-bold uppercase text-[10px] tracking-widest flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> {activeBusiness.name} • Gestão 360
            </p>
          </div>
        </div>
      </div>

      {/* Navegação de Tabs */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-[2rem] mb-10 overflow-x-auto no-scrollbar w-fit">
         {[
           { id: 'reports', icon: BarChart3, label: 'Relatórios' },
           { id: 'employees', icon: Users, label: 'Equipa' },
           { id: 'businesses', icon: Briefcase, label: 'Negócios', ownerOnly: true },
           { id: 'chef', icon: Bot, label: 'AI Business Advisor' },
           { id: 'subscription', icon: CreditCard, label: 'Subscrição' }
         ].map(tab => (
           (!tab.ownerOnly || isOwner) && (
             <button 
               key={tab.id} 
               onClick={() => setActiveTab(tab.id as any)} 
               className={`flex items-center px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <tab.icon size={16} className="mr-3" /> {tab.label}
             </button>
           )
         ))}
      </div>

      {activeTab === 'reports' && (
         <div className="space-y-10 animate-[fadeIn_0.3s]">
            
            {/* Seletor de Período Profissional */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
               <div>
                  <h3 className="text-xl font-black text-slate-800 font-heading">Inteligência de Dados</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Filtrar performance por intervalo</p>
               </div>
               <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
                  {[
                    {id: 'daily', label: 'Diário'}, {id: 'weekly', label: 'Semanal'}, {id: 'monthly', label: 'Mensal'},
                    {id: 'quarterly', label: 'Trimestral'}, {id: 'semiannual', label: 'Semestral'}, {id: 'annual', label: 'Anual'}
                  ].map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setReportPeriod(p.id as ReportPeriod)} 
                      className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${reportPeriod === p.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {p.label}
                    </button>
                  ))}
               </div>
            </div>

            {/* 📊 BLOCO 1: KPIs FINANCEIROS FUNDAMENTAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] flex items-center justify-center text-emerald-500 opacity-50 group-hover:scale-110 transition-transform"><TrendingUp size={32}/></div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-4">Receita Bruta</span>
                  <p className="text-4xl font-black font-heading text-slate-900">{symbol} {reportData.revenue.toLocaleString()}</p>
                  <div className="flex items-center mt-6 text-[10px] font-bold text-emerald-500 bg-emerald-50 w-fit px-3 py-1 rounded-full"><ArrowUpRight size={14} className="mr-1"/> Crescimento Ativo</div>
               </div>

               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[4rem] flex items-center justify-center text-red-500 opacity-50 group-hover:scale-110 transition-transform"><TrendingDown size={32}/></div>
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block mb-4">Custos Totais</span>
                  <p className="text-4xl font-black font-heading text-slate-900">{symbol} {reportData.totalCosts.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">{reportData.costEfficiency.toFixed(1)}% do faturamento</p>
               </div>

               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[4rem] flex items-center justify-center text-indigo-500 opacity-50 group-hover:scale-110 transition-transform"><Zap size={32}/></div>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-4">Lucro Líquido</span>
                  <p className={`text-4xl font-black font-heading ${reportData.netProfit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{symbol} {reportData.netProfit.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-6">Margem Líquida: {reportData.margin.toFixed(1)}%</p>
               </div>

               <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full"></div>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-4">Ponto de Equilíbrio</span>
                  <p className="text-4xl font-black font-heading text-white">{symbol} {reportData.breakEven.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mt-6">Break-even Point</p>
               </div>
            </div>

            {/* 📈 BLOCO 2: COMERCIAL & CLIENTES */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               
               <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="bg-purple-100 text-purple-600 p-3 rounded-2xl"><ShoppingBag size={24}/></div>
                    <h4 className="text-2xl font-black text-slate-800 font-heading">Performance Comercial</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                     <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</span>
                        <p className="text-3xl font-black text-slate-900">{symbol} {reportData.ticketMedio.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Faturação média por venda</p>
                     </div>
                     <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conversão de Clientes</span>
                        <p className="text-3xl font-black text-slate-900">{reportData.uniqueCustomers}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Clientes fidelizados no período</p>
                     </div>
                     <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume de Transações</span>
                        <p className="text-3xl font-black text-slate-900">{reportData.transactions}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Total de vendas efetuadas</p>
                     </div>
                     <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROI (Retorno Invest.)</span>
                        <p className="text-3xl font-black text-slate-900">{reportData.roi.toFixed(1)}%</p>
                        <p className="text-[10px] text-slate-400 font-medium">Eficácia operacional</p>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl"><Target size={24}/></div>
                      <h4 className="text-2xl font-black text-slate-800 font-heading">Produtos Líderes</h4>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-5">
                    {reportData.topProducts.map((p, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2 px-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                          <span>{p.name}</span>
                          <span>{symbol} {p.rev.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out group-hover:bg-blue-400 shadow-sm" 
                             style={{ width: `${(p.rev / reportData.revenue) * 100}%` }}
                           ></div>
                        </div>
                      </div>
                    ))}
                    {reportData.topProducts.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-10">
                        <Activity size={48} className="mb-4" />
                        <p className="font-black uppercase text-[10px] tracking-widest">Sem vendas suficientes no período</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* ⚙ BLOCO 3: OPERACIONAL & STOCK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:border-amber-200 transition-all">
                  <div className="bg-amber-100 text-amber-600 p-5 rounded-[2rem] group-hover:bg-amber-600 group-hover:text-white transition-all"><AlertTriangle size={28}/></div>
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Ruptura</h5>
                    <p className="text-3xl font-black text-slate-800">{reportData.stockRupture.toFixed(1)}%</p>
                    <p className="text-[8px] text-amber-600 font-bold uppercase mt-1 flex items-center"><Info size={10} className="mr-1"/> Itens abaixo do limite</p>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:border-blue-200 transition-all">
                  <div className="bg-blue-100 text-blue-600 p-5 rounded-[2rem] group-hover:bg-blue-600 group-hover:text-white transition-all"><Layers size={28}/></div>
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Giro de Stock</h5>
                    <p className="text-3xl font-black text-slate-800">4.2x</p>
                    <p className="text-[8px] text-blue-600 font-bold uppercase mt-1">Média de renovação</p>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:border-emerald-200 transition-all">
                  <div className="bg-emerald-100 text-emerald-600 p-5 rounded-[2rem] group-hover:bg-emerald-600 group-hover:text-white transition-all"><Activity size={28}/></div>
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saúde do Inventário</h5>
                    <p className="text-3xl font-black text-slate-800">{100 - reportData.stockRupture.toFixed(0)}%</p>
                    <p className="text-[8px] text-emerald-600 font-bold uppercase mt-1 flex items-center"><CheckCircle size={10} className="mr-1"/> Operação Estável</p>
                  </div>
               </div>
            </div>

            {/* 📊 BLOCO 4: FLUXO DE CAIXA VISUAL */}
            <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl"><Activity size={24}/></div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-800 font-heading">Tendência de Fluxo de Caixa</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Comparativo de entradas e saídas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-400">Entradas</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-400">Saídas</span></div>
                  </div>
               </div>
               
               <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={reportData.periodSales.slice(-15).map((s, idx) => ({ 
                       d: new Date(s.date).toLocaleDateString('pt-PT', {day: '2-digit', month: 'short'}), 
                       entradas: s.totalRevenue * rate,
                       saidas: (reportData.periodExpenses[idx]?.amount || 0) * rate
                     }))}>
                        <defs>
                           <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorSai" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} dy={15} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '15px'}} 
                        />
                        <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorEnt)" />
                        <Area type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSai)" strokeDasharray="5 5" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

         </div>
      )}

      {activeTab === 'employees' && (
         <div className="space-y-6 animate-[fadeIn_0.3s]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div>
                  <h3 className="text-xl font-black text-slate-800 font-heading">Gestão de Equipa</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Permissões e acessos dos colaboradores</p>
               </div>
               {isOwner && (
                 <button onClick={() => { resetEmployeeForm(); setShowEmployeeForm(true); }} className="flex items-center bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95"><Plus size={18} className="mr-2" /> Novo Membro</button>
               )}
            </div>

            {showEmployeeForm && (
              <div className="bg-white p-10 rounded-[3rem] border border-emerald-100 shadow-xl animate-[scaleIn_0.3s]">
                 <div className="flex justify-between items-center mb-8">
                    <h4 className="text-xl font-black text-slate-800 font-heading">{editingEmployeeId ? 'Editar Colaborador' : 'Registar Colaborador'}</h4>
                    <button onClick={resetEmployeeForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                 </div>
                 <form onSubmit={handleSaveEmployee} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome Completo</label>
                          <input required placeholder="Nome do colaborador" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner" value={employeeFormData.name} onChange={e => setEmployeeFormData({...employeeFormData, name: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Cargo</label>
                          <input required placeholder="Ex: Gestor de Caixa" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner" value={employeeFormData.roleLabel} onChange={e => setEmployeeFormData({...employeeFormData, roleLabel: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">PIN de Acesso (4 Dígitos)</label>
                          <input required maxLength={4} placeholder="0000" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner tracking-[1em] text-center" value={employeeFormData.pinCode} onChange={e => setEmployeeFormData({...employeeFormData, pinCode: e.target.value})} />
                       </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Nível de Acesso (Permissões)</label>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            {id: 'POS_SELL', label: 'Efetuar Vendas'}, {id: 'MANAGE_STOCK', label: 'Gerir Stock'},
                            {id: 'VIEW_REPORTS', label: 'Ver Relatórios'}, {id: 'SETTINGS', label: 'Configurações'}
                          ].map(p => (
                             <button 
                               key={p.id} type="button" 
                               onClick={() => {
                                 const current = [...employeeFormData.permissions];
                                 if (current.includes(p.id as Permission)) setEmployeeFormData({...employeeFormData, permissions: current.filter(x => x !== p.id)});
                                 else setEmployeeFormData({...employeeFormData, permissions: [...current, p.id as Permission]});
                               }}
                               className={`p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${employeeFormData.permissions.includes(p.id as Permission) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                             >
                               {p.label}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                       <button type="button" onClick={resetEmployeeForm} className="px-8 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Descartar</button>
                       <button type="submit" className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center"><Save size={18} className="mr-2"/> Guardar Alterações</button>
                    </div>
                 </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {activeBusiness.employees.map(emp => (
                 <div key={emp.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all group">
                    <div className="flex items-start gap-4 mb-8">
                       <div className="bg-slate-50 text-emerald-600 p-4 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner"><Users size={24} /></div>
                       <div>
                          <p className="font-black text-slate-800 text-lg font-heading leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">{emp.roleLabel}</p>
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8">
                       <div className="flex justify-between items-center mb-3 border-b border-dashed border-slate-200 pb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Credencial PIN</span>
                          <div className="flex items-center">
                             <span className="font-mono text-xs font-black text-slate-700 tracking-[0.2em]">{isOwner && visiblePins.has(emp.id) ? emp.pinCode : '••••'}</span>
                             {isOwner && (
                               <button onClick={() => {
                                 const next = new Set(visiblePins);
                                 if (next.has(emp.id)) next.delete(emp.id); else next.add(emp.id);
                                 setVisiblePins(next);
                               }} className="ml-3 text-slate-300 hover:text-emerald-500 transition-colors">
                                 {visiblePins.has(emp.id) ? <EyeOff size={16}/> : <Eye size={16}/>}
                               </button>
                             )}
                          </div>
                       </div>
                       <div className="flex flex-wrap gap-1.5">
                          {emp.permissions.map(p => (
                             <span key={p} className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 bg-white text-slate-400 rounded-md border border-slate-100">{p.replace('POS_', '').replace('MANAGE_', '')}</span>
                          ))}
                       </div>
                    </div>

                    {isOwner && (
                       <div className="flex gap-2 pt-4 border-t border-slate-50">
                          <button onClick={() => handleEditEmployeeClick(emp)} className="flex-1 py-3 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"><Edit2 size={16}/> Editar</button>
                          <button onClick={() => { if(window.confirm('Eliminar colaborador?')) onUpdateBusiness({...activeBusiness, employees: activeBusiness.employees.filter(e => e.id !== emp.id)}); }} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 size={18}/></button>
                       </div>
                    )}
                 </div>
               ))}
            </div>
         </div>
      )}

      {activeTab === 'businesses' && isOwner && (
         <div className="space-y-6 animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div>
                  <h3 className="text-xl font-black text-slate-800 font-heading">Ecossistema Corporativo</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerir múltiplas unidades de negócio</p>
               </div>
               <button onClick={() => setShowAddBusiness(true)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center"><Briefcase size={18} className="mr-3" /> Novo Negócio</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {session.account.businesses.map(biz => (
                 <div key={biz.id} className={`p-8 rounded-[3rem] border transition-all flex flex-col md:flex-row justify-between items-center gap-6 ${biz.id === activeBusiness.id ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center gap-6">
                       <div className={`p-5 rounded-[1.5rem] shadow-sm ${biz.id === activeBusiness.id ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}><Briefcase size={28}/></div>
                       <div>
                          <h4 className="font-black text-slate-900 text-xl font-heading leading-tight">{biz.name}</h4>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 block">{biz.category}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       {biz.id !== activeBusiness.id ? (
                          <button onClick={() => setSwitchTargetId(biz.id)} className="px-10 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">Trocar Ambiente</button>
                       ) : (
                          <span className="bg-emerald-200 text-emerald-800 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest">Ativo Agora</span>
                       )}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      )}

      {activeTab === 'chef' && (
         <div className="h-[750px] bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden animate-[fadeIn_0.3s]">
            <AIChef items={activeBusiness.items} />
         </div>
      )}

      {activeTab === 'subscription' && (
         <div className="animate-[fadeIn_0.3s]">
            <SubscriptionPage account={session.account} activeBusiness={activeBusiness} onRenew={onRenewSubscription} onExit={() => setActiveTab('reports')} isExpiredMode={false} isOwner={isOwner} />
         </div>
      )}

      {/* Modal Switch Business (Padronizado) */}
      {switchTargetId && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-[scaleIn_0.2s] text-center">
               <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={36}/></div>
               <h3 className="text-2xl font-black text-slate-900 font-heading mb-2">Segurança Ativa</h3>
               <p className="text-xs text-slate-400 mb-8">Introduza a sua password mestra para trocar de negócio.</p>
               <form onSubmit={handleConfirmSwitch} className="space-y-6">
                  <input type="password" autoFocus className="w-full p-5 bg-slate-50 border-none rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-emerald-500 shadow-inner" placeholder="••••••••" value={switchPassword} onChange={e => setSwitchPassword(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                     <button type="button" onClick={() => { setSwitchTargetId(null); setSwitchPassword(''); }} className="py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                     <button type="submit" className="py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl">Validar</button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default ProfilePage;
