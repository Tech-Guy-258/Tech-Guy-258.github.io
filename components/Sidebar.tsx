
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, PlusCircle, Store, Globe, Settings, Trash2, ShoppingCart, Wifi, WifiOff, LogOut, User, CreditCard, AlertTriangle, Clock, Truck, Users, Calendar } from 'lucide-react';
import { APP_NAME } from '../constants';
import { CurrencyCode, CurrentSession, Business, Permission } from '../types';

interface SidebarProps {
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  session: CurrentSession | null;
  activeBusiness: Business | null;
  onSwitchBusiness: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currency, onCurrencyChange, rates, session, activeBusiness, onSwitchBusiness }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const subscriptionAlert = useMemo(() => {
    if (!activeBusiness) return null;
    const today = new Date();
    const expiry = new Date(activeBusiness.subscriptionExpiry);
    const diffTime = expiry.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return { color: 'bg-red-50 text-red-700 ring-1 ring-red-200', text: 'Expirado', icon: AlertTriangle };
    if (daysLeft <= 3) return { color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', text: `${daysLeft} dias`, icon: AlertTriangle };
    if (daysLeft <= 7) return { color: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200', text: `${daysLeft} dias`, icon: Clock };
    
    return { color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', text: 'Ativo', icon: CreditCard };
  }, [activeBusiness]);

  const permissions = session?.operator.permissions || [];
  const can = (p: Permission) => permissions.includes(p);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: can('VIEW_REPORTS') },
    { to: '/sales', icon: ShoppingCart, label: 'Caixa (POS)', show: can('POS_SELL') }, 
    
    // Agendamentos (NOVO - Visível para todos para garantir acesso)
    { to: '/appointments', icon: Calendar, label: 'Agendamentos', show: true },

    // Gestão de Stock
    { to: '/inventory', icon: List, label: 'Inventário', show: can('MANAGE_STOCK') },
    { to: '/add', icon: PlusCircle, label: 'Adicionar', show: can('MANAGE_STOCK') },
    
    // Fornecedores (Apenas Gestão de Stock)
    { to: '/suppliers', icon: Truck, label: 'Fornecedores', show: can('MANAGE_STOCK') },
    
    // Clientes (Visível para Gestão OU Vendas - para registar fidelização no caixa)
    { to: '/customers', icon: Users, label: 'Clientes', show: can('MANAGE_STOCK') || can('POS_SELL') },
    
    { to: '/settings', icon: Settings, label: 'Definições', show: can('SETTINGS') },
    { to: '/remove', icon: Trash2, label: 'Lixo', show: can('MANAGE_STOCK') },
  ];

  return (
    <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col h-full fixed left-0 top-0 z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]">
      <div className="p-6 flex items-center justify-start pb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-200">
            <Store size={22} />
          </div>
          <div>
             <span className="text-xl font-bold text-gray-800 tracking-tight font-heading block leading-none">{APP_NAME}</span>
             {session && <span className="text-[10px] text-gray-400 font-medium">Op: {session.operator.name}</span>}
          </div>
        </div>
      </div>
      
      {/* Business Info */}
      <div className="px-4 mb-6">
        {activeBusiness && (
          <div 
            onClick={() => navigate('/profile')}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4 cursor-pointer hover:border-emerald-200 transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
               <div className="overflow-hidden">
                 <p className="text-sm font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">{activeBusiness.name}</p>
                 <p className="text-xs text-gray-500 truncate">
                   {activeBusiness.category}
                 </p>
               </div>
               <div className="text-gray-300 group-hover:text-emerald-500 transition-colors">
                  <User size={16} />
               </div>
            </div>
            
            {subscriptionAlert && (
              <div className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium transition-all ${subscriptionAlert.color}`}>
                <div className="flex items-center">
                   <subscriptionAlert.icon size={12} className="mr-2" />
                   <span>Plano</span>
                </div>
                <span className="font-bold">{subscriptionAlert.text}</span>
              </div>
            )}
          </div>
        )}
        
        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {isOnline ? <><Wifi size={12} className="mr-2" /> Online</> : <><WifiOff size={12} className="mr-2" /> Offline</>}
        </div>
      </div>
      
      <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Menu Principal</p>
        <nav className="space-y-1">
          {navItems.filter(i => i.show).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium
                ${isActive 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50/30">
        <div className="mb-3">
          <label className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
            <Globe size={12} className="mr-1.5" /> Moeda
          </label>
          <div className="relative">
            <select 
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm font-medium appearance-none shadow-sm"
            >
              {Object.keys(rates).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={onSwitchBusiness}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100"
        >
          <LogOut size={16} />
          <span>Sair do Negócio</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
