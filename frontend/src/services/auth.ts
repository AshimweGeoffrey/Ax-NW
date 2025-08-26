import api from "./api";
import {
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
  User,
  ApiResponse,
} from "@/types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<
    ApiResponse<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>
  > {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<ApiResponse<{ user: User }>> {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    const response = await api.put("/auth/change-password", data);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<
    ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>
  > {
    const response = await api.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  logout(): void {
    localStorage.removeItem("auth-state");
  },
};
