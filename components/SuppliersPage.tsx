
import React, { useState, useMemo } from 'react';
import { Supplier, Business, AuditLogEntry, InventoryItem } from '../types';
import { Truck, Plus, Trash2, Edit2, Search, Phone, Mail, MapPin, FileText, Check, X, Package, Box } from 'lucide-react';
import { generateID } from '../constants';

interface SuppliersPageProps {
  business: Business;
  onUpdateBusiness: (updatedBusiness: Business) => void;
  currentOperator?: string;
}

const SuppliersPage: React.FC<SuppliersPageProps> = ({ business, onUpdateBusiness, currentOperator = 'Sistema' }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(business.suppliers || []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    nuit: '',
    address: '',
    notes: '',
    category: ''
  });

  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    return {
      id: generateID(),
      action,
      details,
      operatorName: currentOperator,
      timestamp: new Date().toISOString()
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedSuppliers: Supplier[];
    let log: AuditLogEntry;
    
    if (editingId) {
      updatedSuppliers = suppliers.map(s => 
        s.id === editingId ? { ...formData, id: editingId } : s
      );
      log = createLog('UPDATE', `Editou fornecedor: ${formData.name}`);
    } else {
      const newSupplier: Supplier = {
        ...formData,
        id: generateID()
      };
      updatedSuppliers = [...suppliers, newSupplier];
      log = createLog('CREATE', `Registo de fornecedor: ${formData.name}`);
    }

    setSuppliers(updatedSuppliers);
    onUpdateBusiness({ 
       ...business, 
       suppliers: updatedSuppliers,
       auditLogs: [log, ...(business.auditLogs || [])]
    });
    
    // Reset
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '', contactName: '', phone: '', email: '', nuit: '', address: '', notes: '', category: ''
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      nuit: supplier.nuit,
      address: supplier.address,
      notes: supplier.notes,
      category: supplier.category
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (window.confirm('Tem a certeza que deseja remover este fornecedor?')) {
      const updatedSuppliers = suppliers.filter(s => s.id !== id);
      const log = createLog('DELETE', `Removeu fornecedor: ${supplier?.name || 'Desconhecido'}`);
      
      setSuppliers(updatedSuppliers);
      onUpdateBusiness({ 
         ...business, 
         suppliers: updatedSuppliers,
         auditLogs: [log, ...(business.auditLogs || [])]
      });
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mapeamento de produtos por fornecedor
  const productsBySupplier = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {};
    business.items.forEach(item => {
        const supId = item.supplierId;
        if (supId) {
            if (!map[supId]) map[supId] = [];
            // Adicionar apenas se o nome for único (agrupar variantes)
            if (!map[supId].find(i => i.name === item.name)) {
                map[supId].push(item);
            }
        }
    });
    return map;
  }, [business.items]);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
            <Truck size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-heading">Fornecedores</h2>
            <p className="text-sm text-gray-500">Gerir a lista de parceiros e fornecedores.</p>
          </div>
        </div>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus size={20} className="mr-2" />
            Novo Fornecedor
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-[slideIn_0.2s]">
          <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            {editingId ? 'Editar Fornecedor' : 'Registar Novo Fornecedor'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Empresa</label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Ex: Distribuidora Central" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Contacto</label>
              <input name="contactName" value={formData.contactName} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Ex: Sr. João" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
              <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Ex: 84 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Ex: comercial@distribuidora.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NUIT</label>
              <input name="nuit" value={formData.nuit} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Número fiscal" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria de Produtos</label>
              <input name="category" value={formData.category} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Ex: Bebidas, Frescos" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço</label>
              <input name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" placeholder="Localização física" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 bg-white text-gray-900" placeholder="Detalhes adicionais..." />
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center">
                <Check size={20} className="mr-2" /> Guardar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar fornecedores..."
              className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white text-gray-900 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map(supplier => {
                const suppliedProducts = productsBySupplier[supplier.id] || [];
                return (
                  <div key={supplier.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-blue-200 transition-all group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-gray-900 text-xl font-heading tracking-tight">{supplier.name}</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">{supplier.contactName}</p>
                      </div>
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-widest">
                        {supplier.category || 'Geral'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-3 text-xs text-slate-600">
                        <div className="flex items-center font-bold">
                          <Phone size={14} className="mr-2 text-blue-500 shrink-0" />
                          {supplier.phone}
                        </div>
                        {supplier.email && (
                          <div className="flex items-center font-bold truncate">
                            <Mail size={14} className="mr-2 text-blue-500 shrink-0" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-center font-bold">
                            <MapPin size={14} className="mr-2 text-blue-500 shrink-0" />
                            {supplier.address}
                          </div>
                        )}
                      </div>
                      
                      {/* LISTA DE PRODUTOS FORNECIDOS */}
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                          <Box size={10} className="mr-1" /> Catálogo ({suppliedProducts.length})
                        </p>
                        <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                           {suppliedProducts.length > 0 ? suppliedProducts.map(p => (
                             <div key={p.id} className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                               <span className="text-[10px] font-bold text-slate-700 truncate">{p.name}</span>
                             </div>
                           )) : (
                             <p className="text-[9px] text-slate-300 font-bold uppercase">Nenhum produto associado</p>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-50 pt-4 mt-auto">
                      <button onClick={() => handleEdit(supplier)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(supplier.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-300 bg-white rounded-[3rem] border border-dashed border-gray-200">
                <Truck size={64} className="mb-4 opacity-10" />
                <p className="font-black uppercase text-xs tracking-widest">Nenhum fornecedor encontrado</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SuppliersPage;
