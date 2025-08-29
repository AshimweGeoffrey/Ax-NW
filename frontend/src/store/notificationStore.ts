import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationType = "success" | "error" | "loading" | "blank" | "custom";

export interface UINotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: number; // epoch ms
  path?: string;
}

interface NotificationState {
  notifications: UINotification[];
  add: (n: Omit<UINotification, "id" | "createdAt"> & { id?: string; createdAt?: number }) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      add: ({ id, type, message, path, createdAt }) => {
        const safeId = id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ts = createdAt ?? Date.now();
        const trimmed = (message || "").toString().trim();
        if (!trimmed) return;
        const next = [{ id: safeId, type: (type as NotificationType) || "blank", message: trimmed, createdAt: ts, path }, ...get().notifications].slice(0, 200);
        set({ notifications: next });
      },
      remove: (id) => set({ notifications: get().notifications.filter((n) => n.id !== id) }),
      clear: () => set({ notifications: [] }),
    }),
    {
      name: "ax-notifications",
      partialize: (s) => ({ notifications: s.notifications }),
    }
  )
);
