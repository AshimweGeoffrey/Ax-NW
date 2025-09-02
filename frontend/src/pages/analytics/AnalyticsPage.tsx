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
  Chip,
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
import AttachMoneyRounded from "@mui/icons-material/AttachMoneyRounded";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import * as XLSX from "xlsx";
import { inventoryService } from "../../services/inventory";
import { salesService } from "../../services/sales";
import { outgoingService, OutgoingItem } from "../../services/outgoing";
import { InventoryItem, Sale } from "../../types";

// Add MUI Date Pickers for custom ranges and export start date
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

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

type TimeRange = "currentWeek" | "7d" | "30d" | "90d" | "1y" | "custom";

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
  const [recentEntries, setRecentEntries] = useState<InventoryItem[]>([]);

  // Custom range state
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  // Optional export start override
  const [exportStart, setExportStart] = useState<Date | null>(null);

  const load = async (
    range: TimeRange,
    opts?: { startDate?: Date | null; endDate?: Date | null }
  ) => {
    setLoading(true);
    try {
      const params: any = { timeRange: range };
      if (range === "custom") {
        if (opts?.startDate) params.startDate = opts.startDate.toISOString();
        if (opts?.endDate) params.endDate = opts.endDate.toISOString();
      }
      const [dashRes, salesRes] = await Promise.all([
        api.get("/analytics/dashboard", { params }),
        api.get("/analytics/sales", {
          params: {
            ...params,
            week: range === "currentWeek" ? "current" : undefined,
          },
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

      // Load inventory to derive Recent Entry and Date (two fields only)
      const allInv = await fetchAllInventory();
      const list = allInv
        .filter((i) => (i.recentEntry ?? 0) > 0 && i.recentEntryAt)
        .sort(
          (a, b) =>
            new Date(b.recentEntryAt as any).getTime() -
            new Date(a.recentEntryAt as any).getTime()
        )
        .slice(0, 20);
      setRecentEntries(list);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to load analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange === "custom") {
      // Only load when at least a start date is selected; end date optional
      if (customStart) {
        load("custom", { startDate: customStart, endDate: customEnd });
      }
    } else {
      load(timeRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, customStart, customEnd]);

  const currency = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "RWF",
    }).format(n || 0);

  // Nicely format integers
  const fmt = (n: number) => new Intl.NumberFormat().format(n || 0);

  // Map timeRange -> startDate/endDate ISO strings for Sales/Outgoing export
  const getDateRange = (
    range: TimeRange,
    override?: { startDate?: Date | null; endDate?: Date | null }
  ): { startDate?: string; endDate?: string; titleNote?: string } => {
    if (range === "custom") {
      const s = override?.startDate || customStart || undefined;
      const e = override?.endDate || customEnd || undefined;
      return {
        startDate: s ? new Date(s).toISOString() : undefined,
        endDate: e ? new Date(e).toISOString() : undefined,
        titleNote: s
          ? `${new Date(s).toLocaleDateString()} — ${
              e ? new Date(e).toLocaleDateString() : "present"
            }`
          : "Custom Range",
      };
    }
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

  const fetchAllSales = async (
    range: TimeRange,
    opts?: { startDate?: string; endDate?: string }
  ): Promise<Sale[]> => {
    const sales: Sale[] = [];
    let page = 1;
    const limit = 100;
    const { startDate, endDate } = opts || getDateRange(range, undefined);
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
    range: TimeRange,
    opts?: { startDate?: string; endDate?: string }
  ): Promise<OutgoingItem[]> => {
    const items: OutgoingItem[] = [];
    let page = 1;
    const limit = 100;
    const { startDate, endDate } = opts || getDateRange(range, undefined);
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

      // Determine effective range for export (support optional exportStart override)
      const base = getDateRange(timeRange);
      const effectiveStart = exportStart
        ? exportStart.toISOString()
        : base.startDate;
      const effectiveEnd = timeRange === "custom" ? base.endDate : base.endDate; // unchanged
      const titleRange =
        timeRange === "custom"
          ? base.titleNote
          : effectiveStart
          ? `${new Date(effectiveStart).toLocaleDateString()} — ${
              effectiveEnd
                ? new Date(effectiveEnd).toLocaleDateString()
                : "present"
            }`
          : timeRange;

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
          { metric: "Range", value: titleRange || "" },
          { metric: "Total Revenue", value: metrics?.totalRevenue ?? 0 },
          { metric: "Total Sales", value: metrics?.totalSales ?? 0 },
          { metric: "Inventory Items", value: metrics?.totalItems ?? 0 },
          { metric: "Low Stock", value: metrics?.lowStockItems ?? 0 },
        ],
        `Summary — ${titleRange || timeRange} — ${dateStr}`
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

      // Fetch full datasets (respect effective range)
      const [allInventory, allSales, allOutgoing] = await Promise.all([
        fetchAllInventory(),
        fetchAllSales(timeRange, {
          startDate: effectiveStart,
          endDate: effectiveEnd,
        }),
        fetchAllOutgoing(timeRange, {
          startDate: effectiveStart,
          endDate: effectiveEnd,
        }),
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
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 3 }}
            spacing={2}
          >
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Analytics
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: "wrap", rowGap: 1 }}
            >
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
                  <MenuItem value="custom">Custom…</MenuItem>
                </Select>
              </FormControl>

              {/* Optional export start override */}
              <DatePicker
                label="Export Start (optional)"
                value={exportStart}
                onChange={(d) => setExportStart(d)}
                slotProps={{ textField: { size: "small" } as any }}
              />

              <Button
                variant="contained"
                color="primary"
                onClick={exportToExcel}
                startIcon={<FileDownloadRoundedIcon />}
                disabled={loading || exporting}
                sx={{ fontWeight: 700 }}
              >
                {exporting ? "Exporting…" : "Download Excel"}
              </Button>
            </Stack>
          </Stack>

          {/* Custom range pickers */}
          {timeRange === "custom" && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <DatePicker
                label="Start date"
                value={customStart}
                onChange={(d) => setCustomStart(d)}
                slotProps={{
                  textField: { size: "small", fullWidth: true } as any,
                }}
              />
              <DatePicker
                label="End date (optional)"
                value={customEnd}
                onChange={(d) => setCustomEnd(d)}
                slotProps={{
                  textField: { size: "small", fullWidth: true } as any,
                }}
              />
              <Button
                variant="outlined"
                onClick={() =>
                  load("custom", { startDate: customStart, endDate: customEnd })
                }
                disabled={!customStart}
              >
                Apply
              </Button>
            </Stack>
          )}
        </LocalizationProvider>

        <Grid container spacing={3}>
          {/* Metric: Total Revenue */}
          <Grid item xs={12} md={6} lg={3}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(64,199,147,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#40c793,#249e70)",
                }}
              />
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: 1, color: "text.secondary" }}
                  >
                    Total Revenue
                  </Typography>
                  <Typography
                    variant="h4"
                    color="primary"
                    sx={{ fontWeight: 800 }}
                  >
                    {loading ? "…" : currency(metrics?.totalRevenue || 0)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(64,199,147,0.15)",
                  }}
                >
                  <AttachMoneyRounded sx={{ color: "primary.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Metric: Total Sales */}
          <Grid item xs={12} md={6} lg={3}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(129,199,132,0.18)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#81c784,#43a047)",
                }}
              />
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: 1, color: "text.secondary" }}
                  >
                    Total Sales
                  </Typography>
                  <Typography
                    variant="h4"
                    color="primary"
                    sx={{ fontWeight: 800 }}
                  >
                    {loading ? "…" : fmt(metrics?.totalSales || 0)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(67,160,71,0.18)",
                  }}
                >
                  <ShoppingCartIcon sx={{ color: "#81c784" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Metric: Inventory Items */}
          <Grid item xs={12} md={6} lg={3}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(100,181,246,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#64b5f6,#1e88e5)",
                }}
              />
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: 1, color: "text.secondary" }}
                  >
                    Inventory Items
                  </Typography>
                  <Typography
                    variant="h4"
                    color="primary"
                    sx={{ fontWeight: 800 }}
                  >
                    {loading ? "…" : fmt(metrics?.totalItems || 0)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(30,136,229,0.18)",
                  }}
                >
                  <Inventory2Rounded sx={{ color: "#64b5f6" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Metric: Low Stock */}
          <Grid item xs={12} md={6} lg={3}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(255,138,101,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#ffb74d,#fb8c00)",
                }}
              />
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: 1, color: "text.secondary" }}
                  >
                    Low Stock
                  </Typography>
                  <Typography
                    variant="h4"
                    color="error"
                    sx={{ fontWeight: 800 }}
                  >
                    {loading ? "…" : fmt(metrics?.lowStockItems || 0)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(251,140,0,0.18)",
                  }}
                >
                  <WarningAmberRounded sx={{ color: "#ffb74d" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue by Month */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(64,199,147,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#40c793,#249e70)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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

          {/* Sales by Payment */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(38,198,218,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#26c6da,#00acc1)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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
                        fill="#26c6da"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sales by Day (Mon–Sun) */}
          <Grid item xs={12}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(186,104,200,0.18)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#ba68c8,#8e24aa)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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
                        fill="#8e24aa"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Categories */}
          <Grid item xs={12}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(100,181,246,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#64b5f6,#1e88e5)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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
                      <Bar dataKey="qty" fill="#1e88e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Sales */}
          <Grid item xs={12}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(64,199,147,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#40c793,#249e70)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  Recent Sales
                </Typography>
                <List>
                  {recent.map((r) => (
                    <ListItem
                      key={r.id}
                      divider
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <ListItemText
                        primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                        primary={`${r.itemName} x${r.quantity} — ${currency(
                          r.price
                        )}`}
                        secondary={new Date(r.timeStamp).toLocaleString()}
                      />
                      {r.paymentMethod && (
                        <Chip
                          label={r.paymentMethod}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Stock Entries */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(38,198,218,0.15)",
              }}
            >
              <Box
                sx={{
                  height: 4,
                  background: "linear-gradient(90deg,#26c6da,#00acc1)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  Recent Stock Entries (Qty & Date)
                </Typography>
                <List>
                  {recentEntries.map((it) => (
                    <ListItem key={it.id} divider>
                      <ListItemText
                        primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                        primary={`${it.name}`}
                        secondary={
                          it.recentEntryAt
                            ? `+${it.recentEntry ?? 0} — ${new Date(
                                it.recentEntryAt as any
                              ).toLocaleString()}`
                            : "+0 — -"
                        }
                      />
                    </ListItem>
                  ))}
                  {!loading && recentEntries.length === 0 && (
                    <ListItem>
                      <ListItemText primary="No recent stock entries" />
                    </ListItem>
                  )}
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
