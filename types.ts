
export enum Category {
  FRUITS = 'Frutas',
  VEGETABLES = 'Legumes',
  DAIRY = 'Laticínios',
  MEAT = 'Talho',
  FISH = 'Peixaria',
  BAKERY = 'Padaria',
  PANTRY = 'Mercearia Seca',
  DRINKS = 'Bebidas',
  HOUSEHOLD = 'Limpeza',
  OTHER = 'Outros',
  // Novas categorias genéricas
  SERVICE = 'Serviços Gerais',
  HAIR = 'Cabelos',
  NAILS = 'Unhas & Manicure',
  SPA = 'Spa & Massagem',
  CLOTHING = 'Vestuário',
  SHOES = 'Calçado',
  ACCESSORIES = 'Acessórios',
  ELECTRONICS = 'Eletrónica',
  PHONES = 'Celulares & Tablets',
  COSMETICS = 'Cosmética',
  BOOKS = 'Livros & Papelaria',
  ALCOHOL = 'Bebidas Alcoólicas'
}

export enum Unit {
  KG = 'kg',
  G = 'g',
  L = 'L',
  ML = 'ml',
  UNIT = 'un',
  PACK = 'pct',
  HOUR = 'hr',
  SESSION = 'sessão'
}

export type CurrencyCode = 'EUR' | 'USD' | 'BRL' | 'GBP' | 'MZN';
export type PaymentMethod = 'cash' | 'mpesa' | 'emola' | 'card';

// --- Permissions System ---
export type Permission = 
  | 'POS_SELL'        // Acesso ao Caixa/Vendas
  | 'MANAGE_STOCK'    // Adicionar/Editar/Remover Produtos
  | 'VIEW_REPORTS'    // Ver Dashboard e Relatórios Financeiros
  | 'MANAGE_TEAM'     // Adicionar/Remover Funcionários
  | 'SETTINGS';       // Configurações Gerais e Subscrição

export interface InventoryItem {
  id: string;
  name: string;
  category: Category | string; // Permitir string customizada
  quantity: number; 
  size: number; 
  unit: Unit; 
  price: number; 
  sellingPrice: number; 
  expiryDate: string; 
  addedDate: string;
  imageUrl?: string;
  lowStockThreshold: number;
  type: 'product' | 'service'; // Novo: Diferenciar produto físico de serviço
  lastUpdatedBy?: string; // Auditoria: Quem alterou por último
  lastUpdatedAt?: string;
  supplierId?: string; // NOVO: Associação ao fornecedor
  supplierName?: string; // NOVO: Nome do fornecedor para display rápido
}

export interface SaleRecord {
  id: string;
  transactionId: string;
  itemId: string;
  itemName: string;
  itemSize?: number; 
  itemUnit?: Unit; 
  quantity: number;
  totalRevenue: number; 
  totalProfit: number; 
  date: string; 
  paymentMethod: PaymentMethod; 
  operatorName: string; // Quem fez a venda (Dono ou Funcionário)
  operatorId: string;
  customerId?: string; // NOVO
  customerName?: string; // NOVO
}

export interface RecipeSuggestion {
  title: string;
  ingredients: string[];
  instructions: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  time: string;
}

export type SortField = 'name' | 'quantity' | 'expiryDate' | 'price';
export type SortOrder = 'asc' | 'desc';

// --- Auth & Multi-Business Types ---

export type SubscriptionStatus = 'active' | 'expired' | 'trial';
export type PaymentProvider = 'mpesa' | 'emola';

export interface AuditLogEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SALE' | 'LOGIN' | 'SUBSCRIPTION' | 'CLOSE_REGISTER' | 'EXPENSE' | 'APPOINTMENT';
  details: string;
  operatorName: string;
  timestamp: string;
}

export interface Employee {
  id: string;
  name: string;
  roleLabel: string; // NOVO: Cargo (ex: Gerente, Caixa)
  pinCode: string; // Código único de acesso
  permissions: Permission[]; // Lista de acessos permitidos
  createdAt: string;
  createdBy: string; // Quem criou este funcionário
}

// --- NEW TYPES FOR SUPPLIERS AND CUSTOMERS ---

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  nuit: string;
  address: string;
  notes: string;
  category: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  loyaltyPoints: number;
  totalSpent: number;
  lastVisit: string;
}

// --- NEW: EXPENSES ---
export interface Expense {
  id: string;
  name: string; // ex: Água, Luz, Renda
  amount: number;
  type: 'fixed' | 'variable'; 
  paymentDay?: number; // Dia do mês (1-31) para despesas fixas
  nextDueDate: string; // Data ISO completa do próximo pagamento
  isPaid: boolean;
  lastPaidDate?: string;
  paymentMethod?: PaymentMethod; // NOVO: Regista como foi pago
  category?: string; // ex: Utilidades, Renda, Salários
}

// --- NEW: APPOINTMENTS ---
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AppointmentStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  category: string; // Selecionada da lista de categorias
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: string;
  items: InventoryItem[]; // Inventário isolado deste negócio
  sales: SaleRecord[]; // Vendas isoladas deste negócio
  employees: Employee[]; // Funcionários deste negócio
  suppliers: Supplier[]; // Fornecedores deste negócio
  customers: Customer[]; // Clientes deste negócio
  expenses: Expense[]; // Despesas do negócio
  appointments?: Appointment[]; // Agendamentos (Opcional para compatibilidade)
  auditLogs: AuditLogEntry[]; // Auditoria de acções
}

// A Conta "Mestra" (Baseada no número de telefone)
export interface Account {
  id: string;
  phoneNumber: string; // Identificador Principal
  password: string; // Password do Dono ("Mãe")
  ownerName: string;
  businesses: Business[]; // Lista de negócios associados a este número
}

export interface SubscriptionPlan {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  price: number;
  durationMonths: number;
  features: string[];
}

// Representa a sessão atual
export interface CurrentSession {
  account: Account;
  businessId: string; // ID do negócio selecionado
  operator: { // Quem está a operar agora?
    id: string;
    name: string;
    role: 'owner' | 'employee';
    roleLabel?: string; // NOVO: Cargo visual
    permissions: Permission[]; // Permissões da sessão atual
  };
}
