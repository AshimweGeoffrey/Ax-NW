import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
  Toolbar,
  List,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import { useAuthStore } from "../store/authStore";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    sales: 0,
    items: 0,
    lowStockCount: 0,
  });
  const [lowStock, setLowStock] = useState<
    Array<{ name: string; inventoryQuantity: number }>
  >([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Sales summary (defaults to last 30d)
        const [summaryRes, inventoryRes, lowRes] = await Promise.all([
          api.get("/sales/reports/summary"),
          api.get("/inventory", { params: { page: 1, limit: 1 } }),
          api.get("/inventory/reports/low-stock"),
        ]);

        const totalSales: number =
          summaryRes.data?.data?.summary?.totalSales || 0;
        const totalRevenue: number =
          summaryRes.data?.data?.summary?.totalRevenue || 0;
        const totalItems: number =
          inventoryRes.data?.data?.pagination?.total || 0;
        const lowItems: Array<{ name: string; inventoryQuantity: number }> =
          lowRes.data?.data?.items || [];

        setMetrics({
          revenue: totalRevenue,
          sales: totalSales,
          items: totalItems,
          lowStockCount: lowItems.length,
        });
        setLowStock(lowItems);
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message || "Failed to load dashboard";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to AX Stock Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Hello, {user?.name}! Your role: {user?.role}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {loading ? "…" : currency(metrics.revenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Sales
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {loading ? "…" : metrics.sales}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Inventory Items
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {loading ? "…" : metrics.items}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Low Stock Items
                  </Typography>
                  <Typography variant="h4" color="error">
                    {loading ? "…" : metrics.lowStockCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => navigate("/sales")}
                    >
                      Add Sale
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => navigate("/inventory")}
                    >
                      Add Inventory Item
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => navigate("/outgoing")}
                    >
                      Record Outgoing
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button variant="text" onClick={logout} color="error">
                      Logout
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Low Stock Alert List */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Low Stock Alert
                  </Typography>
                  {loading ? (
                    <Typography color="text.secondary">Loading…</Typography>
                  ) : lowStock.length === 0 ? (
                    <Typography color="text.secondary">
                      All good! No items below threshold.
                    </Typography>
                  ) : (
                    <List>
                      {lowStock.slice(0, 8).map((it) => (
                        <ListItem key={it.name} divider>
                          <ListItemText
                            primary={it.name}
                            secondary={`Quantity: ${it.inventoryQuantity}`}
                            primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                            secondaryTypographyProps={{
                              sx: {
                                color:
                                  it.inventoryQuantity === 0
                                    ? "error.main"
                                    : "warning.main",
                              },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;
