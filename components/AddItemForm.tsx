
import React, { useState, useEffect } from 'react';
import { InventoryItem, Category, Unit, CurrencyCode, Supplier } from '../types';
import { CURRENCY_SYMBOLS, CATEGORIES_PER_BUSINESS, generateID } from '../constants';
import { analyzeProductImage } from '../services/geminiService';
import { Camera, Save, X, Loader2, Plus, Trash2, Layers, Briefcase, Box, CheckCircle, XCircle, Truck, PlusCircle } from 'lucide-react';

interface AddItemFormProps {
  onSave: (items: InventoryItem[], originalName?: string) => void;
  onCancel: () => void;
  editingItem?: InventoryItem | null; 
  allItems?: InventoryItem[]; 
  suppliers?: Supplier[];
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  activeBusinessCategory: string; 
  onQuickAddSupplier?: (s: Omit<Supplier, 'id'>) => Supplier;
}

interface Variant {
  id: string; 
  size: number;
  unit: Unit;
  quantity: number;
  price: number; 
  sellingPrice: number; 
  lowStockThreshold: number;
}

interface CommonData {
  name: string;
  category: string;
  expiryDate: string;
  imageUrl: string | null;
  type: 'product' | 'service';
  supplierId: string;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onSave, onCancel, editingItem, allItems = [], suppliers = [], currency, exchangeRates, activeBusinessCategory, onQuickAddSupplier }) => {
  
  const isServiceBusiness = activeBusinessCategory.includes('Salão') || activeBusinessCategory.includes('Barbearia') || activeBusinessCategory.includes('Agência') || activeBusinessCategory.includes('Consultoria');
  const defaultType = isServiceBusiness ? 'service' : 'product';
  const defaultUnit = isServiceBusiness ? Unit.SESSION : Unit.KG;

  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const bizCats = CATEGORIES_PER_BUSINESS[activeBusinessCategory] || Object.values(Category);
    return [...new Set([...bizCats.map(String), ...(allItems.map(i => String(i.category)))])];
  });

  const [commonData, setCommonData] = useState<CommonData>({
    name: '',
    category: categoriesList[0],
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    imageUrl: null,
    type: defaultType,
    supplierId: ''
  });

  const [variants, setVariants] = useState<Variant[]>([
    { id: generateID(), size: 1, unit: defaultUnit, quantity: isServiceBusiness ? 9999 : 0, price: 0, sellingPrice: 0, lowStockThreshold: 5 }
  ]);

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSup, setNewSup] = useState({ name: '', phone: '' });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalName, setOriginalName] = useState<string | undefined>(undefined);

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  useEffect(() => {
    if (editingItem) {
      setOriginalName(editingItem.name);
      const siblings = allItems.filter(i => i.name === editingItem.name);
      if (siblings.length > 0) {
        const first = siblings[0];
        setCommonData({
          name: first.name,
          category: String(first.category),
          expiryDate: first.expiryDate,
          imageUrl: first.imageUrl || null,
          type: first.type || 'product',
          supplierId: first.supplierId || ''
        });
        setImagePreview(first.imageUrl || null);
        const loadedVariants = siblings.map(item => ({
          id: item.id,
          size: item.size,
          unit: item.unit,
          quantity: item.quantity,
          price: Number((item.price * rate).toFixed(2)),
          sellingPrice: Number(((item.sellingPrice || 0) * rate).toFixed(2)),
          lowStockThreshold: item.lowStockThreshold
        }));
        setVariants(loadedVariants);
      }
    }
  }, [editingItem, allItems, rate]);

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCommonData(prev => ({ ...prev, [name as keyof CommonData]: value }));
  };

  const handleTypeChange = (type: 'product' | 'service') => {
    setCommonData({...commonData, type});
    setVariants(prev => prev.map(v => ({
      ...v, 
      unit: type === 'service' ? Unit.SESSION : Unit.KG,
      quantity: type === 'service' ? 9999 : (v.quantity === 9999 ? 0 : v.quantity)
    })));
  };

  const handleVariantChange = (id: string, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      { id: generateID(), size: 0, unit: commonData.type === 'service' ? Unit.SESSION : Unit.KG, quantity: commonData.type === 'service' ? 9999 : 0, price: 0, sellingPrice: 0, lowStockThreshold: 5 }
    ]);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSup.name || !newSup.phone || !onQuickAddSupplier) return;
    const created = onQuickAddSupplier({ 
      name: newSup.name, phone: newSup.phone, contactName: '', email: '', nuit: '', address: '', notes: '', category: 'Auto' 
    });
    setCommonData(p => ({ ...p, supplierId: created.id }));
    setShowAddSupplierModal(false);
    setNewSup({ name: '', phone: '' });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    setCategoriesList(prev => [...new Set([newCatName, ...prev])]);
    setCommonData(p => ({ ...p, category: newCatName }));
    setShowAddCategoryModal(false);
    setNewCatName('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsAnalyzing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setCommonData(prev => ({ ...prev, imageUrl: base64 }));
        const analysis = await analyzeProductImage(base64.split(',')[1]);
        if (analysis) {
          setCommonData(prev => ({
            ...prev,
            name: analysis.name || prev.name,
            category: String(analysis.category || prev.category),
          }));
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonData.name) return alert("Preencha o Nome.");
    const selectedSupplier = suppliers?.find(s => s.id === commonData.supplierId);
    const newItems: InventoryItem[] = variants.map(v => ({
      id: v.id.length < 10 ? generateID() : v.id, 
      name: String(commonData.name).trim(),
      category: commonData.category,
      quantity: commonData.type === 'service' ? (v.quantity > 0 ? 9999 : 0) : v.quantity, 
      size: v.size || 1,
      unit: commonData.type === 'service' ? Unit.SESSION : v.unit,
      price: commonData.type === 'service' ? 0 : v.price / rate,
      sellingPrice: v.sellingPrice / rate,
      expiryDate: commonData.expiryDate,
      lowStockThreshold: commonData.type === 'service' ? 0 : v.lowStockThreshold,
      addedDate: new Date().toISOString().split('T')[0],
      imageUrl: imagePreview || undefined,
      type: commonData.type,
      supplierId: selectedSupplier?.id,
      supplierName: selectedSupplier?.name
    }));
    onSave(newItems, originalName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 text-gray-900 overflow-y-auto">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-4xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.2s]">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center font-heading"><Layers className="mr-2" />{editingItem ? 'Gerir Lote' : 'Registo de Stock'}</h2>
          <button onClick={onCancel} className="hover:bg-emerald-700 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/50">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto mb-8 shadow-inner">
             <button type="button" onClick={() => handleTypeChange('product')} className={`flex items-center px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${commonData.type === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}><Box size={18} className="mr-2" /> Produto</button>
             <button type="button" onClick={() => handleTypeChange('service')} className={`flex items-center px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${commonData.type === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}><Briefcase size={18} className="mr-2" /> Serviço</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="col-span-1">
                     <div className={`relative w-full aspect-square bg-gray-50 rounded-3xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${imagePreview ? 'border-emerald-500' : 'border-gray-200'}`}>
                        {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <div className="text-center text-gray-300"><Camera size={48} className="mx-auto mb-2" /><span className="text-[10px] font-black uppercase tracking-widest">Carregar Foto</span></div>}
                        {isAnalyzing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                     </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-5">
                     <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Designação do Item</label><input type="text" name="name" required className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-gray-900 font-bold shadow-inner" value={commonData.name} onChange={handleCommonChange} placeholder="Ex: Arroz Tio Lucas" /></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex justify-between">Categoria <button type="button" onClick={() => setShowAddCategoryModal(true)} className="text-emerald-600 hover:text-emerald-800"><Plus size={14}/></button></label>
                          <select name="category" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner text-gray-900 appearance-none" value={commonData.category} onChange={handleCommonChange}>
                            {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        {commonData.type === 'product' && (
                           <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Data de Validade</label><input type="date" name="expiryDate" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner text-gray-900" value={commonData.expiryDate} onChange={handleCommonChange} /></div>
                        )}
                     </div>
                     {commonData.type === 'product' && (
                        <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex justify-between">Fornecedor Associado <button type="button" onClick={() => setShowAddSupplierModal(true)} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1"><PlusCircle size={14}/> Novo</button></label>
                           <select name="supplierId" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold shadow-inner text-gray-900 appearance-none" value={commonData.supplierId} onChange={handleCommonChange}>
                              <option value="">Sem fornecedor selecionado</option>
                              {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                           </select>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Configuração de Lotes / Variantes</h3>
                 <button type="button" onClick={addVariant} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100"><Plus size={16} className="mr-1" /> Novo Lote</button>
               </div>
               <div className="space-y-4">
                  {variants.map((v) => (
                    <div key={v.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col lg:flex-row gap-6 items-center group">
                       <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div><label className="text-[10px] text-gray-400 uppercase font-black tracking-tighter block mb-1">Medida</label><input type="number" step="0.01" className="w-full p-3 bg-white border-none rounded-xl text-sm font-bold shadow-sm" value={v.size} onChange={(e) => handleVariantChange(v.id, 'size', Number(e.target.value))} /></div>
                          <div>
                             <label className="text-[10px] text-gray-400 uppercase font-black tracking-tighter block mb-1">Unidade</label>
                             <select disabled={commonData.type === 'service'} className="w-full p-3 bg-white border-none rounded-xl text-sm font-bold shadow-sm disabled:opacity-60" value={v.unit} onChange={(e) => handleVariantChange(v.id, 'unit', e.target.value)}>
                                {commonData.type === 'service' ? <option value={Unit.SESSION}>Sessão</option> : Object.values(Unit).filter(u => u !== Unit.HOUR && u !== Unit.SESSION).map(u => <option key={u} value={u}>{u}</option>)}
                             </select>
                          </div>
                          {commonData.type === 'product' ? (
                             <>
                                <div><label className="text-[10px] text-gray-400 uppercase font-black tracking-tighter block mb-1">Qtd Atual</label><input type="number" className="w-full p-3 bg-white border-none rounded-xl text-sm font-bold shadow-sm" value={v.quantity} onChange={(e) => handleVariantChange(v.id, 'quantity', Number(e.target.value))} /></div>
                                <div><label className="text-[10px] text-red-400 uppercase font-black tracking-tighter block mb-1">Aviso Mín</label><input type="number" className="w-full p-3 bg-white border-red-100 text-red-600 rounded-xl text-sm font-bold shadow-sm" value={v.lowStockThreshold} onChange={(e) => handleVariantChange(v.id, 'lowStockThreshold', Number(e.target.value))} /></div>
                             </>
                          ) : (
                             <div className="col-span-2 flex items-end">
                                <button type="button" onClick={() => handleVariantChange(v.id, 'quantity', v.quantity > 0 ? 0 : 9999)} className={`flex items-center h-[44px] rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest w-full justify-center ${v.quantity > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{v.quantity > 0 ? <CheckCircle size={16} className="mr-2"/> : <XCircle size={16} className="mr-2"/>}{v.quantity > 0 ? 'Serviço Disponível' : 'Indisponível'}</button>
                             </div>
                          )}
                       </div>
                       <div className="w-full lg:flex-1 grid grid-cols-2 gap-3">
                          {commonData.type === 'product' && (
                             <div><label className="text-[10px] text-gray-400 uppercase font-black tracking-tighter block mb-1">Preço Custo ({symbol})</label><input type="number" step="0.01" className="w-full p-3 bg-white border-none rounded-xl text-sm font-bold shadow-sm" value={v.price} onChange={(e) => handleVariantChange(v.id, 'price', Number(e.target.value))} /></div>
                          )}
                          <div className={commonData.type === 'service' ? 'col-span-2' : ''}>
                             <label className="text-[10px] text-emerald-600 uppercase font-black tracking-tighter block mb-1">Preço Venda ({symbol})</label>
                             <input type="number" step="0.01" className="w-full p-3 bg-emerald-50 border-none text-emerald-800 rounded-xl text-sm font-black shadow-sm" value={v.sellingPrice} onChange={(e) => handleVariantChange(v.id, 'sellingPrice', Number(e.target.value))} />
                          </div>
                       </div>
                       <button type="button" onClick={() => variants.length > 1 && setVariants(prev => prev.filter(item => item.id !== v.id))} className="p-3 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-4 shrink-0">
          <button type="button" onClick={onCancel} className="w-full sm:w-auto px-10 py-4 rounded-2xl text-gray-500 bg-white font-bold uppercase text-[10px] tracking-widest border border-gray-100 shadow-sm">Descartar</button>
          <button onClick={handleSubmit} className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center"><Save size={18} className="mr-2" /> Confirmar e Guardar</button>
        </div>
      </div>

      {/* Mini-Modal Adicionar Fornecedor */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
             <h3 className="text-lg font-black mb-4">Novo Fornecedor</h3>
             <form onSubmit={handleAddSupplier} className="space-y-4">
                <input required placeholder="Nome do Fornecedor" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={newSup.name} onChange={e => setNewSup({...newSup, name: e.target.value})} />
                <input required placeholder="Telefone" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={newSup.phone} onChange={e => setNewSup({...newSup, phone: e.target.value})} />
                <div className="flex gap-2 pt-2">
                   <button type="button" onClick={() => setShowAddSupplierModal(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                   <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl">Guardar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Mini-Modal Adicionar Categoria */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
             <h3 className="text-lg font-black mb-4">Nova Categoria</h3>
             <form onSubmit={handleAddCategory} className="space-y-4">
                <input required placeholder="Nome da Categoria" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                <div className="flex gap-2 pt-2">
                   <button type="button" onClick={() => setShowAddCategoryModal(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                   <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl">Adicionar</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItemForm;
