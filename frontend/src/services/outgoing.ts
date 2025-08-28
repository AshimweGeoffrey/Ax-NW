import api from "./api";
import { ApiResponse, PaginationResponse } from "../types";

export interface OutgoingItem {
  id: string;
  itemName: string;
  categoryName: string;
  userName?: string | null;
  branchName?: string | null;
  quantity: number;
  timeStamp?: Date;
}

export interface OutgoingListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  product?: string;
}

export const outgoingService = {
  async list(params: OutgoingListParams = {}): Promise<
    ApiResponse<{
      items: OutgoingItem[];
      pagination: PaginationResponse<OutgoingItem>["pagination"];
    }>
  > {
    const res = await api.get("/outgoing", { params });
    return res.data;
  },
  async create(payload: {
    itemName: string;
    quantity: number;
    branchName?: string;
  }): Promise<ApiResponse<{ record: OutgoingItem }>> {
    const res = await api.post("/outgoing", payload);
    return res.data;
  },
  async remove(id: string): Promise<ApiResponse<{ message: string }>> {
    const res = await api.delete(`/outgoing/${id}`);
    return res.data;
  },
};
