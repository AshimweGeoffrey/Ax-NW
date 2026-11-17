import React, { useCallback, useEffect, useState } from "react";
import {
  Box, Toolbar, Container, Card, CardContent, Typography, Stack, TextField, MenuItem, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip, Pagination, Tooltip, Grid,
} from "@mui/material";
import toast from "react-hot-toast";
import { auditService, AuditResponse } from "../../services/audit";

const METHOD_COLOR: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
  POST: "success", PUT: "info", PATCH: "info", DELETE: "error", GET: "default",
};

const Stat: React.FC<{ label: string; value: number; tone?: "error" | "warning" }> = ({ label, value, tone }) => (
  <Card><CardContent sx={{ py: 1.5 }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
    <Typography variant="h5" sx={{ color: tone ? `${tone}.main` : "text.primary" }}>{value}</Typography>
  </CardContent></Card>
);

// "/api/v1/inventory/Bag/adjust" -> "inventory/Bag/adjust"
const shortPath = (path: string) => path.replace(/^\/api\/v\d+\//, "");

const AuditPage: React.FC = () => {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ search: "", user: "", method: "", outcome: "", from: "", to: "" });

  const load = useCallback(async () => {
    try { setData(await auditService.list({ ...f, page, limit: 25 })); }
    catch (e: any) { toast.error(e?.response?.data?.error?.message || "Failed to load audit log"); }
  }, [f, page]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => { setPage(1); setF({ ...f, [k]: e.target.value }); };

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 0.5 }}>Audit log</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Every change made in the system, plus refused and failed requests. Passwords are never stored.
        </Typography>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}><Stat label="Actions (24h)" value={data?.last24h.total ?? 0} /></Grid>
          <Grid item xs={6} md={3}><Stat label="Failed (24h)" value={data?.last24h.failed ?? 0} tone="warning" /></Grid>
          <Grid item xs={6} md={3}><Stat label="Failed logins (24h)" value={data?.last24h.failedLogins ?? 0} tone="error" /></Grid>
          <Grid item xs={6} md={3}><Stat label="Active users (24h)" value={data?.last24h.activeUsers ?? 0} /></Grid>
        </Grid>

        <Card sx={{ mb: 2 }}><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField label="Search" value={f.search} onChange={set("search")} sx={{ minWidth: 180, flex: 1 }} />
            <TextField select label="User" value={f.user} onChange={set("user")} sx={{ minWidth: 150 }}>
              <MenuItem value="">All</MenuItem>
              {(data?.users || []).map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField select label="Method" value={f.method} onChange={set("method")} sx={{ minWidth: 110 }}>
              <MenuItem value="">All</MenuItem>
              {["POST", "PUT", "PATCH", "DELETE", "GET"].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField select label="Outcome" value={f.outcome} onChange={set("outcome")} sx={{ minWidth: 120 }}>
              <MenuItem value="">All</MenuItem><MenuItem value="success">Success</MenuItem><MenuItem value="failed">Failed</MenuItem>
            </TextField>
            <TextField label="From" type="date" value={f.from} onChange={set("from")} InputLabelProps={{ shrink: true }} />
            <TextField label="To" type="date" value={f.to} onChange={set("to")} InputLabelProps={{ shrink: true }} />
          </Stack>
        </CardContent></Card>

        <Card><TableContainer>
          <Table>
            <TableHead><TableRow>
              <TableCell>Time</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell>
              <TableCell>Status</TableCell><TableCell>IP</TableCell><TableCell>Details</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {(data?.items || []).map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(r.timeStamp).toLocaleString()}</TableCell>
                  <TableCell>{r.userName || "—"}{r.role && <Typography variant="caption" color="text.secondary" display="block">{r.role}</Typography>}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={r.method} color={METHOD_COLOR[r.method] || "default"} variant="outlined" />
                      <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{shortPath(r.path)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell><Chip label={r.status} color={r.status < 400 ? "success" : r.status < 500 ? "warning" : "error"} /></TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{(r.ip || "").replace("::ffff:", "")}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    {r.details ? (
                      <Tooltip title={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.details}</pre>}>
                        <Typography variant="body2" noWrap sx={{ fontFamily: "monospace", color: "text.secondary" }}>{r.details}</Typography>
                      </Tooltip>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.items.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>No audit entries match these filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer></Card>

        <Stack alignItems="center" sx={{ my: 2 }}>
          <Pagination count={data?.pagination.pages || 1} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      </Container>
    </Box>
  );
};

export default AuditPage;
