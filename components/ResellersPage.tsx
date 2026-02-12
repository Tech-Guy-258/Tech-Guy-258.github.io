
import React, { useState, useMemo } from 'react';
import { Reseller, Business, AuditLogEntry, InventoryItem, ResellerItem, CurrencyCode, DeliveryBatch, ResellerPayment, PaymentMethod } from '../types';
import { 
  Handshake, Plus, Search, Trash2, Edit2, Package, Wallet, TrendingUp, X, Check, 
  ArrowRight, DollarSign, Percent, Smartphone, Info, MapPin, ShieldCheck, 
  Clock, History, Activity, Award, Calendar, ChevronRight
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [viewingHistory, setViewingHistory] = useState<Reseller | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState<Reseller | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Reseller | null>(null);

  // Delivery State
  const [currentBatch, setCurrentBatch] = useState<ResellerItem[]>([]);
  const [batchProduct, setBatchProduct] = useState('');
  const [batchQty, setBatchQty] = useState(1);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');

  const [formData, setFormData] = useState<Partial<Reseller>>({
    id: '', name: '', phone: '', secondaryPhone: '', address: '', idDocument: '',
    commissionType: 'percentage', commissionValue: 10, notes: ''
  });

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  // --- DASHBOARD ANALYTICS ---
  const stats = useMemo(() => {
    if (resellers.length === 0) return null;
    const totalNetworkRevenue = resellers.reduce((acc, r) => acc + (r.totalPaid * rate), 0);
    const totalDebt = resellers.reduce((acc, r) => acc + (r.totalDebt * rate), 0);
    
    const performance = resellers.map(r => {
      const daysActive = Math.max(1, (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return { ...r, velocity: r.totalPaid / daysActive };
    });

    const star = [...performance].sort((a,b) => b.totalPaid - a.totalPaid)[0];
    const fastest = [...performance].sort((a,b) => b.velocity - a.velocity)[0];

    return { totalNetworkRevenue, totalDebt, star, fastest };
  }, [resellers, rate]);

  const createLog = (details: string): AuditLogEntry => ({
    id: generateID(), action: 'RESELLER', details, operatorName: currentOperator, timestamp: new Date().toISOString()
  });

  const handleSaveReseller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    let updatedList: Reseller[];
    if (editingId) {
      updatedList = resellers.map(r => r.id === editingId ? { ...r, ...formData } as Reseller : r);
    } else {
      const newR: Reseller = {
        ...formData as any,
        totalDebt: 0, totalPaid: 0, batches: [], payments: [], createdAt: new Date().toISOString()
      };
      updatedList = [...resellers, newR];
    }

    setResellers(updatedList);
    onUpdateBusiness({ ...business, resellers: updatedList, auditLogs: [createLog(`${editingId ? 'Editou' : 'Registo'} Revendedor: ${formData.name}`), ...(business.auditLogs || [])] });
    setShowForm(false);
    setEditingId(null);
    setFormData({ id: '', name: '', phone: '', address: '', commissionType: 'percentage', commissionValue: 10 });
  };

  const addToBatch = () => {
    const item = business.items.find(i => i.id === batchProduct);
    if (!item || item.quantity < batchQty) return alert("Stock insuficiente!");
    setCurrentBatch([...currentBatch, { itemId: item.id, itemName: item.name, quantity: batchQty, priceAtDelivery: item.sellingPrice }]);
    setBatchProduct(''); setBatchQty(1);
  };

  const confirmBatchDelivery = () => {
    if (!showDeliveryModal || currentBatch.length === 0) return;
    const batchTotal = currentBatch.reduce((acc, i) => acc + (i.priceAtDelivery * i.quantity), 0);
    const newBatch: DeliveryBatch = { id: `LOTE-${generateID().slice(0,6).toUpperCase()}`, date: new Date().toISOString(), items: currentBatch, totalValue: batchTotal };
    
    const updatedItems = business.items.map(bi => {
      const ci = currentBatch.find(x => x.itemId === bi.id);
      return ci ? { ...bi, quantity: bi.quantity - ci.quantity } : bi;
    });

    const updatedResellers = resellers.map(r => r.id === showDeliveryModal.id ? { ...r, totalDebt: r.totalDebt + batchTotal, batches: [newBatch, ...r.batches] } : r);
    
    setResellers(updatedResellers);
    onUpdateBusiness({ ...business, items: updatedItems, resellers: updatedResellers, auditLogs: [createLog(`Entrega Lote ${newBatch.id} para ${showDeliveryModal.name}`), ...(business.auditLogs || [])] });
    setShowDeliveryModal(null); setCurrentBatch([]);
  };

  const confirmPayment = () => {
    if (!showPaymentModal || paymentAmount <= 0) return;
    const pay: ResellerPayment = { id: generateID(), amount: paymentAmount, method: paymentMethod, date: new Date().toISOString() };
    const updated = resellers.map(r => r.id === showPaymentModal.id ? { ...r, totalPaid: r.totalPaid + paymentAmount, totalDebt: Math.max(0, r.totalDebt - paymentAmount), payments: [pay, ...r.payments] } : r);
    setResellers(updated);
    onUpdateBusiness({ ...business, resellers: updated, auditLogs: [createLog(`Retorno de ${paymentAmount}MT pago por ${showPaymentModal.name}`), ...(business.auditLogs || [])] });
    setShowPaymentModal(null); setPaymentAmount(0);
  };

  const filtered = resellers.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out] max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center space-x-5">
          <div className="bg-indigo-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-indigo-100"><Handshake size={32} /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Centro de Revenda</h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1 flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span> Gestão de Rede e Distribuição
            </p>
          </div>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ id: '', name: '', phone: '', commissionType: 'percentage', commissionValue: 10 }); setShowForm(true); }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center">
          <Plus size={18} className="mr-2" /> Novo Parceiro
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Retorno Total</span>
              <p className="text-3xl font-black text-slate-900 font-heading">{symbol} {stats.totalNetworkRevenue.toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2 block">Capital na Rua</span>
              <p className="text-3xl font-black text-slate-900 font-heading">{symbol} {stats.totalDebt.toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-emerald-50 text-emerald-500"><Award size={20}/></div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">Estrela do Mês</span>
              <p className="text-lg font-black text-slate-800 truncate">{stats.star?.name || '—'}</p>
           </div>
           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Maior Agilidade</span>
              <p className="text-lg font-black truncate">{stats.fastest?.name || '—'}</p>
           </div>
        </div>
      )}

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Pesquisar por ID ou Nome..." className="pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.8rem] w-full shadow-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(r => (
          <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">{r.name[0]}</div>
                <div><h3 className="font-black text-slate-800 text-lg leading-tight">{r.name}</h3><span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{r.id}</span></div>
              </div>
              {r.totalDebt > 5000 && <div className="p-2 bg-red-100 text-red-600 rounded-full animate-bounce"><Clock size={16}/></div>}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Dívida</span>
                  <p className="text-xl font-black text-red-600">{symbol} {(r.totalDebt * rate).toLocaleString()}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Retornado</span>
                  <p className="text-xl font-black text-emerald-600">{symbol} {(r.totalPaid * rate).toLocaleString()}</p>
               </div>
            </div>

            <div className="space-y-2 mb-6 flex-1 text-xs font-bold text-slate-500">
               <div className="flex items-center gap-2"><Smartphone size={14} className="text-slate-300"/> {r.phone}</div>
               <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-300"/> {r.address || 'Sem morada'}</div>
               <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-slate-300"/> {r.idDocument || 'Sem BI'}</div>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-3">
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowDeliveryModal(r)} className="py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Package size={14}/> Entregar</button>
                  <button onClick={() => setShowPaymentModal(r)} className="py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><Wallet size={14}/> Receber</button>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setViewingHistory(r)} className="py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-2"><History size={14}/> Extrato</button>
                  <button onClick={() => { setEditingId(r.id); setFormData(r); setShowForm(true); }} className="py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-2"><Edit2 size={14}/> Editar</button>
               </div>
               <button onClick={() => { if(window.confirm('Eliminar revendedor?')) onUpdateBusiness({...business, resellers: resellers.filter(x => x.id !== r.id)}); }} className="w-full py-2 text-slate-300 hover:text-red-500 text-[8px] font-black uppercase tracking-widest">Remover do Sistema</button>
            </div>
          </div>
        ))}
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[90vh]">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
               <div><h3 className="font-black text-xl font-heading uppercase">{editingId ? 'Actualizar Parceiro' : 'Novo Revendedor'}</h3><p className="text-xs opacity-70">Dados de segurança e rastreabilidade</p></div>
               <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveReseller} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">ID Único (Nome Curto)</label><input required disabled={!!editingId} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="Ex: Joana_Influencer" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} /></div>
                 <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Completo</label><input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" placeholder="Ex: Joana dos Santos" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                 <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Telemóvel 1</label><input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                 <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Telemóvel 2 / Alternativo</label><input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" value={formData.secondaryPhone} onChange={e => setFormData({...formData, secondaryPhone: e.target.value})} /></div>
                 <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Morada Completa</label><input required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                 <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Documento (BI/NUIT)</label><input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold shadow-inner" value={formData.idDocument} onChange={e => setFormData({...formData, idDocument: e.target.value})} /></div>
                 <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Ganhos</label><select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={formData.commissionType} onChange={e => setFormData({...formData, commissionType: e.target.value as any})}><option value="percentage">%</option><option value="fixed">Fixo (MT)</option></select></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Valor</label><input type="number" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={formData.commissionValue} onChange={e => setFormData({...formData, commissionValue: Number(e.target.value)})} /></div>
                 </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">{editingId ? 'Guardar Alterações' : 'Activar Parceiro'}</button>
            </form>
          </div>
        </div>
      )}

      {/* DELIVERY MODAL (LOTES) */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[85vh]">
             <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                <div><h3 className="font-black text-xl font-heading uppercase">Novo Lote de Entrega</h3><p className="text-xs opacity-70">A carregar produtos para {showDeliveryModal.name}</p></div>
                <button onClick={() => setShowDeliveryModal(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
             </div>
             
             <div className="p-8 border-b border-slate-100 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">Produto</label>
                      <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={batchProduct} onChange={e => setBatchProduct(e.target.value)}>
                         <option value="">Seleccionar...</option>
                         {business.items.filter(i => i.type === 'product' && i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} un)</option>)}
                      </select>
                   </div>
                   <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block px-1">Qtd</label>
                      <div className="flex gap-2"><input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={batchQty} onChange={e => setBatchQty(Number(e.target.value))} /><button onClick={addToBatch} className="p-3 bg-indigo-600 text-white rounded-xl active:scale-90"><Plus size={16}/></button></div>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Catálogo do Lote</h4>
                {currentBatch.length > 0 ? currentBatch.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl mb-2 border border-slate-100">
                     <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{item.itemName}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{item.quantity} un • {symbol}{item.priceAtDelivery} un</p></div>
                     <button onClick={() => setCurrentBatch(currentBatch.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500"><X size={16}/></button>
                  </div>
                )) : <div className="py-10 text-center opacity-30 text-slate-400"><Package size={40} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">Vazio</p></div>}
             </div>

             <div className="p-8 border-t bg-gray-50 flex items-center justify-between">
                <div><p className="text-[9px] font-black text-slate-400 uppercase">Valor do Lote</p><p className="text-2xl font-black text-indigo-600">{symbol} {currentBatch.reduce((acc, i) => acc + (i.priceAtDelivery * i.quantity), 0).toLocaleString()}</p></div>
                <button onClick={confirmBatchDelivery} disabled={currentBatch.length === 0} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl disabled:opacity-50">Confirmar Saída</button>
             </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
             <div className="p-8 bg-emerald-600 text-white text-center">
                <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="font-black text-xl font-heading">Registar Retorno</h3>
                <p className="text-emerald-100 text-xs mt-1">Acerto de contas com {showPaymentModal.name}</p>
             </div>
             <div className="p-8 space-y-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Valor do Retorno ({symbol})</label>
                   <input type="number" step="0.01" className="w-full p-5 bg-slate-50 border-none rounded-2xl text-center text-3xl font-black shadow-inner" placeholder="0.00" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} />
                </div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Forma de Pagamento</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['cash', 'mpesa', 'emola', 'card'].map(m => <button key={m} onClick={() => setPaymentMethod(m as any)} className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}>{m}</button>)}
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setShowPaymentModal(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                   <button onClick={confirmPayment} className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Validar Pagamento</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {viewingHistory && (
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col max-h-[90vh]">
               <div className="p-8 bg-slate-900 text-white shrink-0 flex justify-between items-center">
                  <div><h3 className="font-black text-xl font-heading uppercase">Histórico Detalhado</h3><p className="text-slate-400 text-xs">Extrato: <span className="text-white font-bold">{viewingHistory.name}</span></p></div>
                  <button onClick={() => setViewingHistory(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50 custom-scrollbar">
                  <section>
                     <div className="flex items-center gap-2 mb-4 text-indigo-600"><Package size={18}/><h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Lotes Entregues</h4></div>
                     <div className="space-y-4">{viewingHistory.batches.length > 0 ? viewingHistory.batches.map(b => (
                        <div key={b.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-3 bg-indigo-50 text-indigo-500 font-black text-[8px] rounded-bl-xl">{b.id}</div>
                           <div className="flex justify-between items-start mb-4 pt-2"><div><p className="text-xs font-black text-slate-800">{new Date(b.date).toLocaleDateString()}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{b.items.length} Referências</p></div><p className="text-lg font-black text-indigo-600">{symbol} {b.totalValue.toLocaleString()}</p></div>
                           <div className="bg-slate-50/50 p-3 rounded-xl space-y-1">{b.items.map((i, idx) => <div key={idx} className="flex justify-between text-[10px] font-bold text-slate-600"><span>{i.quantity}x {i.itemName}</span><span>{symbol}{i.priceAtDelivery} un</span></div>)}</div>
                        </div>
                     )) : <p className="text-xs text-slate-300 italic">Sem entregas registadas.</p>}</div>
                  </section>
                  <section>
                     <div className="flex items-center gap-2 mb-4 text-emerald-600"><History size={18}/><h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Retornos Pagos</h4></div>
                     <div className="space-y-3">{viewingHistory.payments.length > 0 ? viewingHistory.payments.map(p => (
                        <div key={p.id} className="bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                           <div className="flex items-center gap-4"><div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Check size={16}/></div><div><p className="text-xs font-black text-slate-800">{new Date(p.date).toLocaleDateString()}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Via {p.method}</p></div></div>
                           <p className="text-base font-black text-emerald-600">{symbol} {p.amount.toLocaleString()}</p>
                        </div>
                     )) : <p className="text-xs text-slate-300 italic">Sem pagamentos registados.</p>}</div>
                  </section>
               </div>
            </div>
         </div>
      )}

      {resellers.length === 0 && (
         <div className="col-span-full py-40 bg-white rounded-[4rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
            <Handshake size={84} className="mb-6 opacity-10" /><p className="font-black uppercase text-xs tracking-[0.3em]">Nenhum parceiro registado</p>
         </div>
      )}
    </div>
  );
};

export default ResellersPage;
