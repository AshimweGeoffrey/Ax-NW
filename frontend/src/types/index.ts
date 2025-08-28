export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = "Administrator" | "Sale_Manager" | "Staff" | "Auditor";

export interface Category {
  id: string;
  name: string;
  percentage?: string; // varchar(12) in DB
}

export interface Branch {
  id: string;
  branch_name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  categoryName: string;
  inventoryQuantity: number;
  incomingTimeStamp?: Date;
}

export interface Sale {
  id: string;
  itemName: string;
  category?: string;
  quantity: number;
  price: number;
  userName?: string | null;
  timeStamp?: Date;
  paymentMethod: string;
}

export interface PaymentMethod {
  paymentId?: string;
  name: string;
  totalWeekly: number;
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
  page?: number;
  limit?: number;
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
  categoryName: string;
  inventoryQuantity?: number;
}

export interface CreateSaleData {
  itemName: string;
  quantity: number;
  price: number;
  paymentMethod: string;
}

export type TimeRange = "7d" | "30d" | "90d" | "1y";
