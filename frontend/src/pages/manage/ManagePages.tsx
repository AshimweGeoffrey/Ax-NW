import React, { useCallback, useEffect, useState } from "react";
import {
  Box, Toolbar, Container, Card, CardContent, Typography, Stack, TextField, Button,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, MenuItem, Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
import toast from "react-hot-toast";
import {
  usersService, branchesService, categoryAdminService,
  UserRow, BranchRow, CategoryRow,
} from "../../services/admin";
import { useAuthStore } from "../../store/authStore";

const errMsg = (e: any, fallback: string) => e?.response?.data?.error?.message || fallback;
const ROLES = ["Administrator", "Sale_Manager", "Staff", "Auditor"];

const Shell: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <Box>
    <Toolbar />
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>
      {children}
    </Container>
  </Box>
);

// ---------- Categories ----------
export const CategoriesPage: React.FC = () => {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState("");
  const load = useCallback(async () => {
    try { setRows(await categoryAdminService.list()); } catch (e) { toast.error(errMsg(e, "Failed to load categories")); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    try { await categoryAdminService.create(name.trim()); toast.success("Category added"); setName(""); load(); }
    catch (e) { toast.error(errMsg(e, "Failed to add category")); }
  };
  const remove = async (n: string) => {
    if (!window.confirm(`Delete category "${n}"?`)) return;
    try { await categoryAdminService.remove(n); toast.success("Category deleted"); load(); }
    catch (e) { toast.error(errMsg(e, "Failed to delete category")); }
  };
  return (
    <Shell title="Categories" subtitle="Group inventory items">
      <Card sx={{ mb: 2 }}><CardContent>
        <Stack direction="row" spacing={1}>
          <TextField label="New category" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 32 }} fullWidth />
          <Button variant="contained" disabled={!name.trim()} onClick={add}>Add</Button>
        </Stack>
      </CardContent></Card>
      <Card><Table>
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell align="right">Items</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell>{r.name}</TableCell>
            <TableCell align="right">{r._count?.inventory ?? 0}</TableCell>
            <TableCell align="right"><IconButton color="error" onClick={() => remove(r.name)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></Card>
    </Shell>
  );
};

// ---------- Branches ----------
export const BranchesPage: React.FC = () => {
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [name, setName] = useState("");
  const load = useCallback(async () => {
    try { setRows(await branchesService.list()); } catch (e) { toast.error(errMsg(e, "Failed to load branches")); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    try { await branchesService.create(name.trim()); toast.success("Branch added"); setName(""); load(); }
    catch (e) { toast.error(errMsg(e, "Failed to add branch")); }
  };
  const remove = async (n: string) => {
    if (!window.confirm(`Delete branch "${n}"?`)) return;
    try { await branchesService.remove(n); toast.success("Branch deleted"); load(); }
    catch (e) { toast.error(errMsg(e, "Failed to delete branch")); }
  };
  return (
    <Shell title="Branches" subtitle="Locations that receive outgoing stock">
      <Card sx={{ mb: 2 }}><CardContent>
        <Stack direction="row" spacing={1}>
          <TextField label="New branch" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 16 }} fullWidth />
          <Button variant="contained" disabled={!name.trim()} onClick={add}>Add</Button>
        </Stack>
      </CardContent></Card>
      <Card><Table>
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell>{r.name}</TableCell>
            <TableCell align="right"><IconButton color="error" onClick={() => remove(r.name)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></Card>
    </Shell>
  );
};

// ---------- Users ----------
export const UsersPage: React.FC = () => {
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === "Administrator";
  const [rows, setRows] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", accessControl: "Staff" });
  const load = useCallback(async () => {
    try { setRows(await usersService.list()); } catch (e) { toast.error(errMsg(e, "Failed to load users")); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const add = async () => {
    try { await usersService.create(form); toast.success("User created"); setForm({ name: "", email: "", password: "", accessControl: "Staff" }); load(); }
    catch (e) { toast.error(errMsg(e, "Failed to create user")); }
  };
  const changeRole = async (name: string, accessControl: string) => {
    try { await usersService.update(name, { accessControl }); toast.success("Role updated"); load(); }
    catch (e) { toast.error(errMsg(e, "Failed to update role")); }
  };
  const reset = async (name: string) => {
    const pw = window.prompt(`New password for ${name} (min 6 chars)`);
    if (!pw) return;
    try { await usersService.resetPassword(name, pw); toast.success("Password reset"); }
    catch (e) { toast.error(errMsg(e, "Failed to reset password")); }
  };
  return (
    <Shell title="Users" subtitle={isAdmin ? "Manage accounts and roles" : "View accounts"}>
      {isAdmin && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField label="Username" value={form.name} onChange={set("name")} inputProps={{ maxLength: 32 }} />
            <TextField label="Email" value={form.email} onChange={set("email")} inputProps={{ maxLength: 32 }} />
            <TextField label="Password" type="password" value={form.password} onChange={set("password")} />
            <TextField select label="Role" value={form.accessControl} onChange={set("accessControl")} sx={{ minWidth: 150 }}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <Button variant="contained" disabled={!form.name || !form.email || form.password.length < 6} onClick={add}>Add</Button>
          </Stack>
        </CardContent></Card>
      )}
      <Card sx={{ overflowX: "auto" }}><Table>
        <TableHead><TableRow><TableCell>Username</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell>{isAdmin && <TableCell />}</TableRow></TableHead>
        <TableBody>{rows.map((u) => (
          <TableRow key={u.name}>
            <TableCell>{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{isAdmin ? (
              <TextField select value={u.accessControl || "Staff"} onChange={(e) => changeRole(u.name, e.target.value)} variant="standard">
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            ) : <Chip label={u.accessControl || "Staff"} />}</TableCell>
            {isAdmin && <TableCell align="right"><IconButton onClick={() => reset(u.name)} title="Reset password"><LockResetIcon fontSize="small" /></IconButton></TableCell>}
          </TableRow>
        ))}</TableBody>
      </Table></Card>
    </Shell>
  );
};
