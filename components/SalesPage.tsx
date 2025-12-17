
import React, { useState, useMemo } from 'react';
import { InventoryItem, CurrencyCode, SaleRecord, PaymentMethod, Customer } from '../types';
import { CURRENCY_SYMBOLS } from '../constants';
import { Search, ShoppingCart, Trash2, Package, Plus, Minus, CreditCard, Receipt, X, CheckCircle, AlertCircle, Scale, Layers, AlertTriangle, Smartphone, Wallet, Briefcase, Box, User as UserIcon, Award, UserPlus } from 'lucide-react';

export interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface SalesPageProps {
  items: InventoryItem[];
  customers: Customer[]; // Nova prop
  onBatchSale: (cartItems: CartItem[], paymentMethod: PaymentMethod, customer?: Customer) => SaleRecord[];
  onAddCustomer: (name: string, phone: string) => Customer; // Nova prop
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
}

const SalesPage: React.FC<SalesPageProps> = ({ items, customers = [], onBatchSale, onAddCustomer, currency, exchangeRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewType, setViewType] = useState<'product' | 'service'>('product'); 
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [receipt, setReceipt] = useState<{show: boolean, records: SaleRecord[], total: number, method: PaymentMethod, customer?: Customer} | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{name: string, items: InventoryItem[]} | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  
  // CUSTOMER STATES
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  
  // New Customer Form State
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
      try {
        if (!item || typeof item !== 'object') return false;
        
        const name = String(item.name || "").toLowerCase();
        const term = String(searchTerm || "").toLowerCase();
        
        const matchesSearch = name.includes(term);
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesType = item.type === viewType; 
        
        const hasStock = (Number(item.quantity) || 0) > 0;
        
        return matchesSearch && matchesCategory && matchesType && hasStock;
      } catch (e) {
        return false;
      }
    });
  }, [items, searchTerm, selectedCategory, viewType]);

  // Filter Customers for Autocomplete
  const filteredCustomers = useMemo(() => {
     if (!customerSearch) return [];
     const lower = customerSearch.toLowerCase();
     return customers.filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower));
  }, [customers, customerSearch]);

  const groupedItems = useMemo<Record<string, InventoryItem[]>>(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
      try {
        const rawName = String(item.name || "Sem Nome");
        const normalizedName = rawName.trim();
        if (!normalizedName) return;
        if (!groups[normalizedName]) groups[normalizedName] = [];
        groups[normalizedName].push(item);
      } catch (e) {}
    });
    return groups;
  }, [filteredItems]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, cartItem) => {
      if (!cartItem.item) return acc;
      const price = (cartItem.item.sellingPrice || cartItem.item.price || 0) * rate;
      return acc + (price * cartItem.quantity);
    }, 0);
  }, [cart, rate]);

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity && item.type === 'product') {
           showToast("Stock máximo disponível já adicionado!", "error");
           return prev;
        }
        return prev.map(ci => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(ci => {
      if (ci.item.id === itemId) {
        const newQty = Math.max(1, ci.quantity + delta);
        if (ci.item.type === 'product' && newQty > ci.item.quantity) {
          showToast("Limite de stock atingido!", "error");
          return ci; 
        }
        return { ...ci, quantity: newQty };
      }
      return ci;
    }));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    // Pass selectedCustomer to onBatchSale
    const records = onBatchSale(cart, paymentMethod, selectedCustomer || undefined);
    setReceipt({
      show: true,
      records,
      total: cartTotal,
      method: paymentMethod,
      customer: selectedCustomer || undefined
    });
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCartMobile(false);
  };

  const handleSelectCustomer = (c: Customer) => {
     setSelectedCustomer(c);
     setCustomerSearch(c.name);
     setShowCustomerList(false);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
     e.preventDefault();
     if (!newCustomerData.name || !newCustomerData.phone) return;
     
     const newCustomer = onAddCustomer(newCustomerData.name, newCustomerData.phone);
     setSelectedCustomer(newCustomer);
     setCustomerSearch(newCustomer.name);
     setShowNewCustomerModal(false);
     setNewCustomerData({ name: '', phone: '' });
     showToast("Cliente criado com sucesso!");
  };

  const categories = useMemo(() => {
     const relevantItems = items.filter(i => i.type === viewType);
     return Array.from(new Set(relevantItems.filter(i => i && i.category).map(i => i.category))).filter(Boolean);
  }, [items, viewType]);

  const getMethodLabel = (method: PaymentMethod) => {
    switch(method) {
      case 'cash': return 'Numerário';
      case 'mpesa': return 'M-Pesa';
      case 'emola': return 'E-Mola';
      case 'card': return 'Cartão';
      default: return method;
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50 relative text-gray-900">
      
      {toast && (
        <div className={`fixed top-20 md:top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center animate-[slideIn_0.3s_ease-out] border ${toast.type === 'error' ? 'bg-white border-red-100 text-red-600' : 'bg-white border-emerald-100 text-emerald-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={20} className="mr-3" /> : <CheckCircle size={20} className="mr-3" />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      {/* LEFT COLUMN: PRODUCT CATALOG */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header & Filters */}
        <div className="p-4 md:p-6 bg-white border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] z-10 flex flex-col gap-4">
          
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto">
             <button 
               onClick={() => setViewType('product')}
               className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Box size={16} className="mr-2" /> Produtos
             </button>
             <button 
               onClick={() => setViewType('service')}
               className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Briefcase size={16} className="mr-2" /> Serviços
             </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={`Pesquisar ${viewType === 'product' ? 'produtos' : 'serviços'}...`}
                className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full text-gray-900 font-medium placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-6 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 font-medium cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24 md:pb-4 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([name, items]) => {
                const groupItems = items as InventoryItem[];
                const isGroup = groupItems.length > 1;
                const displayItem = groupItems[0];
                
                const prices = groupItems.map(i => (i.sellingPrice || i.price || 0) * rate);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceDisplay = minPrice === maxPrice 
                  ? `${symbol} ${minPrice.toFixed(2)}`
                  : `${symbol} ${minPrice.toFixed(2)}+`;

                const totalStock = groupItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

                const totalQtyInCart = groupItems.reduce((acc, i) => {
                  const cartItem = cart.find(c => c.item.id === i.id);
                  return acc + (cartItem ? cartItem.quantity : 0);
                }, 0);

                return (
                  <button
                    key={name}
                    onClick={() => isGroup ? setSelectedGroup({ name, items: groupItems }) : addToCart(displayItem)}
                    className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-full group relative overflow-visible"
                  >
                    <div className="h-32 w-full bg-gray-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center relative border border-gray-100">
                      {displayItem.imageUrl ? (
                        <img src={displayItem.imageUrl} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        viewType === 'service' ? <Briefcase size={36} className="text-gray-300" /> : <Package size={36} className="text-gray-300" />
                      )}
                      
                      {isGroup && (
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm z-10 flex items-center border border-gray-200">
                            <Layers size={10} className="mr-1 text-indigo-500" />
                            {groupItems.length} Opções
                        </div>
                      )}

                      {totalQtyInCart > 0 && (
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-lg z-10 border-2 border-white ring-1 ring-emerald-100 animate-[scaleIn_0.2s_ease-out]">
                          {totalQtyInCart}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors font-heading">{name}</h3>
                      
                      {!isGroup && (
                        <div className="mb-2">
                          <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-md font-bold border border-gray-200 inline-flex items-center">
                            <Scale size={10} className="mr-1" />
                            {displayItem.size}{displayItem.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-between items-end w-full border-t border-dashed border-gray-100 pt-2">
                      {displayItem.type === 'product' ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${totalStock <= ((displayItem.lowStockThreshold || 0) * groupItems.length) ? 'bg-red-50 text-red-600' : 'text-gray-400 bg-gray-50'}`}>
                          {totalStock} un
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Serviço
                        </span>
                      )}
                      
                      <span className="font-extrabold text-emerald-600 text-lg">
                        {priceDisplay}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
               <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                  {viewType === 'product' ? <Package size={48} className="mb-2 opacity-20"/> : <Briefcase size={48} className="mb-2 opacity-20"/>}
                  <p>Nenhum {viewType === 'product' ? 'produto' : 'serviço'} encontrado.</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: CART (Desktop) / DRAWER (Mobile) */}
      <div className={`
        fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity md:static md:bg-transparent md:w-96 md:flex md:flex-col
        ${showCartMobile ? 'opacity-100 visible' : 'opacity-0 invisible md:opacity-100 md:visible pointer-events-none md:pointer-events-auto'}
      `} onClick={() => setShowCartMobile(false)}>
        
        <div 
          className={`
            fixed top-0 right-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 md:static md:w-full md:h-full md:shadow-none md:border-l md:border-gray-100
            ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
          onClick={e => e.stopPropagation()}
        >
          {/* Cart Header */}
          <div className="p-5 bg-white border-b border-gray-100 flex justify-between items-center shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] z-20">
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-heading">
              <ShoppingCart className="mr-2 text-emerald-600" /> Carrinho
              <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                {cart.length}
              </span>
            </h2>
            <button onClick={() => setShowCartMobile(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/50">
            {cart.length > 0 ? (
              cart.map((ci) => {
                const price = (ci.item.sellingPrice || ci.item.price || 0) * rate;
                return (
                  <div key={ci.item.id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex flex-col gap-2 relative group hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                         <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden flex-shrink-0">
                           {ci.item.imageUrl ? <img src={ci.item.imageUrl} className="w-full h-full object-cover" /> : (ci.item.type === 'service' ? <Briefcase size={20} className="text-gray-300"/> : <Package size={20} className="text-gray-300" />)}
                         </div>
                         <div>
                            <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{ci.item.name}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {ci.item.size}{ci.item.unit}
                              </span>
                              <p className="text-xs text-emerald-600 font-bold">
                                {symbol} {price.toFixed(2)}
                              </p>
                            </div>
                         </div>
                      </div>
                      <button onClick={() => removeFromCart(ci.item.id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-dashed border-gray-100">
                      <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
                        <button 
                          onClick={() => updateCartQty(ci.item.id, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-emerald-600 active:scale-95 transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold w-8 text-center text-gray-900">{ci.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(ci.item.id, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-emerald-600 active:scale-95 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="font-bold text-gray-900 text-base">
                        {symbol} {(price * ci.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                <div className="bg-gray-100 p-6 rounded-full">
                   <ShoppingCart size={40} />
                </div>
                <p className="font-medium">O carrinho está vazio</p>
              </div>
            )}
          </div>

          {/* Cart Footer / Checkout */}
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] z-20">
             
             {/* CUSTOMER SELECTOR */}
             <div className="mb-4 relative">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Cliente (Opcional)</span>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                         {selectedCustomer ? <Award size={16} className="text-purple-500" /> : <UserIcon size={16} />}
                      </div>
                      <input 
                         type="text" 
                         className={`w-full pl-9 pr-8 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${selectedCustomer ? 'border-purple-200 bg-purple-50 text-purple-700 focus:ring-purple-500' : 'border-gray-200 bg-gray-50 focus:ring-emerald-500 text-gray-900'}`}
                         placeholder="Associar Cliente..."
                         value={customerSearch}
                         onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerList(true);
                            if (!e.target.value) setSelectedCustomer(null);
                         }}
                         onFocus={() => setShowCustomerList(true)}
                      />
                      {selectedCustomer ? (
                         <button 
                           onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                           className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600"
                         >
                            <X size={16} />
                         </button>
                      ) : (
                         <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                            <Search size={14} />
                         </div>
                      )}
                   </div>
                   <button 
                     onClick={() => setShowNewCustomerModal(true)}
                     className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl w-10 flex items-center justify-center transition-colors border border-gray-200"
                     title="Novo Cliente"
                   >
                      <Plus size={20} />
                   </button>
                </div>

                {/* Customer Autocomplete Dropdown */}
                {showCustomerList && customerSearch && !selectedCustomer && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                         filteredCustomers.map(c => (
                            <button
                               key={c.id}
                               onClick={() => handleSelectCustomer(c)}
                               className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                            >
                               <div>
                                  <p className="text-sm font-bold text-gray-800">{c.name}</p>
                                  <p className="text-xs text-gray-500">{c.phone}</p>
                               </div>
                               {c.loyaltyPoints > 0 && (
                                  <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold">
                                     {c.loyaltyPoints} pts
                                  </span>
                               )}
                            </button>
                         ))
                      ) : (
                         <div className="p-3 text-center">
                            <p className="text-xs text-gray-400 mb-2">Cliente não encontrado.</p>
                            <button 
                              onClick={() => {
                                 setNewCustomerData({ name: customerSearch, phone: '' });
                                 setShowNewCustomerModal(true);
                                 setShowCustomerList(false);
                              }}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center w-full py-1"
                            >
                               <UserPlus size={12} className="mr-1" /> Criar "{customerSearch}"
                            </button>
                         </div>
                      )}
                   </div>
                )}
                {/* Backdrop to close dropdown */}
                {showCustomerList && (
                   <div className="fixed inset-0 z-40" onClick={() => setShowCustomerList(false)} />
                )}
             </div>

             {/* Payment Methods */}
             <div className="mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Pagamento</span>
                <div className="grid grid-cols-4 gap-2">
                   <button 
                     onClick={() => setPaymentMethod('cash')}
                     className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                   >
                      <Wallet size={20} />
                      <span className="text-[10px] font-bold mt-1">Num.</span>
                   </button>
                   <button 
                     onClick={() => setPaymentMethod('mpesa')}
                     className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === 'mpesa' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                   >
                      <Smartphone size={20} />
                      <span className="text-[10px] font-bold mt-1">M-Pesa</span>
                   </button>
                   <button 
                     onClick={() => setPaymentMethod('emola')}
                     className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === 'emola' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                   >
                      <Smartphone size={20} />
                      <span className="text-[10px] font-bold mt-1">E-Mola</span>
                   </button>
                   <button 
                     onClick={() => setPaymentMethod('card')}
                     className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                   >
                      <CreditCard size={20} />
                      <span className="text-[10px] font-bold mt-1">POS</span>
                   </button>
                </div>
             </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-medium">Total a Pagar</span>
              <span className="text-3xl font-bold text-gray-900">
                {symbol} {cartTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
            >
              <Receipt className="mr-2" size={20} />
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white">
                  <h3 className="font-bold text-lg font-heading">Novo Cliente</h3>
                  <button onClick={() => setShowNewCustomerModal(false)} className="hover:bg-purple-700 p-1.5 rounded-full"><X size={20}/></button>
               </div>
               <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                     <input 
                        autoFocus
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                        value={newCustomerData.name}
                        onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                        placeholder="Nome do cliente"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                     <input 
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                        value={newCustomerData.phone}
                        onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                        placeholder="84 / 85 xxx xxxx"
                     />
                  </div>
                  <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold mt-2 hover:bg-purple-700">
                     Criar e Selecionar
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* Mobile Floating Cart Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setShowCartMobile(true)}
          className="bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform active:scale-95 relative"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-900">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Variant Selection Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-xl text-gray-900 font-heading">{selectedGroup.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">Selecione uma opção</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="hover:bg-gray-100 p-2 rounded-full text-gray-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 bg-gray-50 max-h-[60vh] overflow-y-auto">
               <div className="space-y-3">
                 {selectedGroup.items.map(item => {
                    const price = (item.sellingPrice || item.price || 0) * rate;
                    const cartItem = cart.find(c => c.item.id === item.id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    
                    return (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2.5 rounded-xl text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                               {item.type === 'service' ? <Briefcase size={20} /> : <Package size={20} />}
                            </div>
                            <div>
                               <div className="flex items-center space-x-2">
                                  <span className="font-bold text-gray-800 text-base">
                                     {item.size}{item.unit}
                                  </span>
                                  {item.type === 'product' && (Number(item.quantity) || 0) <= (item.lowStockThreshold || 0) && (
                                     <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-bold flex items-center">
                                        <AlertTriangle size={10} className="mr-0.5" /> Pouco Stock
                                     </span>
                                  )}
                               </div>
                               {item.type === 'product' && <p className="text-xs text-gray-400 mt-0.5">Disp: {item.quantity || 0}</p>}
                            </div>
                         </div>

                         <div className="flex items-center gap-4">
                            <div className="text-right">
                               <div className="font-bold text-emerald-600 text-lg">{symbol} {price.toFixed(2)}</div>
                            </div>
                            
                            {qty === 0 ? (
                               <button 
                                 onClick={() => addToCart(item)}
                                 className="bg-gray-900 text-white w-10 h-10 rounded-xl hover:bg-emerald-600 hover:scale-105 active:scale-95 shadow-md flex items-center justify-center transition-all"
                               >
                                 <Plus size={20} />
                               </button>
                            ) : (
                               <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                                  <button onClick={() => updateCartQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-red-500"><Minus size={16}/></button>
                                  <span className="font-bold w-8 text-center text-sm text-gray-900">{qty}</span>
                                  <button onClick={() => updateCartQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-600 hover:bg-emerald-50"><Plus size={16}/></button>
                               </div>
                            )}
                         </div>
                      </div>
                    );
                 })}
               </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100 text-center">
               <button onClick={() => setSelectedGroup(null)} className="text-gray-500 hover:text-gray-800 font-medium text-sm px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && receipt.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] relative">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-center text-white relative">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
                 <CheckCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold font-heading">Sucesso!</h3>
              <p className="text-emerald-100 opacity-90 text-sm mt-1">Venda registada com sucesso.</p>
              <button 
                onClick={() => setReceipt(null)} 
                className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 relative">
              {/* Zigzag edge effect */}
              <div className="absolute top-0 left-0 w-full h-4 -mt-2 bg-[linear-gradient(45deg,transparent_75%,white_75%),linear-gradient(-45deg,transparent_75%,white_75%)] bg-[length:20px_20px]"></div>

              <div className="mt-2 text-center mb-4">
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase tracking-wide">
                     {getMethodLabel(receipt.method)}
                  </span>
                  {receipt.customer && (
                     <div className="mt-2 text-xs font-bold text-purple-600 flex items-center justify-center">
                        <UserIcon size={12} className="mr-1" /> {receipt.customer.name}
                     </div>
                  )}
              </div>

              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
                {receipt.records.map((rec) => (
                  <div key={rec.id} className="flex justify-between items-center py-2 border-b border-dashed border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                       <span className="bg-gray-100 text-gray-600 text-xs font-bold h-6 w-6 rounded flex items-center justify-center">
                         {rec.quantity}
                       </span>
                       <div>
                          <span className="text-sm text-gray-800 font-bold block leading-tight">{rec.itemName}</span>
                          {(() => {
                            if (rec.itemSize && rec.itemUnit) {
                              return <span className="text-[10px] text-gray-400 font-medium">{rec.itemSize}{rec.itemUnit}</span>;
                            }
                            const originalItem = items.find(i => i && i.id === rec.itemId);
                            return originalItem ? <span className="text-[10px] text-gray-400 font-medium">{originalItem.size}{originalItem.unit}</span> : null;
                          })()}
                       </div>
                    </div>
                    <span className="text-sm text-gray-800 font-bold">
                      {symbol} {(rec.totalRevenue * rate).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                 <div className="flex justify-between items-center">
                   <span className="text-gray-500 font-medium">Total Recebido</span>
                   <span className="text-2xl font-extrabold text-emerald-600">
                     {symbol} {receipt.total.toFixed(2)}
                   </span>
                 </div>
              </div>

              <button
                onClick={() => setReceipt(null)}
                className="mt-6 w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center"
              >
                <Receipt size={18} className="mr-2" />
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
