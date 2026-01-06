
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
import { InventoryItem, CurrencyCode, SaleRecord, Account, Business, CurrentSession, PaymentMethod, Permission, AuditLogEntry, Customer, Expense } from './types';
import { DEFAULT_EXCHANGE_RATES, APP_NAME, getDemoAccount, APP_VERSION, generateID } from './constants';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';

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
              <NavButton to="/appointments" label="📅 Agendamentos" />
              {can('MANAGE_STOCK') && <NavButton to="/inventory" label="Inventário" />}
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
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-xl font-medium transition-colors"
          >
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
    if (!initialAccounts.find(a => a.phoneNumber === demoUser.phoneNumber)) {
      initialAccounts.push(demoUser);
    }
    return initialAccounts;
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

  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('currency') as CurrencyCode) || 'MZN';
  });

  const [rates, setRates] = useState<Record<CurrencyCode, number>>(() => {
    try {
      const savedRates = localStorage.getItem('exchange_rates');
      return savedRates ? JSON.parse(savedRates) : DEFAULT_EXCHANGE_RATES;
    } catch (e) {
      return DEFAULT_EXCHANGE_RATES;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('gestao360_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (currentSession) localStorage.setItem('gestao360_session', JSON.stringify(currentSession));
    else localStorage.removeItem('gestao360_session');
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

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

  const handleLoginSuccess = (account: Account, businessId: string, operator: any) => {
    const finalPermissions: Permission[] = operator.role === 'owner' 
      ? ['POS_SELL', 'MANAGE_STOCK', 'VIEW_REPORTS', 'MANAGE_TEAM', 'SETTINGS']
      : (operator.permissions || []);

    setCurrentSession({
       account, businessId,
       operator: { ...operator, permissions: finalPermissions }
    });
  };

  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    const opName = currentSession?.operator.role === 'owner' ? 'Proprietário' : currentSession?.operator.name || 'Sistema';
    return {
      id: generateID(),
      action,
      details,
      operatorName: opName,
      timestamp: new Date().toISOString()
    };
  };

  const handleSaveProduct = (newVariants: InventoryItem[], originalName?: string) => {
    if (!currentSession) return;
    updateActiveBusiness(biz => {
      const nameToRemove = originalName || (newVariants.length > 0 ? newVariants[0].name : '');
      const otherItems = biz.items.filter(i => i.name !== nameToRemove);
      const log = createLog(originalName ? 'UPDATE' : 'CREATE', `Produto: ${newVariants[0].name}`);
      return { 
        ...biz, 
        items: [...otherItems, ...newVariants],
        auditLogs: [log, ...(biz.auditLogs || [])]
      };
    });
    setEditingItem(null);
    navigate('/inventory');
  };

  const handleBatchSale = (cartItems: CartItem[], paymentMethod: PaymentMethod, customer?: Customer): SaleRecord[] => {
    if (!activeBusiness || !currentSession) return [];
    const newSales: SaleRecord[] = [];
    const date = new Date().toISOString();
    const transactionId = generateID();
    let totalRev = 0;

    const updatedItems = activeBusiness.items.map(item => {
      const cartItem = cartItems.find(ci => ci.item.id === item.id);
      if (cartItem) {
        const rev = (item.sellingPrice || item.price) * cartItem.quantity;
        totalRev += rev;
        newSales.push({
          id: generateID(), transactionId, itemId: item.id, itemName: item.name,
          itemSize: item.size, itemUnit: item.unit, quantity: cartItem.quantity,
          totalRevenue: rev, totalProfit: (item.sellingPrice - item.price) * cartItem.quantity,
          date, paymentMethod, operatorName: currentSession.operator.name, operatorId: currentSession.operator.id,
          customerId: customer?.id, customerName: customer?.name
        });
        return { ...item, quantity: Number((item.quantity - cartItem.quantity).toFixed(2)) };
      }
      return item;
    });

    updateActiveBusiness(biz => ({
      ...biz,
      items: updatedItems,
      sales: [...biz.sales, ...newSales],
      auditLogs: [createLog('SALE', `Venda #${transactionId.slice(0,6)}: ${totalRev.toFixed(2)}MT`), ...(biz.auditLogs || [])]
    }));

    return newSales;
  };

  const handleSaveExpense = (exp: Expense) => {
     updateActiveBusiness(biz => ({
        ...biz,
        expenses: [...(biz.expenses || []).filter(e => e.id !== exp.id), exp],
        auditLogs: [createLog('EXPENSE', `Despesa: ${exp.name}`), ...(biz.auditLogs || [])]
     }));
  };

  if (!currentSession || !activeBusiness) {
     return <AuthPage onLoginSuccess={handleLoginSuccess} accounts={accounts} onUpdateAccounts={setAccounts} />;
  }

  const can = (p: Permission) => currentSession.operator.permissions.includes(p);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-gray-900">
      <Sidebar currency={currency} onCurrencyChange={setCurrency} rates={rates} session={currentSession} activeBusiness={activeBusiness} onSwitchBusiness={() => setCurrentSession(null)} />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} currency={currency} onCurrencyChange={setCurrency} rates={rates} onLogout={() => setCurrentSession(null)} session={currentSession} />
      
      <main className="flex-1 md:ml-72 w-full min-h-screen flex flex-col">
        <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/profile')} className="p-2 bg-gray-50 border border-gray-200 rounded-full text-emerald-600 shadow-sm"><UserIcon size={20} /></button>
             <h1 className="text-sm font-bold">{activeBusiness.name}</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-gray-50 border border-gray-200 rounded-lg"><Menu size={24} /></button>
        </div>

        <div className="flex-1">
          <Routes>
            <Route path="/appointments" element={<AppointmentsPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} />} />
            <Route path="/" element={can('VIEW_REPORTS') ? <Dashboard items={activeBusiness.items} sales={activeBusiness.sales} logs={activeBusiness.auditLogs} expenses={activeBusiness.expenses} currency={currency} exchangeRates={rates} onSaveExpense={handleSaveExpense} /> : <Navigate to="/profile" replace />} />
            <Route path="/inventory" element={can('MANAGE_STOCK') ? <InventoryList items={activeBusiness.items} onDelete={(id) => updateActiveBusiness(b => ({...b, items: b.items.filter(i => i.id !== id)}))} onEdit={(i) => { setEditingItem(i); navigate('/add'); }} currency={currency} exchangeRates={rates} activeBusinessCategory={activeBusiness.category} /> : <Navigate to="/" replace />} />
            <Route path="/add" element={can('MANAGE_STOCK') ? <AddItemForm onSave={handleSaveProduct} onCancel={() => navigate('/inventory')} editingItem={editingItem} allItems={activeBusiness.items} suppliers={activeBusiness.suppliers} currency={currency} exchangeRates={rates} activeBusinessCategory={activeBusiness.category} /> : <Navigate to="/" replace />} />
            <Route path="/sales" element={can('POS_SELL') ? <SalesPage items={activeBusiness.items} customers={activeBusiness.customers || []} onBatchSale={handleBatchSale} onAddCustomer={(n, p) => { const c = {id: generateID(), name: n, phone: p, totalSpent: 0, loyaltyPoints: 0, lastVisit: new Date().toISOString(), email: '', address: '', notes: ''}; updateActiveBusiness(b => ({...b, customers: [...(b.customers || []), c]})); return c; }} currency={currency} exchangeRates={rates} /> : <Navigate to="/" replace />} />
            <Route path="/profile" element={<ProfilePage session={currentSession} activeBusiness={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} onAddBusiness={(b) => setAccounts(p => p.map(a => a.id === currentSession.account.id ? {...a, businesses: [...a.businesses, b]} : a))} onSwitchBusinessSecure={(id) => setCurrentSession({...currentSession, businessId: id})} currency={currency} exchangeRates={rates} onRenewSubscription={(id, plan) => {}} />} />
            <Route path="/settings" element={can('SETTINGS') ? <Settings rates={rates} onUpdateRate={(c, r) => setRates(p => ({...p, [c]: r}))} onResetRates={() => setRates(DEFAULT_EXCHANGE_RATES)} onClearInventory={() => updateActiveBusiness(b => ({...b, items: []}))} /> : <Navigate to="/" replace />} />
            <Route path="/suppliers" element={can('MANAGE_STOCK') ? <SuppliersPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} /> : <Navigate to="/" replace />} />
            <Route path="/customers" element={(can('MANAGE_STOCK') || can('POS_SELL')) ? <CustomersPage business={activeBusiness} onUpdateBusiness={(b) => updateActiveBusiness(() => b)} currentOperator={currentSession.operator.name} /> : <Navigate to="/" replace />} />
            <Route path="/remove" element={can('MANAGE_STOCK') ? <RemoveItems items={activeBusiness.items} onDelete={(id) => updateActiveBusiness(b => ({...b, items: b.items.filter(i => i.id !== id)}))} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => <Router><AppContent /></Router>;
export default App;
