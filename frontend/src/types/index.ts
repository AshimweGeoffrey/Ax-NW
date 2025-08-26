export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  percentage?: string;
  profitPercentage: number;
  colorCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  managerId?: string;
  manager?: User;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  categoryName: string;
  category?: Category;
  inventoryQuantity: number;
  incomingTimeStamp?: Date;
  minStockLevel: number;
  maxStockLevel: number;
  unitCost: number;
  sellingPrice: number;
  supplier?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  creator?: User;
}

export interface Sale {
  id: string;
  invoiceNumber?: string;
  itemName?: string;
  category?: string;
  quantity: number;
  price: number;
  userName?: string;
  user?: User;
  item?: InventoryItem;
  categoryRel?: Category;
  timeStamp?: Date;
  paymentMethod?: string;
  payment?: PaymentMethod;
  discountAmount: number;
  taxAmount: number;
  customerName?: string;
  customerPhone?: string;
  branchId?: string;
  branch?: Branch;
}

export interface PaymentMethod {
  paymentId?: string;
  name: string;
  totalWeekly: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  item?: InventoryItem;
  movementType: "in" | "out" | "transfer" | "adjustment";
  quantity: number;
  fromBranchId?: string;
  toBranchId?: string;
  fromBranch?: Branch;
  toBranch?: Branch;
  referenceId?: string;
  referenceType?: "sale" | "purchase" | "transfer" | "adjustment";
  notes?: string;
  userId: string;
  user?: User;
  movementDate: Date;
}

export interface SystemLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Settings {
  id: string;
  keyName: string;
  value?: string;
  description?: string;
  category: string;
  updatedBy?: string;
  updater?: User;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
  timestamp?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalSales: number;
  totalItems: number;
  lowStockItems: number;
}

export interface ChartData {
  revenueByMonth: MonthlyRevenueData[];
  salesByPaymentMethod: PaymentMethodData[];
  topCategories: CategorySalesData[];
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  sales_count: number;
}

export interface PaymentMethodData {
  paymentMethod: string;
  _sum: { price: number };
  _count: number;
}

export interface CategorySalesData {
  category: string;
  _sum: { quantity: number; price: number };
  _count: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  accessControl?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CreateInventoryData {
  name: string;
  sku?: string;
  categoryName: string;
  inventoryQuantity?: number;
  unitCost?: number;
  sellingPrice?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  supplier?: string;
  location?: string;
}

export interface CreateSaleData {
  itemName: string;
  quantity: number;
  price: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  discountAmount?: number;
  taxAmount?: number;
  branchId?: string;
}

export interface FilterOptions {
  categories: Category[];
  branches: Branch[];
  users: User[];
  paymentMethods: PaymentMethod[];
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  branches?: string[];
  users?: string[];
  paymentMethods?: string[];
}

export type UserRole = "Administrator" | "Sale_Manager" | "Staff" | "Auditor";
export type MovementType = "in" | "out" | "transfer" | "adjustment";
export type ReferenceType = "sale" | "purchase" | "transfer" | "adjustment";
export type TimeRange = "7d" | "30d" | "90d" | "1y";
