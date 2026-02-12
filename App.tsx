
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import AddItemForm from './components/AddItemForm';
import AIChef from './components/AIChef';
import Settings from './components/Settings';
import RemoveItems from './components/RemoveItems';
import SalesPage, { CartItem } from './components/SalesPage';
import AuthPage from './components/AuthPage';
import SubscriptionPage from './components/SubscriptionPage';
import ProfilePage from './components/ProfilePage';
import SuppliersPage from './components/SuppliersPage';
import CustomersPage from './components/CustomersPage';
import AppointmentsPage from './components/AppointmentsPage'; 
import ResellersPage from './components/ResellersPage';
import { InventoryItem, CurrencyCode, SaleRecord, Account, Business, CurrentSession, PaymentMethod, Permission, AuditLogEntry, Customer, Expense, Appointment, AppointmentStatus, Supplier } from './types';
import { DEFAULT_EXCHANGE_RATES, APP_NAME, getDemoAccount, APP_VERSION, generateID, CURRENCY_SYMBOLS } from './constants';
import { Menu, X, LogOut, User as UserIcon, Receipt, CheckCircle, Smartphone, User, Clock, Building2 } from 'lucide-react';

const MobileNav = ({ 
  isOpen, onClose, currency, onCurrencyChange, rates, onLogout, session
}: { 
  isOpen: boolean; 
  onClose: () => void;
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  onLogout: () => void;
  session: CurrentSession | null;
}) => {
  if (!isOpen) return null;
  const permissions = session?.operator.permissions || [];
  const can = (p: Permission) => permissions.includes(p);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 md:hidden backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-72 h-full shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-emerald-700 text-white">
          <div className="flex flex-col">
             <span className="font-bold text-lg font-heading">Menu Principal</span>
             {session && <span className="text-xs text-emerald-100">Op: {session.operator.name}</span>}
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1"><X size={24} /></button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto" onClick={onClose}>
           <nav className="space-y-1">
              {can('VIEW_REPORTS') && <NavButton to="/" label="Dashboard" />}
              {can('POS_SELL') && <NavButton to="/sales" label="Caixa (Vendas)" />}
              <NavButton to="/appointments" label="Agendamentos" />
              {can('MANAGE_STOCK') && <NavButton to="/inventory" label="Inventário" />}
              {can('MANAGE_STOCK') && <NavButton to="/resellers" label="Revendedores" />}
              {can('MANAGE_STOCK') && <NavButton to="/add" label="Adicionar Produto" />}
              {can('MANAGE_STOCK') && <NavButton to="/suppliers" label="Fornecedores" />}
              {(can('MANAGE_STOCK') || can('POS_SELL')) && <NavButton to="/customers" label="Clientes" />}
              {can('SETTINGS') && <NavButton to="/settings" label="Definições" />}
              {can('MANAGE_STOCK') && <NavButton to="/remove" label="Lixo" />}
           </nav>
        </div>
        <div className="p-5 border-t border-gray-100 space-y-4 bg-gray-50">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Moeda</label>
            <select 
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {Object.keys(rates).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 bg-white border border-red-100 rounded-xl font-medium transition-colors">
            <LogOut size={18} />
            <span>Sair do Negócio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ to, label }: { to: string, label: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <button 
      onClick={() => navigate(to)}
      className={`w-full text-left px-4 py-3 rounded-xl transition-colors font-medium ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );
};

const AppContent: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    let initialAccounts: Account[] = [];
    try {
      const saved = localStorage.getItem('gestao360_accounts');
      if (saved) initialAccounts = JSON.parse(saved);
    } catch (e) {}
    
    const demoUser = getDemoAccount();
    const otherAccounts = initialAccounts.filter(a => a.phoneNumber !== demoUser.phoneNumber);
    return [demoUser, ...otherAccounts];
  });

  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(() => {
     try {
        const saved = localStorage.getItem('gestao360_session');
        return saved ? JSON.parse(saved) : null;
     } catch(e) { return null; }
  });

  const activeBusiness = currentSession 
    ? accounts.find(a => a.id === currentSession.account.id)?.businesses.find(b => b.id === currentSession.businessId)
    : null;

  const [currency, setCurrency] = useState<CurrencyCode>(() => (localStorage.getItem('currency') as CurrencyCode) || 'MZN');
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(() => {
    try {
      const savedRates = localStorage.getItem('exchange_rates');
      return savedRates ? JSON.parse(savedRates) : DEFAULT_EXCHANGE_RATES;
    } catch (e) { return DEFAULT_EXCHANGE_RATES; }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{records: SaleRecord[], total: number, method: PaymentMethod} | null>(null);
  const navigate = useNavigate();

  useEffect(() => { localStorage.setItem('gestao360_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { if (currentSession) localStorage.setItem('gestao360_session', JSON.stringify(currentSession)); else localStorage.removeItem('gestao360_session'); }, [currentSession]);
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    const opName = currentSession?.operator.role === 'owner' ? 'Proprietário' : currentSession?.operator.name || 'Sistema';
    return { id: generateID(), action, details, operatorName: opName, timestamp: new Date().toISOString() };
  };

  const updateActiveBusiness = (updater: (b: Business) => Business) => {
    if (!currentSession || !activeBusiness) return;
    setAccounts(prevAccounts => prevAccounts.map(acc => {
      if (acc.id === currentSession.account.id) {
        return {
          ...acc,
          businesses: acc.businesses.map(b => b.id === currentSession.businessId ? updater(b) : b)
        };
      }
      return acc;
    }));
  };

  const handleQuickAddSupplier = (supData: Omit<Supplier, 'id'>) => {
     const newSup: Supplier = { ...supData, id: generateID() };
     updateActiveBusiness(biz => ({
        ...biz, suppliers: [...(biz.suppliers || []), newSup],
        auditLogs: [createLog('CREATE', `Fornecedor Rápido: ${newSup.name}`), ...(biz.auditLogs || [])]
     }));
     return newSup;
  };

  const handleRestock = (itemId: string, qty: number) => {
    if (!activeBusiness) return;
    const item = activeBusiness.items.find(i => i.id === itemId);
    if (!item) return;
    updateActiveBusiness(biz => {
       const updatedItems = biz.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity + qty } : i);
       const log = createLog('UPDATE', `Reposição: +${qty} un para "${item.name}"`);
       return { ...biz, items: updatedItems, auditLogs: [log, ...(biz.auditLogs || [])] };
    });
  };

  const handlePayExpense = (expenseId: string, method: PaymentMethod, months: number = 1) => {
    if (!activeBusiness || !currentSession) return;
    const expense = activeBusiness.expenses?.find(e => e.id === expenseId);
    if (!expense) return;
    const opName = currentSession.operator.name;
    const totalAmountPaid = expense.amount * months;
    
    updateActiveBusiness(biz => {
      let updatedExpenses = (biz.expenses || []).map(e => {
        if (e.id === expenseId) {
          if (e.type === 'variable') return { ...e, isPaid: true, lastPaidDate: new Date().toISOString(), paymentMethod: method, operatorName: opName };
          const nextDue = new Date(e.nextDueDate);
          nextDue.setMonth(nextDue.getMonth() + months);
          return { ...e, lastPaidDate: new Date().toISOString(), nextDueDate: nextDue.toISOString(), paymentMethod: method, operatorName: opName, isPaid: true };
        }
        return e;
      });
      const log = createLog('EXPENSE', `Saída Paga (${months} mes/es): "${expense.name}" (${totalAmountPaid}MT)`);
      return { ...biz, expenses: updatedExpenses, auditLogs: [log, ...(biz.auditLogs || [])] };
    });
  };

  const handleUpdateAppointmentStatus = (id: string, status: AppointmentStatus) => {
     updateActiveBusiness(biz => ({
        ...biz,
        appointments: (biz.appointments || []).map(a => a.id === id ? { ...a, status } : a),
        auditLogs: [createLog('APPOINTMENT', `Estado alterado para ${status}`), ...(biz.auditLogs || [])]
     }));
  };

  const handleCompleteAppointment = (appointmentId: string, paymentMethod: PaymentMethod) => {
    if (!activeBusiness || !currentSession) return;
    const appt = activeBusiness.appointments?.find(a => a.id === appointmentId);
    if (!appt) return;
    const transactionId = generateID();
    const date = new Date().toISOString();
    const salesRecords: SaleRecord[] = (appt.serviceIds || []).map(sid => {
       const service = activeBusiness.items.find(i => i.id === sid);
       const sellPrice = service?.sellingPrice || service?.price || 0;
       return {
          id: generateID(), transactionId, itemId: sid, itemName: service?.name || 'Serviço',
          itemSize: service?.size, itemUnit: service?.unit, quantity: 1,
          totalRevenue: sellPrice, totalProfit: sellPrice - (service?.price || 0),
          date, paymentMethod, operatorName: currentSession.operator.name, operatorId: currentSession.operator.id,
          customerId: appt.customerId, customerName: appt.customerName
       };
    });
    const totalRevenue = salesRecords.reduce((acc, r) => acc + r.totalRevenue, 0);
    updateActiveBusiness(biz => {
      const updatedAppointments = (biz.appointments || []).map(a => a.id === appointmentId ? { ...a, status: 'completed' as AppointmentStatus } : a);
      const updatedSales = [...(biz.sales || []), ...salesRecords];
      const updatedCustomers = (biz.customers || []).map(c => 
        c.id === appt.customerId ? { ...c, lastVisit: new Date().toISOString(), totalSpent: c.totalSpent + totalRevenue } : c
      );
      const log = createLog('SALE', `Agendamento Concluído: ${appt.customerName} (${totalRevenue}MT)`);
      return { ...biz, appointments: updatedAppointments, sales: updatedSales, customers: updatedCustomers, auditLogs: [log, ...(biz.auditLogs || [])] };
    });
    setActiveReceipt({ records: salesRecords, total: totalRevenue, method: paymentMethod });
  };

  const handleAddCustomer = (name: string, phone: string) => {
     const newCust: Customer = {
        id: generateID(), name, phone, email: '', address: '', notes: '', loyaltyPoints: 0, totalSpent: 0, lastVisit: new Date().toISOString()
     };
     updateActiveBusiness(b => ({...b, customers: [...(b.customers || []), newCust]}));
     return newCust;
  };

  const handleLoginSuccess = (account: Account, businessId: string, operator: any) => {
    if (account.phoneNumber === '840000001') {
       const freshDemo = getDemoAccount();
       setAccounts(prev => prev.map(a => a.phoneNumber === '840000001' ? freshDemo : a));
       setCurrentSession({ account: freshDemo, businessId: freshDemo.businesses[0].id, operator: { ...operator, permissions: ['POS_SELL', 'MANAGE_STOCK', 'VIEW_REPORTS', 'MANAGE_TEAM', 'SETTINGS'] } });
    } else {
       const finalPermissions: Permission[] = operator.role === 'owner' ? ['POS_SELL', 'MANAGE_STOCK', 'VIEW_REPORTS', 'MANAGE_TEAM', 'SETTINGS'] : (operator.permissions || []);
       setCurrentSession({ account, businessId, operator: { ...operator, permissions: finalPermissions } });
    }
  };

  if (!currentSession || !activeBusiness) return <AuthPage onLoginSuccess={handleLoginSuccess} accounts={accounts} onUpdateAccounts={setAccounts} />;
  const can = (p: Permission) => currentSession.operator.permissions.includes(p);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-gray-900">
      <Sidebar currency={currency} onCurrencyChange={setCurrency} rates={rates} session={currentSession} activeBusiness={activeBusiness} onSwitchBusiness={() => setCurrentSession(null)} />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} currency={currency} onCurrencyChange={setCurrency} rates={rates} onLogout={() => setCurrentSession(null)} session={currentSession} />
      <main className="flex-1 md:ml-72 w-full min-h-screen flex flex-col">
        <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/profile')} className="p-2 bg-gray-50 border rounded-full text-emerald-600"><UserIcon size={20} /></button>
             <h1 className="text-sm font-bold truncate max-w-[150px]">{activeBusiness.name}</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-gray-50 border border-gray-200 rounded-lg"><Menu size={24} /></button>
        </div>
        <div className="flex-1">
          <Routes>
            <Route path="/appointments" element={<AppointmentsPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} onCompleteAppointment={handleCompleteAppointment} onAddCustomer={handleAddCustomer} />} />
            <Route path="/" element={can('VIEW_REPORTS') ? <Dashboard items={activeBusiness.items} sales={activeBusiness.sales} logs={activeBusiness.auditLogs} expenses={activeBusiness.expenses} customers={activeBusiness.customers} suppliers={activeBusiness.suppliers} appointments={activeBusiness.appointments} currency={currency} exchangeRates={rates} onPayExpense={handlePayExpense} onRestock={handleRestock} onSaveExpense={(e) => updateActiveBusiness(b => ({...b, expenses: [...(b.expenses || []).filter(ex => ex.id !== e.id), e]}))} activeBusinessName={activeBusiness.name} currentOperator={currentSession.operator.name} onDeleteExpense={(id) => updateActiveBusiness(b => ({...b, expenses: b.expenses?.filter(e => e.id !== id)}))} onUpdateAppointmentStatus={handleUpdateAppointmentStatus} onCompleteAppointment={handleCompleteAppointment} /> : <Navigate to="/profile" replace />} />
            <Route path="/inventory" element={can('MANAGE_STOCK') ? <InventoryList items={activeBusiness.items} onDelete={(id) => updateActiveBusiness(b => ({...b, items: b.items.filter(i => i.id !== id)}))} onEdit={(i) => { setEditingItem(i); navigate('/add'); }} currency={currency} exchangeRates={rates} activeBusinessCategory={activeBusiness.category} suppliers={activeBusiness.suppliers} /> : <Navigate to="/" replace />} />
            <Route path="/resellers" element={can('MANAGE_STOCK') ? <ResellersPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} currency={currency} exchangeRates={rates} /> : <Navigate to="/" replace />} />
            <Route path="/add" element={can('MANAGE_STOCK') ? <AddItemForm onSave={(newVariants, orig) => { updateActiveBusiness(biz => ({...biz, items: [...biz.items.filter(i => i.name !== (orig || newVariants[0].name)), ...newVariants], auditLogs: [createLog('CREATE', `Produto: ${newVariants[0].name}`), ...(biz.auditLogs || [])]})); navigate('/inventory'); }} onCancel={() => navigate('/inventory')} editingItem={editingItem} allItems={activeBusiness.items} suppliers={activeBusiness.suppliers} currency={currency} exchangeRates={rates} activeBusinessCategory={activeBusiness.category} onQuickAddSupplier={handleQuickAddSupplier} /> : <Navigate to="/" replace />} />
            <Route path="/sales" element={can('POS_SELL') ? <SalesPage items={activeBusiness.items} customers={activeBusiness.customers || []} onBatchSale={(cart, method, cust) => { const txId = generateID(); const date = new Date().toISOString(); const sales = cart.map(ci => ({id: generateID(), transactionId: txId, itemId: ci.item.id, itemName: ci.item.name, itemSize: ci.item.size, itemUnit: ci.item.unit, quantity: ci.quantity, totalRevenue: ci.quantity * (ci.item.sellingPrice || ci.item.price), totalProfit: ci.quantity * (ci.item.sellingPrice - ci.item.price), date, paymentMethod: method, operatorName: currentSession.operator.name, operatorId: currentSession.operator.id, customerId: cust?.id, customerName: cust?.name})); updateActiveBusiness(b => {
              const updatedItems = b.items.map(i => { const ci = cart.find(c => c.item.id === i.id); return ci ? {...i, quantity: i.quantity - ci.quantity} : i; });
              const updatedCustomers = cust ? b.customers.map(c => c.id === cust.id ? { ...c, lastVisit: new Date().toISOString(), totalSpent: c.totalSpent + cart.reduce((acc, ci) => acc + (ci.quantity * (ci.item.sellingPrice || ci.item.price)), 0) } : c) : b.customers;
              return {...b, sales: [...b.sales, ...sales], items: updatedItems, customers: updatedCustomers, auditLogs: [createLog('SALE', `Venda #${txId.slice(0,6)} Processada`), ...(b.auditLogs || [])]};
            }); return sales; }} onAddCustomer={handleAddCustomer} currency={currency} exchangeRates={rates} /> : <Navigate to="/" replace />} />
            <Route path="/profile" element={<ProfilePage session={currentSession} activeBusiness={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} onAddBusiness={(b) => setAccounts(p => p.map(a => a.id === currentSession.account.id ? {...a, businesses: [...a.businesses, b]} : a))} onSwitchBusinessSecure={(id) => setCurrentSession({...currentSession, businessId: id})} currency={currency} exchangeRates={rates} onRenewSubscription={(id, plan) => {}} />} />
            <Route path="/settings" element={can('SETTINGS') ? <Settings rates={rates} onUpdateRate={(c, r) => setRates(p => ({...p, [c]: r}))} onResetRates={() => setRates(DEFAULT_EXCHANGE_RATES)} onClearInventory={() => updateActiveBusiness(b => ({...b, items: []}))} /> : <Navigate to="/" replace />} />
            <Route path="/suppliers" element={can('MANAGE_STOCK') ? <SuppliersPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} /> : <Navigate to="/" replace />} />
            <Route path="/customers" element={(can('MANAGE_STOCK') || can('POS_SELL')) ? <CustomersPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} /> : <Navigate to="/" replace />} />
            <Route path="/remove" element={can('MANAGE_STOCK') ? <RemoveItems items={activeBusiness.items} onDelete={(id) => updateActiveBusiness(b => ({...b, items: b.items.filter(i => i.id !== id)}))} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* RECIBO DIGITAL ULTRA-DETALHADO */}
        {activeReceipt && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-[fadeIn_0.2s]">
             <div className="bg-white w-full max-w-sm rounded-[4rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
                <div className="p-10 bg-emerald-600 text-white text-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-pulse"></div>
                   <CheckCircle className="mx-auto mb-4" size={56} />
                   <h3 className="text-2xl font-black font-heading tracking-tight">Transação Concluída</h3>
                   <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Documento Digital #{(activeReceipt.records[0]?.transactionId || '000').slice(0,8)}</p>
                </div>
                
                <div className="p-8 space-y-6">
                   <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 shadow-inner">
                      <div className="flex justify-between items-start mb-6 border-b border-dashed border-slate-200 pb-4">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Building2 size={10}/> Empresa</p>
                            <p className="text-sm font-bold text-slate-800">{activeBusiness.name}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 justify-end"><Clock size={10}/> Data</p>
                            <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('pt-PT')}</p>
                         </div>
                      </div>

                      <div className="space-y-3 mb-6 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                         {activeReceipt.records.map((r, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                               <div className="min-w-0 flex-1"><p className="font-bold text-slate-700 truncate">{r.itemName}</p><p className="text-[9px] text-slate-400 uppercase">{r.quantity}x {r.itemUnit || 'un'}</p></div>
                               <span className="ml-4 font-black text-slate-900">{CURRENCY_SYMBOLS[currency]} {r.totalRevenue.toLocaleString()}</span>
                            </div>
                         ))}
                      </div>

                      <div className="space-y-2 border-t border-dashed border-slate-200 pt-4 mb-6">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                            <span>Canal</span>
                            <span className="text-emerald-600 flex items-center gap-1.5"><Smartphone size={12}/> {activeReceipt.method}</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                            <span>Operador</span>
                            <span className="text-slate-800">{activeReceipt.records[0]?.operatorName}</span>
                         </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Pago</span>
                         <span className="text-3xl font-black text-emerald-600">{CURRENCY_SYMBOLS[currency]} {activeReceipt.total.toLocaleString()}</span>
                      </div>
                   </div>

                   <button onClick={() => setActiveReceipt(null)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center">
                      <Receipt size={18} className="mr-3 text-emerald-400" /> Novo Recebimento
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => <Router><AppContent /></Router>;
export default App;
