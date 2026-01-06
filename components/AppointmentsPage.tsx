
import React, { useState, useMemo } from 'react';
import { Appointment, Business, AuditLogEntry, AppointmentStatus, Unit } from '../types';
import { generateID } from '../constants';
import { Calendar as CalendarIcon, Phone, Check, X, Plus, Trash2, Search, Briefcase, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface AppointmentsPageProps {
  business: Business;
  onUpdateBusiness: (updatedBusiness: Business) => void;
  currentOperator?: string;
}

const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ business, onUpdateBusiness, currentOperator = 'Sistema' }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(business.appointments || []);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Form State
  const [formData, setFormData] = useState<{
    customerId: string;
    serviceId: string;
    date: string;
    time: string;
    notes: string;
  }>({
    customerId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: ''
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Derive services directly from business items (synchronized with inventory)
  const services = useMemo(() => {
    return business.items.filter(item => item.type === 'service');
  }, [business.items]);

  const customers = business.customers || [];
  
  const filteredCustomers = useMemo(() => {
     if (!customerSearch) return [];
     const lower = customerSearch.toLowerCase();
     return customers.filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower));
  }, [customers, customerSearch]);

  const appointmentsByDate = useMemo(() => {
    return appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    return {
      id: generateID(),
      action,
      details,
      operatorName: currentOperator,
      timestamp: new Date().toISOString()
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.serviceId) {
       alert("Selecione um cliente e um serviço.");
       return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    const service = services.find(s => s.id === formData.serviceId);

    if (!customer || !service) return;

    const newAppointment: Appointment = {
       id: generateID(),
       customerId: customer.id,
       customerName: customer.name,
       customerPhone: customer.phone,
       serviceId: service.id,
       serviceName: service.name,
       date: formData.date,
       time: formData.time,
       status: 'scheduled',
       notes: formData.notes,
       createdBy: currentOperator,
       createdAt: new Date().toISOString()
    };

    const updatedList = [...appointments, newAppointment];
    const log = createLog('APPOINTMENT', `Agendou ${service.name} para ${customer.name} em ${formData.date} às ${formData.time}`);

    setAppointments(updatedList);
    onUpdateBusiness({
       ...business,
       appointments: updatedList,
       auditLogs: [log, ...(business.auditLogs || [])]
    });

    setShowForm(false);
    setFormData({ ...formData, notes: '', customerId: '', serviceId: '' });
    setCustomerSearch('');
  };

  const updateStatus = (id: string, status: AppointmentStatus) => {
     const appointment = appointments.find(a => a.id === id);
     if (!appointment) return;

     const updatedList = appointments.map(a => a.id === id ? { ...a, status } : a);
     const log = createLog('APPOINTMENT', `Alterou estado de agendamento para ${status}: ${appointment.customerName}`);

     setAppointments(updatedList);
     onUpdateBusiness({
        ...business,
        appointments: updatedList,
        auditLogs: [log, ...(business.auditLogs || [])]
     });
  };

  const deleteAppointment = (id: string) => {
     if (!window.confirm("Cancelar e remover este agendamento?")) return;
     
     const updatedList = appointments.filter(a => a.id !== id);
     const log = createLog('APPOINTMENT', `Cancelou agendamento`);

     setAppointments(updatedList);
     onUpdateBusiness({
        ...business,
        appointments: updatedList,
        auditLogs: [log, ...(business.auditLogs || [])]
     });
  };

  const changeDate = (days: number) => {
     const date = new Date(selectedDate);
     date.setDate(date.getDate() + days);
     setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getStatusColor = (status: AppointmentStatus) => {
     switch(status) {
        case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200 decoration-slate-400';
        case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
        case 'noshow': return 'bg-orange-50 text-orange-700 border-orange-200';
        default: return 'bg-gray-50 text-gray-700';
     }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
     switch(status) {
        case 'scheduled': return 'Agendado';
        case 'confirmed': return 'Confirmado';
        case 'completed': return 'Concluído';
        case 'cancelled': return 'Cancelado';
        case 'noshow': return 'Não Compareceu';
        default: return status;
     }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-heading">Agendamentos</h2>
            <p className="text-sm text-gray-500">Gerir marcações de serviços do inventário.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
        >
          <Plus size={20} className="mr-2" />
          Novo Agendamento
        </button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
         <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
         <div className="text-center">
            <h3 className="font-bold text-lg text-gray-800">
               {new Date(selectedDate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
               {selectedDate === new Date().toISOString().split('T')[0] ? 'Hoje' : ''}
            </p>
         </div>
         <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={24} /></button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
         {appointmentsByDate.length > 0 ? (
            appointmentsByDate.map(app => (
               <div key={app.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${app.status === 'completed' ? 'opacity-60 border-gray-100' : 'border-gray-200 hover:border-purple-200'}`}>
                  <div className="flex items-start gap-4">
                     <div className="bg-purple-50 text-purple-700 font-bold px-3 py-2 rounded-xl text-center min-w-[70px] border border-purple-100">
                        <span className="block text-lg">{app.time}</span>
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-800 text-lg">{app.customerName}</h4>
                        <div className="flex items-center text-sm text-gray-500 mb-1">
                           <Briefcase size={14} className="mr-1.5" />
                           {app.serviceName}
                        </div>
                        {app.customerPhone && (
                           <div className="flex items-center text-xs text-gray-400">
                              <Phone size={12} className="mr-1.5" />
                              {app.customerPhone}
                           </div>
                        )}
                        {app.notes && <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 p-2 rounded border border-gray-100">"{app.notes}"</p>}
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                     <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                     </span>
                     
                     {app.status !== 'cancelled' && app.status !== 'completed' && (
                        <div className="flex gap-2">
                           <button onClick={() => updateStatus(app.id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Confirmar"><Check size={18} /></button>
                           <button onClick={() => updateStatus(app.id, 'completed')} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" title="Concluir"><Briefcase size={18} /></button>
                           <button onClick={() => updateStatus(app.id, 'cancelled')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Cancelar"><X size={18} /></button>
                        </div>
                     )}
                     {(app.status === 'cancelled' || app.status === 'completed') && (
                        <button onClick={() => deleteAppointment(app.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                     )}
                  </div>
               </div>
            ))
         ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
               <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
               <p className="font-medium">Sem agendamentos para este dia.</p>
            </div>
         )}
      </div>

      {/* New Appointment Modal */}
      {showForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white">
                  <div className="flex items-center">
                    <CalendarIcon size={20} className="mr-2" />
                    <h3 className="font-bold text-lg font-heading">Novo Agendamento</h3>
                  </div>
                  <button onClick={() => setShowForm(false)} className="hover:bg-purple-700 p-1.5 rounded-full transition-colors"><X size={20}/></button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-gray-50">
                  {/* Customer Selection */}
                  <div className="relative">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                     <div className="relative">
                        <input 
                           type="text"
                           placeholder="Procurar cliente..."
                           className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                           value={customerSearch}
                           onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setShowCustomerDropdown(true);
                              if (!e.target.value) setFormData({...formData, customerId: ''});
                           }}
                           onFocus={() => setShowCustomerDropdown(true)}
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     </div>
                     
                     {showCustomerDropdown && customerSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-40 overflow-y-auto z-10">
                           {filteredCustomers.length > 0 ? (
                              filteredCustomers.map(c => (
                                 <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                       setFormData({...formData, customerId: c.id});
                                       setCustomerSearch(c.name);
                                       setShowCustomerDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-purple-50 text-sm border-b border-gray-50 last:border-0"
                                 >
                                    <div className="font-bold text-gray-800">{c.name}</div>
                                    <div className="text-xs text-gray-500">{c.phone}</div>
                                 </button>
                              ))
                           ) : (
                              <div className="p-3 text-xs text-gray-400 text-center">Cliente não encontrado</div>
                           )}
                        </div>
                     )}
                  </div>

                  {/* Service Selection */}
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serviço (Do Inventário)</label>
                     <select 
                        required
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                        value={formData.serviceId}
                        onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
                     >
                        <option value="">Selecione o serviço...</option>
                        {services.map(s => (
                           <option key={s.id} value={s.id}>
                              {s.name} - {s.sellingPrice ? s.sellingPrice.toFixed(2) : '0.00'} MT
                           </option>
                        ))}
                     </select>
                     {services.length === 0 ? (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-lg flex items-start">
                          <Info size={14} className="text-orange-500 mr-2 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-orange-700">Não existem serviços no inventário. Adicione um item do tipo "Serviço" primeiro.</p>
                        </div>
                     ) : (
                        <p className="text-[10px] text-gray-400 mt-1">Lista sincronizada com os serviços registados no stock.</p>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                        <input 
                           type="date"
                           required
                           className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                           value={formData.date}
                           onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                        <input 
                           type="time"
                           required
                           className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                           value={formData.time}
                           onChange={(e) => setFormData({...formData, time: e.target.value})}
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas</label>
                     <textarea 
                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white h-20 text-gray-900"
                        placeholder="Detalhes opcionais..."
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                     />
                  </div>

                  <button 
                     type="submit" 
                     className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center"
                  >
                     <Check size={20} className="mr-2" />
                     Confirmar Agendamento
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
