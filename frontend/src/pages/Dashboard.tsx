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
} from "@mui/material";
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

  const PAYMENT_OPTIONS: Array<"Cash" | "Mobile Money" | "Card"> = [
    "Cash",
    "Mobile Money",
    "Card",
  ];

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
      const payload: any = {};
      if (updateForm.categoryName)
        payload.categoryName = updateForm.categoryName;
      if (
        typeof updateForm.inventoryQuantity === "number" &&
        !Number.isNaN(updateForm.inventoryQuantity)
      ) {
        if (updateForm.inventoryQuantity < 0)
          return toast.error("Quantity cannot be negative");
        payload.inventoryQuantity = updateForm.inventoryQuantity;
      }
      if (Object.keys(payload).length === 0)
        return toast.error("No changes to apply");
      await inventoryService.update(updateForm.name, payload);
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

  return (
    <Box>
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
          {/* Removed Total Revenue card */}

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
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => setOpenSale(true)}
                  >
                    Conduct Sale
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<OutboundIcon />}
                    onClick={() => setOpenOutgoing(true)}
                  >
                    Outgoing
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AddBoxIcon />}
                    onClick={() => setOpenAddItem(true)}
                  >
                    Add New Item
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UpgradeIcon />}
                    onClick={() => setOpenUpdateItem(true)}
                  >
                    Update Item
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CampaignIcon />}
                    onClick={() => setOpenNotice(true)}
                  >
                    Add Notice
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
              label="Quantity (optional)"
              type="number"
              value={updateForm.inventoryQuantity ?? ""}
              onChange={(e) =>
                setUpdateForm((f) => ({
                  ...f,
                  inventoryQuantity:
                    e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
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
