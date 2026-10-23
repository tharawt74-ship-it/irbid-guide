export type AppUserRole = 'ownerA' | 'ownerB';

export interface AppAuthSession {
  role: AppUserRole;
  name: string;
}

export type AppTabName = 'dashboard' | 'operations' | 'inventory' | 'doughs' | 'products' | 'profiles' | 'factory' | 'activity' | 'settings';

export interface SupplierItem {
  inventoryId: string;
  price: number; // Total price for the given quantity
  quantity: number; // Quantity for this price (e.g. 10 kg)
}

export interface AppBusinessEntity {
  id: string;
  type: 'salesperson' | 'pos' | 'supplier';
  name: string;
  commissionMode?: 'fixed' | 'wholesale';
  commissionRate?: number; // JOD per unit if fixed
  wholesalePrice?: number; // JOD per unit if wholesale
  debt: number; // Account Receivables
  rating?: number; // 1-5
  isBlacklisted?: boolean;
  supplierItems?: SupplierItem[];
  supplierStatus?: 'primary' | 'backup';
  note?: string;
  startDate?: string;
  status?: 'active' | 'inactive';
  stoppedAt?: string;
  contactInfo?: string;
  location?: string;
}

export interface AppStockItem {
  id: string;
  name: string;
  quantity: number; // in units (boxes/grams)
  unit: 'box' | 'kg' | 'gram' | 'piece' | 'ml' | 'liter';
  category: 'food' | 'pre-production' | 'non-food';
  unitCost: number; // computed or manual
  priceHistory: { date: string; price: number }[];
  safetyStock: number;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number; // Unit price
  total: number;
  supplierName?: string;
  note?: string;
  customerName?: string;
  isPaid?: boolean;
}

export interface Invoice {
  id: string;
  type: 'sale' | 'purchase' | 'return';
  items: InvoiceItem[];
  totalAmount: number;
  date: string;
  issuer: 'محمد' | 'عبيدة';
  relatedProfileId?: string;
  relatedProfileName?: string;
  description?: string;
  note?: string;
}

export interface AppAccountingRecord {
  id: string;
  date: string;
  type: 'sale' | 'purchase' | 'waste' | 'return' | 'deposit' | 'expense' | 'production' | 'withdrawal';
  amountJOD: number;
  description: string;
  responsibleId?: 'محمد' | 'عبيدة'; // Updated to literal names
  relatedProfileId?: string;
  relatedInvoiceId?: string; // Link to detailed invoice
  isCredit?: boolean;
  fundSource?: 'project' | 'mohammed' | 'obaida'; // Standardized source names
  cogsJOD?: number;
  productId?: string;
  quantity?: number;
  expenseCategory?: string;
  customerName?: string;
  isPaid?: boolean;
}

export interface AppDoughFormula {
  id: string;
  name: string;
  yieldWeightGram: number;
  ingredients: { inventoryId: string; quantity: number }[];
}

export interface AppCatalogItem {
  id: string;
  name: string;
  sellingPriceJOD: number;
  piecesCount?: number;
  doughWeightPerPiece?: number;
  fillingWeightPerPiece?: number;
  doughComponents: { doughId: string; quantityGram: number }[]; // kept for legacy / generic products
  piecesComponents?: { inventoryId: string; quantity: number; weightPerPieceGram: number; doughId: string }[];
  addons: { inventoryId: string; quantity: number; displayUnit?: string }[];
}


export interface AppGlobalSettings {
  adminPasswordHash: string;
  ownerAShare: number; // 0.58
  ownerBShare: number; // 0.42
}

export interface ProductionTask {
  id: string;
  plan: Record<string, number>;
  totalCost: number;
  createdAt: string; // ISO timestamp
}

export interface ProductionLog {
  id: string;
  plan: Record<string, number>;
  finishedAt: string; // ISO timestamp
  startedAt: string;
}

export interface ShoppingListItem {
  inventoryId: string;
  name: string;
  quantityNeeded: number;
  actualQuantity?: number; // User can override
  actualPrice?: number; // Total price paid for the quantity
  supplierId?: string; // Selected supplier
  supplierName?: string; // For manual entry or "Other"
  skipped?: boolean; // Label as "Not Purchased"
  unit: string;
  note?: string;
}

export interface ShoppingList {
  id: string;
  items: ShoppingListItem[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string; // ISO
  details?: string;
}

export interface TrashItem {
  id: string;
  type: 'transaction' | 'product' | 'doughRecipe' | 'profile' | 'inventoryItem' | 'invoice' | 'task' | 'shoppingList' | 'activityLog';
  data: any;
  deletedAt: string; // ISO timestamp
  reason?: string;
}

export interface AppCoreState {
  profiles: AppBusinessEntity[];
  inventory: AppStockItem[];
  transactions: AppAccountingRecord[];
  doughRecipes: AppDoughFormula[];
  products: AppCatalogItem[];
  settings: AppGlobalSettings;
  productionQueue: ProductionTask[];
  productionHistory: ProductionLog[];
  shoppingLists: ShoppingList[];
  invoices: Invoice[];
  activityLogs: ActivityLog[];
  trash: TrashItem[];
}

export const INITIAL_STATE: AppCoreState = {
  profiles: [
    { id: 'p_1', type: 'salesperson', name: 'أحمد (مبيعات)', commissionMode: 'fixed', commissionRate: 0.5, debt: 0 },
    { id: 'p_2', type: 'pos', name: 'مقهى وسط البلد', commissionMode: 'wholesale', wholesalePrice: 4.5, debt: 15.0 },
    { id: 'p_3', type: 'supplier', name: 'مطاحن عمان (طحين)', debt: 0 }
  ],
  inventory: [
    { id: 'i_1', name: 'الطحين', quantity: 10, unit: 'kg', category: 'food', unitCost: 0.275, priceHistory: [], safetyStock: 5 },
    { id: 'i_2', name: 'السكر الأبيض', quantity: 10, unit: 'kg', category: 'food', unitCost: 0.600, priceHistory: [], safetyStock: 5 },
    { id: 'i_3', name: 'الزبدة', quantity: 1, unit: 'kg', category: 'food', unitCost: 2.000, priceHistory: [], safetyStock: 2 },
    { id: 'i_4', name: 'دبس التمر الأسود', quantity: 900, unit: 'gram', category: 'food', unitCost: 0.00222, priceHistory: [], safetyStock: 500 },
    { id: 'i_5', name: 'نشا الذرة', quantity: 1, unit: 'kg', category: 'food', unitCost: 0.750, priceHistory: [], safetyStock: 1 },
    { id: 'i_6', name: 'البيض', quantity: 30, unit: 'piece', category: 'food', unitCost: 0.09166, priceHistory: [], safetyStock: 30 },
    { id: 'i_7', name: 'جليسرين غذائي', quantity: 1, unit: 'kg', category: 'food', unitCost: 5.000, priceHistory: [], safetyStock: 1 },
    { id: 'i_8', name: 'فانيلا باودر', quantity: 144, unit: 'gram', category: 'food', unitCost: 0.00347, priceHistory: [], safetyStock: 50 },
    { id: 'i_9', name: 'بيكنغ باودر', quantity: 144, unit: 'gram', category: 'food', unitCost: 0.00347, priceHistory: [], safetyStock: 50 },
    { id: 'i_10', name: 'شوكولاتة دهن (حشوة)', quantity: 1, unit: 'kg', category: 'food', unitCost: 2.000, priceHistory: [], safetyStock: 1 },
    { id: 'i_11', name: 'شوكولاتة شبس', quantity: 1, unit: 'kg', category: 'food', unitCost: 3.000, priceHistory: [], safetyStock: 1 },
    { id: 'i_12', name: 'شوكولاتة دروبس', quantity: 1, unit: 'kg', category: 'food', unitCost: 4.000, priceHistory: [], safetyStock: 1 },
    { id: 'i_13', name: 'أصنص الشوكولاتة', quantity: 360, unit: 'ml', category: 'food', unitCost: 0.01388, priceHistory: [], safetyStock: 100 },
    { id: 'i_14', name: 'ملون طعام', quantity: 120, unit: 'gram', category: 'food', unitCost: 0.02083, priceHistory: [], safetyStock: 50 },
    { id: 'i_15', name: 'بوكس تغليف', quantity: 500, unit: 'piece', category: 'non-food', unitCost: 0.15, priceHistory: [], safetyStock: 100 },
    { id: 'i_16', name: 'ملح', quantity: 1, unit: 'kg', category: 'food', unitCost: 0.250, priceHistory: [], safetyStock: 1 },
    { id: 'i_17', name: 'جرة غاز', quantity: 1, unit: 'piece', category: 'non-food', unitCost: 8.000, priceHistory: [], safetyStock: 1 },
    { id: 'i_frozen_30', name: 'حبات كوكيز مجمدة (32 جرام)', quantity: 0, unit: 'piece', category: 'pre-production', unitCost: 0, priceHistory: [], safetyStock: 50 },
    { id: 'i_frozen_25', name: 'حبات كوكيز مجمدة (24 جرام)', quantity: 0, unit: 'piece', category: 'pre-production', unitCost: 0, priceHistory: [], safetyStock: 50 },
    { id: 'i_prepared_dough', name: 'عجينة جاهزة', quantity: 0, unit: 'gram', category: 'pre-production', unitCost: 0, priceHistory: [], safetyStock: 2000 }
  ],
  transactions: [],
  doughRecipes: [
    {
      id: 'dr_1',
      name: 'عجينة الفانيلا',
      yieldWeightGram: 470,
      ingredients: [
        { inventoryId: 'i_1', quantity: 0.195 },
        { inventoryId: 'i_3', quantity: 0.100 },
        { inventoryId: 'i_2', quantity: 0.090 },
        { inventoryId: 'i_6', quantity: 1 },
        { inventoryId: 'i_5', quantity: 0.020 },
        { inventoryId: 'i_4', quantity: 15 },
        { inventoryId: 'i_7', quantity: 0.005 },
        { inventoryId: 'i_8', quantity: 5 },
        { inventoryId: 'i_9', quantity: 3 },
        { inventoryId: 'i_16', quantity: 0.002 }
      ]
    }
  ],
  products: [
    {
      id: 'pr_1',
      name: 'بوكس كوكيز عادي (15 حبات)',
      sellingPriceJOD: 2.70,
      piecesCount: 15,
      doughWeightPerPiece: 26,
      fillingWeightPerPiece: 6,
      doughComponents: [
        { doughId: 'dr_1', quantityGram: 390 }
      ],
      piecesComponents: [
        { inventoryId: 'i_frozen_30', quantity: 15, weightPerPieceGram: 26, doughId: 'dr_1' }
      ],
      addons: [
        { inventoryId: 'i_10', quantity: 0.090 }, // Filling
        { inventoryId: 'i_12', quantity: 0.0158 }, // Drops
        { inventoryId: 'i_15', quantity: 1 } // Box
      ]
    },
    {
      id: 'pr_2',
      name: 'بوكس كوكيز 4+1 مجانا',
      sellingPriceJOD: 1.00,
      piecesCount: 5,
      doughWeightPerPiece: 20,
      fillingWeightPerPiece: 4,
      doughComponents: [
        { doughId: 'dr_1', quantityGram: 100 }
      ],
      piecesComponents: [
        { inventoryId: 'i_frozen_25', quantity: 5, weightPerPieceGram: 20, doughId: 'dr_1' }
      ],
      addons: [
        { inventoryId: 'i_10', quantity: 0.020 }, // Filling
        { inventoryId: 'i_12', quantity: 0.0053 }, // Drops
        { inventoryId: 'i_15', quantity: 1 } // Box
      ]
    }
  ],
  settings: {
    adminPasswordHash: 'AS1234AS',
    ownerAShare: 0.58,
    ownerBShare: 0.42
  },
  productionQueue: [],
  productionHistory: [],
  shoppingLists: [],
  invoices: [],
  activityLogs: [],
  trash: []
};
