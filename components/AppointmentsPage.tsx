
import React, { useState, useMemo } from 'react';
import { Appointment, Business, AuditLogEntry, AppointmentStatus, Unit, PaymentMethod } from '../types';
import { generateID } from '../constants';
import { Calendar as CalendarIcon, Phone, Check, X, Plus, Trash2, Search, Briefcase, ChevronLeft, ChevronRight, Info, CreditCard, Smartphone, Wallet, Receipt, UserPlus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface AppointmentsPageProps {
  business: Business;
  onUpdateBusiness: (updatedBusiness: Business) => void;
  currentOperator?: string;
  onCompleteAppointment?: (id: string, method: PaymentMethod) => void;
  onAddCustomer?: (name: string, phone: string) => any;
}

const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ business, onUpdateBusiness, currentOperator = 'Sistema', onCompleteAppointment, onAddCustomer }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(business.appointments || []);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [apptToPay, setApptToPay] = useState<Appointment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmOverlap, setConfirmOverlap] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    customerId: string;
    serviceIds: string[];
    date: string;
    time: string;
    notes: string;
    isNewCustomer: boolean;
    newName: string;
    newPhone: string;
  }>({
    customerId: '',
    serviceIds: [],
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: '',
    isNewCustomer: false,
    newName: '',
    newPhone: ''
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

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

  // Busy and Free slots calculation
  const scheduleSlots = useMemo(() => {
     const slots = [];
     const startHour = 8;
     const endHour = 19;
     
     const dayAppts = appointments.filter(a => a.date === formData.date && a.status !== 'cancelled');

     for (let h = startHour; h < endHour; h++) {
        const time = `${h.toString().padStart(2, '0')}:00`;
        const time30 = `${h.toString().padStart(2, '0')}:30`;
        
        [time, time30].forEach(t => {
            const appt = dayAppts.find(a => a.time === t);
            slots.push({ time: t, isBusy: !!appt, customerName: appt?.customerName });
        });
     }
     return slots;
  }, [appointments, formData.date]);

  const isTimeOverlapping = useMemo(() => {
      return appointments.some(a => a.date === formData.date && a.time === formData.time && a.status !== 'cancelled');
  }, [appointments, formData.date, formData.time]);

  const createLog = (action: AuditLogEntry['action'], details: string): AuditLogEntry => {
    return { id: generateID(), action, details, operatorName: currentOperator, timestamp: new Date().toISOString() };
  };

  const toggleService = (id: string) => {
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) 
        ? prev.serviceIds.filter(sid => sid !== id)
        : [...prev.serviceIds, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.serviceIds.length === 0) { alert("Selecione pelo menos um serviço."); return; }
    
    // Safety check for overlap
    if (isTimeOverlapping && !confirmOverlap) {
        alert("O horário selecionado já está ocupado. Por favor confirme que deseja sobrepor.");
        return;
    }

    let targetCustomer: any = null;
    if (formData.isNewCustomer) {
       if (!formData.newName || !formData.newPhone) return;
       targetCustomer = onAddCustomer?.(formData.newName, formData.newPhone);
    } else {
       targetCustomer = customers.find(c => c.id === formData.customerId);
    }

    if (!targetCustomer) return;

    const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
    const totalAmount = selectedServices.reduce((acc, s) => acc + (s.sellingPrice || s.price), 0);

    const newAppointment: Appointment = {
       id: generateID(),
       customerId: targetCustomer.id, customerName: targetCustomer.name, customerPhone: targetCustomer.phone,
       serviceIds: formData.serviceIds, serviceNames: selectedServices.map(s => s.name),
       totalAmount, date: formData.date, time: formData.time, status: 'scheduled',
       notes: formData.notes, createdBy: currentOperator, createdAt: new Date().toISOString()
    };
    const updatedList = [...appointments, newAppointment];
    setAppointments(updatedList);
    onUpdateBusiness({ ...business, appointments: updatedList, auditLogs: [createLog('APPOINTMENT', `Agendou ${selectedServices.length} serviços para ${targetCustomer.name}${isTimeOverlapping ? ' (SOBREPOSIÇÃO)' : ''}`), ...(business.auditLogs || [])] });
    setShowForm(false);
    setConfirmOverlap(false);
    setFormData({ ...formData, notes: '', customerId: '', serviceIds: [], isNewCustomer: false, newName: '', newPhone: '' });
    setCustomerSearch('');
  };

  const initiateCompletion = (app: Appointment) => {
     setApptToPay(app);
     setShowPaymentModal(true);
  };

  const handleConfirmPayment = (method: PaymentMethod) => {
     if (apptToPay && onCompleteAppointment) {
        onCompleteAppointment(apptToPay.id, method);
        setShowPaymentModal(false);
        setApptToPay(null);
        setAppointments(prev => prev.map(a => a.id === apptToPay.id ? { ...a, status: 'completed' as AppointmentStatus } : a));
     }
  };

  const updateStatus = (id: string, status: AppointmentStatus) => {
     const appt = appointments.find(a => a.id === id);
     const updatedList = appointments.map(a => a.id === id ? { ...a, status } : a);
     setAppointments(updatedList);
     onUpdateBusiness({ ...business, appointments: updatedList, auditLogs: [createLog('APPOINTMENT', `Estado alterado para ${status}`), ...(business.auditLogs || [])] });

     if (status === 'confirmed' && appt && appt.customerPhone) {
        const msg = encodeURIComponent(`Olá ${appt.customerName}, o seu agendamento para o dia ${new Date(appt.date).toLocaleDateString()} às ${appt.time} foi confirmado! Serviços: ${appt.serviceNames.join(', ')}.`);
        window.open(`https://wa.me/258${appt.customerPhone.replace(/\s/g, '')}?text=${msg}`, '_blank');
     }
  };

  const getStatusColor = (status: AppointmentStatus) => {
     switch(status) {
        case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200';
        case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-50 text-gray-700';
     }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><CalendarIcon size={28} /></div>
          <div><h2 className="text-2xl font-bold text-gray-800 font-heading">Agendamentos</h2><p className="text-sm text-gray-500">Gestão operacional de serviços.</p></div>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 flex items-center"><Plus size={20} className="mr-2" /> Novo Agendamento</button>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={24} /></button>
         <h3 className="font-bold text-lg text-gray-800">{new Date(selectedDate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={24} /></button>
      </div>

      <div className="space-y-3">
         {appointmentsByDate.length > 0 ? appointmentsByDate.map(app => (
            <div key={app.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${app.status === 'completed' ? 'opacity-60 grayscale' : 'border-gray-200 hover:border-purple-200'}`}>
               <div className="flex items-start gap-4">
                  <div className="bg-purple-50 text-purple-700 font-bold px-3 py-2 rounded-xl text-center min-w-[70px] border border-purple-100"><span className="block text-lg">{app.time}</span></div>
                  <div>
                     <h4 className="font-bold text-gray-800 text-lg leading-none mb-1">{app.customerName}</h4>
                     <p className="text-sm text-gray-500 flex items-center mb-2"><Briefcase size={12} className="mr-1" /> {app.serviceNames?.join(', ')}</p>
                     <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(app.status)}`}>{app.status.toUpperCase()}</span>
                        <span className="text-[10px] font-black text-gray-400">MT {app.totalAmount?.toFixed(2)}</span>
                     </div>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  {app.status !== 'completed' && app.status !== 'cancelled' && (
                     <>
                        <button onClick={() => updateStatus(app.id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold" title="Confirmar e WhatsApp"><CheckCircle size={20}/><span className="hidden sm:inline">WhatsApp</span></button>
                        <button onClick={() => initiateCompletion(app)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-black transition-colors"><Receipt size={16} className="mr-2" /> Cobrar</button>
                     </>
                  )}
                  {app.status !== 'completed' && <button onClick={() => updateStatus(app.id, 'cancelled')} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={20}/></button>}
               </div>
            </div>
         )) : <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400"><CalendarIcon size={48} className="mx-auto mb-4 opacity-20" /><p>Sem agendamentos para este dia.</p></div>}
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && apptToPay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-6 bg-purple-600 text-white text-center">
                  <h3 className="font-bold text-lg font-heading tracking-tight">Registar Pagamento</h3>
                  <p className="text-purple-100 text-xs mt-1">{apptToPay.serviceNames?.join(', ')}</p>
                  <p className="text-xl font-black mt-2">MT {apptToPay.totalAmount?.toFixed(2)}</p>
               </div>
               <div className="p-4 grid grid-cols-2 gap-3 bg-gray-50">
                  <button onClick={() => handleConfirmPayment('cash')} className="flex flex-col items-center p-4 bg-white hover:bg-emerald-50 rounded-2xl border border-gray-100 shadow-sm transition-all"><Wallet size={20} className="text-gray-400 mb-2"/><span className="text-xs font-bold text-gray-700">Numerário</span></button>
                  <button onClick={() => handleConfirmPayment('mpesa')} className="flex flex-col items-center p-4 bg-white hover:bg-red-50 rounded-2xl border border-gray-100 shadow-sm transition-all"><Smartphone size={20} className="text-red-500 mb-2"/><span className="text-xs font-bold text-gray-700">M-Pesa</span></button>
                  <button onClick={() => handleConfirmPayment('emola')} className="flex flex-col items-center p-4 bg-white hover:bg-indigo-50 rounded-2xl border border-gray-100 shadow-sm transition-all"><Smartphone size={20} className="text-indigo-500 mb-2"/><span className="text-xs font-bold text-gray-700">E-Mola</span></button>
                  <button onClick={() => handleConfirmPayment('card')} className="flex flex-col items-center p-4 bg-white hover:bg-blue-50 rounded-2xl border border-gray-100 shadow-sm transition-all"><CreditCard size={20} className="text-blue-500 mb-2"/><span className="text-xs font-bold text-gray-700">POS</span></button>
               </div>
               <button onClick={() => setShowPaymentModal(false)} className="w-full py-4 text-gray-500 font-bold text-sm bg-white border-t hover:bg-gray-50">Cancelar</button>
            </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s] flex flex-col md:flex-row h-full md:h-auto max-h-[90vh]">
               {/* Left Side: Schedule Timeline */}
               <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-100 overflow-y-auto">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center"><Clock size={18} className="mr-2 text-purple-600"/> Horários no dia</h4>
                  <div className="space-y-2">
                     {scheduleSlots.map(slot => (
                        <button 
                           key={slot.time} 
                           type="button"
                           onClick={() => { setFormData({...formData, time: slot.time}); setConfirmOverlap(slot.isBusy); }}
                           className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${formData.time === slot.time ? 'bg-purple-600 border-purple-600 text-white shadow-md' : slot.isBusy ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'}`}
                        >
                           <span className="text-sm font-bold">{slot.time}</span>
                           {slot.isBusy ? <span className="text-[10px] font-black truncate max-w-[80px]">{slot.customerName}</span> : <span className="text-[10px] font-bold opacity-60">LIVRE</span>}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Right Side: Form */}
               <div className="flex-1 bg-white flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white">
                     <div className="flex items-center"><CalendarIcon size={20} className="mr-2" /><h3 className="font-bold text-lg font-heading">Novo Agendamento</h3></div>
                     <button onClick={() => { setShowForm(false); setConfirmOverlap(false); }} className="hover:bg-purple-700 p-1.5 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                     
                     {/* Overlap Warning */}
                     {isTimeOverlapping && (
                        <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 animate-[pulse_2s_infinite]">
                           <AlertTriangle className="text-red-600 shrink-0" size={24} />
                           <div className="flex-1">
                              <p className="text-xs font-bold text-red-700">Horário Ocupado!</p>
                              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                                 <input type="checkbox" checked={confirmOverlap} onChange={e => setConfirmOverlap(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300" />
                                 <span className="text-[10px] text-red-600 font-bold uppercase">Confirmar sobreposição</span>
                              </label>
                           </div>
                        </div>
                     )}

                     {/* Client Selector */}
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</span>
                           <button type="button" onClick={() => setFormData({...formData, isNewCustomer: !formData.isNewCustomer})} className="text-[10px] font-bold text-purple-600 flex items-center">
                              {formData.isNewCustomer ? "Selecionar Existente" : <><UserPlus size={12} className="mr-1"/> Registar Novo</>}
                           </button>
                        </div>

                        {formData.isNewCustomer ? (
                           <div className="grid grid-cols-2 gap-3 animate-[fadeIn_0.2s]">
                              <input placeholder="Nome" required className="p-3 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-purple-500" value={formData.newName} onChange={e => setFormData({...formData, newName: e.target.value})} />
                              <input placeholder="Telemóvel" required className="p-3 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-purple-500" value={formData.newPhone} onChange={e => setFormData({...formData, newPhone: e.target.value})} />
                           </div>
                        ) : (
                           <div className="relative">
                              <input type="text" placeholder="Procurar cliente..." className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-gray-900" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} />
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              {showCustomerDropdown && customerSearch && (
                                 <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-40 overflow-y-auto z-10">
                                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                       <button key={c.id} type="button" onClick={() => { setFormData({...formData, customerId: c.id}); setCustomerSearch(c.name); setShowCustomerDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-purple-50 text-sm border-b border-gray-50 last:border-0"><div className="font-bold text-gray-800">{c.name}</div><div className="text-xs text-gray-500">{c.phone}</div></button>
                                    )) : <div className="p-3 text-xs text-gray-400 text-center">Não encontrado</div>}
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                     {/* Services Selector */}
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Serviços</span>
                        <div className="grid grid-cols-2 gap-2">
                           {services.map(s => (
                              <button 
                                key={s.id} 
                                type="button" 
                                onClick={() => toggleService(s.id)}
                                className={`p-3 rounded-xl border text-left text-[11px] font-bold transition-all flex items-center justify-between ${formData.serviceIds.includes(s.id) ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-100 text-gray-500 hover:border-purple-200'}`}
                              >
                                 <span className="line-clamp-1">{s.name}</span>
                                 {formData.serviceIds.includes(s.id) && <Check size={14} />}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 px-1">Data</label><input type="date" required className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 px-1">Hora</label><input type="time" step="1800" required className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} /></div>
                     </div>

                     <button 
                        type="submit" 
                        disabled={isTimeOverlapping && !confirmOverlap}
                        className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center shadow-xl ${isTimeOverlapping && !confirmOverlap ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-100'}`}
                     >
                        <CheckCircle size={20} className="mr-2" /> Confirmar Agendamento
                     </button>
                  </form>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
