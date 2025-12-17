
import React, { useState } from 'react';
import { Supplier, Business, AuditLogEntry } from '../types';
import { Truck, Plus, Trash2, Edit2, Search, Phone, Mail, MapPin, FileText, Check, X } from 'lucide-react';
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{supplier.name}</h3>
                      <p className="text-sm text-gray-500 font-medium">{supplier.contactName}</p>
                    </div>
                    <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-wide">
                      {supplier.category || 'Geral'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Phone size={14} className="mr-2 text-gray-400" />
                      {supplier.phone}
                    </div>
                    {supplier.email && (
                      <div className="flex items-center">
                        <Mail size={14} className="mr-2 text-gray-400" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-2 text-gray-400" />
                        {supplier.address}
                      </div>
                    )}
                     {supplier.nuit && (
                      <div className="flex items-center">
                        <FileText size={14} className="mr-2 text-gray-400" />
                        NUIT: {supplier.nuit}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                    <button onClick={() => handleEdit(supplier)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(supplier.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <Truck size={48} className="mb-3 opacity-20" />
                <p>Nenhum fornecedor encontrado.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SuppliersPage;
