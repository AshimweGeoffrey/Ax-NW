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
  FormControlLabel,
  Switch,
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
import EditIcon from "@mui/icons-material/Edit";
import RemoveIcon from "@mui/icons-material/RemoveCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import { inventoryService } from "../../services/inventory";
import { categoriesService } from "../../services/categories";
import { InventoryItem, Category } from "../../types";
import { useAuthStore } from "../../store/authStore";

const PAGE_SIZE = 100;

const InventoryPage: React.FC = () => {
  const { user } = useAuthStore();

  // Filters and pagination
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  // Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openAdjust, setOpenAdjust] = useState<{
    open: boolean;
    name: string | null;
  }>({ open: false, name: null });

  // Create form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQty, setNewQty] = useState<number>(0);

  // Adjust form state
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState<string>("");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const loadCategories = async () => {
    try {
      const res = await categoriesService.list();
      setCategories(res.data?.categories || []);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to load categories"
      );
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.list({
        page,
        limit: PAGE_SIZE,
        search,
        category,
        lowStock,
      });
      setItems(res.data?.items || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to load inventory"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, lowStock]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadData();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const resetCreateForm = () => {
    setNewName("");
    setNewCategory("");
    setNewQty(0);
  };

  const handleCreate = async () => {
    if (user?.role !== "Administrator") {
      toast.error("Only administrators can create items");
      return;
    }
    try {
      if (!newName.trim() || !newCategory) {
        toast.error("Name and category are required");
        return;
      }
      const res = await inventoryService.create({
        name: newName.trim(),
        categoryName: newCategory,
        inventoryQuantity: Number(newQty) || 0,
      });
      toast.success(`Item '${res.data?.item.name}' created`);
      setOpenCreate(false);
      resetCreateForm();
      loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to create item");
    }
  };

  const openAdjustDialog = (name: string) =>
    setOpenAdjust({ open: true, name });

  const handleAdjust = async () => {
    if (user?.role !== "Administrator") {
      toast.error("Only administrators can adjust inventory");
      return;
    }
    if (!openAdjust.name) return;
    try {
      const qty = Number(adjustQty) || 0;
      if (qty === 0) {
        toast.error("Quantity change cannot be 0");
        return;
      }
      await inventoryService.adjust(openAdjust.name, {
        quantityChange: qty,
        notes: adjustNotes || undefined,
      });
      toast.success("Stock adjusted");
      setOpenAdjust({ open: false, name: null });
      setAdjustQty(0);
      setAdjustNotes("");
      loadData();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to adjust stock"
      );
    }
  };

  const handleDelete = async (name: string) => {
    if (user?.role !== "Administrator") {
      toast.error("Only administrators can delete items");
      return;
    }
    try {
      await inventoryService.remove(name);
      toast.success("Item deleted");
      loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to delete item");
    }
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
          <Typography variant="h4">Inventory</Typography>
          {user?.role === "Administrator" && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreate(true)}
            >
              New Item
            </Button>
          )}
        </Stack>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  label="Category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={lowStock}
                    onChange={(e) => {
                      setLowStock(e.target.checked);
                      setPage(1);
                    }}
                  />
                }
                label="Low stock (< 3)"
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading…</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>No items found</TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow
                      key={it.id}
                      hover
                      selected={it.inventoryQuantity < 3}
                    >
                      <TableCell>{it.name}</TableCell>
                      <TableCell>{it.categoryName}</TableCell>
                      <TableCell
                        align="right"
                        style={{
                          color:
                            it.inventoryQuantity === 0
                              ? "#d32f2f"
                              : it.inventoryQuantity < 3
                              ? "#ed6c02"
                              : undefined,
                        }}
                      >
                        {it.inventoryQuantity}
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          {user?.role === "Administrator" && (
                            <IconButton
                              color="primary"
                              title="Adjust"
                              onClick={() => openAdjustDialog(it.name)}
                            >
                              <EditIcon />
                            </IconButton>
                          )}
                          {user?.role === "Administrator" && (
                            <IconButton
                              color="error"
                              title="Delete"
                              onClick={() => handleDelete(it.name)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Stack>
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

      {/* Create Dialog */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New Inventory Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel id="new-cat">Category</InputLabel>
              <Select
                labelId="new-cat"
                label="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
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
              value={newQty}
              onChange={(e) => setNewQty(Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog
        open={openAdjust.open}
        onClose={() => setOpenAdjust({ open: false, name: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Adjust Stock{openAdjust.name ? `: ${openAdjust.name}` : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Quantity Change (use negative to reduce)"
              type="number"
              value={adjustQty}
              onChange={(e) => setAdjustQty(Number(e.target.value))}
            />
            <TextField
              label="Notes (optional)"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdjust({ open: false, name: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<RemoveIcon />}
            onClick={handleAdjust}
            disabled={user?.role !== "Administrator"}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;
