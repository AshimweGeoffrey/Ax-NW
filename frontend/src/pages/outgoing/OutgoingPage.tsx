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
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Sidebar from "../../components/Sidebar";
import toast from "react-hot-toast";
import { outgoingService, OutgoingItem } from "../../services/outgoing";
import { inventoryService } from "../../services/inventory";
import { InventoryItem } from "../../types";

const PAGE_SIZE = 10 as const;

const OutgoingPage: React.FC = () => {
  // Filters and pagination
  const [page, setPage] = useState(1);
  const [product, setProduct] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Data
  const [rows, setRows] = useState<OutgoingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<{
    itemName: string;
    quantity: number;
    branchName?: string;
  }>({ itemName: "", quantity: 1 });

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

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (product) params.product = product;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();
      const res = await outgoingService.list(params);
      setRows(res.data?.items || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to load outgoing"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, startDate, endDate]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadData();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleCreate = async () => {
    try {
      if (!form.itemName) return toast.error("Select an item");
      if (!form.quantity || form.quantity < 1)
        return toast.error("Quantity must be at least 1");
      await outgoingService.create(form);
      toast.success("Outgoing recorded");
      setOpenCreate(false);
      setForm({ itemName: "", quantity: 1 });
      loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to record outgoing"
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await outgoingService.remove(id);
      toast.success("Outgoing removed");
      loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to remove outgoing"
      );
    }
  };

  const formatDateTime = (d?: Date) => (d ? new Date(d).toLocaleString() : "");

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: "240px" }}>
        <Toolbar />
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <Typography variant="h4">Outgoing</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreate(true)}
            >
              Record Outgoing
            </Button>
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
                    <TableCell>Category</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell align="right">Qty</TableCell>
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
                      <TableCell colSpan={7}>No records found</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{formatDateTime(r.timeStamp)}</TableCell>
                        <TableCell>{r.itemName}</TableCell>
                        <TableCell>{r.categoryName}</TableCell>
                        <TableCell>{r.userName || "-"}</TableCell>
                        <TableCell>{r.branchName || "-"}</TableCell>
                        <TableCell align="right">{r.quantity}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(r.id)}
                            title="Delete"
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
      </Box>

      {/* Create Outgoing Dialog */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Outgoing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Item Name"
              select
              value={form.itemName}
              onChange={(e) =>
                setForm((f) => ({ ...f, itemName: e.target.value }))
              }
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value=""></option>
              {items.map((it) => (
                <option key={it.id} value={it.name}>
                  {it.name} (qty: {it.inventoryQuantity})
                </option>
              ))}
            </TextField>

            <TextField
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
              }
              fullWidth
            />
            <TextField
              label="Branch (optional)"
              value={form.branchName || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, branchName: e.target.value }))
              }
              fullWidth
            />
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
    </Box>
  );
};

export default OutgoingPage;
