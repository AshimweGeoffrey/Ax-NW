import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Toolbar,
  Container,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import * as XLSX from "xlsx";
import { inventoryService } from "../../services/inventory";
import { salesService } from "../../services/sales";
import { outgoingService, OutgoingItem } from "../../services/outgoing";
import { InventoryItem, Sale } from "../../types";

interface DashboardMetrics {
  totalRevenue: number;
  totalSales: number;
  totalItems: number;
  lowStockItems: number;
}

interface RevenueRow {
  month: string;
  revenue: number;
  sales_count: number;
}
interface PaymentRow {
  paymentMethod: string;
  _sum: { price: number | null };
  _count: number;
}
interface CategoryRow {
  category: string;
  _sum: { quantity: number | null; price: number | null };
  _count: number;
}

interface SalesByDayRow {
  day_name: string;
  items_count: number;
  revenue: number;
}

type TimeRange = "currentWeek" | "7d" | "30d" | "90d" | "1y";

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false); // exporting state
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueRow[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<PaymentRow[]>([]);
  const [salesByDay, setSalesByDay] = useState<SalesByDayRow[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryRow[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("currentWeek");

  const load = async (range: TimeRange) => {
    setLoading(true);
    try {
      const [dashRes, salesRes] = await Promise.all([
        api.get("/analytics/dashboard", { params: { timeRange: range } }),
        api.get("/analytics/sales", {
          params: { timeRange: range, week: "current" },
        }),
      ]);
      const data = dashRes.data?.data;
      setMetrics(data?.metrics || null);
      setRecent(data?.recentActivity?.recentSales || []);
      setRevenueByMonth((data?.charts?.revenueByMonth as RevenueRow[]) || []);
      setSalesByPayment(
        (data?.charts?.salesByPaymentMethod as PaymentRow[]) || []
      );
      setTopCategories((data?.charts?.topCategories as CategoryRow[]) || []);

      const salesData = salesRes.data?.data;
      setSalesByDay((salesData?.salesByDay as SalesByDayRow[]) || []);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to load analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(timeRange);
  }, [timeRange]);

  const currency = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "RWF",
    }).format(n || 0);

  // Map timeRange -> startDate/endDate ISO strings for Sales/Outgoing export
  const getDateRange = (
    range: TimeRange
  ): { startDate?: string; endDate?: string } => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined = new Date(now);

    if (range === "currentWeek") {
      const day = now.getDay(); // 0=Sun..6=Sat
      const diffToMonday = (day === 0 ? -6 : 1) - day; // move to Monday
      start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (range === "7d") {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (range === "30d") {
      start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (range === "90d") {
      start = new Date(now);
      start.setDate(now.getDate() - 89);
      start.setHours(0, 0, 0, 0);
    } else if (range === "1y") {
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
    }

    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
    };
  };

  // Fetch all pages helper
  const fetchAllInventory = async (): Promise<InventoryItem[]> => {
    const items: InventoryItem[] = [];
    let page = 1;
    const limit = 100;
    while (true) {
      const res = await inventoryService.list({ page, limit });
      const data = res.data;
      const batch = data?.items || [];
      items.push(...batch);
      const pagination = data?.pagination;
      if (!pagination || page >= (pagination.pages || 1)) break;
      page += 1;
    }
    return items;
  };

  const fetchAllSales = async (range: TimeRange): Promise<Sale[]> => {
    const sales: Sale[] = [];
    let page = 1;
    const limit = 100;
    const { startDate, endDate } = getDateRange(range);
    while (true) {
      const res = await salesService.list({ page, limit, startDate, endDate });
      const data = res.data;
      const batch = (data?.sales as Sale[]) || [];
      sales.push(...batch);
      const pagination = data?.pagination;
      if (!pagination || page >= (pagination.pages || 1)) break;
      page += 1;
    }
    return sales;
  };

  const fetchAllOutgoing = async (
    range: TimeRange
  ): Promise<OutgoingItem[]> => {
    const items: OutgoingItem[] = [];
    let page = 1;
    const limit = 100;
    const { startDate, endDate } = getDateRange(range);
    while (true) {
      const res = await outgoingService.list({
        page,
        limit,
        startDate,
        endDate,
      });
      const data = res.data;
      const batch = (data?.items as OutgoingItem[]) || [];
      items.push(...batch);
      const pagination = data?.pagination;
      if (!pagination || page >= (pagination.pages || 1)) break;
      page += 1;
    }
    return items;
  };

  // Helper to build a nicely formatted worksheet with title, widths, filters, and formats
  const buildAndAppendSheet = (
    wb: XLSX.WorkBook,
    sheetName: string,
    columns: Array<{
      key: string;
      label: string;
      type?: "text" | "int" | "float" | "currency" | "date";
    }>,
    rows: any[],
    titleNote?: string
  ) => {
    // Title row + header row + data rows
    const title = titleNote || `${sheetName} — ${timeRange}`;

    // Convert rows to AOA with correct primitive types for formatting
    const headerLabels = columns.map((c) => c.label);
    const aoa: any[][] = [];
    aoa.push([title]);
    aoa.push(headerLabels);
    for (const r of rows) {
      const row: any[] = [];
      for (const col of columns) {
        const v = r[col.key];
        switch (col.type) {
          case "int":
            row.push(v != null ? Number(v) : null);
            break;
          case "float":
          case "currency":
            row.push(v != null ? Number(v) : null);
            break;
          case "date":
            row.push(v ? new Date(v) : null);
            break;
          default:
            row.push(v ?? "");
        }
      }
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge title across all columns (A1 -> last col in row 1)
    ws["!merges"] = ws["!merges"] || [];
    ws["!merges"].push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: Math.max(0, columns.length - 1) },
    });

    // Column widths heuristic
    ws["!cols"] = columns.map((c) => {
      const base = Math.max(12, c.label.length + 2);
      if (c.type === "currency") return { wch: Math.max(base, 14) };
      if (c.type === "date") return { wch: Math.max(base, 20) };
      if (c.type === "int" || c.type === "float")
        return { wch: Math.max(base, 12) };
      return { wch: Math.max(base, 16) };
    });

    // Add auto filter on header row (row index 2, 1-based=A2)
    const lastRow = aoa.length; // 1-based
    const lastColIdx = Math.max(0, columns.length - 1);
    const rangeRef = XLSX.utils.encode_range({
      s: { r: 1, c: 0 },
      e: { r: lastRow - 1, c: lastColIdx },
    });
    ws["!autofilter"] = { ref: rangeRef } as any;

    // Apply number/date formats to data cells (starting at row 3 in Excel)
    for (let r = 2; r < aoa.length; r++) {
      for (let c = 0; c < columns.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        const col = columns[c];
        if (col.type === "currency") {
          cell.z = "[$RWF] #,##0";
        } else if (col.type === "int") {
          cell.z = "#,##0";
        } else if (col.type === "float") {
          cell.z = "#,##0.00";
        } else if (col.type === "date" && cell.v instanceof Date) {
          cell.z = "yyyy-mm-dd hh:mm:ss";
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);

      // Summary
      buildAndAppendSheet(
        wb,
        "Summary",
        [
          { key: "metric", label: "Metric", type: "text" },
          { key: "value", label: "Value", type: "text" },
        ],
        [
          { metric: "Time Range", value: timeRange },
          { metric: "Total Revenue", value: metrics?.totalRevenue ?? 0 },
          { metric: "Total Sales", value: metrics?.totalSales ?? 0 },
          { metric: "Inventory Items", value: metrics?.totalItems ?? 0 },
          { metric: "Low Stock", value: metrics?.lowStockItems ?? 0 },
        ],
        `Summary — ${timeRange} — ${dateStr}`
      );

      // Revenue by Month
      buildAndAppendSheet(
        wb,
        "RevenueByMonth",
        [
          { key: "month", label: "Month", type: "text" },
          { key: "revenue", label: "Revenue", type: "currency" },
          { key: "sales_count", label: "Sales Count", type: "int" },
        ],
        revenueByMonth,
        `Revenue by Month — ${timeRange} — ${dateStr}`
      );

      // Sales by Payment
      buildAndAppendSheet(
        wb,
        "SalesByPayment",
        [
          { key: "paymentMethod", label: "Payment Method", type: "text" },
          { key: "revenue", label: "Revenue", type: "currency" },
          { key: "count", label: "Count", type: "int" },
        ],
        salesByPayment.map((p) => ({
          paymentMethod: p.paymentMethod,
          revenue: p._sum?.price ?? 0,
          count: p._count ?? 0,
        })),
        `Sales by Payment — ${timeRange} — ${dateStr}`
      );

      // Sales by Day
      buildAndAppendSheet(
        wb,
        "SalesByDay",
        [
          { key: "day_name", label: "Day", type: "text" },
          { key: "items_count", label: "Items Count", type: "int" },
          { key: "revenue", label: "Revenue", type: "currency" },
        ],
        salesByDay,
        `Sales by Day — ${timeRange} — ${dateStr}`
      );

      // Top Categories
      buildAndAppendSheet(
        wb,
        "TopCategories",
        [
          { key: "category", label: "Category", type: "text" },
          { key: "quantity", label: "Quantity", type: "int" },
          { key: "revenue", label: "Revenue", type: "currency" },
        ],
        topCategories.map((c) => ({
          category: c.category || "N/A",
          quantity: c._sum?.quantity ?? 0,
          revenue: c._sum?.price ?? 0,
        })),
        `Top Categories — ${timeRange} — ${dateStr}`
      );

      // Recent Sales
      buildAndAppendSheet(
        wb,
        "RecentSales",
        [
          { key: "item", label: "Item", type: "text" },
          { key: "quantity", label: "Quantity", type: "int" },
          { key: "price", label: "Price", type: "currency" },
          { key: "paymentMethod", label: "Payment Method", type: "text" },
          { key: "timestamp", label: "Timestamp", type: "date" },
        ],
        recent.map((r) => ({
          item: r.itemName,
          quantity: r.quantity,
          price: r.price,
          paymentMethod: r.paymentMethod || "",
          timestamp: r.timeStamp ? new Date(r.timeStamp) : null,
        })),
        `Recent Sales — ${timeRange} — ${dateStr}`
      );

      // Fetch full datasets
      const [allInventory, allSales, allOutgoing] = await Promise.all([
        fetchAllInventory(),
        fetchAllSales(timeRange),
        fetchAllOutgoing(timeRange),
      ]);

      // Inventory
      buildAndAppendSheet(
        wb,
        "Inventory",
        [
          { key: "name", label: "Name", type: "text" },
          { key: "category", label: "Category", type: "text" },
          { key: "quantity", label: "Quantity", type: "int" },
          { key: "incoming", label: "Incoming TimeStamp", type: "date" },
        ],
        allInventory.map((i) => ({
          name: i.name,
          category: i.categoryName,
          quantity: i.inventoryQuantity,
          incoming: i.incomingTimeStamp ? new Date(i.incomingTimeStamp) : null,
        })),
        `Inventory — ${dateStr}`
      );

      // Sales
      buildAndAppendSheet(
        wb,
        "Sales",
        [
          { key: "item", label: "Item", type: "text" },
          { key: "quantity", label: "Quantity", type: "int" },
          { key: "price", label: "Price", type: "currency" },
          { key: "paymentMethod", label: "Payment Method", type: "text" },
          { key: "user", label: "User", type: "text" },
          { key: "timestamp", label: "Timestamp", type: "date" },
        ],
        allSales.map((s) => ({
          item: s.itemName,
          quantity: s.quantity,
          price: s.price,
          paymentMethod: s.paymentMethod,
          user: s.userName || "",
          timestamp: s.timeStamp ? new Date(s.timeStamp) : null,
        })),
        `Sales — ${timeRange} — ${dateStr}`
      );

      // Outgoing
      buildAndAppendSheet(
        wb,
        "Outgoing",
        [
          { key: "item", label: "Item", type: "text" },
          { key: "category", label: "Category", type: "text" },
          { key: "quantity", label: "Quantity", type: "int" },
          { key: "user", label: "User", type: "text" },
          { key: "branch", label: "Branch", type: "text" },
          { key: "timestamp", label: "Timestamp", type: "date" },
        ],
        allOutgoing.map((o) => ({
          item: o.itemName,
          category: o.categoryName || "",
          quantity: o.quantity,
          user: o.userName || "",
          branch: o.branchName || "",
          timestamp: o.timeStamp ? new Date(o.timeStamp) : null,
        })),
        `Outgoing — ${timeRange} — ${dateStr}`
      );

      XLSX.writeFile(wb, `Analytics_${timeRange}_${dateStr}.xlsx`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
          spacing={2}
        >
          <Typography variant="h4">Analytics</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="range">Time Range</InputLabel>
              <Select
                labelId="range"
                label="Time Range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <MenuItem value="currentWeek">Current Week</MenuItem>
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="1y">Last year</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              onClick={exportToExcel}
              startIcon={<FileDownloadRoundedIcon />}
              disabled={loading || exporting}
            >
              {exporting ? "Exporting…" : "Download Excel"}
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Total Revenue</Typography>
                <Typography variant="h5" color="primary">
                  {loading ? "…" : currency(metrics?.totalRevenue || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Total Sales</Typography>
                <Typography variant="h5" color="primary">
                  {loading ? "…" : metrics?.totalSales || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Inventory Items</Typography>
                <Typography variant="h5" color="primary">
                  {loading ? "…" : metrics?.totalItems || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">Low Stock</Typography>
                <Typography variant="h5" color="error">
                  {loading ? "…" : metrics?.lowStockItems || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue by Month
                </Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByMonth}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(v: any) => currency(Number(v) || 0)}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#40c793"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sales by Payment Method
                </Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByPayment.map((p) => ({
                        name: p.paymentMethod,
                        revenue: p._sum?.price || 0,
                        count: p._count || 0,
                      }))}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(v: any) => currency(Number(v) || 0)}
                      />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="#40c793"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Week: Sales by Day (Mon–Sun)
                </Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByDay}>
                      <XAxis dataKey="day_name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="items_count"
                        name="Items Sold (Qty)"
                        fill="#40c793"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="#8884d8"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Categories (by quantity)
                </Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCategories.map((c) => ({
                        name: c.category || "N/A",
                        qty: c._sum?.quantity || 0,
                      }))}
                    >
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="qty" fill="#0088FE" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sales
                </Typography>
                <List>
                  {recent.map((r) => (
                    <ListItem key={r.id} divider>
                      <ListItemText
                        primary={`${r.itemName} x${r.quantity} - ${currency(
                          r.price
                        )}`}
                        secondary={new Date(r.timeStamp).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AnalyticsPage;
