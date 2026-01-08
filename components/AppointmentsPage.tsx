import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, Business, AuditLogEntry, AppointmentStatus, Unit, PaymentMethod } from '../types';
import { generateID, CURRENCY_SYMBOLS } from '../constants';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Check, X, Plus, Trash2, Search, Briefcase, ChevronLeft, ChevronRight, Receipt, User, CheckCircle, Clock, AlertTriangle, Smartphone, Wallet, CalendarDays } from 'lucide-react';

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
  const [paymentToConfirm, setPaymentToConfirm] = useState<{ id: string, method: PaymentMethod } | null>(null);
  const [confirmOverlap, setConfirmOverlap] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    customerId: string;
    serviceIds: string[];
    date: string;
    time: string;
    duration: number; 
    notes: string;
    isNewCustomer: boolean;
    newName: string;
    newPhone: string;
    isRescheduling?: boolean;
    rescheduleId?: string; 
  }>({
    customerId: '',
    serviceIds: [],
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    notes: '',
    isNewCustomer: false,
    newName: '',
    newPhone: ''
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [activeStep, setActiveStep] = useState<'details' | 'time'>('details');

  const location = useLocation();

  useEffect(() => {
    if (location.state?.reschedule) {
      const appt = location.state.reschedule as Appointment;
      setFormData({
          customerId: appt.customerId,
          serviceIds: appt.serviceIds,
          date: new Date().toISOString().split('T')[0], 
          time: '09:00', 
          duration: appt.notes?.includes('dur:') ? parseInt(appt.notes.split('dur:')[1]) : 60,
          notes: appt.notes || '',
          isNewCustomer: false,
          newName: '',
          newPhone: '',
          isRescheduling: true,
          rescheduleId: appt.id
      });
      setCustomerSearch(appt.customerName);
      setShowForm(true);
      setActiveStep('details');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
    return appointments
      .filter(a => a.date === selectedDate && a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const scheduleSlots = useMemo(() => {
     const slots = [];
     const startHour = 8;
     const endHour = 19;
     const dayAppts = appointments.filter(a => a.date === formData.date && a.status !== 'cancelled' && a.status !== 'completed');

     for (let h = startHour; h < endHour; h++) {
        const t00 = `${h.toString().padStart(2, '0')}:00`;
        const t30 = `${h.toString().padStart(2, '0')}:30`;
        [t00, t30].forEach(t => {
            const appt = dayAppts.find(a => a.time === t);
            slots.push({ time: t, isBusy: !!appt, customerName: appt?.customerName });
        });
     }
     return slots;
  }, [appointments, formData.date]);

  const isTimeOverlapping = useMemo(() => {
      const newStart = formData.time;
      const [h, m] = newStart.split(':').map(Number);
      const newEndMinutes = h * 60 + m + formData.duration;

      return appointments.some(a => {
          if (a.id === formData.rescheduleId) return false; 
          if (a.date !== formData.date || a.status === 'cancelled' || a.status === 'completed') return false;
          const [ah, am] = a.time.split(':').map(Number);
          const aStartMinutes = ah * 60 + am;
          const aEndMinutes = aStartMinutes + (a.notes?.includes('dur:') ? parseInt(a.notes.split('dur:')[1]) : 60);
          const newStartMinutes = h * 60 + m;
          return (newStartMinutes < aEndMinutes && newEndMinutes > aStartMinutes);
      });
  }, [appointments, formData.date, formData.time, formData.duration, formData.rescheduleId]);

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
    if (isTimeOverlapping && !confirmOverlap) return;

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
       notes: `${formData.notes} | dur:${formData.duration}`, createdBy: currentOperator, createdAt: new Date().toISOString()
    };
    
    let updatedList = [...appointments, newAppointment];
    
    if (formData.isRescheduling && formData.rescheduleId) {
      updatedList = updatedList.map(a => a.id === formData.rescheduleId ? { ...a, status: 'cancelled' as AppointmentStatus } : a);
    }

    setAppointments(updatedList);
    onUpdateBusiness({ 
      ...business, 
      appointments: updatedList, 
      auditLogs: [
        createLog('APPOINTMENT', `${formData.isRescheduling ? 'Remarcou' : 'Agendou'} para ${targetCustomer.name}`), 
        ...(business.auditLogs || [])
      ] 
    });
    
    setShowForm(false);
    setConfirmOverlap(false);
    setFormData({ ...formData, notes: '', customerId: '', serviceIds: [], isNewCustomer: false, newName: '', newPhone: '', isRescheduling: false, rescheduleId: undefined });
    setCustomerSearch('');
    setActiveStep('details');
  };

  const initiateCompletion = (app: Appointment) => {
     setApptToPay(app);
     setShowPaymentModal(true);
  };

  const handleFinalConfirmPayment = () => {
     if (paymentToConfirm && onCompleteAppointment) {
        onCompleteAppointment(paymentToConfirm.id, paymentToConfirm.method);
        setPaymentToConfirm(null);
        setApptToPay(null);
        setAppointments(prev => prev.map(a => a.id === paymentToConfirm.id ? { ...a, status: 'completed' as AppointmentStatus } : a));
     }
  };

  const updateStatus = (id: string, status: AppointmentStatus) => {
     if(status === 'cancelled' && !window.confirm('Tem a certeza que deseja cancelar este agendamento?')) return;

     const appt = appointments.find(a => a.id === id);
     const updatedList = appointments.map(a => a.id === id ? { ...a, status } : a);
     setAppointments(updatedList);
     onUpdateBusiness({ ...business, appointments: updatedList, auditLogs: [createLog('APPOINTMENT', `Estado alterado para ${status}`), ...(business.auditLogs || [])] });

     if (status === 'confirmed' && appt && appt.customerPhone) {
        const msg = encodeURIComponent(`Olá ${appt.customerName}, o seu agendamento para o dia ${new Date(appt.date).toLocaleDateString()} às ${appt.time} foi confirmado! Operador: ${currentOperator}.`);
        window.open(`https://wa.me/258${appt.customerPhone.replace(/\D/g, '')}?text=${msg}`, '_blank');
     }
  };

  const handleRemarcarInternal = (appt: Appointment) => {
      setFormData({
          customerId: appt.customerId,
          serviceIds: appt.serviceIds,
          date: new Date().toISOString().split('T')[0], 
          time: '09:00', 
          duration: appt.notes?.includes('dur:') ? parseInt(appt.notes.split('dur:')[1]) : 60,
          notes: appt.notes || '',
          isNewCustomer: false,
          newName: '',
          newPhone: '',
          isRescheduling: true,
          rescheduleId: appt.id
      });
      setCustomerSearch(appt.customerName);
      setShowForm(true);
      setActiveStep('details');
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 text-gray-900 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><CalendarIcon size={28} /></div>
          <div><h2 className="text-2xl font-bold text-gray-800 font-heading">Agendamentos</h2><p className="text-sm text-gray-500">Operações e marcações.</p></div>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center hover:bg-purple-700 active:scale-95 transition-all w-full md:w-auto justify-center"><Plus size={20} className="mr-2" /> Novo Agendamento</button>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6">
         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-gray-100 rounded-full"><ChevronLeft size={24} /></button>
         <h3 className="font-black text-sm uppercase tracking-widest text-gray-800">{new Date(selectedDate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-gray-100 rounded-full"><ChevronRight size={24} /></button>
      </div>

      <div className="space-y-3">
         {appointmentsByDate.length > 0 ? appointmentsByDate.map(app => (
            <div key={app.id} className="bg-white p-5 rounded-[2rem] border border-gray-200 hover:border-purple-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
               <div className="flex items-start gap-4">
                  <div className="bg-purple-50 text-purple-700 font-black p-3 rounded-2xl text-center min-w-[80px] border border-purple-100 shadow-inner"><span className="block text-xl">{app.time}</span></div>
                  <div className="min-w-0">
                     <h4 className="font-black text-slate-900 text-lg truncate leading-tight">{app.customerName}</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center mb-3"><Briefcase size={12} className="mr-1" /> {app.serviceNames?.join(', ')}</p>
                     <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${app.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{app.status === 'scheduled' ? 'Agendado' : 'Confirmado'}</span>
                        <span className="text-[10px] font-black text-slate-400">MT {app.totalAmount?.toFixed(2)}</span>
                     </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 xs:grid-cols-3 md:flex md:items-center gap-2 border-t md:border-0 pt-4 md:pt-0">
                  <button onClick={() => updateStatus(app.id, 'confirmed')} className="w-full md:w-auto py-3 px-4 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-emerald-100">
                    <CheckCircle size={18} className="hidden xs:block" /> Confirmar
                  </button>
                  <button onClick={() => handleRemarcarInternal(app)} className="w-full md:w-auto py-3 px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200">
                    <CalendarDays size={18} className="hidden xs:block" /> Remarcar
                  </button>
                  <button onClick={() => initiateCompletion(app)} className="w-full md:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-black active:scale-95 transition-all shadow-md">
                    <Receipt size={18} className="mr-2 hidden xs:block" /> Cobrar
                  </button>
                  <button onClick={() => { if(window.confirm('Eliminar registo?')) updateStatus(app.id, 'cancelled'); }} className="hidden md:flex p-3 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={20}/>
                  </button>
               </div>
            </div>
         )) : <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200 text-gray-300"><CalendarIcon size={64} className="mx-auto mb-4 opacity-10" /><p className="font-black uppercase text-xs tracking-[0.2em]">Sem agendamentos ativos</p></div>}
      </div>

      {/* MODAL FORMULÁRIO */}
      {showForm && (
         <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-4xl h-[92vh] md:h-auto md:max-h-[90vh] rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-[slideIn_0.3s_ease-out] flex flex-col">
               
               <div className="p-6 md:p-8 bg-purple-600 text-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black text-xl md:text-2xl font-heading tracking-tight">{formData.isRescheduling ? 'Remarcar Serviço' : 'Agendar Serviço'}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200 mt-1">{formData.isRescheduling ? 'Altere a data, hora ou adicione novos serviços' : 'Operação Assistida'}</p>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-3 bg-white/20 rounded-full hover:bg-white/40 transition-all"><X size={24}/></button>
               </div>

               <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2 shrink-0 md:hidden">
                  <button onClick={() => setActiveStep('details')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeStep === 'details' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>1. Detalhes</button>
                  <button onClick={() => setActiveStep('time')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeStep === 'time' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>2. Horário</button>
               </div>
               
               <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  <div className={`w-full md:w-80 bg-gray-50 p-6 border-r border-gray-100 overflow-y-auto custom-scrollbar ${activeStep === 'time' ? 'flex flex-col' : 'hidden md:flex flex-col'}`}>
                     <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center"><Clock size={14} className="mr-2" /> Disponibilidade no dia</h4>
                     <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                        {scheduleSlots.map(slot => (
                           <button key={slot.time} type="button" onClick={() => { setFormData({...formData, time: slot.time}); setConfirmOverlap(slot.isBusy); }} className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-center ${formData.time === slot.time ? 'bg-purple-600 border-purple-600 text-white shadow-lg scale-[1.02] z-10' : slot.isBusy ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-slate-100 text-slate-500 hover:border-purple-300'}`}>
                              <span className="font-black text-sm">{slot.time}</span>
                              {slot.isBusy && <span className="text-[8px] font-black uppercase">Ocupado</span>}
                           </button>
                        ))}
                     </div>
                     <div className="mt-8 space-y-4 md:hidden">
                        <button onClick={handleSubmit} className="w-full py-5 bg-purple-600 text-white font-black rounded-3xl shadow-xl uppercase text-xs tracking-widest">Confirmar Remarcação</button>
                        <button onClick={() => setActiveStep('details')} className="w-full py-4 text-slate-400 font-bold text-xs uppercase">Voltar para Detalhes</button>
                     </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); if(activeStep === 'details') setActiveStep('time'); else handleSubmit(e); }} className={`flex-1 bg-white p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar ${activeStep === 'details' ? 'block' : 'hidden md:block'}`}>
                     <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</span>
                           {!formData.isRescheduling && (
                              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: !formData.isNewCustomer})} className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border shadow-sm">
                                 {formData.isNewCustomer ? "Listar Existentes" : "+ Novo Cliente"}
                              </button>
                           )}
                        </div>

                        {formData.isNewCustomer ? (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input placeholder="Nome" required className="p-4 bg-white border-none rounded-2xl text-sm font-bold shadow-sm" value={formData.newName} onChange={e => setFormData({...formData, newName: e.target.value})} />
                              <input placeholder="Telemóvel" required type="tel" className="p-4 bg-white border-none rounded-2xl text-sm font-bold shadow-sm" value={formData.newPhone} onChange={e => setFormData({...formData, newPhone: e.target.value})} />
                           </div>
                        ) : (
                           <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></div>
                              <input 
                                type="text" 
                                placeholder="Procurar por nome ou telefone..." 
                                disabled={formData.isRescheduling}
                                className="w-full p-4 pl-12 bg-white border-none rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-70" 
                                value={customerSearch} 
                                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} 
                                onFocus={() => setShowCustomerDropdown(true)} 
                              />
                              {showCustomerDropdown && customerSearch && !formData.isRescheduling && (
                                 <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-48 overflow-y-auto z-[60] p-2">
                                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                       <button key={c.id} type="button" onClick={() => { setFormData({...formData, customerId: c.id}); setCustomerSearch(c.name); setShowCustomerDropdown(false); }} className="w-full text-left p-4 hover:bg-purple-50 rounded-xl transition-all border-b last:border-0"><div className="font-black text-slate-800 text-sm">{c.name}</div><div className="text-[10px] text-slate-400 font-bold">{c.phone}</div></button>
                                    )) : <div className="p-6 text-xs text-slate-400 text-center font-bold uppercase">Não encontrado</div>}
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                     <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Escolha os Serviços (Pode adicionar mais)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {services.map(s => (
                              <button key={s.id} type="button" onClick={() => toggleService(s.id)} className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${formData.serviceIds.includes(s.id) ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-purple-200'}`}>
                                 <span className="font-bold text-xs">{s.name}</span>
                                 {formData.serviceIds.includes(s.id) ? <CheckCircle size={16} /> : <span className="text-[10px] font-black opacity-50">{s.sellingPrice}MT</span>}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Data</label>
                           <input type="date" required className="w-full p-4 bg-slate-100 border-none rounded-2xl font-bold text-xs" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Duração Est.</label>
                           <select className="w-full p-4 bg-slate-100 border-none rounded-2xl font-bold text-xs appearance-none" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}>
                              <option value={30}>30 min</option>
                              <option value={60}>1 hora</option>
                              <option value={90}>1h 30m</option>
                              <option value={120}>2 horas</option>
                           </select>
                        </div>
                        <div className="hidden md:block">
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Notas</label>
                           <input placeholder="..." className="w-full p-4 bg-slate-100 border-none rounded-2xl font-bold text-xs" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                        </div>
                     </div>

                     <div className="pt-4">
                        <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase text-xs tracking-[0.2em] hover:bg-black active:scale-95 transition-all">
                           {activeStep === 'details' ? "Próximo Passo: Horário" : (formData.isRescheduling ? "Confirmar Alterações" : "Concluir Agendamento")}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}

      {/* Modal Pagamento Agendamento */}
      {showPaymentModal && apptToPay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-[scaleIn_0.2s]">
               <div className="p-8 bg-purple-600 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Receipt size={32} /></div>
                  <h3 className="font-black text-xl font-heading">Cobrar Serviço</h3>
                  <p className="text-purple-100 text-sm mt-1">{apptToPay.customerName}</p>
                  <p className="text-3xl font-black mt-4">MT {apptToPay.totalAmount?.toFixed(0)}</p>
               </div>
               <div className="p-8 grid grid-cols-2 gap-4 bg-gray-50">
                  {['cash', 'mpesa', 'emola', 'card'].map(m => (
                    <button key={m} onClick={() => setPaymentToConfirm({ id: apptToPay.id, method: m as PaymentMethod })} className="flex flex-col items-center justify-center p-6 bg-white hover:bg-emerald-600 hover:text-white rounded-[2rem] border border-slate-100 shadow-sm transition-all group active:scale-90">
                       {m === 'cash' ? <Wallet size={24} className="group-hover:text-white text-slate-300 mb-2"/> : <Smartphone size={24} className="group-hover:text-white text-slate-300 mb-2"/>}
                       <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowPaymentModal(false)} className="w-full py-5 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] bg-white border-t">Desistir</button>
            </div>
        </div>
      )}

      {/* Modal Confirmação Final de Pagamento (Padronizado) */}
      {paymentToConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
           <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl p-8 text-center animate-[scaleIn_0.2s]">
              <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
              <h3 className="text-lg font-black text-slate-800">Confirmar Transação?</h3>
              <p className="text-xs text-slate-500 mt-2">Deseja finalizar o recebimento de <span className="font-black text-slate-900">MT {(apptToPay?.totalAmount || 0).toFixed(0)}</span> via <span className="font-black uppercase text-emerald-600">{paymentToConfirm.method}</span>?</p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={() => setPaymentToConfirm(null)} className="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[10px] uppercase">Voltar</button>
                 <button onClick={handleFinalConfirmPayment} className="py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-200">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;