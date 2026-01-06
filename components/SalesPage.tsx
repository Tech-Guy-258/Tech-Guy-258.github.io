
import React, { useState, useMemo } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, PaymentMethod, Customer } from '../types';
import { CURRENCY_SYMBOLS } from '../constants';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, X, CheckCircle, AlertCircle, Layers, Smartphone, Wallet, Briefcase, Box, User as UserIcon, Award, UserPlus, Package } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewType, setViewType] = useState<'product' | 'service'>('product'); 
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [receipt, setReceipt] = useState<{show: boolean, records: SaleRecord[], total: number, method: PaymentMethod, customer?: Customer, timestamp: string} | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{name: string, items: InventoryItem[]} | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  
  // CUSTOMER STATES
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
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
        const name = String(item.name || "").toLowerCase();
        const term = String(searchTerm || "").toLowerCase();
        return name.includes(term) && (selectedCategory === 'all' || item.category === selectedCategory) && item.type === viewType && (Number(item.quantity) || 0) > 0;
    });
  }, [items, searchTerm, selectedCategory, viewType]);

  const groupedItems = useMemo<Record<string, InventoryItem[]>>(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
        const normalizedName = String(item.name || "Sem Nome").trim();
        if (!normalizedName) return;
        if (!groups[normalizedName]) groups[normalizedName] = [];
        groups[normalizedName].push(item);
    });
    return groups;
  }, [filteredItems]);

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
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const records = onBatchSale(cart, paymentMethod, selectedCustomer || undefined);
    setReceipt({ show: true, records, total: cartTotal, method: paymentMethod, customer: selectedCustomer || undefined, timestamp: new Date().toLocaleString('pt-PT') });
    setCart([]); setSelectedCustomer(null); setCustomerSearch(''); setShowCartMobile(false);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
     e.preventDefault();
     if (!newCustomerData.name || !newCustomerData.phone) return;
     const newCust = onAddCustomer(newCustomerData.name, newCustomerData.phone);
     setSelectedCustomer(newCust); setCustomerSearch(newCust.name);
     setShowNewCustomerModal(false); setNewCustomerData({ name: '', phone: '' });
     showToast("Cliente registado!");
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50 relative text-gray-900">
      {toast && <div className={`fixed top-20 md:top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center border ${toast.type === 'error' ? 'bg-white border-red-100 text-red-600' : 'bg-white border-emerald-100 text-emerald-600'}`}><CheckCircle size={20} className="mr-3" /> <span className="font-bold">{toast.message}</span></div>}

      {/* CATALOG */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 md:p-6 bg-white border-b border-gray-100 shadow-sm z-10 flex flex-col gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto">
             <button onClick={() => setViewType('product')} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Box size={16} className="mr-2" /> Produtos</button>
             <button onClick={() => setViewType('service')} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Briefcase size={16} className="mr-2" /> Serviços</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder={`Pesquisar no catálogo...`} className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(groupedItems).map(([name, groupItems]: [string, InventoryItem[]]) => {
                const isGroup = groupItems.length > 1;
                const displayItem = groupItems[0];
                const minPrice = Math.min(...groupItems.map(i => (i.sellingPrice || i.price || 0) * rate));
                const totalQtyInCart = groupItems.reduce((acc, i) => acc + (cart.find(c => c.item.id === i.id)?.quantity || 0), 0);
                return (
                  <button key={name} onClick={() => isGroup ? setSelectedGroup({ name, items: groupItems }) : addToCart(displayItem)} className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-full group relative">
                    <div className="h-32 w-full bg-gray-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center relative border border-gray-100">
                      {displayItem.imageUrl ? <img src={displayItem.imageUrl} className="h-full w-full object-cover" /> : (viewType === 'service' ? <Briefcase size={36} className="text-gray-300" /> : <Package size={36} className="text-gray-300" />)}
                      {isGroup && <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200"><Layers size={10} className="mr-1 text-indigo-500" /> {groupItems.length} Opções</div>}
                      {totalQtyInCart > 0 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white">{totalQtyInCart}</div>}
                    </div>
                    <div className="flex-1"><h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors">{name}</h3></div>
                    <div className="mt-3 flex justify-between items-end w-full border-t border-dashed border-gray-100 pt-2"><span className="font-extrabold text-emerald-600 text-lg">{symbol} {minPrice.toFixed(0)}{isGroup && '+'}</span></div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* CART COLUMN */}
      <div className={`fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity md:static md:bg-transparent md:w-96 md:flex md:flex-col ${showCartMobile ? 'opacity-100 visible' : 'opacity-0 invisible md:opacity-100 md:visible pointer-events-none md:pointer-events-auto'}`} onClick={() => setShowCartMobile(false)}>
        <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 md:static md:w-full md:h-full md:shadow-none md:border-l md:border-gray-100 ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`} onClick={e => e.stopPropagation()}>
          <div className="p-5 bg-white border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-heading"><ShoppingCart className="mr-2 text-emerald-600" /> Venda <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">{cart.length}</span></h2>
            <button onClick={() => setShowCartMobile(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/50">
            {cart.map((ci) => {
                const price = (ci.item.sellingPrice || ci.item.price || 0) * rate;
                return (
                  <div key={ci.item.id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                         <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border overflow-hidden shrink-0">{ci.item.imageUrl ? <img src={ci.item.imageUrl} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-300" />}</div>
                         <div><h4 className="font-bold text-gray-800 text-xs line-clamp-1">{ci.item.name}</h4><p className="text-xs text-emerald-600 font-bold">{symbol} {price.toFixed(0)}</p></div>
                      </div>
                      <button onClick={() => setCart(prev => prev.filter(x => x.item.id !== ci.item.id))} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                    </div>
                  </div>
                );
            })}
          </div>

          <div className="p-6 bg-white border-t border-gray-100 shadow-lg z-20">
             {/* CRM SECTION */}
             <div className="mb-4 relative">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Cliente / Fidelização</span>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{selectedCustomer ? <Award size={16} className="text-purple-500" /> : <UserIcon size={16} />}</div>
                      <input type="text" className={`w-full pl-9 pr-8 py-2.5 border rounded-xl text-sm font-bold focus:outline-none transition-all ${selectedCustomer ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-gray-100 bg-gray-50 focus:ring-emerald-500'}`} placeholder="Procurar cliente..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerList(true); }} onFocus={() => setShowCustomerList(true)} />
                      {showCustomerList && customerSearch && !selectedCustomer && (
                         <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-40 overflow-y-auto z-50 p-2">
                            {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                               <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerList(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-all"><div className="font-bold text-slate-800 text-sm">{c.name}</div><div className="text-[10px] text-slate-400 font-bold">{c.phone}</div></button>
                            ))}
                         </div>
                      )}
                      {selectedCustomer && <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600"><X size={16} /></button>}
                   </div>
                   <button onClick={() => setShowNewCustomerModal(true)} className="bg-white hover:bg-gray-50 text-slate-400 rounded-xl w-11 flex items-center justify-center border border-gray-200 shadow-sm"><UserPlus size={20} /></button>
                </div>
             </div>

             <div className="grid grid-cols-4 gap-2 mb-6">
                {['cash', 'mpesa', 'emola', 'card'].map(m => (
                   <button key={m} onClick={() => setPaymentMethod(m as any)} className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${paymentMethod === m ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>{m === 'cash' ? <Wallet size={20}/> : <Smartphone size={20}/>}<span className="text-[8px] font-black uppercase mt-1">{m}</span></button>
                ))}
             </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-medium">Total Liquido</span>
              <span className="text-3xl font-black text-gray-900">{symbol} {cartTotal.toFixed(0)}</span>
            </div>
            <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl flex items-center justify-center"><Receipt className="mr-2" size={20} /> Concluir Venda</button>
          </div>
        </div>
      </div>

      {/* NEW CUSTOMER MODAL */}
      {showNewCustomerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 bg-emerald-600 text-white flex justify-between items-center"><h3 className="font-black text-xl font-heading">Novo Cliente</h3><button onClick={() => setShowNewCustomerModal(false)}><X size={24}/></button></div>
               <form onSubmit={handleCreateCustomer} className="p-8 space-y-6">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome Completo</label><input required className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-inner font-bold outline-none" value={newCustomerData.name} onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})} placeholder="Ex: João Muianga" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Telemóvel</label><input required type="tel" className="w-full p-4 border-none rounded-2xl bg-slate-50 text-slate-900 shadow-inner font-bold outline-none" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} placeholder="8x xxx xxxx" /></div>
                  <button type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 shadow-xl transition-all uppercase tracking-widest text-xs">Salvar Cliente</button>
               </form>
            </div>
         </div>
      )}

      {/* RECEIPT MODAL */}
      {receipt && receipt.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-emerald-500 p-8 text-center text-white relative">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><CheckCircle size={32} /></div>
              <h3 className="text-2xl font-black font-heading">Sucesso!</h3>
              <p className="text-emerald-100 text-sm mt-1">Registo financeiro concluído.</p>
            </div>
            <div className="p-8">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-3 mb-6">
                 <div className="flex justify-between items-center"><span className="text-slate-500 font-bold text-xs uppercase">Total Pago</span><span className="text-2xl font-black text-emerald-600">{symbol} {receipt.total.toFixed(0)}</span></div>
                 {receipt.customer && <div className="text-xs font-black text-purple-600 uppercase tracking-widest border-t border-slate-200 pt-2 flex items-center gap-1"><UserIcon size={12} /> {receipt.customer.name}</div>}
              </div>
              <button onClick={() => setReceipt(null)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black shadow-lg uppercase text-xs tracking-widest">Nova Venda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
