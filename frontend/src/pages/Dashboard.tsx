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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { useAuthStore } from "../store/authStore";
// removed: import Sidebar from "../components/Sidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import OutboundIcon from "@mui/icons-material/Outbound";
import AddBoxIcon from "@mui/icons-material/AddBox";
import UpgradeIcon from "@mui/icons-material/Upgrade";
import CampaignIcon from "@mui/icons-material/Campaign";
import { inventoryService } from "../services/inventory";
import { salesService } from "../services/sales";
import { outgoingService } from "../services/outgoing";
import { categoriesService } from "../services/categories";
import { remarksService } from "../services/remarks";
import { Category, InventoryItem } from "../types";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import { useNotificationStore } from "../store/notificationStore";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();

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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [openSale, setOpenSale] = useState(false);
  const [openOutgoing, setOpenOutgoing] = useState(false);
  const [openAddItem, setOpenAddItem] = useState(false);
  const [openUpdateItem, setOpenUpdateItem] = useState(false);
  const [openNotice, setOpenNotice] = useState(false);

  const [saleForm, setSaleForm] = useState<{
    itemName: string;
    quantity: number;
    price: number;
    paymentMethod: "Cash" | "Mobile Money" | "Card";
  }>({ itemName: "", quantity: 1, price: 0, paymentMethod: "Cash" });

  const [outForm, setOutForm] = useState<{
    itemName: string;
    quantity: number;
    branchName?: string;
  }>({ itemName: "", quantity: 1 });

  const [addForm, setAddForm] = useState<{
    name: string;
    categoryName: string;
    inventoryQuantity: number;
  }>({ name: "", categoryName: "", inventoryQuantity: 0 });

  const [updateForm, setUpdateForm] = useState<{
    name: string;
    categoryName?: string;
    inventoryQuantity?: number;
  }>({ name: "" });

  const [noticeMessage, setNoticeMessage] = useState("");

  const [typeFilter, setTypeFilter] = useState<"all" | "success" | "error" | "loading">("all");

  const PAYMENT_OPTIONS: Array<"Cash" | "Mobile Money" | "Card"> = [
    "Cash",
    "Mobile Money",
    "Card",
  ];

  const notifications = useNotificationStore((s) => s.notifications);
  const clearNotifications = useNotificationStore((s) => s.clear);

  const filteredNotifications = notifications.filter((n) =>
    typeFilter === "all" ? true : n.type === typeFilter
  );

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
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

  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([
        loadDashboard(),
        loadItems(),
        loadCategories(),
      ]);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = async () => {
    try {
      const res = await inventoryService.list({ page: 1, limit: 1000 });
      setItems(res.data?.items || []);
    } catch (e: any) {
      // ignore
    }
  };

  const loadCategories = async () => {
    try {
      const res = await categoriesService.list();
      setCategories(res.data?.categories || []);
    } catch (e: any) {
      // ignore
    }
  };

  const handleSubmitSale = async () => {
    try {
      if (!saleForm.itemName) return toast.error("Select an item");
      if (saleForm.quantity < 1)
        return toast.error("Quantity must be at least 1");
      if (saleForm.price < 0) return toast.error("Price cannot be negative");
      await salesService.create(saleForm);
      toast.success("Sale recorded");
      setOpenSale(false);
      setSaleForm({
        itemName: "",
        quantity: 1,
        price: 0,
        paymentMethod: "Cash",
      });
      await Promise.all([loadDashboard(), loadItems()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to record sale");
    }
  };

  const handleSubmitOutgoing = async () => {
    try {
      if (!outForm.itemName) return toast.error("Select an item");
      if (outForm.quantity < 1)
        return toast.error("Quantity must be at least 1");
      await outgoingService.create(outForm);
      toast.success("Outgoing recorded");
      setOpenOutgoing(false);
      setOutForm({ itemName: "", quantity: 1 });
      await Promise.all([loadDashboard(), loadItems()]);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to record outgoing"
      );
    }
  };

  const handleSubmitAddItem = async () => {
    try {
      if (!addForm.name.trim() || !addForm.categoryName)
        return toast.error("Name and category are required");
      await inventoryService.create({
        name: addForm.name.trim(),
        categoryName: addForm.categoryName,
        inventoryQuantity: Number(addForm.inventoryQuantity) || 0,
      });
      toast.success("Item created");
      setOpenAddItem(false);
      setAddForm({ name: "", categoryName: "", inventoryQuantity: 0 });
      await Promise.all([loadDashboard(), loadItems()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to create item");
    }
  };

  const handleSubmitUpdateItem = async () => {
    try {
      if (!updateForm.name) return toast.error("Select an item");

      // Optional category change via update endpoint
      if (updateForm.categoryName) {
        await inventoryService.update(updateForm.name, {
          categoryName: updateForm.categoryName,
        });
      }

      // Quantity field acts as increment (add to current stock)
      if (
        typeof updateForm.inventoryQuantity === "number" &&
        !Number.isNaN(updateForm.inventoryQuantity)
      ) {
        const inc = Number(updateForm.inventoryQuantity);
        if (inc <= 0) return toast.error("Enter a positive quantity to add");
        await inventoryService.adjust(updateForm.name, {
          quantityChange: inc,
          notes: "Dashboard quick increment",
        });
      }

      if (!updateForm.categoryName && updateForm.inventoryQuantity == null) {
        return toast.error("No changes to apply");
      }

      toast.success("Item updated");
      setOpenUpdateItem(false);
      setUpdateForm({ name: "" });
      await Promise.all([loadDashboard(), loadItems()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to update item");
    }
  };

  const handleSubmitNotice = async () => {
    try {
      if (!noticeMessage.trim()) return toast.error("Please enter a message");
      await remarksService.create(noticeMessage.trim());
      toast.success("Notice posted");
      setOpenNotice(false);
      setNoticeMessage("");
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to post notice");
    }
  };

  // Number formatter for large values
  const fmt = (n: number) => new Intl.NumberFormat().format(n || 0);

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 800 }}
          >
            Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome, {user?.name}. Quick overview of sales and stock status.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Metric: Total Sales */}
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
                    Total Sales
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800 }}
                    color="primary"
                  >
                    {loading ? "…" : fmt(metrics.sales)}
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
                  <ShoppingCartIcon sx={{ color: "primary.main" }} />
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
                    sx={{ fontWeight: 800 }}
                    color="primary"
                  >
                    {loading ? "…" : fmt(metrics.items)}
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

          {/* Metric: Low Stock Items */}
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
                    Low Stock Items
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800 }}
                    color="error"
                  >
                    {loading ? "…" : fmt(metrics.lowStockCount)}
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

          {/* Quick Actions */}
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
                  Quick Actions
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {/* Conduct Sale - Green */}
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => setOpenSale(true)}
                    sx={{
                      borderRadius: 999,
                      px: 2.5,
                      py: 1.25,
                      color: "#0f1115",
                      background: "linear-gradient(135deg,#40c793,#249e70)",
                      boxShadow: "0 4px 14px rgba(64,199,147,0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg,#2aa574,#1b845a)",
                        boxShadow: "0 6px 18px rgba(64,199,147,0.45)",
                      },
                    }}
                  >
                    Conduct Sale
                  </Button>

                  {/* Outgoing - Amber */}
                  <Button
                    variant="contained"
                    startIcon={<OutboundIcon />}
                    onClick={() => setOpenOutgoing(true)}
                    sx={{
                      borderRadius: 999,
                      px: 2.5,
                      py: 1.25,
                      color: "#0f1115",
                      background: "linear-gradient(135deg,#ffb74d,#fb8c00)",
                      boxShadow: "0 4px 14px rgba(251,140,0,0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg,#ffa726,#f57c00)",
                        boxShadow: "0 6px 18px rgba(251,140,0,0.5)",
                      },
                    }}
                  >
                    Outgoing
                  </Button>

                  {/* Add New Item - Blue */}
                  <Button
                    variant="contained"
                    startIcon={<AddBoxIcon />}
                    onClick={() => setOpenAddItem(true)}
                    sx={{
                      borderRadius: 999,
                      px: 2.5,
                      py: 1.25,
                      color: "#fff",
                      background: "linear-gradient(135deg,#64b5f6,#1e88e5)",
                      boxShadow: "0 4px 14px rgba(30,136,229,0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg,#42a5f5,#1976d2)",
                        boxShadow: "0 6px 18px rgba(30,136,229,0.5)",
                      },
                    }}
                  >
                    Add New Item
                  </Button>

                  {/* Update Item - Purple */}
                  <Button
                    variant="contained"
                    startIcon={<UpgradeIcon />}
                    onClick={() => setOpenUpdateItem(true)}
                    sx={{
                      borderRadius: 999,
                      px: 2.5,
                      py: 1.25,
                      color: "#fff",
                      background: "linear-gradient(135deg,#ba68c8,#8e24aa)",
                      boxShadow: "0 4px 14px rgba(142,36,170,0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg,#ab47bc,#7b1fa2)",
                        boxShadow: "0 6px 18px rgba(142,36,170,0.5)",
                      },
                    }}
                  >
                    Update Item
                  </Button>

                  {/* Add Notice - Cyan */}
                  <Button
                    variant="contained"
                    startIcon={<CampaignIcon />}
                    onClick={() => setOpenNotice(true)}
                    sx={{
                      borderRadius: 999,
                      px: 2.5,
                      py: 1.25,
                      color: "#0f1115",
                      background: "linear-gradient(135deg,#26c6da,#00acc1)",
                      boxShadow: "0 4px 14px rgba(0,172,193,0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg,#00bcd4,#0097a7)",
                        boxShadow: "0 6px 18px rgba(0,172,193,0.5)",
                      },
                    }}
                  >
                    Add Notice
                  </Button>

                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    variant="text"
                    onClick={logout}
                    color="error"
                    sx={{ fontWeight: 600 }}
                  >
                    Logout
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Center */}
          <Grid item xs={12} md={6}>
            <Card sx={{ overflow: "hidden", border: "1px solid rgba(64,199,147,0.15)" }}>
              <Box sx={{ height: 4, background: "linear-gradient(90deg,#40c793,#249e70)" }} />
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <NotificationsActiveIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Notification Center</Typography>
                    <Chip size="small" label={notifications.length} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={typeFilter}
                      onChange={(_e, v) => v && setTypeFilter(v)}
                    >
                      <ToggleButton value="all">All</ToggleButton>
                      <ToggleButton value="success">Success</ToggleButton>
                      <ToggleButton value="error">Error</ToggleButton>
                      <ToggleButton value="loading">Loading</ToggleButton>
                    </ToggleButtonGroup>
                    <Button variant="text" color="error" onClick={clearNotifications}>
                      Clear
                    </Button>
                  </Stack>
                </Stack>

                {filteredNotifications.length === 0 ? (
                  <Typography color="text.secondary">No notifications yet.</Typography>
                ) : (
                  <List sx={{ maxHeight: 360, overflowY: "auto" }}>
                    {filteredNotifications.map((n) => (
                      <ListItem key={n.id} divider sx={{ alignItems: "flex-start" }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: "100%" }}>
                          {n.type === "success" ? (
                            <CheckCircleOutlineIcon color="success" fontSize="small" />
                          ) : n.type === "error" ? (
                            <ErrorOutlineIcon color="error" fontSize="small" />
                          ) : (
                            <HistoryIcon color="info" fontSize="small" />
                          )}
                          <Stack sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{n.message}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {timeAgo(n.createdAt)} {n.path ? `• ${n.path}` : ""}
                            </Typography>
                          </Stack>
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Low Stock Alert List */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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
                      <ListItem
                        key={it.name}
                        divider
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
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
                        <Chip
                          label={it.inventoryQuantity === 0 ? "Out" : "Low"}
                          color={
                            it.inventoryQuantity === 0 ? "error" : "warning"
                          }
                          size="small"
                          variant="outlined"
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

      {/* Modals for quick actions (wired up) */}
      <Dialog
        open={openSale}
        onClose={() => setOpenSale(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Conduct Sale</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="sale-item">Item</InputLabel>
              <Select
                labelId="sale-item"
                label="Item"
                value={saleForm.itemName}
                onChange={(e) =>
                  setSaleForm((s) => ({ ...s, itemName: e.target.value }))
                }
              >
                {items.map((it) => (
                  <MenuItem key={it.id} value={it.name}>
                    {it.name} (qty: {it.inventoryQuantity})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Quantity"
                type="number"
                value={saleForm.quantity}
                onChange={(e) =>
                  setSaleForm((s) => ({
                    ...s,
                    quantity: Number(e.target.value),
                  }))
                }
                fullWidth
              />
              <TextField
                label="Price"
                type="number"
                value={saleForm.price}
                onChange={(e) =>
                  setSaleForm((s) => ({ ...s, price: Number(e.target.value) }))
                }
                fullWidth
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="sale-pay">Payment Method</InputLabel>
              <Select
                labelId="sale-pay"
                label="Payment Method"
                value={saleForm.paymentMethod}
                onChange={(e) =>
                  setSaleForm((s) => ({
                    ...s,
                    paymentMethod: e.target.value as any,
                  }))
                }
              >
                {PAYMENT_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSale(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitSale}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openOutgoing}
        onClose={() => setOpenOutgoing(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Outgoing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="out-item">Item</InputLabel>
              <Select
                labelId="out-item"
                label="Item"
                value={outForm.itemName}
                onChange={(e) =>
                  setOutForm((f) => ({ ...f, itemName: e.target.value }))
                }
              >
                {items.map((it) => (
                  <MenuItem key={it.id} value={it.name}>
                    {it.name} (qty: {it.inventoryQuantity})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantity"
              type="number"
              value={outForm.quantity}
              onChange={(e) =>
                setOutForm((f) => ({ ...f, quantity: Number(e.target.value) }))
              }
              fullWidth
            />
            <TextField
              label="Branch (optional)"
              value={outForm.branchName || ""}
              onChange={(e) =>
                setOutForm((f) => ({ ...f, branchName: e.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOutgoing(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitOutgoing}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openAddItem}
        onClose={() => setOpenAddItem(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={addForm.name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, name: e.target.value }))
              }
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel id="add-cat">Category</InputLabel>
              <Select
                labelId="add-cat"
                label="Category"
                value={addForm.categoryName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, categoryName: e.target.value }))
                }
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Initial Quantity"
              type="number"
              value={addForm.inventoryQuantity}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  inventoryQuantity: Number(e.target.value),
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddItem(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitAddItem}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openUpdateItem}
        onClose={() => setOpenUpdateItem(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Update Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="upd-item">Item</InputLabel>
              <Select
                labelId="upd-item"
                label="Item"
                value={updateForm.name}
                onChange={(e) =>
                  setUpdateForm((f) => ({ ...f, name: e.target.value }))
                }
              >
                {items.map((it) => (
                  <MenuItem key={it.id} value={it.name}>
                    {it.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="upd-cat">Category (optional)</InputLabel>
              <Select
                labelId="upd-cat"
                label="Category (optional)"
                value={updateForm.categoryName || ""}
                onChange={(e) =>
                  setUpdateForm((f) => ({ ...f, categoryName: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>Unchanged</em>
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Add Quantity (increment)"
              type="number"
              value={updateForm.inventoryQuantity ?? ""}
              onChange={(e) =>
                setUpdateForm((f) => ({
                  ...f,
                  inventoryQuantity:
                    e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
              helperText="Enter a positive number to add to current stock"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpdateItem(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitUpdateItem}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notice Dialog */}
      <Dialog
        open={openNotice}
        onClose={() => setOpenNotice(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Post Notice</DialogTitle>
        <DialogContent>
          <TextField
            label="Message"
            value={noticeMessage}
            onChange={(e) => setNoticeMessage(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotice(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitNotice}>
            Post
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
