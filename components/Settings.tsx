
import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS, APP_VERSION } from '../constants';
import { Settings as SettingsIcon, RefreshCw, AlertCircle, Trash2, AlertTriangle, Eraser, CheckCircle, Loader2, Database, X } from 'lucide-react';

interface SettingsProps {
  rates: Record<CurrencyCode, number>;
  onUpdateRate: (currency: CurrencyCode, newRate: number) => void;
  onResetRates: () => void;
  onClearInventory: () => void;
}

const Settings: React.FC<SettingsProps> = ({ rates, onUpdateRate, onResetRates, onClearInventory }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // States for Cache Cleaning
  const [showConfirmCache, setShowConfirmCache] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [cleaningStep, setCleaningStep] = useState('');

  const handleRateChange = (currency: CurrencyCode, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdateRate(currency, numValue);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Tem a certeza que deseja repor as taxas de câmbio para os valores padrão?')) {
      onResetRates();
      showSuccess('Taxas repostas com sucesso!');
    }
  };

  const handleClearData = () => {
    const confirmed = window.confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL.\n\nTem a certeza que deseja APAGAR TODOS os produtos do inventário?');
    if (confirmed) {
      if (window.confirm('Confirme novamente: Deseja limpar totalmente o stock da loja?')) {
        onClearInventory();
        showSuccess('Inventário limpo com sucesso.');
      }
    }
  };

  const executeCacheClear = async () => {
    setShowConfirmCache(false);
    setIsCleaning(true);
    setCleaningProgress(0);
    setCleaningStep('A iniciar limpeza...');

    try {
      setCleaningProgress(10);
      setCleaningStep('A parar serviços antigos...');
      await new Promise(r => setTimeout(r, 400)); 

      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for(const registration of registrations) {
            await registration.unregister();
          }
        } catch (e) {
          console.debug("SW Unregister handled.");
        }
      }
      setCleaningProgress(40);

      setCleaningStep('A apagar ficheiros em cache...');
      await new Promise(r => setTimeout(r, 400)); 

      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        } catch (e) {
          console.debug("Cache Clear handled.");
        }
      }
      setCleaningProgress(80);

      setCleaningStep('A finalizar e reiniciar...');
      
      let p = 80;
      const interval = setInterval(() => {
          p += 5;
          setCleaningProgress(p);
          if (p >= 100) {
              clearInterval(interval);
              window.location.reload();
          }
      }, 50);

    } catch (e) {
      console.error("Erro ao limpar cache", e);
      setIsCleaning(false);
      alert("Limpeza parcial concluída. Por favor, recarregue a página manualmente.");
    }
  };

  return (
    <>
      <div className="p-6 text-gray-900 pb-20 md:pb-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center space-x-2 mb-6">
          <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
             <SettingsIcon size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exchange Rates Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Taxas de Câmbio</h3>
                <p className="text-sm text-gray-500">Defina o valor das moedas em relação ao Metical (MT).</p>
              </div>
              <button 
                onClick={handleReset}
                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"
                title="Repor valores padrão"
              >
                <RefreshCw size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                <AlertCircle className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" size={18} />
                <p className="text-sm text-blue-800">
                  A moeda base é o <strong>Metical (MZN)</strong>. Altere os valores abaixo para ajustar quanto vale 1 MT noutras moedas.
                </p>
              </div>

              <div className="space-y-4">
                {Object.entries(rates).map(([code, rate]) => {
                  const currencyCode = code as CurrencyCode;
                  const isBase = currencyCode === 'MZN';

                  return (
                    <div key={code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-gray-700 shadow-sm mr-4">
                          {CURRENCY_SYMBOLS[currencyCode]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{code}</p>
                          <p className="text-xs text-gray-500">
                            {isBase ? 'Moeda Base' : `1 MZN = ${rate} ${code}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isBase ? (
                          <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-mono font-medium text-sm">
                            1.000
                          </span>
                        ) : (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.0001"
                              min="0.000001"
                              value={rate}
                              onChange={(e) => handleRateChange(currencyCode, e.target.value)}
                              className="w-32 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-right text-gray-900"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Info & Danger Zone */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Sobre a Aplicação</h3>
              <div className="space-y-4 text-gray-600 text-sm">
                <p>
                  O <strong>Gestão360</strong> utiliza inteligência artificial para ajudar na gestão do seu negócio.
                </p>
                
                <div className="pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setShowConfirmCache(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors font-bold text-sm"
                  >
                    <Eraser size={18} />
                    <span>Limpar Cache & Reparar</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="font-medium text-gray-800">Versão {APP_VERSION}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
              <div className="flex items-center mb-4 text-red-700">
                 <AlertTriangle size={20} className="mr-2" />
                 <h3 className="text-lg font-bold">Zona de Perigo</h3>
              </div>
              <button 
                onClick={handleClearData}
                className="w-full bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center shadow-sm"
              >
                <Trash2 size={18} className="mr-2" />
                Apagar Todo o Inventário
              </button>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center animate-[slideIn_0.3s_ease-out] z-[100] border border-emerald-500">
            <CheckCircle className="mr-3 text-emerald-200" size={24} />
            <span className="font-bold text-lg">{successMessage}</span>
          </div>
        )}
      </div>

      {showConfirmCache && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s]">
           <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden m-4 animate-[scaleIn_0.2s_ease-out]">
              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4">
                    <Eraser size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Limpar Cache?</h3>
                 <p className="text-gray-500 text-sm mb-6">Recarregar a aplicação para corrigir erros visuais e atualizar para a versão mais recente.</p>
                 <div className="flex gap-3 w-full">
                    <button onClick={() => setShowConfirmCache(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={executeCacheClear} className="flex-1 py-3 text-white font-bold bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-lg shadow-orange-200">Confirmar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isCleaning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-[fadeIn_0.2s]">
           <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden m-4">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
                 <div className="h-full bg-orange-500 transition-all duration-300 ease-linear" style={{ width: `${cleaningProgress}%` }}></div>
              </div>
              <div className="mb-6 flex justify-center relative">
                 <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 relative">
                    <Database size={32} className="relative z-10" />
                    <div className="absolute inset-0 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin"></div>
                 </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-heading">{cleaningProgress < 100 ? 'A Otimizar...' : 'Concluído!'}</h3>
              <p className="text-gray-500 text-sm mb-6 h-5">{cleaningStep}</p>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                 <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300 ease-out rounded-full" style={{ width: `${cleaningProgress}%` }}></div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                 <span>A processar</span>
                 <span>{Math.round(cleaningProgress)}%</span>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Settings;
