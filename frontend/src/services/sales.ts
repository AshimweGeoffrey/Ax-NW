import api from "./api";
import { ApiResponse, Sale, PaginationResponse } from "../types";

export interface SalesListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  product?: string;
}

export const salesService = {
  async list(params: SalesListParams = {}): Promise<
    ApiResponse<{
      sales: Sale[];
      pagination: PaginationResponse<Sale>["pagination"];
    }>
  > {
    const res = await api.get("/sales", { params });
    return res.data;
  },
  async create(payload: {
    itemName: string;
    quantity: number;
    price: number;
    paymentMethod: "Cash" | "Mobile Money" | "Pos";
  }): Promise<ApiResponse<{ sale: Sale }>> {
    const res = await api.post("/sales", payload);
    return res.data;
  },
  async summary(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<
    ApiResponse<{ summary: any; salesByPaymentMethod: any; salesByDay: any }>
  > {
    const res = await api.get("/sales/reports/summary", { params });
    return res.data;
  },
};
