import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Toolbar,
  Container,
  Card,
  CardContent,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import toast from "react-hot-toast";
import { salesService } from "../../services/sales";
import { inventoryService } from "../../services/inventory";
import { InventoryItem, Sale } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 100 as const;
const PAYMENT_OPTIONS: Array<"Cash" | "Mobile Money" | "Card"> = [
  "Cash",
  "Mobile Money",
  "Card",
];

const SalesPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  // Filters and pagination
  const [page, setPage] = useState(1);
  const [product, setProduct] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Data
  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newSale, setNewSale] = useState<{
    itemName: string;
    quantity: number;
    price: number;
    paymentMethod: "Cash" | "Mobile Money" | "Card";
  }>({ itemName: "", quantity: 1, price: 0, paymentMethod: "Cash" });

  const [openEdit, setOpenEdit] = useState<{
    open: boolean;
    sale: Sale | null;
  }>({ open: false, sale: null });
  const [editForm, setEditForm] = useState<{
    itemName: string;
    quantity: number;
    price: number;
    paymentMethod: "Cash" | "Mobile Money" | "Card";
  }>({ itemName: "", quantity: 1, price: 0, paymentMethod: "Cash" });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const loadItems = async () => {
    try {
      const res = await inventoryService.list({ page: 1, limit: 1000 });
      setItems(res.data?.items || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to load items");
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (product) params.product = product;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();
      const res = await salesService.list(params);
      setRows(res.data?.sales || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, paymentMethod, startDate, endDate]);

  // Debounce product search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadSales();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleCreate = async () => {
    try {
      if (!newSale.itemName) return toast.error("Select an item");
      if (!newSale.quantity || newSale.quantity < 1)
        return toast.error("Quantity must be at least 1");
      if (newSale.price < 0) return toast.error("Price cannot be negative");
      await salesService.create(newSale);
      toast.success("Sale recorded");
      setOpenCreate(false);
      setNewSale({
        itemName: "",
        quantity: 1,
        price: 0,
        paymentMethod: "Cash",
      });
      loadSales();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to create sale");
    }
  };

  const handleEdit = async () => {
    if (!openEdit.sale) return;
    if (user?.role !== "Administrator") {
      toast.error("Only administrators can edit sales");
      return;
    }
    try {
      await salesService.update(openEdit.sale.id, editForm);
      toast.success("Sale updated");
      setOpenEdit({ open: false, sale: null });
      loadSales();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to update sale");
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== "Administrator") {
      toast.error("Only administrators can delete sales");
      return;
    }
    try {
      await salesService.remove(id);
      toast.success("Sale deleted");
      loadSales();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to delete sale");
    }
  };

  const formatDateTime = (d?: Date) => (d ? new Date(d).toLocaleString() : "");
  const currency = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "RWF",
    }).format(n || 0);

  const openEditDialog = (s: Sale) => {
    setOpenEdit({ open: true, sale: s });
    setEditForm({
      itemName: s.itemName,
      quantity: s.quantity,
      price: s.price,
      paymentMethod: (s.paymentMethod as any) || "Cash",
    });
  };

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Typography variant="h4">Sales</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreate(true)}
            >
              New Sale
            </Button>
            <Button variant="outlined" onClick={() => navigate("/outgoing")}>
              Record Outgoing
            </Button>
          </Stack>
        </Stack>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                placeholder="Product name"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="pay-label">Payment</InputLabel>
                <Select
                  labelId="pay-label"
                  label="Payment"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {PAYMENT_OPTIONS.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading…</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No sales found</TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{formatDateTime(s.timeStamp)}</TableCell>
                      <TableCell>{s.itemName}</TableCell>
                      <TableCell align="right">{s.quantity}</TableCell>
                      <TableCell align="right">{currency(s.price)}</TableCell>
                      <TableCell>{s.paymentMethod}</TableCell>
                      <TableCell>{s.userName || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          title="Edit"
                          onClick={() => openEditDialog(s)}
                          disabled={user?.role !== "Administrator"}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          title="Delete"
                          onClick={() => handleDelete(s.id)}
                          disabled={user?.role !== "Administrator"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Pagination
                page={page}
                count={totalPages}
                onChange={(_e, p) => setPage(p)}
                color="primary"
              />
            </Stack>
          </CardContent>
        </Card>
      </Container>

      {/* Create Sale Dialog */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New Sale</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="item-sel">Item</InputLabel>
              <Select
                labelId="item-sel"
                label="Item"
                value={newSale.itemName}
                onChange={(e) =>
                  setNewSale((s) => ({ ...s, itemName: e.target.value }))
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
                value={newSale.quantity}
                onChange={(e) =>
                  setNewSale((s) => ({
                    ...s,
                    quantity: Number(e.target.value),
                  }))
                }
                fullWidth
              />
              <TextField
                label="Price"
                type="number"
                value={newSale.price}
                onChange={(e) =>
                  setNewSale((s) => ({ ...s, price: Number(e.target.value) }))
                }
                fullWidth
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="pay-sel">Payment Method</InputLabel>
              <Select
                labelId="pay-sel"
                label="Payment Method"
                value={newSale.paymentMethod}
                onChange={(e) =>
                  setNewSale((s) => ({
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
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog
        open={openEdit.open}
        onClose={() => setOpenEdit({ open: false, sale: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Sale</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="edit-item">Item</InputLabel>
              <Select
                labelId="edit-item"
                label="Item"
                value={editForm.itemName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, itemName: e.target.value }))
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
                value={editForm.quantity}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, quantity: Number(e.target.value) }))
                }
                fullWidth
              />
              <TextField
                label="Price"
                type="number"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, price: Number(e.target.value) }))
                }
                fullWidth
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="edit-pay">Payment Method</InputLabel>
              <Select
                labelId="edit-pay"
                label="Payment Method"
                value={editForm.paymentMethod}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
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
          <Button onClick={() => setOpenEdit({ open: false, sale: null })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesPage;
