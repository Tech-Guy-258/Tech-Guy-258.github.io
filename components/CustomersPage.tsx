
import React, { useState, useMemo } from 'react';
import { Customer, Business, SaleRecord, AuditLogEntry } from '../types';
import { Users, Plus, Trash2, Edit2, Search, Phone, Mail, MapPin, Award, Calendar, Check, X, User, Clock, ChevronRight, Receipt } from 'lucide-react';
import { generateID } from '../constants';

interface CustomersPageProps {
  business: Business;
  onUpdateBusiness: (updatedBusiness: Business) => void;
  currentOperator?: string;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ business, onUpdateBusiness, currentOperator = 'Sistema' }) => {
  const [customers, setCustomers] = useState<Customer[]>(business.customers || []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // HISTORY MODAL STATE
  const [viewingHistory, setViewingHistory] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent' | 'lastVisit'>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
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
    
    let updatedCustomers: Customer[];
    let log: AuditLogEntry;
    
    if (editingId) {
      updatedCustomers = customers.map(c => 
        c.id === editingId ? { ...c, ...formData } : c
      );
      log = createLog('UPDATE', `Editou cliente: ${formData.name}`);
    } else {
      const newCustomer: Customer = {
        ...formData,
        id: generateID(),
        loyaltyPoints: 0,
        totalSpent: 0,
        lastVisit: new Date().toISOString()
      };
      updatedCustomers = [...customers, newCustomer];
      log = createLog('CREATE', `Registo de cliente: ${formData.name}`);
    }

    setCustomers(updatedCustomers);
    onUpdateBusiness({ 
       ...business, 
       customers: updatedCustomers,
       auditLogs: [log, ...(business.auditLogs || [])]
    });
    
    // Reset
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '', phone: '', email: '', address: '', notes: ''
    });
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (window.confirm('Tem a certeza que deseja remover este cliente?')) {
      const updatedCustomers = customers.filter(c => c.id !== id);
      const log = createLog('DELETE', `Removeu cliente: ${customer?.name || 'Desconhecido'}`);
      
      setCustomers(updatedCustomers);
      onUpdateBusiness({ 
         ...business, 
         customers: updatedCustomers,
         auditLogs: [log, ...(business.auditLogs || [])]
      });
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  // Group sales for history
  const customerHistory = useMemo(() => {
     if (!viewingHistory) return [];
     
     const sales = business.sales.filter(s => s.customerId === viewingHistory.id);
     const groups = new Map<string, { id: string, date: string, items: SaleRecord[], total: number }>();

     sales.forEach(sale => {
        const tId = sale.transactionId;
        if (!groups.has(tId)) {
           groups.set(tId, { id: tId, date: sale.date, items: [], total: 0 });
        }
        const g = groups.get(tId)!;
        g.items.push(sale);
        g.total += sale.totalRevenue;
     });

     return Array.from(groups.values()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingHistory, business.sales]);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-heading">Clientes & Fidelização</h2>
            <p className="text-sm text-gray-500">Gerir a base de clientes para marketing e fidelização.</p>
          </div>
        </div>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
          >
            <Plus size={20} className="mr-2" />
            Novo Cliente
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-[slideIn_0.2s]">
          <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            {editingId ? 'Editar Cliente' : 'Registar Novo Cliente'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900" placeholder="Ex: Maria José" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
              <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900" placeholder="Ex: 84 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900" placeholder="Ex: maria@email.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço</label>
              <input name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900" placeholder="Bairro ou Zona de residência" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas / Preferências</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 bg-white text-gray-900" placeholder="Ex: Gosta de produtos orgânicos..." />
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center">
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
              placeholder="Pesquisar clientes por nome ou telefone..."
              className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 w-full bg-white text-gray-900 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map(customer => (
                <div key={customer.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-purple-200 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-2 rounded-full mr-3 text-gray-500">
                        <User size={20} />
                      </div>
                      <div>
                         <h3 className="font-bold text-gray-800 text-lg">{customer.name}</h3>
                         <div className="flex items-center text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full w-fit mt-1 border border-purple-100">
                            <Award size={12} className="mr-1" /> {customer.loyaltyPoints} Pontos
                         </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      Última visita: {new Date(customer.lastVisit).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4 pl-12">
                    <div className="flex items-center">
                      <Phone size={14} className="mr-2 text-gray-400" />
                      {customer.phone}
                    </div>
                    {customer.email && (
                      <div className="flex items-center">
                        <Mail size={14} className="mr-2 text-gray-400" />
                        {customer.email}
                      </div>
                    )}
                    {customer.notes && (
                      <p className="text-xs italic text-gray-500 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                        "{customer.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                    <button 
                       onClick={() => setViewingHistory(customer)}
                       className="flex items-center text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                       <Clock size={14} className="mr-1.5" /> Histórico
                    </button>
                    <div className="flex gap-2">
                       <button onClick={() => handleEdit(customer)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                         <Edit2 size={18} />
                       </button>
                       <button onClick={() => handleDelete(customer.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <Users size={48} className="mb-3 opacity-20" />
                <p>Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* CUSTOMER HISTORY MODAL */}
      {viewingHistory && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[85vh]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="bg-white/20 p-2 rounded-full">
                        <Clock size={20} />
                     </div>
                     <div>
                        <h3 className="font-bold text-lg font-heading">{viewingHistory.name}</h3>
                        <p className="text-purple-100 text-xs">Histórico de Compras</p>
                     </div>
                  </div>
                  <button onClick={() => setViewingHistory(null)} className="hover:bg-purple-700 p-1.5 rounded-full text-white/80 hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
                  {customerHistory.length > 0 ? (
                     <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                           <div>
                              <p className="text-xs text-gray-500 font-bold uppercase">Total Gasto</p>
                              <p className="text-xl font-bold text-gray-800">MT {viewingHistory.totalSpent.toFixed(2)}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs text-gray-500 font-bold uppercase">Compras</p>
                              <p className="text-xl font-bold text-gray-800">{customerHistory.length}</p>
                           </div>
                        </div>

                        <div className="relative pl-4 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                           {customerHistory.map(tx => (
                              <div key={tx.id} className="relative">
                                 <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-purple-400 border-2 border-white ring-1 ring-gray-100"></div>
                                 <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                                       <div>
                                          <p className="text-xs font-bold text-gray-400">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                          <p className="text-xs text-gray-300 font-mono">#{tx.id.slice(0,6)}</p>
                                       </div>
                                       <span className="text-sm font-bold text-emerald-600">MT {tx.total.toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-1">
                                       {tx.items.map((item, idx) => (
                                          <div key={idx} className="flex justify-between text-xs">
                                             <span className="text-gray-700 font-medium">{item.quantity}x {item.itemName}</span>
                                             <span className="text-gray-500">MT {item.totalRevenue.toFixed(2)}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                        <Receipt size={48} className="mb-3 opacity-20" />
                        <p>Nenhuma compra registada.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default CustomersPage;
