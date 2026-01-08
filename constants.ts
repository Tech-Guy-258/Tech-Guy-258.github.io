
import { InventoryItem, Category, Unit, CurrencyCode, SaleRecord, Permission, Account, Business, Employee, AuditLogEntry, PaymentMethod, Supplier, Customer, Appointment, Expense } from './types';

export const APP_VERSION = '3.3.3'; 
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

export const CATEGORIES_PER_BUSINESS: Record<string, string[]> = {
  "Mercearia": [Category.FRUITS, Category.VEGETABLES, Category.DAIRY, Category.MEAT, Category.FISH, Category.BAKERY, Category.PANTRY, Category.DRINKS, Category.HOUSEHOLD, Category.OTHER],
  "Salão de Beleza / Barbearia": [Category.SERVICE, Category.HAIR, Category.NAILS, Category.SPA, Category.COSMETICS, Category.OTHER],
  "Venda de Acessórios e Bijuterias": [Category.ACCESSORIES, Category.OTHER],
  "Venda e Revenda (Produtos Diversos)": Object.values(Category),
  "Brechó / Loja de Roupas": [Category.CLOTHING, Category.ACCESSORIES, Category.OTHER],
  "Aluguer de Vestidos": [Category.CLOTHING, Category.OTHER],
  "Bar": [Category.DRINKS, Category.ALCOHOL, Category.OTHER],
  "Bottle Store": [Category.DRINKS, Category.ALCOHOL, Category.OTHER],
  "Agência de Eventos e Decoração": [Category.SERVICE, Category.OTHER],
  "Cosméticos e Perfumes": [Category.COSMETICS, Category.OTHER],
  "Confeção de Bolos e Salgados": [Category.BAKERY, Category.PANTRY, Category.OTHER],
  "Take Away / Restaurante": [Category.DRINKS, Category.OTHER, "Pratos Prontos"],
  "Material Electrónico e Celulares": [Category.ELECTRONICS, Category.PHONES, Category.OTHER],
  "Papelaria e Material Académico": [Category.BOOKS, Category.OTHER],
  "Outro": Object.values(Category)
};

export const SAMPLE_INVENTORY: InventoryItem[] = [];

export const getDemoAccount = (): Account => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const longAgo = new Date(today); longAgo.setDate(today.getDate() - 45);
  const longAgoStr = longAgo.toISOString();

  // FORNECEDORES
  const suppliers: Supplier[] = [
    { id: 'sup-1', name: 'Beleza Pro Moçambique', contactName: 'Dra. Ana', phone: '841112223', email: 'ana@belezapro.co.mz', nuit: '400555', address: 'Av. Mao Tsé Tung, Maputo', notes: 'Entrega de químicos às terças', category: 'Cosméticos' },
    { id: 'sup-2', name: 'Equipamentos Elite', contactName: 'Sr. Paulo', phone: '823334445', email: 'vendas@elite.com', nuit: '400666', address: 'Matola', notes: 'Manutenção de máquinas', category: 'Equipamento' }
  ];

  // CLIENTES
  const customers: Customer[] = [
    { id: 'c-1', name: 'Belmira Mondlane', phone: '840001112', email: 'bel@gmail.com', address: 'Sommerschield', notes: 'Prefere verniz gel vermelho. VIP.', loyaltyPoints: 1250, totalSpent: 25000, lastVisit: today.toISOString() },
    { id: 'c-2', name: 'Titos Chilaule', phone: '821112223', email: 'titos@yahoo.com', address: 'Bairro Central', notes: 'Corte degradê clássico.', loyaltyPoints: 450, totalSpent: 4500, lastVisit: longAgoStr },
    { id: 'c-3', name: 'Sérgio Matsinhe', phone: '875554443', email: 'sergio@outlook.com', address: 'Matola', notes: 'Cliente novo.', loyaltyPoints: 50, totalSpent: 800, lastVisit: today.toISOString() }
  ];

  // ITENS (SERVIÇOS E PRODUTOS)
  const items: InventoryItem[] = [
    // Serviços
    { id: 's-1', name: 'Corte Masculino VIP', category: 'Cabelos', quantity: 9999, size: 1, unit: Unit.SESSION, price: 0, sellingPrice: 500, expiryDate: '2099-12-31', addedDate: '2024-01-01', lowStockThreshold: 0, type: 'service' },
    { id: 's-2', name: 'Manicure Gel', category: 'Unhas & Manicure', quantity: 9999, size: 1, unit: Unit.SESSION, price: 150, sellingPrice: 1200, expiryDate: '2099-12-31', addedDate: '2024-01-01', lowStockThreshold: 0, type: 'service' },
    { id: 's-3', name: 'Barba com Toalha Quente', category: 'Cabelos', quantity: 9999, size: 1, unit: Unit.SESSION, price: 50, sellingPrice: 400, expiryDate: '2099-12-31', addedDate: '2024-01-01', lowStockThreshold: 0, type: 'service' },
    // Produtos de Revenda/Uso
    { id: 'p-1', name: 'Pomada Modeladora Matte', category: 'Cosméticos', quantity: 2, size: 150, unit: Unit.G, price: 350, sellingPrice: 650, expiryDate: '2026-05-01', addedDate: '2024-01-01', lowStockThreshold: 5, type: 'product', supplierId: 'sup-1', supplierName: 'Beleza Pro Moçambique' },
    { id: 'p-2', name: 'Shampoo Profissional 1L', category: 'Cosméticos', quantity: 0, size: 1, unit: Unit.L, price: 600, sellingPrice: 1500, expiryDate: '2025-12-30', addedDate: '2024-01-01', lowStockThreshold: 3, type: 'product', supplierId: 'sup-1', supplierName: 'Beleza Pro Moçambique' },
    { id: 'p-3', name: 'Lâminas de Barbear (Pack)', category: 'Outros', quantity: 15, size: 10, unit: Unit.PACK, price: 120, sellingPrice: 250, expiryDate: '2028-01-01', addedDate: '2024-01-01', lowStockThreshold: 10, type: 'product' }
  ];

  // VENDAS (HOJE)
  const sales: SaleRecord[] = [
    { id: generateID(), transactionId: 'TX-2001', itemId: 's-1', itemName: 'Corte Masculino VIP', quantity: 1, totalRevenue: 500, totalProfit: 500, date: `${todayStr}T09:30:00`, paymentMethod: 'cash', operatorName: 'Luís Demo', operatorId: 'owner', customerId: 'c-3', customerName: 'Sérgio Matsinhe' },
    { id: generateID(), transactionId: 'TX-2002', itemId: 'p-1', itemName: 'Pomada Modeladora Matte', quantity: 1, totalRevenue: 650, totalProfit: 300, date: `${todayStr}T10:15:00`, paymentMethod: 'mpesa', operatorName: 'Luís Demo', operatorId: 'owner', customerId: 'c-1', customerName: 'Belmira Mondlane' }
  ];

  // DESPESAS
  const expenses: Expense[] = [
    { id: 'e-1', name: 'Renda do Espaço', amount: 25000, type: 'fixed', isPaid: false, paymentDay: 5, nextDueDate: '2025-05-05' },
    { id: 'e-2', name: 'Energia EDM', amount: 3500, type: 'variable', isPaid: true, lastPaidDate: today.toISOString(), paymentMethod: 'mpesa', operatorName: 'Luís Demo', nextDueDate: todayStr },
    { id: 'e-3', name: 'Água FIPAG', amount: 1200, type: 'variable', isPaid: false, nextDueDate: todayStr }
  ];

  // AGENDAMENTOS
  const appointments: Appointment[] = [
    { id: 'a-1', customerId: 'c-1', customerName: 'Belmira Mondlane', customerPhone: '840001112', serviceIds: ['s-2'], serviceNames: ['Manicure Gel'], totalAmount: 1200, date: todayStr, time: '14:00', status: 'confirmed', createdBy: 'Luís Demo', createdAt: today.toISOString() },
    { id: 'a-2', customerId: 'c-2', customerName: 'Titos Chilaule', customerPhone: '821112223', serviceIds: ['s-1', 's-3'], serviceNames: ['Corte Masculino VIP', 'Barba'], totalAmount: 900, date: todayStr, time: '16:30', status: 'scheduled', createdBy: 'Luís Demo', createdAt: today.toISOString() },
    { id: 'a-3', customerId: 'c-1', customerName: 'Belmira Mondlane', customerPhone: '840001112', serviceIds: ['s-1'], serviceNames: ['Corte Masculino VIP'], totalAmount: 500, date: tomorrowStr, time: '10:00', status: 'scheduled', createdBy: 'Luís Demo', createdAt: today.toISOString() }
  ];

  // LOGS DE AUDITORIA
  const auditLogs: AuditLogEntry[] = [
    { id: generateID(), action: 'LOGIN', details: 'Acesso administrativo detetado.', operatorName: 'Luís Demo', timestamp: `${todayStr}T08:00:00` },
    { id: generateID(), action: 'EXPENSE', details: 'Saída Paga: "Energia EDM" (3500MT) via mpesa', operatorName: 'Luís Demo', timestamp: `${todayStr}T09:00:00` },
    { id: generateID(), action: 'SALE', details: 'Venda #TX-2001 Processada: Corte Masculino VIP (500MT)', operatorName: 'Luís Demo', timestamp: `${todayStr}T09:30:00` },
    { id: generateID(), action: 'UPDATE', details: 'Reposição de stock: Pomada Matte', operatorName: 'Luís Demo', timestamp: `${todayStr}T08:15:00` }
  ];

  const biz1: Business = {
    id: 'biz-salon-demo',
    name: 'Elite Barber & Spa',
    category: 'Salão de Beleza / Barbearia',
    subscriptionStatus: 'active',
    subscriptionExpiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    suppliers,
    customers,
    items,
    sales,
    expenses,
    auditLogs,
    employees: [
      { id: 'emp-1', name: 'Ricardo Stylist', roleLabel: 'Barbeiro Sénior', pinCode: '1234', permissions: ['POS_SELL', 'VIEW_REPORTS'], createdAt: today.toISOString(), createdBy: 'Luís Demo' }
    ],
    appointments
  };

  return { 
    id: 'account-salon-demo', 
    phoneNumber: '840000001', 
    password: '00000000', 
    ownerName: 'Luís Demo', 
    businesses: [biz1] 
  };
};
