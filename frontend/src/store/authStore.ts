import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, User, LoginCredentials } from "../types";
import { authService } from "../services/auth";
import toast from "react-hot-toast";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });

          const response = await authService.login(credentials);

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;

            set({
              user,
              token: accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });

            toast.success(`Welcome back, ${user.name}!`);
          } else {
            throw new Error("Login failed");
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message =
            error.response?.data?.error?.message || "Login failed";
          toast.error(message);
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        toast.success("Logged out successfully");
      },

      getCurrentUser: async () => {
        try {
          const { token } = get();
          if (!token) return;

          const response = await authService.getCurrentUser();

          if (response.success && response.data) {
            set({ user: response.data.user });
          }
        } catch (error: any) {
          console.error("Failed to get current user:", error);
          // If getting current user fails, logout
          get().logout();
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "auth-state",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
