
import React, { useState, useMemo } from 'react';
import { CurrentSession, Business, Employee, Permission, SubscriptionPlan, AuditLogEntry } from '../types';
// Fixed: Removed missing PERMISSION_LABELS from imports
import { CURRENCY_SYMBOLS, BUSINESS_CATEGORIES, generateID } from '../constants';
import { TrendingUp, User as UserIcon, Plus, Users, Key, Briefcase, Trash2, Lock, Bot, CreditCard, Edit2, Eye, EyeOff, X, Save } from 'lucide-react';
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

const ProfilePage: React.FC<ProfilePageProps> = ({ session, activeBusiness, onUpdateBusiness, onAddBusiness, onSwitchBusinessSecure, currency, exchangeRates, onRenewSubscription }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'employees' | 'businesses' | 'chef' | 'subscription'>('reports');
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

  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    const opName = session.operator.role === 'owner' ? 'Proprietário' : (session.operator.roleLabel || 'Funcionário');
    const displayName = `${opName} - ${session.operator.name}`;
    return { id: generateID(), action, details, operatorName: displayName, timestamp: new Date().toISOString() };
  };

  const stats = useMemo(() => {
    const sales = activeBusiness.sales || [];
    const revenue = sales.reduce((acc, s) => acc + s.totalRevenue, 0);
    const profit = sales.reduce((acc, s) => acc + s.totalProfit, 0);
    const transactions = new Set(sales.map(s => s.transactionId)).size;
    return { revenue: revenue * rate, profit: profit * rate, transactions };
  }, [activeBusiness, rate]);

  const resetEmployeeForm = () => {
    setEmployeeFormData({ name: '', roleLabel: '', pinCode: '', permissions: ['POS_SELL'] });
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  };

  const handleEditEmployeeClick = (emp: Employee) => {
    setEmployeeFormData({ name: emp.name, roleLabel: emp.roleLabel || '', pinCode: emp.pinCode, permissions: emp.permissions });
    setEditingEmployeeId(emp.id);
    setShowEmployeeForm(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFormData.name || !employeeFormData.pinCode) return;
    
    let updatedEmployees = [...activeBusiness.employees];
    let log: AuditLogEntry;

    if (editingEmployeeId) {
      updatedEmployees = updatedEmployees.map(emp => 
        emp.id === editingEmployeeId 
          ? { ...emp, name: employeeFormData.name, roleLabel: employeeFormData.roleLabel || 'Funcionário', pinCode: employeeFormData.pinCode, permissions: employeeFormData.permissions }
          : emp
      );
      log = createLog('UPDATE', `Atualizou dados de ${employeeFormData.name}`);
    } else {
      const newEmployee: Employee = {
         id: generateID(), name: employeeFormData.name, roleLabel: employeeFormData.roleLabel || 'Funcionário',
         pinCode: employeeFormData.pinCode, permissions: employeeFormData.permissions, createdAt: new Date().toISOString(), createdBy: session.operator.name
      };
      updatedEmployees.push(newEmployee);
      log = createLog('CREATE', `Adicionou funcionário: ${newEmployee.name}`);
    }

    onUpdateBusiness({ ...activeBusiness, employees: updatedEmployees, auditLogs: [log, ...(activeBusiness.auditLogs || [])] });
    resetEmployeeForm();
  };

  const togglePermission = (p: Permission) => {
    setEmployeeFormData(prev => {
       const exists = prev.permissions.includes(p);
       if (exists) return { ...prev, permissions: prev.permissions.filter(perm => perm !== p) };
       return { ...prev, permissions: [...prev.permissions, p] };
    });
  };

  const handleDeleteEmployee = (id: string) => {
     if (window.confirm(`Tem a certeza?`)) {
        const updatedEmployees = activeBusiness.employees.filter(e => e.id !== id);
        const log = createLog('DELETE', `Removeu funcionário`);
        onUpdateBusiness({ ...activeBusiness, employees: updatedEmployees, auditLogs: [log, ...(activeBusiness.auditLogs || [])] });
     }
  };

  const togglePinVisibility = (id: string) => {
    const newSet = new Set(visiblePins);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setVisiblePins(newSet);
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
     e.preventDefault();
     const business: Business = {
        id: generateID(), name: newBiz.name, category: newBiz.category, subscriptionStatus: 'trial', subscriptionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        items: [], sales: [], employees: [], suppliers: [], customers: [], auditLogs: [], expenses: []
     };
     onAddBusiness(business);
     setShowAddBusiness(false);
     setNewBiz({ name: '', category: BUSINESS_CATEGORIES[0] });
     alert("Novo negócio criado!");
  };

  const handleConfirmSwitch = (e: React.FormEvent) => {
     e.preventDefault();
     if (switchPassword === session.account.password && switchTargetId) {
        onSwitchBusinessSecure(switchTargetId);
     } else {
        alert("Senha incorreta.");
     }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><UserIcon size={32} /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-heading">Gestão Geral</h2>
            <p className="text-sm text-gray-500">{isOwner ? "Proprietário" : "Funcionário"}: {session.operator.name} | Negócio: {activeBusiness.name}</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
         <button onClick={() => setActiveTab('reports')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><TrendingUp size={16} className="mr-2" /> Relatórios</button>
         <button onClick={() => setActiveTab('employees')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'employees' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><Users size={16} className="mr-2" /> Equipa</button>
         {isOwner && <button onClick={() => setActiveTab('businesses')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'businesses' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><Briefcase size={16} className="mr-2" /> Meus Negócios</button>}
         {can('MANAGE_STOCK') && <button onClick={() => setActiveTab('chef')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'chef' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><Bot size={16} className="mr-2" /> Assistente AI</button>}
         {(isOwner || can('SETTINGS')) && <button onClick={() => setActiveTab('subscription')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'subscription' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><CreditCard size={16} className="mr-2" /> Subscrição</button>}
      </div>

      {activeTab === 'reports' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-[fadeIn_0.2s]">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <p className="text-sm text-gray-500 mb-1">Faturação Total</p>
               <p className="text-2xl font-bold text-emerald-600">{symbol} {stats.revenue.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <p className="text-sm text-gray-500 mb-1">Lucro Estimado</p>
               <p className="text-2xl font-bold text-indigo-600">{symbol} {stats.profit.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <p className="text-sm text-gray-500 mb-1">Transações</p>
               <p className="text-2xl font-bold text-gray-800">{stats.transactions}</p>
            </div>
         </div>
      )}

      {activeTab === 'employees' && (
         <div className="space-y-6 animate-[fadeIn_0.2s]">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-gray-800">Equipa</h3>{isOwner && <button onClick={() => { resetEmployeeForm(); setShowEmployeeForm(true); }} className="flex items-center bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><Plus size={16} className="mr-1" /> Novo</button>}</div>
            {showEmployeeForm && <form onSubmit={handleSaveEmployee} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"><input placeholder="Nome" required className="p-3 border border-gray-200 rounded-lg w-full bg-white text-gray-900" value={employeeFormData.name} onChange={e => setEmployeeFormData({...employeeFormData, name: e.target.value})} /><input placeholder="Cargo" required className="p-3 border border-gray-200 rounded-lg w-full bg-white text-gray-900" value={employeeFormData.roleLabel} onChange={e => setEmployeeFormData({...employeeFormData, roleLabel: e.target.value})} /><input placeholder="PIN" required className="p-3 border border-gray-200 rounded-lg w-full bg-white text-gray-900" value={employeeFormData.pinCode} onChange={e => setEmployeeFormData({...employeeFormData, pinCode: e.target.value})} /></div><div className="flex justify-end gap-2"><button type="button" onClick={resetEmployeeForm} className="text-gray-500">Cancelar</button><button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg">Salvar</button></div></form>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeBusiness.employees.map(emp => <div key={emp.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-start"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Users size={20} /></div><div><p className="font-bold text-gray-800">{emp.name}</p><p className="text-xs text-emerald-600 font-bold">{emp.roleLabel}</p><div className="flex items-center mt-1"><div className="bg-gray-100 px-2 py-1 rounded flex items-center"><Key size={12} className="mr-2 text-gray-400" /><span className="font-mono text-xs font-bold text-gray-600">{isOwner && visiblePins.has(emp.id) ? emp.pinCode : '••••'}</span></div>{isOwner && <button onClick={() => togglePinVisibility(emp.id)} className="ml-2 text-gray-400 hover:text-emerald-600"><Eye size={14} /></button>}</div></div></div>{isOwner && <div className="flex gap-2"><button onClick={() => handleEditEmployeeClick(emp)} className="text-gray-400 hover:text-emerald-600"><Edit2 size={18}/></button><button onClick={() => handleDeleteEmployee(emp.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18}/></button></div>}</div>))}</div>
         </div>
      )}

      {activeTab === 'businesses' && isOwner && (
         <div className="space-y-6 animate-[fadeIn_0.2s]">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-gray-800">Meus Negócios</h3><button onClick={() => setShowAddBusiness(true)} className="flex items-center bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-black"><Briefcase size={16} className="mr-1" /> Novo</button></div>
            {showAddBusiness && <form onSubmit={handleCreateBusiness} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"><input placeholder="Nome" required className="p-2 border rounded-lg bg-white text-gray-900" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} /><select className="p-2 border rounded-lg bg-white text-gray-900" value={newBiz.category} onChange={e => setNewBiz({...newBiz, category: e.target.value})}>{BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddBusiness(false)} className="text-gray-500">Cancelar</button><button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg">Criar</button></div></form>}
            <div className="grid grid-cols-1 gap-3">{session.account.businesses.map(biz => <div key={biz.id} className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-4 ${biz.id === activeBusiness.id ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}><div className="flex-1"><div><h4 className="font-bold text-gray-800">{biz.name}</h4>{biz.id === activeBusiness.id && <span className="text-xs bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">EM USO</span>}</div><p className="text-xs text-gray-500">{biz.category}</p></div>{biz.id !== activeBusiness.id && <button onClick={() => setSwitchTargetId(biz.id)} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black">Trocar</button>}</div>)}</div>
         </div>
      )}

      {activeTab === 'chef' && <div className="h-[700px] border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm animate-[fadeIn_0.2s]"><AIChef items={activeBusiness.items} /></div>}
      {activeTab === 'subscription' && <div className="animate-[fadeIn_0.2s]"><SubscriptionPage account={session.account} activeBusiness={activeBusiness} onRenew={onRenewSubscription} onExit={() => setActiveTab('reports')} isExpiredMode={false} isOwner={isOwner} /></div>}
      
      {switchTargetId && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-[scaleIn_0.2s]"><h3 className="text-lg font-bold text-center mb-4">Confirmar Senha</h3><form onSubmit={handleConfirmSwitch}><input type="password" autoFocus className="w-full p-3 border border-gray-300 rounded-xl mb-4 text-center text-lg bg-white text-gray-900" placeholder="Senha" value={switchPassword} onChange={e => setSwitchPassword(e.target.value)} /><div className="flex gap-2"><button type="button" onClick={() => { setSwitchTargetId(null); setSwitchPassword(''); }} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl">Confirmar</button></div></form></div></div>
      )}
    </div>
  );
};

export default ProfilePage;
