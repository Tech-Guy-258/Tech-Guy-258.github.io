
import React, { useState } from 'react';
import { Business, SubscriptionPlan, PaymentProvider, Account } from '../types';
import { CheckCircle, Shield, Wifi, CreditCard, LogOut, Phone, Smartphone, AlertTriangle, ArrowLeft, Briefcase } from 'lucide-react';

interface SubscriptionPageProps {
  account: Account;
  activeBusiness: Business;
  onRenew: (businessId: string, plan: SubscriptionPlan) => void;
  onExit: () => void; // To go back to business selector or logout
  isExpiredMode?: boolean; 
  isOwner: boolean;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Mensal',
    price: 500,
    durationMonths: 1,
    features: ['Gestão de Stock Ilimitada', 'Acesso Offline', 'Suporte Básico']
  },
  {
    id: 'pro',
    name: 'Semestral',
    price: 2500,
    durationMonths: 6,
    features: ['Gestão de Stock Ilimitada', 'Acesso Offline', 'Suporte Prioritário', 'Poupa 500 MT']
  },
  {
    id: 'enterprise',
    name: 'Anual',
    price: 4500,
    durationMonths: 12,
    features: ['Todas as funcionalidades', 'Acesso Offline', 'Suporte VIP 24/7', 'Poupa 1500 MT', 'Formação Incluída']
  }
];

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ account, activeBusiness, onRenew, onExit, isExpiredMode = false, isOwner }) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(PLANS[0]);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // If owner, let them select which business to pay for. Default to active.
  const [targetBusinessId, setTargetBusinessId] = useState<string>(activeBusiness.id);

  const targetBusiness = account.businesses.find(b => b.id === targetBusinessId) || activeBusiness;
  const isTargetExpired = new Date(targetBusiness.subscriptionExpiry) < new Date();

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setIsProcessing(true);
    // Simulate Payment Processing (M-Pesa/E-Mola)
    setTimeout(() => {
      onRenew(targetBusinessId, selectedPlan);
      setIsProcessing(false);
      alert(`Pagamento de ${selectedPlan.price}MT via ${paymentProvider === 'mpesa' ? 'M-Pesa' : 'E-Mola'} confirmado para ${targetBusiness.name}!`);
    }, 2500);
  };

  const containerClasses = isExpiredMode 
    ? "min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"
    : "p-6 pb-20 md:pb-6";

  const cardClasses = isExpiredMode
    ? "max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row"
    : "max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row";

  return (
    <div className={`${containerClasses} text-gray-900`}>
      {!isExpiredMode && (
         <div className="flex items-center space-x-2 mb-6">
           <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <CreditCard size={28} />
           </div>
           <h2 className="text-2xl font-bold text-gray-800">Subscrição do Negócio</h2>
         </div>
      )}

      {/* Owner Control Panel: Select Business to Pay For */}
      {isOwner && !isExpiredMode && (
        <div className="max-w-5xl mx-auto mb-6">
           <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Gerir Pagamentos dos Seus Negócios</p>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {account.businesses.map(biz => {
                 const expired = new Date(biz.subscriptionExpiry) < new Date();
                 return (
                    <button
                       key={biz.id}
                       onClick={() => setTargetBusinessId(biz.id)}
                       className={`p-4 rounded-xl border text-left transition-all ${
                          targetBusinessId === biz.id 
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                            : 'bg-white border-gray-200 hover:border-emerald-200'
                       }`}
                    >
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-800">{biz.name}</span>
                          {targetBusinessId === biz.id && <CheckCircle size={16} className="text-emerald-600" />}
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">{biz.category}</span>
                          <span className={expired ? 'text-red-500 font-bold' : 'text-emerald-600 font-medium'}>
                             {expired ? 'Expirado' : 'Ativo'}
                          </span>
                       </div>
                    </button>
                 );
              })}
           </div>
        </div>
      )}

      <div className={cardClasses}>
        
        {/* Left Side: Status */}
        <div className={`md:w-1/3 text-white p-8 flex flex-col justify-between ${isExpiredMode ? 'bg-emerald-900' : 'bg-emerald-800 rounded-l-2xl'}`}>
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Shield size={32} className="text-emerald-400" />
              <h1 className="text-2xl font-bold">Estado da Conta</h1>
            </div>
            
            <div className="mb-8">
              <p className="text-emerald-200 text-sm uppercase tracking-wider mb-1">Negócio Selecionado</p>
              <p className="font-semibold text-xl">{targetBusiness.name}</p>
              <p className="text-xs text-emerald-300">{targetBusiness.category}</p>
            </div>

            <div className={`p-4 rounded-xl border ${isTargetExpired ? 'bg-red-900/50 border-red-500' : 'bg-emerald-700/50 border-emerald-500'}`}>
              <p className="text-sm opacity-80 mb-1">Estado Atual</p>
              <p className={`text-lg font-bold ${isTargetExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                {isTargetExpired ? 'Expirado' : 'Ativo'}
              </p>
              <p className="text-xs mt-2 opacity-70">
                Válido até: {new Date(targetBusiness.subscriptionExpiry).toLocaleDateString('pt-PT')}
              </p>
              {isTargetExpired && (
                <div className="mt-2 flex items-center text-xs text-red-300">
                  <AlertTriangle size={12} className="mr-1" /> Renovação necessária
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center text-sm text-emerald-100">
               <Wifi size={16} className="mr-3" />
               Funciona Offline após validação
            </div>
            <div className="flex items-center text-sm text-emerald-100">
               <Smartphone size={16} className="mr-3" />
               Pagamento Móvel Integrado
            </div>
          </div>

          {isExpiredMode && (
            <button 
              onClick={onExit}
              className="mt-8 flex items-center text-emerald-300 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} className="mr-2" /> Voltar / Sair
            </button>
          )}
        </div>

        {/* Right Side: Plans & Payment */}
        <div className="md:w-2/3 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Renovar Acesso</h2>
          <p className="text-gray-500 mb-6">Escolha um plano e pague facilmente com M-Pesa ou E-Mola.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {PLANS.map(plan => (
              <div 
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
                  selectedPlan.id === plan.id 
                    ? 'border-emerald-500 bg-emerald-50 shadow-md transform scale-105 z-10' 
                    : 'border-gray-100 hover:border-emerald-200'
                }`}
              >
                {selectedPlan.id === plan.id && (
                  <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-emerald-500 text-white rounded-full p-1">
                    <CheckCircle size={16} />
                  </div>
                )}
                <h3 className="font-bold text-gray-800">{plan.name}</h3>
                <p className="text-2xl font-bold text-emerald-600 my-2">{plan.price} MT</p>
                <p className="text-xs text-gray-500 mb-3">por {plan.durationMonths} {plan.durationMonths === 1 ? 'mês' : 'meses'}</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 2).map((feat, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-center">
                      <CheckCircle size={10} className="text-emerald-500 mr-1" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <form onSubmit={handlePayment} className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-800 mb-4">Método de Pagamento</h3>
            
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setPaymentProvider('mpesa')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  paymentProvider === 'mpesa' 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-red-200 grayscale hover:grayscale-0'
                }`}
              >
                <div className="bg-red-600 text-white font-bold text-xs px-2 py-0.5 rounded mb-1">M-Pesa</div>
                <span className="text-sm font-semibold">Vodacom</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider('emola')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  paymentProvider === 'emola' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-200 hover:border-indigo-200 grayscale hover:grayscale-0'
                }`}
              >
                <div className="bg-indigo-600 text-white font-bold text-xs px-2 py-0.5 rounded mb-1">E-Mola</div>
                <span className="text-sm font-semibold">Movitel</span>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de Telemóvel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="84 / 85 xxx xxxx"
                  className="pl-10 w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg tracking-wide text-gray-900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Irá receber um pop-up no telemóvel para confirmar o pagamento de <strong>{selectedPlan.price} MT</strong>.
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !phoneNumber}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center ${
                paymentProvider === 'mpesa' 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                'A aguardar confirmação...'
              ) : (
                <>
                  Pagar {selectedPlan.price} MT
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
