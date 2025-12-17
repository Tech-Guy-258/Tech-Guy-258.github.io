
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import InventoryList from './InventoryList';
import AddItemForm from './AddItemForm';
import AIChef from './AIChef';
import Settings from './Settings';
import RemoveItems from './RemoveItems';
import SalesPage, { CartItem } from './SalesPage';
import AuthPage from './AuthPage';
import SubscriptionPage from './SubscriptionPage';
import ProfilePage from './ProfilePage';
import SuppliersPage from './SuppliersPage';
import CustomersPage from './CustomersPage';
import AppointmentsPage from './AppointmentsPage'; 
import { InventoryItem, CurrencyCode, SaleRecord, Account, Business, CurrentSession, PaymentMethod, Permission, AuditLogEntry, Customer, Expense } from '../types';
import { DEFAULT_EXCHANGE_RATES, APP_NAME, getDemoAccount, APP_VERSION, generateID } from '../constants';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';

// --- MOBILE NAV COMPONENT ---
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
              {can('VIEW_REPORTS') && <NavButton to="/" label="Dashboard" onClose={onClose} />}
              {can('POS_SELL') && <NavButton to="/sales" label="Caixa (Vendas)" onClose={onClose} />}
              
              <NavButton to="/appointments" label="📅 Agendamentos" onClose={onClose} />
              
              {can('MANAGE_STOCK') && <NavButton to="/inventory" label="Inventário" onClose={onClose} />}
              {can('MANAGE_STOCK') && <NavButton to="/add" label="Adicionar Produto" onClose={onClose} />}
              
              {can('MANAGE_STOCK') && <NavButton to="/suppliers" label="Fornecedores" onClose={onClose} />}
              {(can('MANAGE_STOCK') || can('POS_SELL')) && <NavButton to="/customers" label="Clientes" onClose={onClose} />}
              
              {can('SETTINGS') && <NavButton to="/settings" label="Definições" onClose={onClose} />}
              {can('MANAGE_STOCK') && <NavButton to="/remove" label="Lixo" onClose={onClose} />}
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
          <p className="text-[10px] text-center text-gray-400 mt-2 font-mono">v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ to, label, onClose }: { to: string, label: string, onClose?: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <button 
      onClick={() => {
         navigate(to);
         if(onClose) onClose();
      }}
      className={`w-full text-left px-4 py-3 rounded-xl transition-colors font-medium ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );
};

const AppContent: React.FC = () => {
  // --- GLOBAL DATA (All Accounts) ---
  const [accounts, setAccounts] = useState<Account[]>(() => {
    let initialAccounts: Account[] = [];
    try {
      const saved = localStorage.getItem('gestao360_accounts');
      if (saved) {
        initialAccounts = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load accounts", e);
    }

    // INJECT DEMO USER IF MISSING
    const demoUser = getDemoAccount();
    if (!initialAccounts.find(a => a.phoneNumber === demoUser.phoneNumber)) {
      initialAccounts.push(demoUser);
    }

    return initialAccounts;
  });

  // --- SESSION STATE ---
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(() => {
     try {
        const saved = localStorage.getItem('gestao360_session');
        return saved ? JSON.parse(saved) : null;
     } catch(e) { return null; }
  });

  // Helper: Get Active Business Object
  const activeBusiness = currentSession 
    ? accounts.find(a => a.id === currentSession.account.id)?.businesses.find(b => b.id === currentSession.businessId)
    : null;

  // SAFETY: Ensure business has appointment array even if old data
  if (activeBusiness && !activeBusiness.appointments) {
     activeBusiness.appointments = [];
  }

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

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('gestao360_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (currentSession) {
       localStorage.setItem('gestao360_session', JSON.stringify(currentSession));
    } else {
       localStorage.removeItem('gestao360_session');
    }
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // --- DATA UPDATERS ---
  
  const updateActiveBusiness = (updater: (b: Business) => Business) => {
    if (!currentSession || !activeBusiness) return;

    setAccounts(prevAccounts => prevAccounts.map(acc => {
      if (acc.id === currentSession.account.id) {
        return {
          ...acc,
          businesses: acc.businesses.map(b => {
             if (b.id === currentSession.businessId) {
                return updater(b);
             }
             return b;
          })
        };
      }
      return acc;
    }));
  };

  const handleUpdateAccounts = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
  };

  const handleLoginSuccess = (account: Account, businessId: string, operator: {id: string, name: string, role: 'owner' | 'employee', permissions?: Permission[]}) => {
    const finalPermissions: Permission[] = operator.role === 'owner' 
      ? ['POS_SELL', 'MANAGE_STOCK', 'VIEW_REPORTS', 'MANAGE_TEAM', 'SETTINGS']
      : (operator.permissions || []);

    setCurrentSession({
       account: account, 
       businessId,
       operator: {
         ...operator,
         permissions: finalPermissions
       }
    });
  };

  const handleSwitchBusinessSecure = (targetBusinessId: string) => {
    if (currentSession) {
       setCurrentSession({
         ...currentSession,
         businessId: targetBusinessId
       });
       navigate('/');
    }
  };

  const getOperatorDisplayName = () => {
    if (!currentSession) return 'Sistema';
    return currentSession.operator.role === 'owner' ? 'Proprietário' : currentSession.operator.name;
  };

  // --- AUDIT HELPER (SAFE WRAPPER) ---
  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    return {
      id: generateID(), // UPDATED: Use safe generator
      action,
      details,
      operatorName: getOperatorDisplayName(),
      timestamp: new Date().toISOString()
    };
  };

  // --- CENTRALIZED EXPENSE LOGIC (PROTECTED) ---
  
  const handleSaveExpense = (expenseData: Expense) => {
    try {
      updateActiveBusiness(biz => {
        const expenses = biz.expenses || [];
        const logs = biz.auditLogs || [];

        const exists = expenses.find(e => e.id === expenseData.id);
        let updatedExpenses = [...expenses];
        let log: AuditLogEntry;
        
        const methodLabel = expenseData.isPaid && expenseData.paymentMethod ? ` via ${expenseData.paymentMethod}` : '';

        if (exists) {
          updatedExpenses = updatedExpenses.map(e => e.id === expenseData.id ? expenseData : e);
          log = createLog('UPDATE', `Editou despesa: ${expenseData.name}`);
        } else {
          updatedExpenses.push(expenseData);
          log = createLog('EXPENSE', `Criou despesa: ${expenseData.name} (${expenseData.isPaid ? 'Paga' + methodLabel : 'Pendente'})`);
        }

        return {
          ...biz,
          expenses: updatedExpenses,
          auditLogs: [log, ...logs]
        };
      });
      alert("Despesa guardada com sucesso."); 
    } catch (e) {
      console.error("FATAL ERROR SAVING EXPENSE:", e);
      alert("Erro ao guardar. Verifique a consola ou recarregue a página.");
    }
  };

  const handlePayExpense = (expense: Expense, method?: PaymentMethod) => {
    try {
      if (!activeBusiness) return;
      const isPaying = !expense.isPaid;
      
      if (!isPaying) {
         if (!window.confirm("Desmarcar como pago?")) return;
         updateActiveBusiness(biz => {
            const log = createLog('UPDATE', `Marcou despesa ${expense.name} como não paga`);
            return {
               ...biz,
               expenses: (biz.expenses || []).map(e => e.id === expense.id ? { ...e, isPaid: false, lastPaidDate: undefined, paymentMethod: undefined } : e),
               auditLogs: [log, ...(biz.auditLogs || [])]
            };
         });
         return;
      }

      const todayStr = new Date().toISOString();
      const paymentMethod = method || 'cash';
      
      updateActiveBusiness(biz => {
         let currentExpenses = [...(biz.expenses || [])];
         let newLogs = [...(biz.auditLogs || [])];

         currentExpenses = currentExpenses.map(e => 
            e.id === expense.id ? { ...e, isPaid: true, lastPaidDate: todayStr, paymentMethod: paymentMethod } : e
         );

         if (expense.type === 'fixed') {
            const scheduleNext = window.confirm("Esta é uma despesa fixa. Deseja agendar o próximo mês?");
            if (scheduleNext) {
               const currentDue = new Date(expense.nextDueDate);
               const nextMonthDate = new Date(currentDue);
               nextMonthDate.setMonth(currentDue.getMonth() + 1);
               
               const nextExpense: Expense = {
                  ...expense,
                  id: generateID(),
                  isPaid: false,
                  lastPaidDate: undefined,
                  paymentMethod: undefined,
                  nextDueDate: nextMonthDate.toISOString()
               };
               currentExpenses.push(nextExpense);
               newLogs.unshift(createLog('EXPENSE', `Pagou ${expense.name} (${paymentMethod}) e agendou para ${nextMonthDate.toLocaleDateString()}`));
            } else {
               newLogs.unshift(createLog('EXPENSE', `Pagou despesa fixa: ${expense.name} (${paymentMethod})`));
            }
         } else {
            newLogs.unshift(createLog('EXPENSE', `Pagou despesa: ${expense.name} (${paymentMethod})`));
         }

         return {
            ...biz,
            expenses: currentExpenses,
            auditLogs: newLogs
         };
      });
    } catch (e) {
      console.error("ERROR PAYING EXPENSE", e);
      alert("Erro ao processar pagamento.");
    }
  };

  const handleDeleteExpense = (id: string) => {
     try {
       if (!window.confirm("Remover esta despesa permanentemente?")) return;
       updateActiveBusiness(biz => {
          const log = createLog('EXPENSE', "Removeu uma despesa");
          return {
             ...biz,
             expenses: (biz.expenses || []).filter(e => e.id !== id),
             auditLogs: [log, ...(biz.auditLogs || [])]
          };
       });
     } catch (e) {
       console.error("ERROR DELETING EXPENSE", e);
     }
  };

  // --- BUSINESS LOGIC WRAPPERS ---

  const handleSaveProduct = (newVariants: InventoryItem[], originalName?: string) => {
    if (!currentSession) return;
    const auditedVariants = newVariants.map(v => ({
      ...v,
      lastUpdatedBy: getOperatorDisplayName(),
      lastUpdatedAt: new Date().toISOString()
    }));

    updateActiveBusiness(biz => {
      const nameToRemove = originalName || (auditedVariants.length > 0 ? auditedVariants[0].name : '');
      const otherItems = biz.items.filter(i => String(i.name).trim() !== String(nameToRemove).trim());
      const isNew = !originalName;
      const log = createLog(isNew ? 'CREATE' : 'UPDATE', isNew ? `Adicionou: ${newVariants[0].name}` : `Editou: ${newVariants[0].name}`);

      return { 
        ...biz, 
        items: [...otherItems, ...auditedVariants],
        auditLogs: [log, ...(biz.auditLogs || [])]
      };
    });
    setEditingItem(null);
    navigate('/inventory');
  };

  const handleDeleteItem = (id: string) => {
    updateActiveBusiness(biz => {
      const item = biz.items.find(i => i.id === id);
      const log = createLog('DELETE', `Removeu: ${item?.name || 'Desconhecido'}`);
      return {
         ...biz,
         items: biz.items.filter(i => i.id !== id),
         auditLogs: [log, ...(biz.auditLogs || [])]
      };
    });
  };

  const handleRestock = (itemId: string, quantityToAdd: number) => {
    updateActiveBusiness(biz => {
       const item = biz.items.find(i => i.id === itemId);
       const log = createLog('UPDATE', `Repôs stock de ${item?.name}: +${quantityToAdd}`);
       return {
          ...biz,
          items: biz.items.map(i => i.id === itemId ? { ...i, quantity: (Number(i.quantity) || 0) + quantityToAdd } : i),
          auditLogs: [log, ...(biz.auditLogs || [])]
       };
    });
  };

  const handleCloseRegister = () => {
    updateActiveBusiness(biz => {
      const log = createLog('CLOSE_REGISTER', 'Encerramento de caixa diário');
      return { ...biz, auditLogs: [log, ...(biz.auditLogs || [])] };
    });
  };

  const handleBatchSale = (cartItems: CartItem[], paymentMethod: PaymentMethod, customer?: Customer): SaleRecord[] => {
    if (!activeBusiness || !currentSession) return [];
    const newSales: SaleRecord[] = [];
    const date = new Date().toISOString();
    const transactionId = generateID();
    let updatedItems = [...activeBusiness.items];
    let totalRev = 0;

    cartItems.forEach(cartItem => {
      const itemIndex = updatedItems.findIndex(i => i.id === cartItem.item.id);
      if (itemIndex === -1) return;
      const item = updatedItems[itemIndex];
      const sellingPrice = item.sellingPrice || item.price;
      const totalRevenue = sellingPrice * cartItem.quantity;
      totalRev += totalRevenue;
      const totalProfit = (sellingPrice - item.price) * cartItem.quantity;

      const record: SaleRecord = {
        id: generateID(),
        transactionId, itemId: item.id, itemName: item.name, itemSize: item.size, itemUnit: item.unit,
        quantity: cartItem.quantity, totalRevenue, totalProfit, date, paymentMethod, operatorName: getOperatorDisplayName(), operatorId: currentSession.operator.id,
        customerId: customer?.id, customerName: customer?.name
      };
      newSales.push(record);
      updatedItems[itemIndex] = { ...item, quantity: Number((item.quantity - cartItem.quantity).toFixed(2)) };
    });

    updateActiveBusiness(biz => {
       const customerInfo = customer ? ` | Cliente: ${customer.name}` : '';
       const log = createLog('SALE', `Venda #${transactionId.slice(0,6)} de ${cartItems.length} itens. Total: ${totalRev.toFixed(2)}${customerInfo}`);
       let updatedCustomers = biz.customers;
       if (customer) {
          updatedCustomers = biz.customers.map(c => c.id === customer.id ? { ...c, totalSpent: c.totalSpent + totalRev, loyaltyPoints: c.loyaltyPoints + Math.floor(totalRev / 100), lastVisit: date } : c);
       }
       return { ...biz, items: updatedItems, sales: [...biz.sales, ...newSales], customers: updatedCustomers, auditLogs: [log, ...(biz.auditLogs || [])] };
    });
    return newSales;
  };

  const handleQuickAddCustomer = (name: string, phone: string): Customer => {
     const newCustomer: Customer = { id: generateID(), name, phone, email: '', address: '', notes: 'Criado no Caixa', loyaltyPoints: 0, totalSpent: 0, lastVisit: new Date().toISOString() };
     updateActiveBusiness(biz => ({ ...biz, customers: [...(biz.customers || []), newCustomer] }));
     return newCustomer;
  };

  const handleClearInventory = () => {
     updateActiveBusiness(biz => {
        const log = createLog('DELETE', 'Limpou todo o inventário');
        return { ...biz, items: [], sales: [], auditLogs: [log, ...(biz.auditLogs || [])] };
     });
  };

  const handleSwitchBusiness = () => {
    setCurrentSession(null); 
  };

  if (!currentSession || !activeBusiness) {
     return <AuthPage onLoginSuccess={handleLoginSuccess} accounts={accounts} onUpdateAccounts={handleUpdateAccounts} />;
  }

  const hasPermission = (p: Permission) => currentSession.operator.permissions.includes(p);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-gray-900">
      <Sidebar 
        currency={currency} 
        onCurrencyChange={setCurrency} 
        rates={rates}
        session={currentSession}
        activeBusiness={activeBusiness}
        onSwitchBusiness={handleSwitchBusiness}
      />
      <MobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)}
        currency={currency}
        onCurrencyChange={setCurrency}
        rates={rates}
        onLogout={handleSwitchBusiness}
        session={currentSession}
      />
      
      <main className="flex-1 md:ml-72 w-full min-h-screen flex flex-col">
        {/* Sticky Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/profile')} className="p-2 bg-gray-50 border border-gray-200 rounded-full text-emerald-600 active:scale-95 transition-transform shadow-sm">
               <UserIcon size={20} />
             </button>
             <div>
                <h1 className="text-sm font-bold text-gray-900 font-heading tracking-tight leading-none">{activeBusiness.name}</h1>
                <p className="text-[10px] text-gray-500">{getOperatorDisplayName()}</p>
             </div>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
            <Menu size={24} />
          </button>
        </div>

        <div className="flex-1 p-0 md:p-0">
          <Routes>
            {/* 1. TOP PRIORITY ROUTE FOR APPOINTMENTS - FIX REDIRECT ISSUE */}
            <Route 
              path="/appointments" 
              element={ 
                  <AppointmentsPage 
                    business={activeBusiness} 
                    onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)} 
                    currentOperator={getOperatorDisplayName()}
                  />
              } 
            />

            <Route path="/" element={
               hasPermission('VIEW_REPORTS') ? (
                  <Dashboard 
                    items={activeBusiness.items} 
                    sales={activeBusiness.sales} 
                    logs={activeBusiness.auditLogs}
                    expenses={activeBusiness.expenses || []}
                    currency={currency} 
                    exchangeRates={rates} 
                    onRestock={hasPermission('MANAGE_STOCK') ? handleRestock : undefined}
                    onCloseRegister={hasPermission('VIEW_REPORTS') ? handleCloseRegister : undefined}
                    activeBusinessName={activeBusiness.name}
                    currentOperator={getOperatorDisplayName()}
                    onSaveExpense={handleSaveExpense} // Pass handler
                    onPayExpense={handlePayExpense}
                    onDeleteExpense={handleDeleteExpense}
                  />
               ) : <Navigate to="/profile" replace />
            } />
            <Route path="/profile" element={
              <ProfilePage
                session={currentSession}
                activeBusiness={activeBusiness}
                onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)}
                onAddBusiness={(newBiz) => { setAccounts(prev => prev.map(a => a.id === currentSession.account.id ? {...a, businesses: [...a.businesses, newBiz]} : a)); }}
                onSwitchBusinessSecure={handleSwitchBusinessSecure}
                currency={currency}
                exchangeRates={rates}
                onRenewSubscription={(bizId, plan) => {
                   const newExpiry = new Date(); newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);
                   updateActiveBusiness(b => ({ ...b, subscriptionStatus: 'active', subscriptionExpiry: newExpiry.toISOString() }));
                }}
              />
            } />
            <Route path="/inventory" element={ hasPermission('MANAGE_STOCK') ? <InventoryList items={activeBusiness.items} onDelete={handleDeleteItem} onEdit={(item) => { setEditingItem(item); navigate('/add'); }} currency={currency} exchangeRates={rates} activeBusinessCategory={activeBusiness.category} /> : <Navigate to="/" replace /> } />
            <Route path="/add" element={ hasPermission('MANAGE_STOCK') ? <AddItemForm onSave={handleSaveProduct} onCancel={() => { setEditingItem(null); navigate('/inventory'); }} editingItem={editingItem} allItems={activeBusiness.items} suppliers={activeBusiness.suppliers || []} currency={currency} exchangeRates={rates} activeBusinessCategory={activeBusiness.category} /> : <Navigate to="/" replace /> } />
            <Route path="/sales" element={ hasPermission('POS_SELL') ? <SalesPage items={activeBusiness.items} customers={activeBusiness.customers || []} onBatchSale={handleBatchSale} onAddCustomer={handleQuickAddCustomer} currency={currency} exchangeRates={rates} /> : <Navigate to="/" replace /> } />
            
            <Route path="/suppliers" element={ hasPermission('MANAGE_STOCK') ? <SuppliersPage business={activeBusiness} onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)} /> : <Navigate to="/" replace /> } />
            <Route path="/customers" element={ (hasPermission('MANAGE_STOCK') || hasPermission('POS_SELL')) ? <CustomersPage business={activeBusiness} onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)} /> : <Navigate to="/" replace /> } />
            <Route path="/remove" element={ hasPermission('MANAGE_STOCK') ? <RemoveItems items={activeBusiness.items} onDelete={handleDeleteItem} /> : <Navigate to="/" replace /> } />
            <Route path="/chef" element={<AIChef items={activeBusiness.items} />} />
            <Route path="/settings" element={ hasPermission('SETTINGS') ? <Settings rates={rates} onUpdateRate={(c, r) => c !== 'MZN' && setRates(prev => ({...prev, [c]: r}))} onResetRates={() => setRates(DEFAULT_EXCHANGE_RATES)} onClearInventory={handleClearInventory} /> : <Navigate to="/" replace /> } />
            <Route path="/subscription" element={ (hasPermission('SETTINGS') || hasPermission('VIEW_REPORTS')) ? <SubscriptionPage account={currentSession.account} activeBusiness={activeBusiness} onRenew={(bizId, plan) => { const newExpiry = new Date(); newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths); updateActiveBusiness(b => ({ ...b, subscriptionStatus: 'active', subscriptionExpiry: newExpiry.toISOString() })); }} onExit={handleSwitchBusiness} isExpiredMode={false} isOwner={currentSession.operator.role === 'owner'} /> : <Navigate to="/" replace /> } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => { return <Router><AppContent /></Router>; };
export default App;
