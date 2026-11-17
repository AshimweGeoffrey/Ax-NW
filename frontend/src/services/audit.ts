import api from "./api";

export interface AuditEntry {
  id: string; timeStamp: string; userName: string | null; role: string | null;
  method: string; path: string; status: number; ip: string | null; details: string | null;
}
export interface AuditResponse {
  items: AuditEntry[];
  users: string[];
  last24h: { total: number; failed: number; failedLogins: number; activeUsers: number };
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const auditService = {
  list: async (params: Record<string, any>): Promise<AuditResponse> => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
    return (await api.get("/audit", { params: clean })).data.data;
  },
};
