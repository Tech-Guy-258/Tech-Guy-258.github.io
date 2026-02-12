
import React, { useState, useMemo } from 'react';
import { Reseller, Business, AuditLogEntry, InventoryItem, ResellerItem, CurrencyCode, DeliveryBatch, ResellerPayment, PaymentMethod } from '../types';
import { 
  Handshake, Plus, Search, Trash2, Edit2, Package, Wallet, TrendingUp, X, Check, 
  ArrowRight, DollarSign, Percent, Smartphone, Info, MapPin, ShieldCheck, 
  Clock, History, ChevronRight, Activity, Award, UserCheck, Calendar
} from 'lucide-react';
import { generateID, CURRENCY_SYMBOLS } from '../constants';

interface ResellersPageProps {
  business: Business;
  onUpdateBusiness: (updatedBusiness: Business) => void;
  currentOperator: string;
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
}

const ResellersPage: React.FC<ResellersPageProps> = ({ business, onUpdateBusiness, currentOperator, currency, exchangeRates }) => {
  const [resellers, setResellers] = useState<Reseller[]>(business.resellers || []);
  const [showForm, setShowForm] = useState(false);
  const [editingResellerId, setEditingResellerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // History View State
  const [viewingHistory, setViewingHistory] = useState<Reseller | null>(null);

  // Delivery Batch State
  const [showDeliveryModal, setShowDeliveryModal] = useState<Reseller | null>(null);
  const [currentBatch, setCurrentBatch] = useState<ResellerItem[]>([]);
  const [batchProduct, setBatchProduct] = useState('');
  const [batchQty, setBatchQty] = useState(1);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState<Reseller | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [formData, setFormData] = useState<Partial<Reseller>>({
    id: '',
    name: '',
    phone: '',
    secondaryPhone: '',
    address: '',
    idDocument: '',
    commissionType: 'percentage',
    commissionValue: 0,
    notes: ''
  });

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  // --- DASHBOARD ANALYTICS ---
  const stats = useMemo(() => {
    if (resellers.length === 0) return null;

    // Calcular Lucro Estimado total gerado pela rede
    const totalNetworkRevenue = resellers.reduce((acc, r) => acc + (r.totalPaid * rate), 0);
    
    // Performance individual
    const performance = resellers.map(r => {
      const totalReturned = r.totalPaid;
      const totalTaken = r.batches.reduce((acc, b) => acc + b.totalValue, 0);
      const recoveryRate = totalTaken > 0 ? (totalReturned / totalTaken) * 100 : 0;
      
      // Média de dias para retorno (Simulado baseado na data de criação e pagamentos)
      const daysActive = Math.max(1, (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const returnVelocity = r.payments.length > 0 ? totalReturned / daysActive : 0;

      return { ...r, recoveryRate, returnVelocity };
    });

    const starReseller = [...performance].sort((a,b) => b.totalPaid - a.totalPaid)[0];
    const fastestReturn = [...performance].sort((a,b) => b.returnVelocity - a.returnVelocity)[0];
    const totalDebt = resellers.reduce((acc, r) => acc + (r.totalDebt * rate), 0);

    return { totalNetworkRevenue, totalDebt, starReseller, fastestReturn };
  }, [resellers, rate]);

  const createLog = (details: string): AuditLogEntry => ({
    id: generateID(),
    action: 'RESELLER',
    details,
    operatorName: currentOperator,
    timestamp: new Date().toISOString()
  });

  const handleOpenEdit = (reseller: Reseller) => {
    setFormData(reseller);
    setEditingResellerId(reseller.id);
    setShowForm(true);
  };

  const handleSaveReseller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    let updatedResellers: Reseller[];
    
    if (editingResellerId) {
      updatedResellers = resellers.map(r => r.id === editingResellerId ? { ...r, ...formData } as Reseller : r);
      onUpdateBusiness({
        ...business,
        resellers: updatedResellers,
        auditLogs: [createLog(`Actualizado dados de: ${formData.name}`), ...(business.auditLogs || [])]
      });
    } else {
      const newReseller: Reseller = {
        ...formData as any,
        totalDebt: 0,
        totalPaid: 0,
        batches: [],
        payments: [],
        createdAt: new Date().toISOString()
      };
      updatedResellers = [...resellers, newReseller];
      onUpdateBusiness({
        ...business,
        resellers: updatedResellers,
        auditLogs: [createLog(`Novo Revendedor: ${newReseller.name} (ID: ${newReseller.id})`), ...(business.auditLogs || [])]
      });
    }

    setResellers(updatedResellers);
    setShowForm(false);
    setEditingResellerId(null);
    setFormData({ id: '', name: '', phone: '', secondaryPhone: '', address: '', idDocument: '', commissionType: 'percentage', commissionValue: 0, notes: '' });
  };

  // --- LÓGICA DE LOTES ---
  const addToBatch = () => {
    if (!batchProduct || batchQty <= 0) return;
    const item = business.items.find(i => i.id === batchProduct);
    if (!item || item.quantity < batchQty) { alert("Stock insuficiente!"); return; }

    const newItem: ResellerItem = {
      itemId: item.id,
      itemName: item.name,
      quantity: batchQty,
      priceAtDelivery: item.sellingPrice
    };
    setCurrentBatch([...currentBatch, newItem]);
    setBatchProduct('');
    setBatchQty(1);
  };

  const confirmBatchDelivery = () => {
    if (!showDeliveryModal || currentBatch.length === 0) return;

    const batchTotal = currentBatch.reduce((acc, i) => acc + (i.priceAtDelivery * i.quantity), 0);
    const newBatch: DeliveryBatch = {
      id: `BATCH-${generateID().slice(0, 6).toUpperCase()}`,
      date: new Date().toISOString(),
      items: currentBatch,
      totalValue: batchTotal
    };

    // Actualizar Stock
    const updatedItems = business.items.map(bi => {
      const batchItem = currentBatch.find(ci => ci.itemId === bi.id);
      return batchItem ? { ...bi, quantity: bi.quantity - batchItem.quantity } : bi;
    });

    const updatedResellers = resellers.map(r => {
      if (r.id === showDeliveryModal.id) {
        return {
          ...r,
          totalDebt: r.totalDebt + batchTotal,
          batches: [newBatch, ...r.batches]
        };
      }
      return r;
    });

    setResellers(updatedResellers);
    onUpdateBusiness({
      ...business,
      items: updatedItems,
      resellers: updatedResellers,
      auditLogs: [createLog(`Lote ${newBatch.id} entregue a ${showDeliveryModal.name}: ${currentBatch.length} items`), ...(business.auditLogs || [])]
    });

    setShowDeliveryModal(null);
    setCurrentBatch([]);
  };

  // --- LÓGICA DE PAGAMENTO ---
  const handleConfirmPayment = () => {
    if (!showPaymentModal || paymentAmount <= 0) return;

    const newPayment: ResellerPayment = {
      id: generateID(),
      amount: paymentAmount,
      method: paymentMethod,
      date: new Date().toISOString()
    };

    const updatedResellers = resellers.map(r => {
      if (r.id === showPaymentModal.id) {
        return {
          ...r,
          totalPaid: r.totalPaid + paymentAmount,
          totalDebt: Math.max(0, r.totalDebt - paymentAmount),
          payments: [newPayment, ...r.payments]
        };
      }
      return r;
    });

    setResellers(updatedResellers);
    onUpdateBusiness({
      ...business,
      resellers: updatedResellers,
      auditLogs: [createLog(`Retorno pago por ${showPaymentModal.name}: ${paymentAmount}MT via ${paymentMethod}`), ...(business.auditLogs || [])]
    });

    setShowPaymentModal(null);
    setPaymentAmount(0);
  };

  const filteredResellers = resellers.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out] max-w-[1600px] mx-auto">
      
      {/* HEADER DINÂMICO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center space-x-5">
          <div className="bg-indigo-600 p-4 rounded-[1.8rem] text-white shadow-xl shadow-indigo-100">
            <Handshake size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Rede de Revenda</h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] mt-1 flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span> Inteligência de Distribuição
            </p>
          </div>
        </div>
        <button onClick={() => { setEditingResellerId(null); setFormData({ id: '', name: '', phone: '', address: '', commissionType: 'percentage', commissionValue: 0 }); setShowForm(true); }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center">
          <Plus size={18} className="mr-2" /> Novo Parceiro
        </button>
      </div>

      {/* DASHBOARD KPIs */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><TrendingUp size={24}/></div>
                 <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Retorno Global</span>
              </div>
              <p className="text-3xl font-black font-heading text-slate-900">{symbol} {stats.totalNetworkRevenue.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Fluxo total da rede</p>
           </div>
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Wallet size={24}/></div>
                 <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Dívida Externa</span>
              </div>
              <p className="text-3xl font-black font-heading text-slate-900">{symbol} {stats.totalDebt.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Valor em posse dos revendedores</p>
           </div>
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-[2rem] flex items-center justify-center text-emerald-500 opacity-50"><Award size={20}/></div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-4 block">Melhor Performance</span>
              <p className="text-lg font-black text-slate-800 truncate">{stats.starReseller?.name || '—'}</p>
              <p className="text-[10px] font-bold text-emerald-600 mt-1">{symbol} {((stats.starReseller?.totalPaid || 0) * rate).toLocaleString()} gerados</p>
           </div>
           <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-white/10 text-white rounded-2xl"><Activity size={24}/></div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Agilidade</span>
              </div>
              <p className="text-lg font-black">{stats.fastestReturn?.name || '—'}</p>
              <p className="text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-widest">Maior velocidade de acerto</p>
           </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisar revendedores por ID, Nome ou Contacto..."
          className="pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full shadow-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* RESELLERS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredResellers.map(reseller => (
          <div key={reseller.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group flex flex-col h-full relative overflow-hidden">
            {reseller.totalDebt > 5000 && <div className="absolute top-4 right-4 bg-red-100 text-red-600 p-2 rounded-full animate-bounce" title="Alerta: Dívida Elevada"><Clock size={16}/></div>}
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">{reseller.name[0]}</div>
                <div>
                   <h3 className="font-black text-slate-800 text-lg font-heading leading-tight">{reseller.name}</h3>
                   <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{reseller.id}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dívida Pendente</span>
                  <p className="text-xl font-black text-red-600">{symbol} {(reseller.totalDebt * rate).toLocaleString()}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Retornado</span>
                  <p className="text-xl font-black text-emerald-600">{symbol} {(reseller.totalPaid * rate).toLocaleString()}</p>
               </div>
            </div>

            <div className="space-y-3 mb-6 flex-1">
               <div className="flex items-center gap-2 text-xs text-slate-500 font-bold"><Smartphone size={14} className="text-slate-400"/> {reseller.phone}</div>
               <div className="flex items-center gap-2 text-xs text-slate-500 font-bold"><MapPin size={14} className="text-slate-400"/> {reseller.address}</div>
               <div className="flex items-center gap-2 text-xs text-slate-500 font-bold"><ShieldCheck size={14} className="text-slate-400"/> {reseller.idDocument || 'Doc não registado'}</div>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-3">
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowDeliveryModal(reseller)} className="py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <Package size={14}/> Entregar
                  </button>
                  <button onClick={() => setShowPaymentModal(reseller)} className="py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <Wallet size={14}/> Receber
                  </button>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setViewingHistory(reseller)} className="py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <History size={14}/> Histórico
                  </button>
                  <button onClick={() => handleOpenEdit(reseller)} className="py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Edit2 size={14}/> Editar
                  </button>
               </div>
               <button onClick={() => { if(window.confirm('Eliminar parceiro e dados associados?')) onUpdateBusiness({...business, resellers: resellers.filter(r => r.id !== reseller.id)}); }} className="w-full py-2 text-slate-300 hover:text-red-500 text-[8px] font-black uppercase tracking-widest">Remover do Sistema</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL REGISTO / EDIÇÃO */}
      {showForm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[90vh]">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
               <div>
                  <h3 className="font-black text-xl font-heading uppercase tracking-tighter">{editingResellerId ? 'Actualizar Dados' : 'Registar Parceiro'}</h3>
                  <p className="text-xs opacity-70">Garanta a rastreabilidade e segurança do negócio</p>
               </div>
               <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveReseller} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">ID / Nome Curto (Único)</label>
                    <input required disabled={!!editingResellerId} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner disabled:opacity-50" placeholder="Ex: Influencer_Joana" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Completo</label>
                    <input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="Ex: Joana dos Santos" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Telemóvel Principal</label>
                    <input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="84 000 0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Contacto Alternativo</label>
                    <input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="Parente ou segundo número" value={formData.secondaryPhone} onChange={e => setFormData({...formData, secondaryPhone: e.target.value})} />
                 </div>
                 <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Morada de Residência / Trabalho</label>
                    <input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="Bairro, Rua, Casa nr..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Documento de Identificação (BI/NUIT)</label>
                    <input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="000000000X" value={formData.idDocument} onChange={e => setFormData({...formData, idDocument: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Comissão</label>
                       <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" value={formData.commissionType} onChange={e => setFormData({...formData, commissionType: e.target.value as any})}>
                          <option value="percentage">%</option>
                          <option value="fixed">Fixo</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor</label>
                       <input type="number" required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" value={formData.commissionValue} onChange={e => setFormData({...formData, commissionValue: Number(e.target.value)})} />
                    </div>
                 </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-[0.2em] active:scale-95 transition-all">
                {editingResellerId ? 'Confirmar Alterações' : 'Activar Revendedor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENTREGA POR LOTES */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[85vh]">
             <div className="p-8 bg-indigo-600 text-white">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="font-black text-xl font-heading uppercase">Novo Lote de Entrega</h3>
                   <button onClick={() => setShowDeliveryModal(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                </div>
                <p className="text-indigo-100 text-xs">A entregar items para: <span className="font-bold underline">{showDeliveryModal.name}</span></p>
             </div>
             
             <div className="p-8 border-b border-slate-100 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <div className="md:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Escolher Produto</label>
                      <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" value={batchProduct} onChange={e => setBatchProduct(e.target.value)}>
                         <option value="">Seleccionar...</option>
                         {business.items.filter(i => i.type === 'product' && i.quantity > 0).map(i => (
                           <option key={i.id} value={i.id}>{i.name} ({i.quantity} un)</option>
                         ))}
                      </select>
                   </div>
                   <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Quantidade</label>
                      <div className="flex gap-2">
                         <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" value={batchQty} onChange={e => setBatchQty(Number(e.target.value))} />
                         <button onClick={addToBatch} className="p-3 bg-indigo-600 text-white rounded-xl active:scale-90"><Plus size={20}/></button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Catálogo deste Lote</h4>
                {currentBatch.length > 0 ? (
                  <div className="space-y-3">
                    {currentBatch.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <div>
                            <p className="text-xs font-bold text-slate-800">{item.itemName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.quantity} unidades • {symbol} {item.priceAtDelivery} un</p>
                         </div>
                         <button onClick={() => setCurrentBatch(currentBatch.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center opacity-30 text-slate-400"><Package size={40} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">Nenhum item adicionado</p></div>
                )}
             </div>

             <div className="p-8 border-t bg-gray-50 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase">Valor do Lote</p>
                   <p className="text-2xl font-black text-indigo-600">{symbol} {currentBatch.reduce((acc, i) => acc + (i.priceAtDelivery * i.quantity), 0).toLocaleString()}</p>
                </div>
                <button onClick={confirmBatchDelivery} disabled={currentBatch.length === 0} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50">Confirmar Saída</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO DETALHADO */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
             <div className="p-8 bg-emerald-600 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="font-black text-xl font-heading">Registar Retorno</h3>
                <p className="text-emerald-100 text-xs mt-1">Acerto de contas com {showPaymentModal.name}</p>
             </div>
             <div className="p-8 space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Valor do Retorno ({symbol})</label>
                   <input type="number" step="0.01" className="w-full p-5 bg-slate-50 border-none rounded-2xl text-center text-3xl font-black shadow-inner" placeholder="0.00" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} />
                   <p className="text-center text-[9px] font-black text-red-400 uppercase tracking-widest mt-4">Dívida: {symbol} {showPaymentModal.totalDebt.toLocaleString()}</p>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Forma de Pagamento</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['cash', 'mpesa', 'emola', 'card'].map(m => (
                         <button key={m} type="button" onClick={() => setPaymentMethod(m as any)} className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}>{m}</button>
                      ))}
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setShowPaymentModal(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Descartar</button>
                   <button onClick={handleConfirmPayment} className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all">Validar Pagamento</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO COMPLETO */}
      {viewingHistory && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[90vh]">
               <div className="p-8 bg-slate-900 text-white shrink-0">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="font-black text-xl font-heading uppercase">Relatório de Transacções</h3>
                     <button onClick={() => setViewingHistory(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                  </div>
                  <p className="text-slate-400 text-xs">Extracto detalhado: <span className="text-white font-bold">{viewingHistory.name}</span></p>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50 custom-scrollbar">
                  {/* LOTES */}
                  <section>
                     <div className="flex items-center gap-2 mb-4">
                        <Package size={18} className="text-indigo-600"/>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Histórico de Lotes Entregues</h4>
                     </div>
                     <div className="space-y-4">
                        {viewingHistory.batches.length > 0 ? viewingHistory.batches.map(batch => (
                           <div key={batch.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 bg-indigo-50 text-indigo-500 font-black text-[8px] rounded-bl-xl">{batch.id}</div>
                              <div className="flex justify-between items-start mb-4 pt-2">
                                 <div><p className="text-xs font-black text-slate-800">{new Date(batch.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}</p><p className="text-[10px] text-slate-400 uppercase font-bold">{batch.items.length} Referências</p></div>
                                 <p className="text-lg font-black text-indigo-600">{symbol} {batch.totalValue.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-50/50 p-3 rounded-xl space-y-1">
                                 {batch.items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between text-[10px] font-bold text-slate-600"><span>{i.quantity}x {i.itemName}</span><span>{symbol} {i.priceAtDelivery} un</span></div>
                                 ))}
                              </div>
                           </div>
                        )) : <p className="text-xs text-slate-300 italic">Nenhuma entrega registada.</p>}
                     </div>
                  </section>

                  {/* PAGAMENTOS */}
                  <section>
                     <div className="flex items-center gap-2 mb-4">
                        <History size={18} className="text-emerald-600"/>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Histórico de Retornos Pagos</h4>
                     </div>
                     <div className="space-y-3">
                        {viewingHistory.payments.length > 0 ? viewingHistory.payments.map(pay => (
                           <div key={pay.id} className="bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                 <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Check size={16}/></div>
                                 <div><p className="text-xs font-black text-slate-800">{new Date(pay.date).toLocaleDateString('pt-PT')}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Via {pay.method}</p></div>
                              </div>
                              <p className="text-base font-black text-emerald-600">{symbol} {pay.amount.toLocaleString()}</p>
                           </div>
                        )) : <p className="text-xs text-slate-300 italic">Nenhum pagamento registado.</p>}
                     </div>
                  </section>
               </div>
            </div>
         </div>
      )}

      {resellers.length === 0 && (
         <div className="col-span-full py-40 bg-white rounded-[4rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
            <Handshake size={84} className="mb-6 opacity-10" />
            <p className="font-black uppercase text-xs tracking-[0.3em]">Nenhum parceiro registado</p>
         </div>
      )}
    </div>
  );
};

export default ResellersPage;
