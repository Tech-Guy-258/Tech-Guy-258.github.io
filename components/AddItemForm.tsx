
import React, { useState, useEffect } from 'react';
import { InventoryItem, Category, Unit, CurrencyCode, Supplier } from '../types';
import { CURRENCY_SYMBOLS, CATEGORIES_PER_BUSINESS, generateID } from '../constants';
import { analyzeProductImage } from '../services/geminiService';
import { Camera, Save, X, Loader2, Plus, Trash2, Layers, Briefcase, Box, CheckCircle, XCircle, Truck, Scale, TrendingUp } from 'lucide-react';

interface AddItemFormProps {
  onSave: (items: InventoryItem[], originalName?: string) => void;
  onCancel: () => void;
  editingItem?: InventoryItem | null; 
  allItems?: InventoryItem[]; 
  suppliers?: Supplier[];
  currency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  activeBusinessCategory: string; 
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
  category: Category | string;
  expiryDate: string;
  imageUrl: string | null;
  type: 'product' | 'service';
  supplierId: string;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onSave, onCancel, editingItem, allItems = [], suppliers = [], currency, exchangeRates, activeBusinessCategory }) => {
  
  const isServiceBusiness = activeBusinessCategory.includes('Salão') || activeBusinessCategory.includes('Barbearia') || activeBusinessCategory.includes('Agência') || activeBusinessCategory.includes('Consultoria');
  const defaultType = isServiceBusiness ? 'service' : 'product';
  const defaultUnit = isServiceBusiness ? Unit.SESSION : Unit.KG;

  const availableCategories = CATEGORIES_PER_BUSINESS[activeBusinessCategory] || Object.values(Category);

  const [commonData, setCommonData] = useState<CommonData>({
    name: '',
    category: availableCategories[0],
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    imageUrl: null,
    type: defaultType,
    supplierId: ''
  });

  const [variants, setVariants] = useState<Variant[]>([
    { id: generateID(), size: 1, unit: defaultUnit, quantity: isServiceBusiness ? 9999 : 0, price: 0, sellingPrice: 0, lowStockThreshold: 5 }
  ]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [originalName, setOriginalName] = useState<string | undefined>(undefined);

  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = exchangeRates[currency];

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (editingItem) {
      setOriginalName(editingItem.name);
      const siblings = allItems.filter(i => i.name === editingItem.name);
      if (siblings.length > 0) {
        const first = siblings[0];
        setCommonData({
          name: first.name,
          category: first.category,
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
    // Fix: Type cast 'name' to keyof CommonData to eliminate the dynamic property error
    setCommonData(prev => ({ ...prev, [name as keyof CommonData]: value }));
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

  const removeVariant = (id: string) => {
    if (variants.length === 1) return alert("Deve haver pelo menos uma variante.");
    setVariants(prev => prev.filter(v => v.id !== id));
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
        if (isOnline) {
          const analysis = await analyzeProductImage(base64.split(',')[1]);
          if (analysis) {
            setCommonData(prev => ({
              ...prev,
              name: analysis.name || prev.name,
              category: (analysis.category as Category) || prev.category,
            }));
            setVariants(prev => {
              const newVariants = [...prev];
              if (newVariants.length > 0) {
                newVariants[0] = {
                  ...newVariants[0],
                  size: analysis.size || newVariants[0].size,
                  unit: (analysis.unit as Unit) || newVariants[0].unit,
                  price: analysis.price ? Number((analysis.price * rate).toFixed(2)) : newVariants[0].price,
                  sellingPrice: analysis.price ? Number((analysis.price * rate * 1.3).toFixed(2)) : newVariants[0].sellingPrice
                };
              }
              return newVariants;
            });
          }
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonData.name) return alert("Por favor preencha o Nome.");
    const selectedSupplier = suppliers.find(s => s.id === commonData.supplierId);
    const newItems: InventoryItem[] = variants.map(v => ({
      id: v.id.length < 10 ? generateID() : v.id, 
      name: String(commonData.name).trim(),
      category: commonData.category,
      quantity: commonData.type === 'service' ? (v.quantity > 0 ? 9999 : 0) : v.quantity, 
      size: v.size || 1,
      unit: v.unit,
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
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center font-heading"><Layers className="mr-2" />{editingItem ? 'Gerir Item' : 'Adicionar Item'}</h2>
          <button onClick={onCancel} className="hover:bg-emerald-700 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto mb-6">
             <button type="button" onClick={() => setCommonData({...commonData, type: 'product', category: availableCategories[0]})} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${commonData.type === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}><Box size={16} className="mr-2" /> Produto</button>
             <button type="button" onClick={() => setCommonData({...commonData, type: 'service', category: availableCategories[0]})} className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${commonData.type === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}><Briefcase size={16} className="mr-2" /> Serviço</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-1">
                     <div className={`relative w-full aspect-square bg-gray-50 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden group transition-colors cursor-pointer ${imagePreview ? 'border-emerald-500' : 'border-gray-300'}`}>
                        {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center text-gray-400"><Camera size={40} /><span className="text-xs mt-2 font-medium">Foto</span></div>}
                        {isAnalyzing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                     </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input type="text" name="name" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900" value={commonData.name} onChange={handleCommonChange} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                          <select name="category" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" value={commonData.category} onChange={handleCommonChange}>
                            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        {commonData.type === 'product' && (
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                             <input type="date" name="expiryDate" required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" value={commonData.expiryDate} onChange={handleCommonChange} />
                           </div>
                        )}
                     </div>
                     {commonData.type === 'product' && (
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Truck size={14} className="mr-1.5" /> Fornecedor</label>
                           <select name="supplierId" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" value={commonData.supplierId} onChange={handleCommonChange}>
                              <option value="">Sem fornecedor</option>
                              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                 <h3 className="text-sm font-bold text-gray-500 uppercase">Variantes / Opções</h3>
                 <button type="button" onClick={addVariant} className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><Plus size={16} className="mr-1" /> Adicionar</button>
               </div>
               <div className="space-y-3">
                  {variants.map((v) => (
                    <div key={v.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4 items-center">
                       <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                             <label className="text-[10px] text-gray-500 uppercase font-bold block">Tam/Dur</label>
                             <input type="number" step="0.01" className="w-full border rounded px-2 py-1.5 text-sm text-gray-900" value={v.size} onChange={(e) => handleVariantChange(v.id, 'size', Number(e.target.value))} />
                          </div>
                          <div>
                             <label className="text-[10px] text-gray-500 uppercase font-bold block">Unidade</label>
                             <select className="w-full border rounded px-2 py-1.5 text-sm text-gray-900" value={v.unit} onChange={(e) => handleVariantChange(v.id, 'unit', e.target.value)}>
                                {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                             </select>
                          </div>
                          {commonData.type === 'product' ? (
                             <>
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold block">Stock</label><input type="number" className="w-full border rounded px-2 py-1.5 text-sm text-gray-900" value={v.quantity} onChange={(e) => handleVariantChange(v.id, 'quantity', Number(e.target.value))} /></div>
                                <div><label className="text-[10px] text-red-500 uppercase font-bold block">Min</label><input type="number" className="w-full border border-red-100 rounded px-2 py-1.5 text-sm text-red-600" value={v.lowStockThreshold} onChange={(e) => handleVariantChange(v.id, 'lowStockThreshold', Number(e.target.value))} /></div>
                             </>
                          ) : (
                             <div className="col-span-2 flex items-center pt-4">
                                <button type="button" onClick={() => handleVariantChange(v.id, 'quantity', v.quantity > 0 ? 0 : 9999)} className={`flex items-center px-3 py-1.5 rounded-lg border transition-all text-sm font-bold w-full justify-center ${v.quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{v.quantity > 0 ? <CheckCircle size={16} className="mr-1"/> : <XCircle size={16} className="mr-1"/>}{v.quantity > 0 ? 'Disponível' : 'Indisponível'}</button>
                             </div>
                          )}
                       </div>
                       <div className="flex-1 w-full grid grid-cols-2 gap-2">
                          {commonData.type === 'product' && (
                             <div><label className="text-[10px] text-gray-500 uppercase font-bold block">Custo ({symbol})</label><input type="number" step="0.01" className="w-full border rounded px-2 py-1.5 text-sm text-gray-900" value={v.price} onChange={(e) => handleVariantChange(v.id, 'price', Number(e.target.value))} /></div>
                          )}
                          <div className={commonData.type === 'service' ? 'col-span-2' : ''}>
                             <label className="text-[10px] text-emerald-600 uppercase font-bold block">Venda ({symbol})</label>
                             <input type="number" step="0.01" className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 rounded px-2 py-1.5 text-sm font-bold" value={v.sellingPrice} onChange={(e) => handleVariantChange(v.id, 'sellingPrice', Number(e.target.value))} />
                          </div>
                       </div>
                       <button type="button" onClick={() => removeVariant(v.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                  ))}
               </div>
            </div>
          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button type="button" onClick={onCancel} className="w-full sm:w-auto px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-200 font-medium">Cancelar</button>
          <button onClick={handleSubmit} className="w-full sm:w-auto px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium flex items-center justify-center"><Save size={20} className="mr-2" /> Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default AddItemForm;
