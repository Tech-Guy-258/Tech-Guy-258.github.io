
import { InventoryItem, Category, Unit, CurrencyCode, SaleRecord, Permission, Account, Business, Employee, AuditLogEntry, PaymentMethod, Supplier, Customer, Appointment, Expense } from './types';

export const APP_VERSION = '3.3.1'; 
export const APP_NAME = "Gestão360";

export const generateID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return `id-${Math.random().toString(36).substring(2, 11)}`;
};

export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  MZN: 1.0, EUR: 0.0142, USD: 0.0156, BRL: 0.078, GBP: 0.0121
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€', USD: '$', BRL: 'R$', GBP: '£', MZN: 'MT'
};

export const BUSINESS_CATEGORIES = [
  "Mercearia", "Salão de Beleza / Barbearia", "Venda de Acessórios e Bijuterias",
  "Venda e Revenda (Produtos Diversos)", "Brechó / Loja de Roupas", "Aluguer de Vestidos",
  "Bar", "Bottle Store", "Agência de Eventos e Decoração", "Cosméticos e Perfumes",
  "Confeção de Bolos e Salgados", "Take Away / Restaurante", "Material Electrónico e Celulares",
  "Papelaria e Material Académico", "Outro"
];

export const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 'sample-1',
    name: 'Arroz Tio Lucas 5kg',
    category: Category.PANTRY,
    quantity: 10,
    size: 5,
    unit: Unit.KG,
    price: 350,
    sellingPrice: 450,
    expiryDate: '2026-12-31',
    addedDate: new Date().toISOString().split('T')[0],
    lowStockThreshold: 5,
    type: 'product'
  }
];

export const CATEGORIES_PER_BUSINESS: Record<string, Category[]> = {
  "Mercearia": [Category.PANTRY, Category.DRINKS, Category.DAIRY, Category.FRUITS, Category.VEGETABLES, Category.HOUSEHOLD, Category.BAKERY],
  "Salão de Beleza / Barbearia": [Category.HAIR, Category.NAILS, Category.SPA, Category.COSMETICS, Category.SERVICE],
  "Venda de Acessórios e Bijuterias": [Category.ACCESSORIES, Category.OTHER],
  "Brechó / Loja de Roupas": [Category.CLOTHING, Category.SHOES, Category.ACCESSORIES],
  "Material Electrónico e Celulares": [Category.ELECTRONICS, Category.PHONES, Category.ACCESSORIES]
};

export const getDemoAccount = (): Account => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const longAgo = new Date(today); longAgo.setDate(today.getDate() - 45);
  const longAgoStr = longAgo.toISOString();

  const businesses: Business[] = BUSINESS_CATEGORIES.slice(0, 1).map((category, bizIdx) => {
    const suppliers: Supplier[] = [
      { id: `s-${bizIdx}-1`, name: 'Distribuidora Elite', contactName: 'Sr. Carlos', phone: '841234567', email: 'carlos@elite.co.mz', nuit: '400111', address: 'Maputo', notes: 'Entrega quartas-feiras', category: 'Geral' }
    ];

    const customers: Customer[] = [
      { id: `c-${bizIdx}-1`, name: 'Belmira Mondlane', phone: '840001112', email: 'bel@gmail.com', address: 'Sommerschield', notes: 'Cliente VIP', loyaltyPoints: 850, totalSpent: 12500, lastVisit: today.toISOString() },
      { id: `c-${bizIdx}-2`, name: 'Titos Chilaule', phone: '821112223', email: 'titos@yahoo.com', address: 'Bairro Central', notes: '', loyaltyPoints: 45, totalSpent: 450, lastVisit: longAgoStr },
      { id: `c-${bizIdx}-3`, name: 'Sérgio Matsinhe', phone: '875554443', email: 'sergio@outlook.com', address: 'Matola', notes: '', loyaltyPoints: 120, totalSpent: 3200, lastVisit: longAgoStr }
    ];

    const items: InventoryItem[] = [
      { id: `i-${bizIdx}-1`, name: 'Arroz Tio Lucas 5kg', category: 'Geral', quantity: 2, size: 5, unit: Unit.KG, price: 350, sellingPrice: 450, expiryDate: '2026-05-01', addedDate: '2024-01-01', lowStockThreshold: 10, type: 'product', supplierId: suppliers[0].id, supplierName: suppliers[0].name },
      { id: `i-${bizIdx}-2`, name: 'Óleo Alimentar 1L', category: 'Geral', quantity: 0, size: 1, unit: Unit.L, price: 95, sellingPrice: 130, expiryDate: '2025-12-30', addedDate: '2024-01-01', lowStockThreshold: 5, type: 'product', supplierId: suppliers[0].id, supplierName: suppliers[0].name },
      { id: `i-${bizIdx}-3`, name: 'Leite Meio Gordo 1L', category: 'Laticínios', quantity: 15, size: 1, unit: Unit.L, price: 60, sellingPrice: 85, expiryDate: todayStr, addedDate: '2024-01-01', lowStockThreshold: 10, type: 'product' },
      { id: `i-${bizIdx}-4`, name: 'Corte Masculino', category: 'Serviço', quantity: 9999, size: 1, unit: Unit.SESSION, price: 0, sellingPrice: 350, expiryDate: '2099-01-01', addedDate: '2024-01-01', lowStockThreshold: 0, type: 'service' }
    ];

    const sales: SaleRecord[] = [
      { id: generateID(), transactionId: 'TX-1001', itemId: items[0].id, itemName: items[0].name, quantity: 1, totalRevenue: 450, totalProfit: 100, date: `${todayStr}T08:30:00`, paymentMethod: 'cash', operatorName: 'Luís', operatorId: 'owner' }
    ];

    const expenses: Expense[] = [
      { id: `e-${bizIdx}-1`, name: 'Renda Loja', amount: 15000, type: 'fixed', isPaid: false, paymentDay: 5, nextDueDate: '2025-05-05' },
      { id: `e-${bizIdx}-2`, name: 'Energia EDM', amount: 2000, type: 'variable', isPaid: true, lastPaidDate: todayStr, paymentMethod: 'emola', operatorName: 'Luís', nextDueDate: todayStr }
    ];

    const appointments: Appointment[] = [
      { id: `a-${bizIdx}-1`, customerId: customers[0].id, customerName: customers[0].name, customerPhone: customers[0].phone, serviceIds: [items[3].id], serviceNames: [items[3].name], totalAmount: 350, date: todayStr, time: '14:30', status: 'confirmed', createdBy: 'Luís', createdAt: yesterdayStr },
      { id: `a-${bizIdx}-2`, customerId: customers[2].id, customerName: customers[2].name, customerPhone: customers[2].phone, serviceIds: [items[3].id], serviceNames: [items[3].name], totalAmount: 350, date: tomorrowStr, time: '09:00', status: 'scheduled', createdBy: 'Luís', createdAt: yesterdayStr }
    ];

    const auditLogs: AuditLogEntry[] = [
      { id: generateID(), action: 'EXPENSE', details: 'Saída Paga (1 mes): "Energia EDM" (2000MT)', operatorName: 'Luís', timestamp: `${todayStr}T09:00:00` },
      { id: generateID(), action: 'LOGIN', details: 'Sessão iniciada', operatorName: 'Luís', timestamp: `${todayStr}T08:00:00` }
    ];

    return {
      id: `biz-${bizIdx}`, name: `Mercearia Mondlane`, category, subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items, sales, employees: [], suppliers, customers, expenses, appointments, auditLogs
    };
  });

  return { id: 'demo-acc', phoneNumber: '840000001', password: '00000000', ownerName: 'Luís Demo', businesses };
};
