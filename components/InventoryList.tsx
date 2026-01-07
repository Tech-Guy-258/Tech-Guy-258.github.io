
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, SortField, SortOrder, CurrencyCode, Supplier } from '../types';
import { CURRENCY_SYMBOLS, CATEGORIES_PER_BUSINESS } from '../constants';
import { 
  Search, Filter, Trash2, Edit2, ChevronUp, ChevronDown, 
  Package, Scale, Layers, AlertCircle, AlertTriangle, 
  Calendar, CheckCircle, XCircle, Box, Briefcase, 
  Truck, Wallet, TrendingUp, Activity, PieChart, X, Phone, MessageCircle
} from 'lucide-react';

interface InventoryListProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  activeBusinessCategory: string; 
  suppliers?: Supplier[];
}

const InventoryList: React.FC<InventoryListProps> = ({ items, onDelete, onEdit, currency, exchangeRates, activeBusinessCategory, suppliers = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewType, setViewType] = useState<'product' | 'service'>('product'); 
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Modal de Urgências
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);
  const [urgencyTab, setUrgencyTab] = useState<'stock' | 'expiry'>('stock');
  const [contactingSupplier, setContactingSupplier] = useState<{item: InventoryItem, supplier: Supplier} | null>(null);

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  const thirtyDaysFromNow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  // Listas filtradas para urgências
  const urgentStockItems = useMemo(() => 
    items.filter(i => i.type === 'product' && (i.quantity <= i.lowStockThreshold)),
    [items]
  );

  const urgentExpiryItems = useMemo(() => 
    items.filter(i => {
      if (i.type !== 'product' || !i.expiryDate) return false;
      const exp = new Date(i.expiryDate);
      return exp <= thirtyDaysFromNow && exp >= new Date();
    }),
    [items, thirtyDaysFromNow]
  );

  // KPIs de Inventário
  const inventoryStats = useMemo(() => {
    const products = items.filter(i => i.type === 'product');
    const totalCostValue = products.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0) * rate;
    const totalRetailValue = products.reduce((acc, item) => acc + (Number(item.sellingPrice || 0) * Number(item.quantity)), 0) * rate;
    const itemsLowStock = urgentStockItems.length;
    const itemsExpiring = urgentExpiryItems.length;

    const stockHealth = products.length > 0 
      ? Math.round(((products.length - itemsLowStock) / products.length) * 100) 
      : 100;

    return { totalCostValue, totalRetailValue, itemsLowStock, itemsExpiring, stockHealth };
  }, [items, rate, urgentStockItems, urgentExpiryItems]);

  const availableCategories = useMemo(() => {
    return CATEGORIES_PER_BUSINESS[activeBusinessCategory] || Object.values(Category);
  }, [activeBusinessCategory]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    if (!Array.isArray(items)) return [];

    const filtered = items.filter(item => {
      const name = String(item.name || "").toLowerCase();
      const term = String(searchTerm || "").toLowerCase();
      const matchesSearch = name.includes(term);
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesType = item.type === viewType;
      return matchesSearch && matchesCategory && matchesType;
    });

    filtered.forEach(item => {
      const rawName = String(item.name || "Sem Nome");
      const key = rawName.trim();
      if (!key) return; 
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.entries(groups).map(([name, variants]) => {
      const first = variants[0];
      const isService = first.type === 'service';
      const totalStock = isService ? 0 : variants.reduce((acc, v) => acc + (Number(v.quantity) || 0), 0);
      const prices = variants.map(v => ((v.sellingPrice || v.price || 0) * rate));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      let sortValue: any;
      switch (sortField) {
        case 'quantity': sortValue = totalStock; break;
        case 'price': sortValue = minPrice; break;
        case 'expiryDate': sortValue = first.expiryDate; break;
        default: sortValue = name;
      }

      return {
        name,
        category: first.category,
        imageUrl: first.imageUrl,
        expiryDate: first.expiryDate,
        variants, 
        totalStock,
        priceRange: minPrice === maxPrice ? `${symbol} ${minPrice.toFixed(2)}` : `${symbol} ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`,
        sortValue,
        isService,
        supplierName: first.supplierName,
        supplierId: first.supplierId
      };
    }).sort((a, b) => {
      let valA = a.sortValue;
      let valB = b.sortValue;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, searchTerm, selectedCategory, sortField, sortOrder, rate, symbol, viewType]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-50" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const handleDeleteGroup = (variants: InventoryItem[]) => {
    if (variants && variants.length > 0) {
      const name = String(variants[0].name || 'este produto');
      const isService = variants[0].type === 'service';
      
      const confirmMsg = isService 
        ? `Tem a certeza que deseja eliminar o serviço "${name}"?`
        : `Tem a certeza que deseja eliminar "${name}" e todas as suas ${variants.length} variantes/lotes? Esta ação é irreversível.`;

      if (window.confirm(confirmMsg)) {
        variants.forEach(v => onDelete(v.id));
      }
    }
  };

  const getExpiryStatus = (dateString?: string) => {
     if (!dateString) return null;
     const today = new Date();
     const expiry = new Date(dateString);
     const diffTime = expiry.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays < 0) return { label: 'EXPIRADO', color: 'text-red-600 bg-red-100', icon: AlertCircle };
     if (diffDays <= 7) return { label: `Expira em ${diffDays}d`, color: 'text-orange-600 bg-orange-100', icon: Calendar };
     if (diffDays <= 30) return { label: `Validade: ${diffDays}d`, color: 'text-yellow-600 bg-yellow-50', icon: Calendar };
     return null;
  };

  const handleContactSupplier = (item: InventoryItem) => {
    const supplier = suppliers.find(s => s.id === item.supplierId) || suppliers.find(s => s.name === item.supplierName);
    if (supplier && supplier.phone) {
      setContactingSupplier({ item, supplier });
    } else {
      alert("Dados de contacto não encontrados para este fornecedor. Por favor, verifique o registo na página de Fornecedores.");
    }
  };

  const openWhatsApp = (phone: string, itemName: string, supplierName: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('258') && cleanPhone.length === 9) {
      cleanPhone = '258' + cleanPhone;
    }
    const message = encodeURIComponent(`Olá ${supplierName}, contactamos da Mercearia via Gestão360. Precisamos de reposição urgente para o produto: ${itemName}. Está disponível?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    setContactingSupplier(null);
  };

  const renderStockLabel = (item: InventoryItem) => {
    if (item.type === 'service') {
       return item.quantity > 0 ? (
          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold flex items-center border border-emerald-100"><CheckCircle size={12} className="mr-1" /> Disponível</span>
       ) : (
          <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold flex items-center border border-gray-200"><XCircle size={12} className="mr-1" /> Indisponível</span>
       );
    }
    return (
      <span className={`text-xs px-2 py-1 rounded-lg font-bold flex items-center ${
         item.quantity === 0 ? 'bg-gray-200 text-gray-500' :
         item.quantity <= item.lowStockThreshold ? 'bg-red-100 text-red-600' : 'bg-white text-gray-600 border border-gray-200'
      }`}>
         {item.quantity === 0 ? 'Esgotado' : `${item.quantity} un`}
         {item.quantity > 0 && item.quantity <= item.lowStockThreshold && <AlertCircle size={10} className="ml-1" />}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 text-gray-900 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <h2 className="text-3xl font-black text-gray-800 font-heading tracking-tight">Inventário Estratégico</h2>
           <p className="text-gray-500 mt-1 font-medium flex items-center"><Activity size={16} className="mr-2 text-emerald-500" /> Monitorização ativa</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl w-fit mx-auto md:mx-0 shadow-inner">
             <button onClick={() => setViewType('product')} className={`flex items-center px-6 py-2 rounded-xl text-sm font-black transition-all ${viewType === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Box size={18} className="mr-2" /> PRODUTOS</button>
             <button onClick={() => setViewType('service')} className={`flex items-center px-6 py-2 rounded-xl text-sm font-black transition-all ${viewType === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Briefcase size={18} className="mr-2" /> SERVIÇOS</button>
        </div>
      </div>

      {/* KPI BAR */}
      {viewType === 'product' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 w-fit"><Wallet size={24}/></div>
              <div className="mt-5">
                 <p className="text-3xl font-black text-gray-900 font-heading">{symbol} {inventoryStats.totalCostValue.toLocaleString()}</p>
                 <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Património (Custo)</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 w-fit"><TrendingUp size={24}/></div>
              <div className="mt-5">
                 <p className="text-3xl font-black text-gray-900 font-heading">{symbol} {inventoryStats.totalRetailValue.toLocaleString()}</p>
                 <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Potencial de Venda</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 w-fit"><PieChart size={24}/></div>
              <div className="mt-5">
                 <p className="text-3xl font-black text-gray-900 font-heading">{inventoryStats.stockHealth}%</p>
                 <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Saúde do Stock</p>
              </div>
           </div>
           <div onClick={() => setShowUrgencyModal(true)} className="bg-slate-900 p-6 rounded-[2rem] shadow-xl hover:bg-black transition-all cursor-pointer group active:scale-95">
              <div className="flex justify-between items-start">
                 <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg"><AlertCircle size={24}/></div>
                 <span className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full">Ver Detalhes</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                 <div><p className="text-xl font-black text-white">{inventoryStats.itemsLowStock}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Stock Baixo</p></div>
                 <div className="border-l border-slate-700 pl-4"><p className="text-xl font-black text-white">{inventoryStats.itemsExpiring}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Validade</p></div>
              </div>
           </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder={`Pesquisar...`} className="pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none w-full shadow-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="relative min-w-[240px]">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select className="pl-12 pr-10 py-4 border border-gray-200 rounded-2xl appearance-none bg-white w-full font-bold cursor-pointer" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="all">Todas Categorias</option>
              {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
      </div>

      {/* LISTA MOBILE */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {groupedItems.map((group) => (
          <div key={group.name} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 relative shadow-inner">
                  {group.imageUrl ? <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" /> : (viewType === 'service' ? <Briefcase className="text-gray-300" size={24} /> : <Package className="text-gray-300" size={24} />)}
                  {group.variants.length > 1 && <div className="absolute bottom-0 right-0 bg-gray-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-tl-lg flex items-center"><Layers size={8} className="mr-0.5" />{group.variants.length}</div>}
                </div>
                <div><h3 className="font-bold text-gray-800 text-lg leading-tight">{group.name}</h3><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest mt-1">{group.category}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(group.variants[0])} className="p-2.5 text-emerald-600 bg-emerald-50 rounded-xl active:scale-95 transition-transform"><Edit2 size={18} /></button>
                <button onClick={() => handleDeleteGroup(group.variants)} className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-95 transition-transform"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
               {group.variants.map(v => (
                 <div key={v.id} className="flex justify-between items-center pb-2 border-b border-dashed border-gray-200 last:border-0 last:pb-0">
                    <span className="font-bold text-gray-700 text-xs flex items-center bg-white border px-2 py-1 rounded-lg"><Scale size={12} className="mr-1 text-gray-400" /> {v.size}{v.unit}</span>
                    {renderStockLabel(v)}
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>

      {/* TABELA DESKTOP */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer group" onClick={() => handleSort('name')}><div className="flex items-center">Item <SortIcon field="name" /></div></th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Variantes / Stock</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('quantity')}><div className="flex items-center">Volume Total <SortIcon field="quantity" /></div></th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('price')}><div className="flex items-center">PVP Médio <SortIcon field="price" /></div></th>
              <th className="px-8 py-6 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupedItems.map((group) => (
              <tr key={group.name} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-6 align-top">
                  <div className="flex items-center">
                    <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 relative">
                       {group.imageUrl ? <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" /> : (viewType === 'service' ? <Briefcase size={24} className="text-gray-300" /> : <Package size={24} className="text-gray-300" />)}
                       {group.variants.length > 1 && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{group.variants.length}</div>}
                    </div>
                    <div className="ml-5"><div className="text-base font-black text-gray-800 font-heading">{group.name}</div><span className="px-2 py-0.5 mt-1 inline-flex text-[9px] font-black uppercase tracking-widest rounded-md bg-blue-50 text-blue-600 border border-blue-100">{group.category}</span></div>
                  </div>
                </td>
                <td className="px-8 py-6 align-top">
                  <div className="flex flex-col gap-2">
                    {group.variants.map(v => (
                       <div key={v.id} className="flex items-center space-x-2">
                         <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-white text-gray-700 border border-gray-100 shadow-sm">
                           <span className="font-bold mr-2 text-gray-800 bg-gray-50 px-1.5 rounded">{v.size}{v.unit}</span>
                           <span className={`font-mono ${v.quantity === 0 ? 'text-gray-300' : v.quantity <= v.lowStockThreshold ? 'text-red-600 font-black' : 'text-gray-600 font-bold'}`}>{v.type === 'service' ? (v.quantity > 0 ? 'Disp.' : '—') : (v.quantity === 0 ? 'Esgot.' : `${v.quantity} un`)}</span>
                         </div>
                         {getExpiryStatus(v.expiryDate) && v.type === 'product' && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center uppercase tracking-widest ${getExpiryStatus(v.expiryDate)?.color}`}><Calendar size={10} className="mr-1" /> {getExpiryStatus(v.expiryDate)?.label}</span>
                         )}
                       </div>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap align-top font-black text-gray-800">{group.isService ? '—' : `${group.totalStock} un`}</td>
                <td className="px-8 py-6 whitespace-nowrap align-top text-emerald-600 font-black">{group.priceRange}</td>
                <td className="px-8 py-6 text-right align-top">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => onEdit(group.variants[0])} className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteGroup(group.variants)} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL URGÊNCIAS */}
      {showUrgencyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[scaleIn_0.3s_ease-out]">
            <div className="p-6 sm:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="bg-red-500 p-2 rounded-xl"><AlertTriangle size={24} /></div>
                  <div><h3 className="font-black text-xl font-heading">Urgências Detetadas</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditoria em tempo real</p></div>
               </div>
               <button onClick={() => setShowUrgencyModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>

            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
               <button onClick={() => setUrgencyTab('stock')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${urgencyTab === 'stock' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Box size={14} /> Stock Baixo ({inventoryStats.itemsLowStock})</button>
               <button onClick={() => setUrgencyTab('expiry')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${urgencyTab === 'expiry' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Calendar size={14} /> Validade Próxima ({inventoryStats.itemsExpiring})</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
               {urgencyTab === 'stock' ? (
                  urgentStockItems.length > 0 ? urgentStockItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-red-50 flex items-center justify-between hover:border-red-200 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center shrink-0">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={20} />}</div>
                          <div><p className="font-black text-slate-800 text-sm leading-tight">{item.name}</p><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">{item.quantity === 0 ? 'ESGOTADO' : `${item.quantity} un`}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{item.size}{item.unit}</span></div></div>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => { onEdit(item); setShowUrgencyModal(false); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Editar Stock"><Edit2 size={16} /></button>
                          <button onClick={() => handleContactSupplier(item)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Contactar Fornecedor"><Truck size={16} /></button>
                       </div>
                    </div>
                  )) : <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px]">Tudo OK</div>
               ) : (
                  urgentExpiryItems.length > 0 ? urgentExpiryItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-orange-50 flex items-center justify-between hover:border-orange-200 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center shrink-0">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={20} />}</div>
                          <div><p className="font-black text-slate-800 text-sm leading-tight">{item.name}</p><div className="flex items-center gap-2 mt-1"><span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${getExpiryStatus(item.expiryDate)?.color}`}>{getExpiryStatus(item.expiryDate)?.label}</span></div></div>
                       </div>
                       <button onClick={() => { onEdit(item); setShowUrgencyModal(false); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                    </div>
                  )) : <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px]">Nenhuma validade crítica</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELETOR DE CONTACTO */}
      {contactingSupplier && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
              <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Truck size={32} /></div>
                 <h3 className="text-xl font-black text-slate-800 font-heading">Contactar Fornecedor</h3>
                 <p className="text-sm text-slate-500 mt-1">{contactingSupplier.supplier.name}</p>
                 <div className="mt-4 bg-white p-3 rounded-2xl border border-slate-200 inline-block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto em falta</p>
                    <p className="text-xs font-bold text-slate-700">{contactingSupplier.item.name}</p>
                 </div>
              </div>
              <div className="p-6 space-y-3">
                 <a 
                    href={`tel:${contactingSupplier.supplier.phone.replace(/\D/g, '')}`}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                 >
                    <Phone size={20} /> Ligar Agora
                 </a>
                 <button 
                    onClick={() => openWhatsApp(contactingSupplier.supplier.phone, contactingSupplier.item.name, contactingSupplier.supplier.name)}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                 >
                    <MessageCircle size={22} /> Enviar WhatsApp
                 </button>
                 <button onClick={() => setContactingSupplier(null)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest mt-2">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
