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
} from "@mui/material";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

type TimeRange = "7d" | "30d" | "90d" | "1y";

const COLORS = [
  "#40c793",
  "#00C49F",
  "#0088FE",
  "#FFBB28",
  "#FF8042",
  "#8E44AD",
  "#E74C3C",
  "#2ECC71",
];

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueRow[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<PaymentRow[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryRow[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const load = async (range: TimeRange) => {
    setLoading(true);
    try {
      const res = await api.get("/analytics/dashboard", {
        params: { timeRange: range },
      });
      const data = res.data?.data;
      setMetrics(data?.metrics || null);
      setRecent(data?.recentActivity?.recentSales || []);
      setRevenueByMonth((data?.charts?.revenueByMonth as RevenueRow[]) || []);
      setSalesByPayment(
        (data?.charts?.salesByPaymentMethod as PaymentRow[]) || []
      );
      setTopCategories((data?.charts?.topCategories as CategoryRow[]) || []);
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
      currency: "USD",
    }).format(n || 0);

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: "240px" }}>
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
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="range">Time Range</InputLabel>
              <Select
                labelId="range"
                label="Time Range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="1y">Last year</MenuItem>
              </Select>
            </FormControl>
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
                      <PieChart>
                        <Pie
                          data={salesByPayment.map((p) => ({
                            name: p.paymentMethod,
                            value: p._sum?.price || 0,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {salesByPayment.map((_p, i) => (
                            <Cell
                              key={`c-${i}`}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => currency(Number(v) || 0)}
                        />
                        <Legend />
                      </PieChart>
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
                        <Bar
                          dataKey="qty"
                          fill="#0088FE"
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
    </Box>
  );
};

export default AnalyticsPage;
