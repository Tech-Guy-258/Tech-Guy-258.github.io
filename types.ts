
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

export type Permission = 
  | 'POS_SELL'
  | 'MANAGE_STOCK'
  | 'VIEW_REPORTS'
  | 'MANAGE_TEAM'
  | 'SETTINGS';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category | string;
  quantity: number; 
  size: number; 
  unit: Unit; 
  price: number; 
  sellingPrice: number; 
  expiryDate: string; 
  addedDate: string;
  imageUrl?: string;
  lowStockThreshold: number;
  type: 'product' | 'service';
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  supplierId?: string;
  supplierName?: string;
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
  operatorName: string;
  operatorId: string;
  customerId?: string;
  customerName?: string;
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

export type SubscriptionStatus = 'active' | 'expired' | 'trial';
export type PaymentProvider = 'mpesa' | 'emola';

export interface AuditLogEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SALE' | 'LOGIN' | 'SUBSCRIPTION' | 'CLOSE_REGISTER' | 'EXPENSE' | 'APPOINTMENT' | 'RESELLER';
  details: string;
  operatorName: string;
  timestamp: string;
}

export interface Employee {
  id: string;
  name: string;
  roleLabel: string;
  pinCode: string;
  permissions: Permission[];
  createdAt: string;
  createdBy: string;
}

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

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'variable'; 
  paymentDay?: number;
  nextDueDate: string;
  alertThreshold?: number; 
  isPaid: boolean;
  lastPaidDate?: string;
  paymentMethod?: PaymentMethod;
  operatorName?: string;
  category?: string;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  serviceNames: string[];
  totalAmount: number;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ResellerItem {
  itemId: string;
  itemName: string;
  quantity: number;
  priceAtDelivery: number;
}

export interface DeliveryBatch {
  id: string;
  date: string;
  items: ResellerItem[];
  totalValue: number;
}

export interface ResellerPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;
}

export interface Reseller {
  id: string; // Nome curto identificador
  name: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  idDocument?: string; // BI ou NUIT para segurança
  notes?: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  totalDebt: number; 
  totalPaid: number; 
  batches: DeliveryBatch[];
  payments: ResellerPayment[];
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: string;
  items: InventoryItem[];
  sales: SaleRecord[];
  employees: Employee[];
  suppliers: Supplier[];
  customers: Customer[];
  expenses: Expense[];
  appointments?: Appointment[];
  resellers?: Reseller[];
  auditLogs: AuditLogEntry[];
}

export interface Account {
  id: string;
  phoneNumber: string;
  password: string;
  ownerName: string;
  businesses: Business[];
}

export interface SubscriptionPlan {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  price: number;
  durationMonths: number;
  features: string[];
}

export interface CurrentSession {
  account: Account;
  businessId: string;
  operator: {
    id: string;
    name: string;
    role: 'owner' | 'employee';
    roleLabel?: string;
    permissions: Permission[];
  };
}
