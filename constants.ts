
import { InventoryItem, Category, Unit, CurrencyCode, SaleRecord, Permission, Account, Business, Employee, AuditLogEntry, PaymentMethod, Supplier, Customer, Appointment } from './types';

// VERSÃO 3.2.3 - FIX APPOINTMENTS ROUTE
export const APP_VERSION = '3.2.3'; 
export const APP_NAME = "Gestão360";

// --- ID GENERATOR HÍBRIDO (MODERNO + COMPATÍVEL) ---
export const generateID = (): string => {
  // 1. Tenta usar a API Moderna (Funciona em PC, iPhone, Androids Recentes com HTTPS)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Falha silenciosa, passa para o fallback
    }
  }

  // 2. Fallback Seguro (Para dispositivos antigos ou sem HTTPS)
  // Gera um ID robusto baseado em timestamp de alta precisão e aleatoriedade
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 6);
  return `id-${timestamp}-${randomPart}-${randomPart2}`;
};

// Taxas de câmbio baseadas em MZN (1 MZN = X)
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  MZN: 1.0,
  EUR: 0.0142, // 1 / 70
  USD: 0.0156, // 1 / 64
  BRL: 0.078,  // 1 / 12.8
  GBP: 0.0121  // 1 / 82
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  BRL: 'R$',
  GBP: '£',
  MZN: 'MT'
};

export const BUSINESS_CATEGORIES = [
  "Mercearia",
  "Salão de Beleza / Barbearia",
  "Venda de Acessórios e Bijuterias",
  "Venda e Revenda (Produtos Diversos)",
  "Brechó / Loja de Roupas",
  "Aluguer de Vestidos",
  "Bar",
  "Bottle Store",
  "Agência de Eventos e Decoração",
  "Cosméticos e Perfumes",
  "Confeção de Bolos e Salgados",
  "Take Away / Restaurante",
  "Material Electrónico e Celulares",
  "Papelaria e Material Académico",
  "Outro"
];

// Mapping Business Type to Product Categories
export const CATEGORIES_PER_BUSINESS: Record<string, Category[]> = {
  "Mercearia": [Category.PANTRY, Category.DRINKS, Category.DAIRY, Category.FRUITS, Category.VEGETABLES, Category.HOUSEHOLD, Category.BAKERY],
  "Salão de Beleza / Barbearia": [Category.HAIR, Category.NAILS, Category.SPA, Category.COSMETICS, Category.SERVICE],
  "Venda de Acessórios e Bijuterias": [Category.ACCESSORIES, Category.OTHER],
  "Brechó / Loja de Roupas": [Category.CLOTHING, Category.SHOES, Category.ACCESSORIES],
  "Aluguer de Vestidos": [Category.CLOTHING, Category.SERVICE],
  "Bar": [Category.ALCOHOL, Category.DRINKS],
  "Bottle Store": [Category.ALCOHOL, Category.DRINKS],
  "Cosméticos e Perfumes": [Category.COSMETICS, Category.SPA],
  "Confeção de Bolos e Salgados": [Category.BAKERY, Category.SERVICE],
  "Take Away / Restaurante": [Category.MEAT, Category.FISH, Category.DRINKS, Category.SERVICE],
  "Material Electrónico e Celulares": [Category.ELECTRONICS, Category.PHONES, Category.ACCESSORIES],
  "Papelaria e Material Académico": [Category.BOOKS, Category.OTHER]
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  POS_SELL: "Realizar Vendas (Caixa)",
  MANAGE_STOCK: "Gerir Stock (Adicionar/Editar)",
  VIEW_REPORTS: "Ver Relatórios e Faturação",
  MANAGE_TEAM: "Gerir Funcionários",
  SETTINGS: "Definições e Subscrição"
};

// DADOS DE EXEMPLO BASE (Serão usados dinamicamente)
export const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 'rice-1kg',
    name: 'Arroz Carolino',
    category: Category.PANTRY,
    quantity: 45,
    size: 1,
    unit: Unit.KG,
    price: 60, 
    sellingPrice: 85,
    expiryDate: '2025-12-31',
    addedDate: '2024-03-01',
    lowStockThreshold: 10,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300',
    type: 'product'
  }
];

// --- HELPERS PARA GERAR DADOS ---

const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomPaymentMethod = (): PaymentMethod => {
  const r = Math.random();
  if (r < 0.5) return 'cash';
  if (r < 0.8) return 'mpesa';
  if (r < 0.9) return 'emola';
  return 'card';
};

// --- MOCK DATA LISTS ---

const MOCK_CUSTOMER_NAMES = [
  'João Silva', 'Maria Machava', 'Pedro Cossa', 'Ana Mondlane', 
  'Carlos Tivane', 'Sofia Langa', 'Nelson Bata', 'Isabel Sitoe', 
  'Fernando Mabunda', 'Luísa Macamo', 'Jorge Muianga', 'Marta Tembe'
];

const MOCK_SUPPLIERS_GENERIC = [
  { name: 'Distribuidora Nacional', category: 'Geral' },
  { name: 'Importadora Global', category: 'Importados' },
  { name: 'Armazéns do Zimpeto', category: 'Grosso' }
];

const MOCK_SUPPLIERS_SPECIFIC: Record<string, {name: string, category: string}[]> = {
  'Mercearia': [
    { name: 'Agricultores da Manhiça', category: 'Frescos' },
    { name: 'Panificadora Central', category: 'Padaria' },
    { name: 'Coca-Cola Sabco', category: 'Bebidas' },
    { name: 'Lacticínios de Umbeluzi', category: 'Laticínios' }
  ],
  'Salão': [
    { name: 'Beleza Pro Moçambique', category: 'Cosméticos' },
    { name: 'Hair Style Imports', category: 'Cabelos' },
    { name: 'Unhas & Co', category: 'Unhas' }
  ],
  'Bar': [
    { name: 'CDM Cervejas', category: 'Bebidas' },
    { name: 'Vinhos de Portugal', category: 'Vinhos' },
    { name: 'Gelo & Frio Lda', category: 'Gelo' }
  ],
  'Restaurante': [
    { name: 'Talho Halal', category: 'Carnes' },
    { name: 'Pescados de Maputo', category: 'Peixe' },
    { name: 'Mercado Grossista', category: 'Vegetais' }
  ],
  'Electrónico': [
    { name: 'Samsung Moz', category: 'Celulares' },
    { name: 'Tech China Lda', category: 'Acessórios' },
    { name: 'Computadores Pro', category: 'Informática' }
  ]
};

// Nomes de produtos por categoria
const PRODUCTS_BY_CATEGORY: Record<string, string[]> = {
  [Category.PANTRY]: ['Arroz Basmati', 'Feijão Manteiga', 'Massa Esparguete', 'Óleo Fula', 'Azeite Oliveira', 'Farinha Trigo', 'Açúcar Branco'],
  [Category.DRINKS]: ['Coca-Cola', 'Sumo Santal', 'Água Namaacha', 'Fanta Laranja', 'Sprite', 'Sumo Compal'],
  [Category.DAIRY]: ['Leite Mimosa', 'Iogurte Grego', 'Queijo Flamengo', 'Manteiga Pastora', 'Natas'],
  [Category.FRUITS]: ['Banana', 'Maçã Vermelha', 'Laranja do Algarve', 'Pêra Rocha', 'Ananás'],
  [Category.VEGETABLES]: ['Batata Reno', 'Cebola', 'Tomate', 'Alface', 'Cenoura'],
  [Category.HOUSEHOLD]: ['Detergente OMO', 'Lixívia Neoblanc', 'Papel Higiénico', 'Sabonete Lux'],
  [Category.BAKERY]: ['Pão de Forma', 'Bolo de Arroz', 'Croissant', 'Pão Ralado'],
  [Category.HAIR]: ['Champô Anti-Caspa', 'Amaciador Suave', 'Máscara Hidratante', 'Gel Fixador', 'Laca Forte'],
  [Category.NAILS]: ['Verniz Vermelho', 'Acetona', 'Lima de Unhas', 'Gel UV'],
  [Category.COSMETICS]: ['Batom Vermelho', 'Base Líquida', 'Rímel Preto', 'Creme Hidratante'],
  [Category.ALCOHOL]: ['Cerveja 2M', 'Vinho Tinto', 'Whisky JB', 'Gin Tónico', 'Vodka Absolut'],
  [Category.ELECTRONICS]: ['Auriculares Bluetooth', 'Powerbank', 'Cabo USB-C', 'Carregador Rápido', 'Pen Drive 32GB'],
  [Category.CLOTHING]: ['T-Shirt Básica', 'Calças Jeans', 'Vestido Verão', 'Camisa Social'],
  [Category.SERVICE]: ['Taxa de Entrega', 'Serviço Personalizado', 'Mão de Obra', 'Consultoria'],
  [Category.MEAT]: ['Frango Inteiro', 'Bife da Vazia', 'Costeleta de Porco', 'Carne Picada'],
  [Category.FISH]: ['Pescada', 'Salmão', 'Camarão', 'Atum em Lata']
};

// --- HELPER PARA GERAR CONTA DEMO DO LUÍS ---
export const getDemoAccount = (): Account => {
  const businesses: Business[] = BUSINESS_CATEGORIES.map((category, index) => {
    
    // 1. GERAR FORNECEDORES
    const specificSuppliers = Object.entries(MOCK_SUPPLIERS_SPECIFIC).find(([key]) => category.includes(key))?.[1] || [];
    const suppliersPool = [...specificSuppliers, ...MOCK_SUPPLIERS_GENERIC];
    
    const suppliers: Supplier[] = suppliersPool.slice(0, randomInt(3, 5)).map((s, idx) => ({
      id: `sup-${index}-${idx}`,
      name: s.name,
      contactName: MOCK_CUSTOMER_NAMES[randomInt(0, MOCK_CUSTOMER_NAMES.length - 1)],
      phone: `84${randomInt(1000000, 9999999)}`,
      email: `contacto@${s.name.toLowerCase().replace(/\s/g, '')}.co.mz`,
      nuit: `${randomInt(400000000, 499999999)}`,
      address: 'Maputo, Moçambique',
      notes: 'Fornecedor confiável',
      category: s.category
    }));

    // 2. GERAR CLIENTES
    const customers: Customer[] = MOCK_CUSTOMER_NAMES.slice(0, randomInt(5, 10)).map((name, idx) => ({
      id: `cust-${index}-${idx}`,
      name: name,
      phone: `82${randomInt(1000000, 9999999)}`,
      email: `${name.toLowerCase().replace(' ', '.')}@gmail.com`,
      address: 'Matola, Moçambique',
      notes: '',
      loyaltyPoints: 0,
      totalSpent: 0,
      lastVisit: new Date().toISOString()
    }));

    // 3. GERAR PRODUTOS E SERVIÇOS
    let items: InventoryItem[] = [];
    const validCategories = CATEGORIES_PER_BUSINESS[category] || [Category.OTHER];
    
    let itemIdCounter = 1;
    const createItem = (name: string, cat: Category, status: 'normal' | 'low' | 'empty' | 'expired' | 'expiring_soon' | 'service'): InventoryItem => {
      const isService = status === 'service' || cat === Category.SERVICE || category.includes('Salão') && (cat === Category.HAIR && name.includes('Corte'));
      
      let qty = 50;
      let threshold = 10;
      let expDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); 

      if (status === 'low') { qty = 3; threshold = 5; } 
      else if (status === 'empty') { qty = 0; } 
      else if (status === 'expired') { const d = new Date(); d.setDate(d.getDate() - 10); expDate = d; } 
      else if (status === 'expiring_soon') { const d = new Date(); d.setDate(d.getDate() + 3); expDate = d; } 
      else if (isService) { qty = 9999; threshold = 0; }

      const costPrice = isService ? 0 : randomInt(50, 500);
      const margin = randomInt(20, 60) / 100;
      const sellingPrice = isService ? randomInt(100, 1000) : Math.ceil(costPrice * (1 + margin) / 10) * 10;

      const supplier = (!isService && suppliers.length > 0) 
        ? suppliers[randomInt(0, suppliers.length - 1)] 
        : undefined;

      return {
         id: `item-${index}-${itemIdCounter++}`,
         name: name,
         category: cat,
         quantity: qty,
         size: 1,
         unit: isService ? Unit.SESSION : Unit.UNIT,
         price: costPrice,
         sellingPrice: sellingPrice,
         expiryDate: expDate.toISOString().split('T')[0],
         addedDate: '2024-01-01',
         lowStockThreshold: threshold,
         type: isService ? 'service' : 'product',
         imageUrl: undefined,
         supplierId: supplier?.id,
         supplierName: supplier?.name
      };
    };

    validCategories.forEach((cat, catIdx) => {
       const productNames = PRODUCTS_BY_CATEGORY[cat] || [`Produto Genérico ${cat}`];
       if (productNames[0]) items.push(createItem(productNames[0], cat, 'normal'));
       if (productNames[1]) {
          const scenarios = ['low', 'empty', 'expired', 'expiring_soon'] as const;
          items.push(createItem(productNames[1], cat, scenarios[catIdx % scenarios.length]));
       }
    });

    if (category.includes('Salão') || category.includes('Barbearia')) {
       items.push(createItem('Corte de Cabelo', Category.HAIR, 'service'));
       items.push(createItem('Manicure Simples', Category.NAILS, 'service'));
    }

    // 4. GERAR FUNCIONÁRIOS
    const employees: Employee[] = [
      {
        id: `emp-${index}-1`,
        name: `Pedro M.`,
        roleLabel: 'Gerente de Loja',
        pinCode: '1234',
        permissions: ['POS_SELL', 'MANAGE_STOCK', 'VIEW_REPORTS', 'MANAGE_TEAM'],
        createdAt: new Date().toISOString(),
        createdBy: 'Luís'
      },
      {
        id: `emp-${index}-2`,
        name: `Ana S.`,
        roleLabel: 'Caixa',
        pinCode: '0000',
        permissions: ['POS_SELL'],
        createdAt: new Date().toISOString(),
        createdBy: 'Luís'
      }
    ];

    // 5. GERAR VENDAS E LOGS
    const sales: SaleRecord[] = [];
    const auditLogs: AuditLogEntry[] = [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const today = new Date();

    const numberOfSales = items.length > 0 ? randomInt(20, 50) : 0; 

    for (let i = 0; i < numberOfSales; i++) {
      const saleDate = randomDate(startDate, today);
      if (i < 5) saleDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());

      const item = items[randomInt(0, items.length - 1)];
      if (item.quantity === 0 && item.type !== 'service') continue;

      const qty = randomInt(1, 3);
      const isOwner = Math.random() > 0.3;
      const operatorName = isOwner ? 'Proprietário - Luís' : `${employees[randomInt(0, employees.length - 1)].roleLabel} - ${employees[randomInt(0, employees.length - 1)].name}`;
      const operatorId = isOwner ? 'demo-account-luis' : employees[randomInt(0, employees.length - 1)].id;
      
      const sellPrice = item.sellingPrice || item.price;
      const revenue = sellPrice * qty;
      const profit = (sellPrice - item.price) * qty;
      
      const payment = randomPaymentMethod();
      const txId = generateID();

      let saleCustomer: Customer | undefined;
      if (customers.length > 0 && Math.random() > 0.3) {
         saleCustomer = customers[randomInt(0, customers.length - 1)];
         saleCustomer.totalSpent += revenue;
         saleCustomer.loyaltyPoints += Math.floor(revenue / 100);
         if (new Date(saleDate) > new Date(saleCustomer.lastVisit)) {
            saleCustomer.lastVisit = saleDate.toISOString();
         }
      }

      const sale: SaleRecord = {
        id: generateID(),
        transactionId: txId,
        itemId: item.id,
        itemName: item.name,
        itemSize: item.size,
        itemUnit: item.unit,
        quantity: qty,
        totalRevenue: revenue,
        totalProfit: profit,
        date: saleDate.toISOString(),
        paymentMethod: payment,
        operatorName: operatorName,
        operatorId: operatorId,
        customerId: saleCustomer?.id,
        customerName: saleCustomer?.name
      };

      sales.push(sale);
      
      auditLogs.push({
        id: generateID(),
        action: 'SALE',
        details: `Venda #${txId.slice(0,6)}: ${qty}x ${item.name} (${payment})${saleCustomer ? ' - Cliente: ' + saleCustomer.name : ''}`,
        operatorName: operatorName,
        timestamp: saleDate.toISOString()
      });
    }

    // 6. GERAR AGENDAMENTOS (Para salão/barbearia)
    const appointments: Appointment[] = [];
    if (category.includes('Salão') || category.includes('Barbearia')) {
       const services = items.filter(i => i.type === 'service');
       if (services.length > 0 && customers.length > 0) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          for(let i=0; i<3; i++) {
             const cust = customers[i];
             const srv = services[i % services.length];
             // Fixed: Changed serviceId to serviceIds array, serviceName to serviceNames array, and added totalAmount to match Appointment type definition.
             appointments.push({
                id: generateID(),
                customerId: cust.id,
                customerName: cust.name,
                customerPhone: cust.phone,
                serviceIds: [srv.id],
                serviceNames: [srv.name],
                totalAmount: srv.sellingPrice || srv.price,
                date: tomorrow.toISOString().split('T')[0],
                time: `${10 + i}:00`,
                status: 'scheduled',
                notes: 'Agendado via Demo',
                createdBy: 'Sistema',
                createdAt: new Date().toISOString()
             });
          }
       }
    }

    const logActions: {action: AuditLogEntry['action'], text: string}[] = [
       { action: 'LOGIN', text: 'Iniciou sessão no sistema' },
       { action: 'UPDATE', text: 'Atualizou preço de venda' },
       { action: 'UPDATE', text: 'Adicionou stock manual (+10 un)' },
       { action: 'CREATE', text: 'Criou novo produto' }
    ];

    for (let i = 0; i < 5; i++) {
       const logDate = randomDate(startDate, today);
       const randomAction = logActions[randomInt(0, logActions.length - 1)];
       const isOwner = Math.random() > 0.5;
       const operatorName = isOwner ? 'Proprietário - Luís' : `${employees[0].roleLabel} - ${employees[0].name}`;

       auditLogs.push({
          id: generateID(),
          action: randomAction.action,
          details: randomAction.text,
          operatorName: operatorName,
          timestamp: logDate.toISOString()
       });
    }

    auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      id: `biz-demo-${index}`,
      name: category,
      category: category,
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      items: items,
      sales: sales,
      employees: employees,
      suppliers: suppliers,
      customers: customers,
      auditLogs: auditLogs,
      expenses: [],
      appointments: appointments // Adicionado
    };
  });

  return {
    id: 'demo-account-luis',
    phoneNumber: '840000001',
    password: '00000000',
    ownerName: 'Luís',
    businesses: businesses
  };
};
