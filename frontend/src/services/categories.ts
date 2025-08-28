import api from "./api";
import { ApiResponse, Category } from "../types";

export const categoriesService = {
  async list(): Promise<ApiResponse<{ categories: Category[] }>> {
    const res = await api.get("/categories");
    return res.data;
  },
};
