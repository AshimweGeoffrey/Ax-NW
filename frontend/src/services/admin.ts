import api from "./api";

export interface UserRow { id: string; name: string; email: string; accessControl: string | null }
export interface BranchRow { id: string; name: string }
export interface CategoryRow { id: string; name: string; _count?: { inventory: number } }

export const usersService = {
  list: async (): Promise<UserRow[]> => (await api.get("/users")).data.data.users,
  create: async (d: { name: string; email: string; password: string; accessControl: string }) =>
    (await api.post("/users", d)).data,
  update: async (name: string, d: Partial<{ email: string; accessControl: string }>) =>
    (await api.put(`/users/${encodeURIComponent(name)}`, d)).data,
  resetPassword: async (name: string, newPassword: string) =>
    (await api.post(`/users/${encodeURIComponent(name)}/reset-password`, { newPassword })).data,
};

export const branchesService = {
  list: async (): Promise<BranchRow[]> => (await api.get("/branches")).data.data.branches,
  create: async (name: string) => (await api.post("/branches", { name })).data,
  remove: async (name: string) => (await api.delete(`/branches/${encodeURIComponent(name)}`)).data,
};

export const categoryAdminService = {
  list: async (): Promise<CategoryRow[]> => (await api.get("/categories")).data.data.categories,
  create: async (name: string) => (await api.post("/categories", { name })).data,
  remove: async (name: string) => (await api.delete(`/categories/${encodeURIComponent(name)}`)).data,
};
