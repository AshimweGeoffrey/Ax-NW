import api from "./api";

export interface Named { name: string; units?: number; revenue?: number; sales?: number }
export interface Insights {
  range: { start: string; end: string };
  kpis: {
    revenue: number; sales: number; units: number; staff: number; avgOrderValue: number;
    previous: { revenue: number; sales: number; units: number };
    change: { revenue: number | null; sales: number | null; units: number | null };
  };
  daily: { day: string; revenue: number; sales: number; units: number }[];
  topItems: Named[]; byCategory: Named[]; byUser: Named[]; byPayment: Named[];
  byWeekday: { dow: number; sales: number; revenue: number }[];
  byHour: { hour: number; sales: number }[];
  stock: {
    items: number; units: number; outOfStock: number; lowStock: number;
    lowList: { name: string; category: string; quantity: number }[];
    byCategory: { name: string; items: number; units: number }[];
    slowMovers: { name: string; category: string; quantity: number }[];
  };
  outgoing: {
    byBranch: { name: string; units: number; movements: number }[];
    daily: { day: string; units: number }[];
    topItems: { name: string; units: number }[];
    totalUnits: number;
  };
}

export const insightsService = {
  get: async (params: Record<string, any>): Promise<Insights> =>
    (await api.get("/analytics/insights", { params })).data.data,
};
