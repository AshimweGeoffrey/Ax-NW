import api from "./api";
import {
  ApiResponse,
  InventoryItem,
  PaginationResponse,
  CreateInventoryData,
} from "../types";

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export const inventoryService = {
  async list(
    params: InventoryListParams = {}
  ): Promise<ApiResponse<PaginationResponse<InventoryItem>>> {
    const response = await api.get("/inventory", { params });
    return response.data;
  },

  async getByName(name: string): Promise<ApiResponse<{ item: InventoryItem }>> {
    const response = await api.get(`/inventory/${encodeURIComponent(name)}`);
    return response.data;
  },

  async create(
    data: CreateInventoryData
  ): Promise<ApiResponse<{ item: InventoryItem }>> {
    const response = await api.post("/inventory", data);
    return response.data;
  },

  async update(
    name: string,
    data: Partial<CreateInventoryData>
  ): Promise<ApiResponse<{ item: InventoryItem }>> {
    const response = await api.put(
      `/inventory/${encodeURIComponent(name)}`,
      data
    );
    return response.data;
  },

  async adjust(
    name: string,
    payload: { quantityChange: number; notes?: string }
  ): Promise<ApiResponse<{ item: InventoryItem }>> {
    const response = await api.post(
      `/inventory/${encodeURIComponent(name)}/adjust`,
      payload
    );
    return response.data;
  },

  async remove(name: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/inventory/${encodeURIComponent(name)}`);
    return response.data;
  },

  async lowStock(): Promise<ApiResponse<{ items: InventoryItem[] }>> {
    const response = await api.get("/inventory/reports/low-stock");
    return response.data;
  },
};
