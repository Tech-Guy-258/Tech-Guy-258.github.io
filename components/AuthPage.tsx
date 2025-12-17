
import React, { useState } from 'react';
import { Account, Business, Employee } from '../types';
import { Store, Lock, Phone, User as UserIcon, CheckCircle, Briefcase, ChevronRight, ArrowLeft } from 'lucide-react';
import { APP_NAME, BUSINESS_CATEGORIES, SAMPLE_INVENTORY, APP_VERSION, generateID } from '../constants';

interface AuthPageProps {
  onLoginSuccess: (account: Account, businessId: string, operator: {id: string, name: string, role: 'owner' | 'employee', roleLabel?: string}) => void;
  accounts: Account[]; // Passamos todas as contas (simulado backend)
  onUpdateAccounts: (accounts: Account[]) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, accounts, onUpdateAccounts }) => {
  const [view, setView] = useState<'login' | 'register' | 'select_business'>('login');
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Phone
  const [loginPassword, setLoginPassword] = useState(''); // Password or PIN
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regData, setRegData] = useState({
    ownerName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessCategory: BUSINESS_CATEGORIES[0]
  });

  // Business Selection State (After successful owner login)
  const [authenticatedAccount, setAuthenticatedAccount] = useState<Account | null>(null);

  // --- REGISTRATION LOGIC ---
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (regData.password !== regData.confirmPassword) {
      setLoginError("As palavras-passe não coincidem.");
      return;
    }

    const existing = accounts.find(a => a.phoneNumber === regData.phoneNumber);
    if (existing) {
      setLoginError("Este número de telefone já está registado.");
      return;
    }

    // Create Initial Business
    const initialBusiness: Business = {
      id: generateID(),
      name: regData.businessName,
      category: regData.businessCategory,
      subscriptionStatus: 'trial',
      subscriptionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias trial
      items: regData.businessCategory.includes('Mercearia') ? SAMPLE_INVENTORY : [],
      sales: [],
      employees: [],
      suppliers: [],
      customers: [],
      auditLogs: [],
      expenses: [],
      appointments: []
    };

    const newAccount: Account = {
      id: generateID(),
      phoneNumber: regData.phoneNumber,
      ownerName: regData.ownerName,
      password: regData.password,
      businesses: [initialBusiness]
    };

    const updatedAccounts = [...accounts, newAccount];
    onUpdateAccounts(updatedAccounts);
    
    // Auto login
    setAuthenticatedAccount(newAccount);
    setView('select_business');
  };

  // --- LOGIN LOGIC ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const phone = loginIdentifier.trim();
    const passOrPin = loginPassword.trim();

    // 1. Tentar login como DONO (Conta Mestra)
    const ownerAccount = accounts.find(a => a.phoneNumber === phone && a.password === passOrPin);
    
    if (ownerAccount) {
      setAuthenticatedAccount(ownerAccount);
      setView('select_business');
      return;
    }

    // 2. Tentar login como FUNCIONÁRIO (Procurar em todas as contas/negócios)
    const accountByPhone = accounts.find(a => a.phoneNumber === phone);
    if (accountByPhone) {
      // Procurar PIN nos negócios desta conta
      for (const biz of accountByPhone.businesses) {
        const employee = biz.employees.find(emp => emp.pinCode === passOrPin);
        if (employee) {
          // Login Sucesso como Funcionário
          onLoginSuccess(accountByPhone, biz.id, {
            id: employee.id,
            name: employee.name,
            role: 'employee',
            roleLabel: employee.roleLabel
          });
          return;
        }
      }
      setLoginError("PIN de funcionário incorreto ou Password de dono inválida.");
    } else {
      setLoginError("Conta não encontrada com este número.");
    }
  };

  // --- BUSINESS SELECTION (OWNER) ---
  const handleSelectBusiness = (businessId: string) => {
    if (authenticatedAccount) {
      onLoginSuccess(authenticatedAccount, businessId, {
        id: authenticatedAccount.id,
        name: authenticatedAccount.ownerName,
        role: 'owner',
        roleLabel: 'Proprietário'
      });
    }
  };

  if (view === 'select_business' && authenticatedAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
          <div className="bg-emerald-600 p-6 text-white text-center">
            <h2 className="text-2xl font-bold mb-1">Bem-vindo, {authenticatedAccount.ownerName}</h2>
            <p className="opacity-90 text-sm">Selecione o negócio para gerir agora</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {authenticatedAccount.businesses.map(biz => (
                <button
                  key={biz.id}
                  onClick={() => handleSelectBusiness(biz.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm mr-3">
                      <Briefcase size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800 group-hover:text-emerald-700">{biz.name}</h3>
                      <p className="text-xs text-gray-500">{biz.category}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500" />
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setView('login')} 
              className="mt-6 text-gray-400 hover:text-gray-600 text-sm w-full text-center flex items-center justify-center"
            >
              <ArrowLeft size={14} className="mr-1" /> Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex bg-emerald-100 p-3 rounded-2xl mb-4 text-emerald-600">
          <Store size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 font-heading tracking-tight">
          {APP_NAME}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {view === 'login' ? 'Gestão completa para todos os seus negócios.' : 'Crie a sua conta e comece a gerir.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {loginError && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center">
              <span className="mr-2 font-bold">Erro:</span> {loginError}
            </div>
          )}

          {view === 'login' ? (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Telefone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-colors"
                    placeholder="84/85 xxx xxxx"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password (Dono) ou PIN (Funcionário)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all hover:-translate-y-0.5"
              >
                Entrar
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Seu Nome</label>
                    <input
                      type="text"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900"
                      placeholder="Nome do Proprietário"
                      value={regData.ownerName}
                      onChange={(e) => setRegData({...regData, ownerName: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Telefone</label>
                    <input
                      type="tel"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900"
                      placeholder="84 xxx xxxx"
                      value={regData.phoneNumber}
                      onChange={(e) => setRegData({...regData, phoneNumber: e.target.value})}
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Password</label>
                    <input
                      type="password"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900"
                      value={regData.password}
                      onChange={(e) => setRegData({...regData, password: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Confirmar</label>
                    <input
                      type="password"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900"
                      value={regData.confirmPassword}
                      onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                    />
                 </div>
              </div>

              <div className="border-t border-gray-100 pt-3 mt-2">
                 <p className="text-xs font-bold text-emerald-600 mb-3">DADOS DO PRIMEIRO NEGÓCIO</p>
                 <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Negócio</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                           <Store size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900"
                          placeholder="Ex: Barbearia Central"
                          value={regData.businessName}
                          onChange={(e) => setRegData({...regData, businessName: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-gray-900"
                        value={regData.businessCategory}
                        onChange={(e) => setRegData({...regData, businessCategory: e.target.value})}
                      >
                         {BUSINESS_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                         ))}
                      </select>
                    </div>
                 </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 mt-4 transition-all"
              >
                Criar Conta e Negócio
              </button>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {view === 'login' ? 'Novo por aqui?' : 'Já tem conta?'}
                </span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                   setView(view === 'login' ? 'register' : 'login');
                   setLoginError('');
                }}
                className="text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
              >
                {view === 'login' ? 'Registar Negócio' : 'Voltar ao Login'}
              </button>
            </div>
          </div>

        </div>
        
        {view === 'login' && (
           <div className="mt-8 text-center text-gray-500 text-xs">
             <p className="flex items-center justify-center gap-1 mb-2"><CheckCircle size={14} className="text-emerald-500"/> Suporta múltiplos negócios numa conta</p>
             <p className="flex items-center justify-center gap-1"><CheckCircle size={14} className="text-emerald-500"/> Acesso via PIN para funcionários</p>
             <p className="mt-4 font-mono text-gray-300">v{APP_VERSION}</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
