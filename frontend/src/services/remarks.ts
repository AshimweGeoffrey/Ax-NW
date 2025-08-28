import api from "./api";
import { ApiResponse } from "../types";

export interface Remark {
  id: string;
  timeStamp: string;
  message: string;
}

export const remarksService = {
  async list(): Promise<ApiResponse<{ items: Remark[] }>> {
    const res = await api.get("/remarks");
    return res.data;
  },
  async create(message: string): Promise<ApiResponse<{ remark: Remark }>> {
    const res = await api.post("/remarks", { message });
    return res.data;
  },
};
