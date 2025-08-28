import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { AuthState } from "../types";

const STORAGE_KEY = "auth-state";

// Helpers to work with Zustand persist storage shape: { state: AuthState, version: number }
function readPersistedAuth(): any | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  const parsed = readPersistedAuth();
  return parsed?.state?.token ?? parsed?.token ?? null;
}

function getRefreshToken(): string | null {
  const parsed = readPersistedAuth();
  return parsed?.state?.refreshToken ?? parsed?.refreshToken ?? null;
}

function updateTokens(accessToken: string, newRefreshToken: string) {
  const parsed = readPersistedAuth();
  if (parsed && parsed.state) {
    parsed.state.token = accessToken;
    parsed.state.refreshToken = newRefreshToken;
    parsed.state.isAuthenticated = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } else if (parsed) {
    parsed.token = accessToken;
    parsed.refreshToken = newRefreshToken;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } else {
    const newState: { state: AuthState; version: number } = {
      state: {
        user: null,
        token: accessToken,
        refreshToken: newRefreshToken,
        isAuthenticated: true,
        isLoading: false,
      },
      version: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }
}

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
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const rt = getRefreshToken();
        if (rt) {
          const refreshResponse = await axios.post(
            `${
              process.env.REACT_APP_API_URL || "http://localhost:3001/api/v1"
            }/auth/refresh-token`,
            { refreshToken: rt }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            refreshResponse.data.data;

          updateTokens(accessToken, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear and redirect to login
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
