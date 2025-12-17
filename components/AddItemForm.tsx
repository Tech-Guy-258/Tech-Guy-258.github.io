
import React, { useState, useEffect } from 'react';
import { InventoryItem, Category, Unit, CurrencyCode, Supplier } from '../types';
import { CURRENCY_SYMBOLS, CATEGORIES_PER_BUSINESS, generateID } from '../constants';
import { analyzeProductImage } from '../services/geminiService';
import { Camera, Save, X, Loader2, Upload, TrendingUp, Scale, WifiOff, Plus, Trash2, Layers, Briefcase, Box, CheckCircle, XCircle, Truck } from 'lucide-react';

interface AddItemFormProps {
  onSave: (items: InventoryItem[], originalName?: string) => void;
  onCancel: () => void;
  editingItem?: InventoryItem | null; 
  allItems?: InventoryItem[]; 
  suppliers?: Supplier[]; // Novo prop
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

const AddItemForm: React.FC<AddItemFormProps> = ({ onSave, onCancel, editingItem, allItems = [], suppliers = [], currency, exchangeRates, activeBusinessCategory }) => {
  
  const isServiceBusiness = activeBusinessCategory.includes('Salão') || activeBusinessCategory.includes('Barbearia') || activeBusinessCategory.includes('Agência') || activeBusinessCategory.includes('Consultoria');
  const defaultType = isServiceBusiness ? 'service' : 'product';
  const defaultUnit = isServiceBusiness ? Unit.SESSION : Unit.KG;

  const availableCategories = CATEGORIES_PER_BUSINESS[activeBusinessCategory] || Object.values(Category);

  // Common Data
  const [commonData, setCommonData] = useState({
    name: '',
    category: availableCategories[0],
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    imageUrl: null as string | null,
    type: defaultType as 'product' | 'service',
    supplierId: '' as string // Novo state para fornecedor
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
    setCommonData(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantChange = (id: string, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, [field]: value };
      }
      return v;
    }));
  };

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      { 
        id: generateID(), 
        size: 0, 
        unit: commonData.type === 'service' ? Unit.SESSION : Unit.KG, 
        quantity: commonData.type === 'service' ? 9999 : 0, 
        price: 0, 
        sellingPrice: 0, 
        lowStockThreshold: 5 
      }
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length === 1) {
      alert("Deve haver pelo menos uma variante.");
      return;
    }
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isOnline) alert("O reconhecimento por IA requer internet.");

      setIsAnalyzing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalBase64 = reader.result as string;
          const resizedBase64 = await resizeImage(originalBase64);
          
          setImagePreview(resizedBase64);
          setCommonData(prev => ({ ...prev, imageUrl: resizedBase64 }));

          if (isOnline) {
            const base64Data = resizedBase64.split(',')[1];
            const analysis = await analyzeProductImage(base64Data);

            if (analysis) {
              const estimatedPriceDisplay = Number(((analysis.price || 0) * rate).toFixed(2));
              const estimatedSellingPrice = Number((estimatedPriceDisplay * 1.3).toFixed(2));

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
                    price: analysis.price ? estimatedPriceDisplay : newVariants[0].price,
                    sellingPrice: estimatedSellingPrice
                  };
                }
                return newVariants;
              });
            }
          }
        } catch (error) {
          console.error("Error processing image:", error);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonData.name) {
      alert("Por favor preencha o Nome.");
      return;
    }

    const normalizedName = String(commonData.name || '').trim();
    const selectedSupplier = suppliers.find(s => s.id === commonData.supplierId);

    const newItems: InventoryItem[] = variants.map(v => {
      const priceBase = v.price / rate;
      const sellingPriceBase = v.sellingPrice / rate;

      return {
        id: v.id.length < 10 ? generateID() : v.id, 
        name: normalizedName,
        category: commonData.category,
        quantity: commonData.type === 'service' ? (v.quantity > 0 ? 9999 : 0) : (v.quantity || 0), 
        size: v.size || 1,
        unit: v.unit,
        price: commonData.type === 'service' ? 0 : priceBase,
        sellingPrice: sellingPriceBase,
        expiryDate: commonData.expiryDate,
        lowStockThreshold: commonData.type === 'service' ? 0 : (v.lowStockThreshold || 0),
        addedDate: new Date().toISOString().split('T')[0],
        imageUrl: imagePreview || undefined,
        type: commonData.type,
        supplierId: selectedSupplier?.id, // Associa
        supplierName: selectedSupplier?.name // Associa nome
      };
    });

    onSave(newItems, originalName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 text-gray-900">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center font-heading">
            <Layers className="mr-2" />
            {editingItem ? 'Gerir Item' : 'Adicionar Item'}
          </h2>
          <button onClick={onCancel} className="hover:bg-emerald-700 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          
          {/* CENTRALIZED TAB SELECTOR */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto mb-6">
             <button 
               type="button"
               onClick={() => setCommonData({...commonData, type: 'product', category: availableCategories[0]})}
               className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${commonData.type === 'product' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Box size={16} className="mr-2" /> Produto
             </button>
             <button 
               type="button"
               onClick={() => setCommonData({...commonData, type: 'service', category: availableCategories[0]})}
               className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${commonData.type === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Briefcase size={16} className="mr-2" /> Serviço
             </button>
          </div>

          <form id="item-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- SECTION 1: COMMON DATA --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="border-b border-gray-100 pb-2 mb-4">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                   Informação Geral
                 </h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Image Upload */}
                  <div className="col-span-1">
                     <div 
                       className={`relative w-full aspect-square bg-gray-50 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden group transition-colors cursor-pointer ${imagePreview ? 'border-emerald-500' : 'border-gray-300 hover:border-emerald-400'}`}
                     >
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400">
                             <Camera size={40} />
                             <span className="text-xs mt-2 font-medium">Foto</span>
                          </div>
                        )}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <Loader2 className="animate-spin text-emerald-600" size={32} />
                          </div>
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                     </div>
                  </div>

                  {/* Basic Info Inputs */}
                  <div className="col-span-1 md:col-span-2 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                           {commonData.type === 'service' ? 'Nome do Serviço' : 'Nome do Produto'}
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg font-semibold text-gray-900 placeholder-gray-400"
                          value={commonData.name}
                          onChange={handleCommonChange}
                          placeholder={commonData.type === 'service' ? "Ex: Corte de Cabelo" : "Ex: Arroz Carolino"}
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                          <select
                            name="category"
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900"
                            value={commonData.category}
                            onChange={handleCommonChange}
                          >
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat} className="text-gray-900">{cat}</option>
                            ))}
                          </select>
                        </div>
                        {commonData.type === 'product' && (
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                             <input
                               type="date"
                               name="expiryDate"
                               required
                               className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900"
                               value={commonData.expiryDate}
                               onChange={handleCommonChange}
                             />
                           </div>
                        )}
                     </div>

                     {/* SUPPLIER SELECTOR */}
                     {commonData.type === 'product' && suppliers.length > 0 && (
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                              <Truck size={14} className="mr-1.5 text-gray-400"/> Fornecedor
                           </label>
                           <select
                              name="supplierId"
                              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900"
                              value={commonData.supplierId}
                              onChange={handleCommonChange}
                           >
                              <option value="">Sem fornecedor associado</option>
                              {suppliers.map(s => (
                                 <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                           </select>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* --- SECTION 2: VARIANTS --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                   {commonData.type === 'service' ? 'Opções de Serviço' : 'Variantes de Stock'}
                 </h3>
                 <button 
                   type="button"
                   onClick={addVariant}
                   className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors"
                 >
                    <Plus size={16} className="mr-1" /> Adicionar Opção
                 </button>
               </div>

               <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={variant.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                       <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-10 bg-emerald-400 rounded-r hidden sm:block"></div>
                       
                       <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                          {/* Size & Unit */}
                          <div className="flex-1 w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
                             <div className="col-span-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                                   {commonData.type === 'service' ? 'Duração/Qtd' : 'Tamanho'}
                                </label>
                                <div className="flex items-center">
                                   <Scale size={14} className="text-gray-400 mr-1.5" />
                                   <input
                                      type="number"
                                      step="0.01"
                                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 text-sm font-bold text-gray-900"
                                      value={variant.size}
                                      onChange={(e) => handleVariantChange(variant.id, 'size', Number(e.target.value))}
                                   />
                                </div>
                             </div>
                             <div className="col-span-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Unidade</label>
                                <select
                                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-gray-900"
                                  value={variant.unit}
                                  onChange={(e) => handleVariantChange(variant.id, 'unit', e.target.value)}
                                >
                                  {Object.values(Unit).map(u => <option key={u} value={u} className="text-gray-900">{u}</option>)}
                                </select>
                             </div>
                             
                             {/* Stock Logic - Different for Services vs Products */}
                             {commonData.type === 'product' ? (
                               <>
                                 <div className="col-span-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                                       Stock
                                    </label>
                                    <input
                                       type="number"
                                       className={`w-full border rounded px-2 py-1.5 focus:outline-none text-sm font-bold text-gray-900 bg-white border-gray-300 focus:border-emerald-500`}
                                       value={variant.quantity}
                                       onChange={(e) => handleVariantChange(variant.id, 'quantity', Number(e.target.value))}
                                    />
                                 </div>

                                 {/* Alert */}
                                 <div className="col-span-1">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1 text-red-400">Min.</label>
                                    <input
                                       type="number"
                                       className="w-full bg-white border border-red-100 rounded px-2 py-1.5 focus:outline-none focus:border-red-300 text-sm text-red-600"
                                       value={variant.lowStockThreshold}
                                       onChange={(e) => handleVariantChange(variant.id, 'lowStockThreshold', Number(e.target.value))}
                                    />
                                 </div>
                               </>
                             ) : (
                                // SERVICE AVAILABILITY TOGGLE
                                <div className="col-span-2 flex items-center pt-5">
                                   <button
                                     type="button"
                                     onClick={() => handleVariantChange(variant.id, 'quantity', variant.quantity > 0 ? 0 : 9999)}
                                     className={`flex items-center px-3 py-1.5 rounded-lg border transition-all text-sm font-bold w-full justify-center ${
                                        variant.quantity > 0 
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                          : 'bg-gray-100 border-gray-200 text-gray-500'
                                     }`}
                                   >
                                      {variant.quantity > 0 ? <CheckCircle size={16} className="mr-1"/> : <XCircle size={16} className="mr-1"/>}
                                      {variant.quantity > 0 ? 'Disponível' : 'Indisponível'}
                                   </button>
                                </div>
                             )}
                          </div>

                          {/* Prices */}
                          <div className="flex-1 w-full sm:w-auto grid grid-cols-2 gap-2 pl-0 sm:pl-4 sm:border-l border-gray-200">
                              {commonData.type === 'product' && (
                                <div>
                                   <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Custo ({symbol})</label>
                                   <input
                                      type="number"
                                      step="0.01"
                                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-gray-900"
                                      value={variant.price}
                                      onChange={(e) => handleVariantChange(variant.id, 'price', Number(e.target.value))}
                                   />
                                </div>
                              )}
                              <div className={commonData.type === 'service' ? 'col-span-2' : ''}>
                                 <label className="text-[10px] text-emerald-600 uppercase font-bold block mb-1 flex items-center">
                                    Valor {commonData.type === 'service' ? 'Serviço' : 'Venda'} ({symbol}) <TrendingUp size={10} className="ml-1" />
                                 </label>
                                 <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 text-sm font-bold"
                                    value={variant.sellingPrice}
                                    onChange={(e) => handleVariantChange(variant.id, 'sellingPrice', Number(e.target.value))}
                                 />
                              </div>
                          </div>

                          {/* Delete Action */}
                          <div className="w-full sm:w-auto flex justify-end">
                             <button
                               type="button"
                               onClick={() => removeVariant(variant.id)}
                               className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                               title="Remover variante"
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="h-6 md:hidden"></div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-medium transition-colors text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-colors flex items-center justify-center text-base shadow-sm"
          >
            <Save size={20} className="mr-2" />
            Guardar {commonData.type === 'service' ? 'Serviço' : 'Produto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemForm;
