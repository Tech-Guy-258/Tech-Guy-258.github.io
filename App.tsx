
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
import { InventoryItem, CurrencyCode, SaleRecord, Account, Business, CurrentSession, PaymentMethod, Permission, AuditLogEntry, Customer } from './types';
import { DEFAULT_EXCHANGE_RATES, APP_NAME, getDemoAccount, APP_VERSION } from './constants';
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
              {can('VIEW_REPORTS') && <NavButton to="/" label="Dashboard" />}
              {can('POS_SELL') && <NavButton to="/sales" label="Caixa (Vendas)" />}
              
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
          <p className="text-[10px] text-center text-gray-400 mt-2 font-mono">v{APP_VERSION}</p>
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
  
  // Generic helper to update the active business data
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
    
    // Define all permissions for owner, or specific permissions for employee
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

  // --- HELPER PARA OBTER O NOME CORRETO PARA LOGS ---
  const getOperatorDisplayName = () => {
    if (!currentSession) return 'Sistema';
    return currentSession.operator.role === 'owner' ? 'Proprietário' : currentSession.operator.name;
  };

  // --- AUDIT HELPER ---
  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    return {
      id: crypto.randomUUID(),
      action,
      details,
      operatorName: getOperatorDisplayName(),
      timestamp: new Date().toISOString()
    };
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
      const log = createLog(
        isNew ? 'CREATE' : 'UPDATE', 
        isNew ? `Adicionou o produto: ${newVariants[0].name}` : `Editou o produto: ${newVariants[0].name}`
      );

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
      const log = createLog('DELETE', `Removeu o produto: ${item?.name || 'Desconhecido'}`);
      return {
         ...biz,
         items: biz.items.filter(i => i.id !== id),
         auditLogs: [log, ...(biz.auditLogs || [])]
      };
    });
  };

  const handleRestock = (itemId: string, quantityToAdd: number) => {
    if (!currentSession) return;
    updateActiveBusiness(biz => {
       const item = biz.items.find(i => i.id === itemId);
       const log = createLog('UPDATE', `Repôs stock de ${item?.name}: +${quantityToAdd} ${item?.unit}`);
       
       return {
          ...biz,
          items: biz.items.map(i => i.id === itemId ? { 
            ...i, 
            quantity: (Number(i.quantity) || 0) + quantityToAdd,
            lastUpdatedBy: getOperatorDisplayName(),
            lastUpdatedAt: new Date().toISOString()
          } : i),
          auditLogs: [log, ...(biz.auditLogs || [])]
       };
    });
  };

  const handleCloseRegister = () => {
    if (!currentSession) return;
    updateActiveBusiness(biz => {
      const log = createLog('CLOSE_REGISTER', 'Encerramento de caixa diário (Relatório gerado)');
      return {
        ...biz,
        auditLogs: [log, ...(biz.auditLogs || [])]
      };
    });
  };

  const handleBatchSale = (cartItems: CartItem[], paymentMethod: PaymentMethod, customer?: Customer): SaleRecord[] => {
    if (!activeBusiness || !currentSession) return [];

    const newSales: SaleRecord[] = [];
    const date = new Date().toISOString();
    const transactionId = crypto.randomUUID();
    
    let updatedItems = [...activeBusiness.items];
    let totalRev = 0;

    cartItems.forEach(cartItem => {
      const itemIndex = updatedItems.findIndex(i => i.id === cartItem.item.id);
      if (itemIndex === -1) return;
      
      const item = updatedItems[itemIndex];
      const costPrice = item.price;
      const sellingPrice = item.sellingPrice || item.price;
      const totalRevenue = sellingPrice * cartItem.quantity;
      totalRev += totalRevenue;
      const totalProfit = (sellingPrice - costPrice) * cartItem.quantity;

      const record: SaleRecord = {
        id: crypto.randomUUID(),
        transactionId: transactionId,
        itemId: item.id,
        itemName: item.name,
        itemSize: item.size,
        itemUnit: item.unit,
        quantity: cartItem.quantity,
        totalRevenue,
        totalProfit,
        date,
        paymentMethod: paymentMethod,
        operatorName: getOperatorDisplayName(),
        operatorId: currentSession.operator.id,
        customerId: customer?.id,
        customerName: customer?.name
      };
      newSales.push(record);

      updatedItems[itemIndex] = {
        ...item,
        quantity: Number((item.quantity - cartItem.quantity).toFixed(2))
      };
    });

    updateActiveBusiness(biz => {
       const customerInfo = customer ? ` | Cliente: ${customer.name}` : '';
       const log = createLog('SALE', `Venda #${transactionId.slice(0,6)} de ${cartItems.length} itens. Total: ${totalRev.toFixed(2)}${customerInfo}`);
       
       let updatedCustomers = biz.customers;
       if (customer) {
          updatedCustomers = biz.customers.map(c => {
             if (c.id === customer.id) {
                return {
                   ...c,
                   totalSpent: c.totalSpent + totalRev,
                   loyaltyPoints: c.loyaltyPoints + Math.floor(totalRev / 100),
                   lastVisit: date
                };
             }
             return c;
          });
       }

       return {
         ...biz,
         items: updatedItems,
         sales: [...biz.sales, ...newSales],
         customers: updatedCustomers,
         auditLogs: [log, ...(biz.auditLogs || [])]
       };
    });

    return newSales;
  };

  const handleQuickAddCustomer = (name: string, phone: string): Customer => {
     const newCustomer: Customer = {
        id: crypto.randomUUID(),
        name,
        phone,
        email: '',
        address: '',
        notes: 'Criado no Caixa',
        loyaltyPoints: 0,
        totalSpent: 0,
        lastVisit: new Date().toISOString()
     };

     updateActiveBusiness(biz => ({
        ...biz,
        customers: [...(biz.customers || []), newCustomer]
     }));

     return newCustomer;
  };

  const handleClearInventory = () => {
     updateActiveBusiness(biz => {
        const log = createLog('DELETE', 'Limpou todo o inventário (Zona de Perigo)');
        return { ...biz, items: [], sales: [], auditLogs: [log, ...(biz.auditLogs || [])] };
     });
  };

  const handleSwitchBusiness = () => {
    setCurrentSession(null); 
  };

  if (!currentSession || !activeBusiness) {
     return <AuthPage 
       onLoginSuccess={handleLoginSuccess} 
       accounts={accounts} 
       onUpdateAccounts={handleUpdateAccounts} 
     />;
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
             <button 
               onClick={() => navigate('/profile')}
               className="p-2 bg-gray-50 border border-gray-200 rounded-full text-emerald-600 active:scale-95 transition-transform shadow-sm"
               aria-label="Perfil"
             >
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
            <Route path="/" element={
               hasPermission('VIEW_REPORTS') ? (
                  <Dashboard 
                    items={activeBusiness.items} 
                    sales={activeBusiness.sales} 
                    logs={activeBusiness.auditLogs}
                    currency={currency} 
                    exchangeRates={rates} 
                    onRestock={hasPermission('MANAGE_STOCK') ? handleRestock : undefined}
                    onCloseRegister={hasPermission('VIEW_REPORTS') ? handleCloseRegister : undefined}
                    activeBusinessName={activeBusiness.name}
                    currentOperator={getOperatorDisplayName()}
                  />
               ) : <Navigate to="/profile" replace />
            } />
            <Route path="/profile" element={
              <ProfilePage
                session={currentSession}
                activeBusiness={activeBusiness}
                onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)}
                onAddBusiness={(newBiz) => {
                   setAccounts(prev => prev.map(a => a.id === currentSession.account.id ? {...a, businesses: [...a.businesses, newBiz]} : a));
                }}
                onSwitchBusinessSecure={handleSwitchBusinessSecure}
                currency={currency}
                exchangeRates={rates}
                onRenewSubscription={(bizId, plan) => {
                   const newExpiry = new Date();
                   newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);
                   
                   setAccounts(prevAccounts => prevAccounts.map(acc => {
                     if (acc.id === currentSession.account.id) {
                       return {
                         ...acc,
                         businesses: acc.businesses.map(b => {
                           if (b.id === bizId) {
                             const log = createLog('SUBSCRIPTION', `Renovou subscrição (${plan.name})`);
                             const updatedBiz = { 
                               ...b, 
                               subscriptionStatus: 'active' as const, 
                               subscriptionExpiry: newExpiry.toISOString(),
                               auditLogs: [log, ...(b.auditLogs || [])]
                             };
                             return updatedBiz;
                           }
                           return b;
                         })
                       };
                     }
                     return acc;
                   }));
                }}
              />
            } />
            <Route 
              path="/inventory" 
              element={
                hasPermission('MANAGE_STOCK') ? (
                  <InventoryList 
                    items={activeBusiness.items} 
                    onDelete={handleDeleteItem} 
                    onEdit={(item) => { setEditingItem(item); navigate('/add'); }}
                    currency={currency}
                    exchangeRates={rates}
                    activeBusinessCategory={activeBusiness.category}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/add" 
              element={
                hasPermission('MANAGE_STOCK') ? (
                  <AddItemForm 
                    onSave={handleSaveProduct} 
                    onCancel={() => { setEditingItem(null); navigate('/inventory'); }} 
                    editingItem={editingItem}
                    allItems={activeBusiness.items}
                    suppliers={activeBusiness.suppliers || []} // Pass suppliers list
                    currency={currency}
                    exchangeRates={rates}
                    activeBusinessCategory={activeBusiness.category}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/sales" 
              element={
                hasPermission('POS_SELL') ? (
                  <SalesPage 
                    items={activeBusiness.items} 
                    customers={activeBusiness.customers || []}
                    onBatchSale={handleBatchSale}
                    onAddCustomer={handleQuickAddCustomer}
                    currency={currency}
                    exchangeRates={rates}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            
            <Route 
              path="/suppliers" 
              element={
                hasPermission('MANAGE_STOCK') ? (
                  <SuppliersPage 
                    business={activeBusiness}
                    onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/customers" 
              element={
                (hasPermission('MANAGE_STOCK') || hasPermission('POS_SELL')) ? (
                  <CustomersPage 
                    business={activeBusiness}
                    onUpdateBusiness={(updatedBiz) => updateActiveBusiness(() => updatedBiz)}
                  />
                ) : <Navigate to="/" replace />
              } 
            />

            <Route 
              path="/remove" 
              element={
                hasPermission('MANAGE_STOCK') ? (
                  <RemoveItems 
                    items={activeBusiness.items} 
                    onDelete={handleDeleteItem}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            <Route path="/chef" element={<AIChef items={activeBusiness.items} />} />
            <Route 
              path="/settings" 
              element={
                hasPermission('SETTINGS') ? (
                  <Settings 
                    rates={rates} 
                    onUpdateRate={(c, r) => c !== 'MZN' && setRates(prev => ({...prev, [c]: r}))} 
                    onResetRates={() => setRates(DEFAULT_EXCHANGE_RATES)}
                    onClearInventory={handleClearInventory}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/subscription" 
              element={
                (hasPermission('SETTINGS') || hasPermission('VIEW_REPORTS')) ? (
                  <SubscriptionPage 
                    account={currentSession.account} 
                    activeBusiness={activeBusiness}
                    onRenew={(bizId, plan) => {
                       const newExpiry = new Date();
                       newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);
                       setAccounts(prevAccounts => prevAccounts.map(acc => {
                         if (acc.id === currentSession.account.id) {
                           return {
                             ...acc,
                             businesses: acc.businesses.map(b => {
                               if (b.id === bizId) {
                                 const log = createLog('SUBSCRIPTION', `Renovou subscrição (${plan.name})`);
                                 const updatedBiz = { 
                                   ...b, 
                                   subscriptionStatus: 'active' as const, 
                                   subscriptionExpiry: newExpiry.toISOString(),
                                   auditLogs: [log, ...(b.auditLogs || [])]
                                 };
                                 return updatedBiz;
                               }
                               return b;
                             })
                           };
                         }
                         return acc;
                       }));
                    }} 
                    onExit={handleSwitchBusiness}
                    isExpiredMode={false} 
                    isOwner={currentSession.operator.role === 'owner'}
                  />
                ) : <Navigate to="/" replace />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
