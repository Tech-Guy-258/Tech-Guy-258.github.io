
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, SortField, SortOrder, CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS, CATEGORIES_PER_BUSINESS } from '../constants';
import { Search, Filter, Trash2, Edit2, ChevronUp, ChevronDown, Package, Scale, Layers, AlertCircle, AlertTriangle, Calendar, CheckCircle, XCircle, Box, Briefcase, Truck } from 'lucide-react';

interface InventoryListProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  activeBusinessCategory: string; 
}

const InventoryList: React.FC<InventoryListProps> = ({ items, onDelete, onEdit, currency, exchangeRates, activeBusinessCategory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewType, setViewType] = useState<'product' | 'service'>('product'); 
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  const availableCategories = useMemo(() => {
    return CATEGORIES_PER_BUSINESS[activeBusinessCategory] || Object.values(Category);
  }, [activeBusinessCategory]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    
    if (!Array.isArray(items)) return [];

    const filtered = items.filter(item => {
      try {
        if (!item || typeof item !== 'object') return false;
        
        const name = String(item.name || "").toLowerCase();
        const term = String(searchTerm || "").toLowerCase();
        
        const matchesSearch = name.includes(term);
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesType = item.type === viewType;

        return matchesSearch && matchesCategory && matchesType;
      } catch (e) {
        return false;
      }
    });

    filtered.forEach(item => {
      try {
        const rawName = String(item.name || "Sem Nome");
        const key = rawName.trim();
        
        if (!key) return; 

        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      } catch (e) {
        // Skip bad item
      }
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
        variants: variants, 
        totalStock,
        priceRange: minPrice === maxPrice ? `${symbol} ${minPrice.toFixed(2)}` : `${symbol} ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`,
        sortValue,
        isService,
        supplierName: first.supplierName
      };
    }).sort((a, b) => {
      let valA = a.sortValue;
      let valB = b.sortValue;
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      else if (typeof valA !== 'number') valA = String(valA || '');
      
      if (typeof valB === 'string') valB = valB.toLowerCase();
      else if (typeof valB !== 'number') valB = String(valB || '');

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
      if (window.confirm(`Tem a certeza que deseja eliminar "${name}" e todas as suas ${variants.length} variantes?`)) {
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
     return null;
  };

  const renderStockLabel = (item: InventoryItem) => {
    if (item.type === 'service') {
       return item.quantity > 0 ? (
          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold flex items-center border border-emerald-100">
             <CheckCircle size={12} className="mr-1" /> Disponível
          </span>
       ) : (
          <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold flex items-center border border-gray-200">
             <XCircle size={12} className="mr-1" /> Indisponível
          </span>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-800 font-heading">Inventário</h2>
           <p className="text-gray-500 mt-1">Gerencie produtos, variantes e stock.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto md:mx-0">
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
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Pesquisar ${viewType === 'product' ? 'produtos' : 'serviços'}...`}
              className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full text-gray-900 shadow-sm transition-shadow hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select
              className="pl-12 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white w-full text-gray-900 shadow-sm font-medium cursor-pointer transition-shadow hover:shadow-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas as Categorias</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {groupedItems.length > 0 ? (
          groupedItems.map((group) => (
            <div key={group.name} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100 relative shadow-inner">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" />
                    ) : (
                      viewType === 'service' ? <Briefcase className="text-gray-300" size={24} /> : <Package className="text-gray-300" size={24} />
                    )}
                    <div className="absolute bottom-0 right-0 bg-gray-900/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-lg flex items-center">
                       <Layers size={8} className="mr-0.5" />
                       {group.variants.length}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg leading-tight font-heading">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                        {group.category}
                      </span>
                      {group.supplierName && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <Truck size={10} className="mr-1"/> {group.supplierName}
                         </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(group.variants[0]); }}
                    className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.variants); }}
                    className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                 <div className="grid grid-cols-1 gap-2">
                    {group.variants.map(v => {
                       const expiryStatus = getExpiryStatus(v.expiryDate);
                       return (
                       <div key={v.id} className="flex flex-col gap-1 py-2 border-b border-dashed border-gray-200 last:border-0">
                          <div className="flex justify-between items-center">
                             <span className="font-bold text-gray-700 flex items-center bg-white border border-gray-200 px-2 py-1 rounded-lg shadow-sm text-sm">
                                <Scale size={12} className="mr-1.5 text-gray-400" />
                                {v.size}{v.unit}
                             </span>
                             {renderStockLabel(v)}
                          </div>
                          {expiryStatus && v.type === 'product' && (
                             <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit flex items-center ${expiryStatus.color}`}>
                                <expiryStatus.icon size={10} className="mr-1" /> {expiryStatus.label}
                             </div>
                          )}
                       </div>
                    )})}
                 </div>
              </div>
            </div>
          ))
        ) : (
           <div className="bg-white p-12 rounded-3xl text-center text-gray-400 border border-gray-100 border-dashed">
             {viewType === 'service' ? <Briefcase size={48} className="mx-auto mb-3 opacity-20" /> : <Package size={48} className="mx-auto mb-3 opacity-20" />}
             <p className="font-medium">Nenhum {viewType === 'service' ? 'serviço' : 'produto'} encontrado.</p>
           </div>
        )}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th 
                  className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">Produto <SortIcon field="name" /></div>
                </th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Variantes / Estado
                </th>
                <th 
                  className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center">Stock Total <SortIcon field="quantity" /></div>
                </th>
                <th 
                  className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center">Preço de Venda <SortIcon field="price" /></div>
                </th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupedItems.length > 0 ? (
                groupedItems.map((group) => (
                  <tr key={group.name} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                           {group.imageUrl ? (
                             <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" />
                           ) : (
                             viewType === 'service' ? <Briefcase className="text-gray-300" size={24} /> : <Package className="text-gray-300" size={24} />
                           )}
                        </div>
                        <div className="ml-4">
                          <div className="text-base font-bold text-gray-800 font-heading">{group.name}</div>
                          <div className="flex flex-col gap-1 mt-1">
                             <span className="px-2 py-0.5 inline-flex text-[10px] font-bold uppercase tracking-wide rounded-md bg-blue-50 text-blue-600 border border-blue-100 w-fit">
                               {group.category}
                             </span>
                             {group.supplierName && (
                                <span className="text-[10px] text-gray-400 flex items-center">
                                   <Truck size={10} className="mr-1"/> {group.supplierName}
                                </span>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        {group.variants.map(v => {
                           const expiryStatus = getExpiryStatus(v.expiryDate);
                           return (
                           <div key={v.id} className="flex items-center space-x-2">
                             <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-white text-gray-700 border border-gray-200 shadow-sm">
                               <span className="font-bold mr-2 text-gray-800 bg-gray-100 px-1.5 rounded">{v.size}{v.unit}</span>
                               <span className={`font-mono ${
                                  v.type === 'service' ? (v.quantity > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400') :
                                  v.quantity === 0 ? 'text-gray-400 font-bold' :
                                  v.quantity <= v.lowStockThreshold ? 'text-red-600 font-bold' : 'text-gray-500'
                               }`}>
                                  {v.type === 'service' ? (v.quantity > 0 ? 'Disp.' : 'Indisp.') : (v.quantity === 0 ? 'Esgotado' : v.quantity)}
                               </span>
                             </div>
                             {expiryStatus && v.type === 'product' && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${expiryStatus.color}`}>
                                   <expiryStatus.icon size={10} className="mr-1" /> {expiryStatus.label}
                                </span>
                             )}
                             {v.type === 'product' && v.quantity > 0 && v.quantity <= v.lowStockThreshold && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-100 flex items-center">
                                   <AlertTriangle size={10} className="mr-1" /> Baixo Stock
                                </span>
                             )}
                           </div>
                        )})}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="text-sm font-bold text-gray-800 bg-gray-100 w-fit px-3 py-1 rounded-lg border border-gray-200">
                        {group.isService ? '—' : `${group.totalStock} un`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold align-top">
                      {group.priceRange}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEdit(group.variants[0]); }}
                          className="text-gray-500 hover:text-emerald-600 p-2.5 hover:bg-emerald-50 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.variants); }}
                          className="text-gray-500 hover:text-red-500 p-2.5 hover:bg-red-50 rounded-xl transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {viewType === 'service' ? <Briefcase size={32} className="mx-auto mb-2 opacity-20" /> : <Package size={32} className="mx-auto mb-2 opacity-20" />}
                    Nenhum {viewType === 'service' ? 'serviço' : 'produto'} encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
