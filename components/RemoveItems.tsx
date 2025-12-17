
import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Search, Trash2, Package, AlertOctagon, Layers, Scale, X, AlertTriangle, ChevronRight, Box, Briefcase } from 'lucide-react';

interface RemoveItemsProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
}

const RemoveItems: React.FC<RemoveItemsProps> = ({ items, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<{name: string, items: InventoryItem[]} | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [viewType, setViewType] = useState<'product' | 'service'>('product');

  // Filter items safely
  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      // Validate object
      if (!item || typeof item !== 'object') return false;
      const rawName = item.name;
      const name = (typeof rawName === 'string' ? rawName : String(rawName || '')).toLowerCase();
      const term = String(searchTerm || '').toLowerCase();
      
      const matchesType = item.type === viewType;

      return name.includes(term) && matchesType;
    });
  }, [items, searchTerm, viewType]);

  // Group items by Name safely
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
      // Defensive string handling
      const rawName = item.name;
      const normalizedName = (typeof rawName === 'string' ? rawName : String(rawName || '')).trim();
      
      if (!normalizedName) return;

      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(item);
    });
    return groups;
  }, [filteredItems]);

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      
      // Update the selected group view or close it if empty
      if (selectedGroup) {
        const updatedGroupItems = selectedGroup.items.filter(i => i.id !== itemToDelete.id);
        if (updatedGroupItems.length === 0) {
          setSelectedGroup(null);
        } else {
          setSelectedGroup({ ...selectedGroup, items: updatedGroupItems });
        }
      }
      
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-red-100 p-2 rounded-lg text-red-600">
             <Trash2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-heading">Remover {viewType === 'product' ? 'Produtos' : 'Serviços'}</h2>
            <p className="text-sm text-gray-500">Eliminar permanentemente do sistema.</p>
          </div>
        </div>

        {/* CENTRALIZED TAB SELECTOR */}
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

      {/* Barra de Pesquisa */}
      <div className="relative w-full mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder={`Pesquisar ${viewType === 'product' ? 'produto' : 'serviço'} para remover...`}
          className="pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 w-full shadow-sm bg-white text-gray-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedItems).length > 0 ? (
          Object.entries(groupedItems).map(([name, items]) => {
            const groupItems = items as InventoryItem[];
            const displayItem = groupItems[0]; // Imagem representativa
            const totalStock = groupItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

            return (
              <div 
                key={name} 
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-red-200 transition-all cursor-pointer group"
                onClick={() => setSelectedGroup({ name, items: groupItems })}
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg bg-red-50 flex items-center justify-center overflow-hidden flex-shrink-0 text-red-200 relative border border-gray-100">
                    {displayItem.imageUrl ? (
                      <img src={displayItem.imageUrl} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      viewType === 'service' ? <Briefcase size={24} /> : <Package size={24} />
                    )}
                    {groupItems.length > 1 && (
                       <div className="absolute bottom-0 right-0 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-lg flex items-center">
                          <Layers size={10} className="mr-1" /> {groupItems.length}
                       </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg leading-tight font-heading">{name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                       <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 text-xs font-medium">{displayItem.category}</span>
                       <span className="text-xs text-gray-400">•</span>
                       <span className="text-xs text-gray-500 font-medium">{viewType === 'service' ? 'Serviço' : `Total: ${totalStock} un`}</span>
                    </div>
                  </div>
                  <div className="self-center">
                     <div className="p-2 bg-gray-50 rounded-full group-hover:bg-red-50 text-gray-400 group-hover:text-red-500 transition-colors">
                        <ChevronRight size={20} />
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            <AlertOctagon size={48} className="mb-2 opacity-20" />
            <p>Nenhum {viewType === 'product' ? 'produto' : 'serviço'} encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Variante (Lotes) */}
      {selectedGroup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-600 text-white">
              <div>
                <h3 className="font-bold text-lg font-heading">{selectedGroup.name}</h3>
                <p className="text-red-100 text-xs">Selecione o item a eliminar</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="hover:bg-red-700 p-1.5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-gray-50 max-h-[60vh] overflow-y-auto">
               <div className="space-y-3">
                 {selectedGroup.items.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
                             {item.type === 'service' ? <Briefcase size={20} /> : <Package size={20} />}
                          </div>
                          <div>
                             <div className="flex items-center space-x-2">
                                <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center">
                                   <Scale size={12} className="mr-1" />
                                   {item.size}{item.unit}
                                </span>
                             </div>
                             {item.type === 'product' && <p className="text-xs text-gray-500 mt-1">Stock atual: <span className="font-bold text-gray-800">{item.quantity}</span></p>}
                          </div>
                       </div>

                       <button
                         onClick={() => setItemToDelete(item)}
                         className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 rounded-lg font-medium text-sm flex items-center transition-all"
                       >
                         <Trash2 size={16} className="mr-2" />
                         Eliminar
                       </button>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Eliminação */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">Eliminar Item?</h3>
              <p className="text-sm text-gray-500 mb-1">
                Tem a certeza que deseja eliminar:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 my-4 inline-block w-full text-left">
                 <p className="font-bold text-gray-800">{itemToDelete.name}</p>
                 <p className="text-sm text-gray-600 mt-1">Tamanho: <span className="font-bold">{itemToDelete.size}{itemToDelete.unit}</span></p>
              </div>
              <p className="text-xs text-red-500 font-medium">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse gap-2">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                onClick={confirmDelete}
              >
                Sim, Eliminar
              </button>
              <button
                type="button"
                className="mt-2 sm:mt-0 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                onClick={() => setItemToDelete(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoveItems;
