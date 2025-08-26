import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { AuthState } from "@/types";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authState = localStorage.getItem("auth-state");
    if (authState) {
      try {
        const { token }: AuthState = JSON.parse(authState);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error parsing auth state:", error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authState = localStorage.getItem("auth-state");
        if (authState) {
          const { refreshToken }: AuthState = JSON.parse(authState);

          if (refreshToken) {
            const refreshResponse = await axios.post(
              `${process.env.REACT_APP_API_URL}/auth/refresh`,
              { refreshToken }
            );

            const { accessToken, refreshToken: newRefreshToken } =
              refreshResponse.data.data;

            // Update auth state
            const currentAuthState: AuthState = JSON.parse(authState);
            const newAuthState: AuthState = {
              ...currentAuthState,
              token: accessToken,
              refreshToken: newRefreshToken,
            };
            localStorage.setItem("auth-state", JSON.stringify(newAuthState));

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("auth-state");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
