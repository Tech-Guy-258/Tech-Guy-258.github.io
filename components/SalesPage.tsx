
import React, { useState, useMemo } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, PaymentMethod, Customer } from '../types';
import { CURRENCY_SYMBOLS } from '../constants';
import { Search, ShoppingCart, Plus, Minus, Receipt, X, CheckCircle, Layers, Smartphone, Wallet, Briefcase, Box, User as UserIcon, UserPlus, Package, Info } from 'lucide-react';

export interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface SalesPageProps {
  items: InventoryItem[];
  customers: Customer[]; 
  onBatchSale: (cartItems: CartItem[], paymentMethod: PaymentMethod, customer?: Customer) => SaleRecord[];
  onAddCustomer: (name: string, phone: string) => Customer; 
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
}

const SalesPage: React.FC<SalesPageProps> = ({ items, customers = [], onBatchSale, onAddCustomer, currency, exchangeRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'product' | 'service'>('product'); 
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [receipt, setReceipt] = useState<{show: boolean, records: SaleRecord[], total: number, method: PaymentMethod, customer?: Customer, timestamp: string} | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const name = String(item.name || "").toLowerCase();
        const term = String(searchTerm || "").toLowerCase();
        return name.includes(term) && item.type === viewType && (Number(item.quantity) || 0) > 0;
    });
  }, [items, searchTerm, viewType]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, ci) => acc + ((ci.item.sellingPrice || ci.item.price || 0) * rate * ci.quantity), 0);
  }, [cart, rate]);

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity && item.type === 'product') { showToast("Stock insuficiente!", "error"); return prev; }
        return prev.map(ci => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1 }];
    });
    showToast(`${item.name} adicionado!`);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(ci => ci.item.id !== id));

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(ci => {
      if (ci.item.id === id) {
        const newQty = Math.max(1, ci.quantity + delta);
        if (delta > 0 && ci.item.type === 'product' && newQty > ci.item.quantity) {
          showToast("Limite de stock atingido", "error");
          return ci;
        }
        return { ...ci, quantity: newQty };
      }
      return ci;
    }));
  };

  const handleOpenConfirmation = () => {
    if (!paymentMethod) {
      showToast("Selecione um método de pagamento primeiro!", "error");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalCheckout = () => {
    if (!paymentMethod) return;
    try {
      const records = onBatchSale(cart, paymentMethod, selectedCustomer || undefined);
      if (records && records.length > 0) {
        setReceipt({ 
          show: true, records, total: cartTotal, method: paymentMethod, 
          customer: selectedCustomer || undefined, timestamp: new Date().toLocaleString('pt-PT') 
        });
        setCart([]); setSelectedCustomer(null); setCustomerSearch(''); setPaymentMethod(null);
        setShowCartMobile(false); setShowConfirmModal(false);
      }
    } catch (err) {
      showToast("Falha ao concluir venda.", "error");
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50 relative text-gray-900">
      {toast && <div className={`fixed top-20 md:top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-xl flex items-center border ${toast.type === 'error' ? 'bg-white border-red-100 text-red-600' : 'bg-white border-emerald-100 text-emerald-600'} animate-[slideIn_0.3s_ease-out]`}><CheckCircle size={20} className="mr-3" /> <span className="font-bold">{toast.message}</span></div>}

      {/* CATÁLOGO */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 md:p-6 bg-white border-b border-gray-100 shadow-sm z-10 flex flex-col gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto shadow-inner">
             <button onClick={() => setViewType('product')} className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${viewType === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Box size={16} className="mr-2" /> Produtos</button>
             <button onClick={() => setViewType('service')} className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${viewType === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Briefcase size={16} className="mr-2" /> Serviços</button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder={`Pesquisar itens...`} className="pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-gray-50/50">
          {filteredItems.map((item) => {
              const qtyInCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
              return (
                <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col h-full relative group active:scale-95">
                  <div className="h-32 w-full bg-gray-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center border shadow-inner">
                    {item.imageUrl ? <img src={item.imageUrl} className="h-full w-full object-cover" /> : (item.type === 'service' ? <Briefcase size={36} className="text-gray-300" /> : <Package size={36} className="text-gray-300" />)}
                    {qtyInCart > 0 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white shadow-lg">{qtyInCart}</div>}
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm line-clamp-2 flex-1">{item.name}</h3>
                  <div className="mt-3 flex justify-between items-center border-t border-dashed border-gray-100 pt-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase">{item.size}{item.unit}</span>
                     <span className="font-extrabold text-emerald-600 text-lg">{symbol} {((item.sellingPrice || item.price || 0) * rate).toFixed(0)}</span>
                  </div>
                </button>
              );
          })}
        </div>
      </div>

      {/* CARRINHO E CONFIRMAÇÃO */}
      <div className={`fixed inset-0 z-[100] transition-opacity md:static md:bg-transparent md:w-96 md:flex md:flex-col ${showCartMobile ? 'opacity-100 visible bg-gray-900/60 backdrop-blur-sm' : 'opacity-0 invisible md:opacity-100 md:visible pointer-events-none md:pointer-events-auto'}`} onClick={() => setShowCartMobile(false)}>
        <div className={`fixed top-0 right-0 h-full w-[85%] sm:w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 md:static md:w-full md:h-full md:shadow-none md:border-l md:border-gray-100 ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`} onClick={e => e.stopPropagation()}>
          <div className="p-5 bg-white border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-heading"><ShoppingCart className="mr-2 text-emerald-600" /> Carrinho</h2>
            <button onClick={() => setShowCartMobile(false)} className="md:hidden p-2 text-gray-500 rounded-full"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {cart.map((ci) => (
              <div key={ci.item.id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                     <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border shrink-0">{ci.item.imageUrl ? <img src={ci.item.imageUrl} className="h-full w-full object-cover" /> : <Package size={16} className="text-gray-300" />}</div>
                     <div className="min-w-0 flex-1">
                       <h4 className="font-bold text-gray-800 text-xs truncate">{ci.item.name}</h4>
                       <p className="text-[10px] text-emerald-600 font-black">{symbol} {((ci.item.sellingPrice || ci.item.price || 0) * rate).toFixed(0)}</p>
                     </div>
                  </div>
                  <button onClick={() => removeFromCart(ci.item.id)} className="p-1 text-gray-300"><X size={16} /></button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-100">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button onClick={() => updateQty(ci.item.id, -1)} className="p-1"><Minus size={14}/></button>
                    <span className="px-3 text-xs font-black">{ci.quantity}</span>
                    <button onClick={() => updateQty(ci.item.id, 1)} className="p-1"><Plus size={14}/></button>
                  </div>
                  <span className="text-xs font-black text-slate-800">{symbol} {((ci.item.sellingPrice || ci.item.price || 0) * rate * ci.quantity).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-white border-t border-gray-100 shadow-2xl z-20">
             <div className="mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Identificar Cliente</span>
                <div className="flex gap-2">
                   <input type="text" className="flex-1 p-2.5 bg-gray-50 border-gray-100 border rounded-xl text-xs font-bold" placeholder="Pesquisar cliente..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerList(true); }} />
                   <button onClick={() => setShowNewCustomerModal(true)} className="p-2.5 bg-white border border-gray-200 rounded-xl text-slate-400"><UserPlus size={20}/></button>
                </div>
                {showCustomerList && customerSearch && (
                    <div className="absolute bottom-60 left-4 right-4 bg-white rounded-2xl shadow-2xl border p-2 z-[110] max-h-40 overflow-y-auto">
                        {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                            <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerList(false); }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl border-b last:border-0"><p className="font-bold text-sm">{c.name}</p><p className="text-[10px] text-slate-400">{c.phone}</p></button>
                        ))}
                    </div>
                )}
             </div>

             <div className="grid grid-cols-4 gap-2 mb-6">
                {['cash', 'mpesa', 'emola', 'card'].map(m => (
                   <button key={m} onClick={() => setPaymentMethod(m as any)} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>{m === 'cash' ? <Wallet size={18}/> : <Smartphone size={18}/>}<span className="text-[8px] font-black uppercase mt-1">{m}</span></button>
                ))}
             </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Total Líquido</span>
              <span className="text-3xl font-black text-slate-900 font-heading">{symbol} {cartTotal.toFixed(0)}</span>
            </div>
            <button onClick={handleOpenConfirmation} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center active:scale-95"><Receipt className="mr-2" size={20} /> Concluir Venda</button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO FINAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-xs rounded-[3rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
              <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
              <h3 className="text-lg font-black text-slate-800">Confirmar Recebimento?</h3>
              <p className="text-xs text-slate-500 mt-2">Deseja finalizar a venda de <span className="font-black text-slate-900">{symbol} {cartTotal.toFixed(0)}</span> via <span className="font-black uppercase text-emerald-600">{paymentMethod}</span>?</p>
              
              <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                 <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2"><span>Detalhes</span></div>
                 <div className="space-y-1">
                    {cart.slice(0, 3).map(ci => <div key={ci.item.id} className="flex justify-between text-[11px] font-bold text-slate-700"><span>{ci.quantity}x {ci.item.name}</span></div>)}
                    {cart.length > 3 && <p className="text-[9px] text-slate-400">e mais {cart.length - 3} itens...</p>}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowConfirmModal(false)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase">Voltar</button>
                 <button onClick={handleFinalCheckout} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-200">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {/* RECIBO FINAL PÓS-VENDA (DISCRIMINADO) */}
      {receipt && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-sm rounded-[4rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
            <div className="bg-emerald-500 p-10 text-center text-white relative">
              <CheckCircle size={48} className="mx-auto mb-4" />
              <h3 className="text-2xl font-black font-heading">Transação Efetuada</h3>
              <p className="text-emerald-100 text-xs mt-1 uppercase tracking-widest font-bold">Venda registada com sucesso</p>
            </div>
            <div className="p-8">
              <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 space-y-4 mb-6 shadow-inner">
                 <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1 mb-4 border-b border-dashed border-slate-200 pb-4">
                    {receipt.records.map((r, i) => (
                       <div key={i} className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span className="truncate flex-1">{r.itemName}</span>
                          <span className="ml-3 text-slate-400">{r.quantity}x</span>
                          <span className="ml-3 text-slate-900">{symbol}{(r.totalRevenue * rate).toLocaleString()}</span>
                       </div>
                    ))}
                 </div>
                 <div className="space-y-1.5 border-b border-dashed border-slate-200 pb-4 mb-4 text-[9px] font-black uppercase tracking-tight">
                    <div className="flex justify-between"><span className="text-slate-400">Operador:</span><span className="text-slate-700">{receipt.records[0].operatorName}</span></div>
                    {receipt.customer && <div className="flex justify-between"><span className="text-slate-400">Cliente:</span><span className="text-purple-600">{receipt.customer.name}</span></div>}
                    <div className="flex justify-between"><span className="text-slate-400">Canal:</span><span className="text-emerald-600 font-black">{receipt.method}</span></div>
                 </div>
                 <div className="flex justify-between items-center"><span className="text-slate-400 font-black text-[10px] uppercase">Total Pago</span><span className="text-3xl font-black text-emerald-600">{symbol} {receipt.total.toFixed(0)}</span></div>
              </div>
              <button onClick={() => setReceipt(null)} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-black uppercase text-[10px] tracking-widest transition-all">Próximo Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
