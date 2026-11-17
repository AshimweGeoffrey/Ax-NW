import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Toolbar, Container, Card, CardContent, Typography, Stack, TextField, MenuItem, Grid, Tabs, Tab,
  Button, Chip, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, LinearProgress, useTheme,
} from "@mui/material";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import toast from "react-hot-toast";
import { insightsService, Insights } from "../../services/insights";
import { chartColors, brand } from "../../theme";

type Range = "currentWeek" | "7d" | "30d" | "90d" | "1y" | "custom";
const RANGES: { value: Range; label: string }[] = [
  { value: "currentWeek", label: "This week" }, { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" }, { value: "custom", label: "Custom range" },
];
const DOW = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const rwf = (n: number) => `RWF ${Math.round(n).toLocaleString()}`;
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${n}`);

const Panel: React.FC<{ title: string; subtitle?: string; height?: number; children: React.ReactNode; empty?: boolean }> =
  ({ title, subtitle, height = 260, children, empty }) => (
    <Card sx={{ height: "100%" }}><CardContent>
      <Typography variant="h6">{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      <Box sx={{ height, mt: 1.5 }}>
        {empty ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", color: "text.secondary" }}>
            <Typography variant="body2">No data for this period</Typography>
          </Stack>
        ) : children}
      </Box>
    </CardContent></Card>
  );

const Kpi: React.FC<{ label: string; value: string; change?: number | null; hint?: string }> = ({ label, value, change, hint }) => (
  <Card><CardContent sx={{ py: 1.75 }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
    <Typography variant="h5" sx={{ my: 0.25 }}>{value}</Typography>
    {change !== undefined ? (
      change === null ? <Typography variant="caption" color="text.secondary">New activity vs prior period</Typography>
      : change === 0 ? <Typography variant="caption" color="text.secondary">No change vs prior period</Typography> : (
        <Chip size="small" variant="outlined" color={change >= 0 ? "success" : "error"}
          icon={change >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
          label={`${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs prior period`} />
      )
    ) : hint ? <Typography variant="caption" color="text.secondary">{hint}</Typography> : null}
  </CardContent></Card>
);

const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const [range, setRange] = useState<Range>("30d");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (range === "custom" && !start) return;
    setLoading(true);
    try {
      setData(await insightsService.get(range === "custom" ? { startDate: start, endDate: end || undefined } : { timeRange: range }));
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Failed to load analytics");
    } finally { setLoading(false); }
  }, [range, start, end]);
  useEffect(() => { load(); }, [load]);

  const tip = useMemo(() => ({
    contentStyle: { background: theme.palette.background.paper, border: `1px solid ${brand.border}`, borderRadius: 8, fontSize: 12 },
    labelStyle: { color: theme.palette.text.secondary },
    cursor: { fill: "rgba(255,255,255,0.04)" },
  }), [theme]);
  const axis = { stroke: theme.palette.text.secondary, fontSize: 11, tickLine: false, axisLine: false } as const;

  const weekday = useMemo(() => (data?.byWeekday || []).map((d) => ({ ...d, label: DOW[d.dow] })), [data]);
  const hours = useMemo(() => (data?.byHour || []).map((h) => ({ ...h, label: `${h.hour}:00` })), [data]);

  const exportXlsx = async () => {
    if (!data) return;
    const XLSX = await import("xlsx"); // loaded only when exporting
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: any[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
    add("Summary", [
      { metric: "Period", value: `${data.range.start.slice(0, 10)} to ${data.range.end.slice(0, 10)}` },
      { metric: "Revenue (RWF)", value: data.kpis.revenue }, { metric: "Sales", value: data.kpis.sales },
      { metric: "Units sold", value: data.kpis.units }, { metric: "Avg order value (RWF)", value: Math.round(data.kpis.avgOrderValue) },
      { metric: "Stock units on hand", value: data.stock.units }, { metric: "Out of stock items", value: data.stock.outOfStock },
      { metric: "Low stock items", value: data.stock.lowStock }, { metric: "Units sent out", value: data.outgoing.totalUnits },
    ]);
    add("Daily", data.daily); add("Top items", data.topItems); add("Categories", data.byCategory);
    add("Staff", data.byUser); add("Payment", data.byPayment); add("Low stock", data.stock.lowList);
    add("Slow movers", data.stock.slowMovers); add("Outgoing by branch", data.outgoing.byBranch);
    XLSX.writeFile(wb, `ax_analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const maxUnits = Math.max(1, ...(data?.stock.byCategory || []).map((c) => c.units));

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="lg">
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4">Analytics</Typography>
          </Box>
          <TextField select label="Period" value={range} onChange={(e) => setRange(e.target.value as Range)} sx={{ minWidth: 150 }}>
            {RANGES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
          {range === "custom" && (<>
            <TextField label="From" type="date" value={start} onChange={(e) => setStart(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="To" type="date" value={end} onChange={(e) => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
          </>)}
          <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} onClick={exportXlsx} disabled={!data}>Export Excel</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {data ? `${data.range.start.slice(0, 10)} → ${data.range.end.slice(0, 10)} · compared with the previous period of equal length` : "Loading…"}
        </Typography>
        {loading && <LinearProgress sx={{ mb: 1 }} />}

        {data && (<>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><Kpi label="Revenue" value={rwf(data.kpis.revenue)} change={data.kpis.change.revenue} /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Sales" value={`${data.kpis.sales}`} change={data.kpis.change.sales} /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Units sold" value={`${data.kpis.units}`} change={data.kpis.change.units} /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Avg order value" value={rwf(data.kpis.avgOrderValue)} hint={`${data.kpis.staff} staff active`} /></Grid>
          </Grid>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: `1px solid ${brand.border}` }}>
            <Tab label="Overview" /><Tab label="Products" /><Tab label="Team" /><Tab label="Stock & movement" />
          </Tabs>

          {tab === 0 && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={8}>
                <Panel title="Revenue trend" subtitle="Daily revenue" empty={!data.daily.length}>
                  <ResponsiveContainer><AreaChart data={data.daily}>
                    <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={brand.primary} stopOpacity={0.35} /><stop offset="100%" stopColor={brand.primary} stopOpacity={0} />
                    </linearGradient></defs>
                    <CartesianGrid stroke={brand.border} vertical={false} />
                    <XAxis dataKey="day" {...axis} tickFormatter={(d) => d.slice(5)} /><YAxis {...axis} tickFormatter={short} />
                    <Tooltip {...tip} formatter={(v: any) => rwf(Number(v))} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={brand.primary} strokeWidth={2} fill="url(#rev)" />
                  </AreaChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12} md={4}>
                <Panel title="Payment methods" subtitle="Share of revenue" empty={!data.byPayment.length}>
                  <ResponsiveContainer><PieChart>
                    <Pie data={data.byPayment} dataKey="revenue" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="none">
                      {data.byPayment.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip {...tip} formatter={(v: any) => rwf(Number(v))} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12} md={6}>
                <Panel title="Best days of the week" subtitle="Revenue by weekday" empty={!weekday.length}>
                  <ResponsiveContainer><BarChart data={weekday}>
                    <CartesianGrid stroke={brand.border} vertical={false} />
                    <XAxis dataKey="label" {...axis} /><YAxis {...axis} tickFormatter={short} />
                    <Tooltip {...tip} formatter={(v: any) => rwf(Number(v))} />
                    <Bar dataKey="revenue" name="Revenue" fill={brand.info} radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12} md={6}>
                <Panel title="Busiest hours" subtitle="Number of sales by hour" empty={!hours.length}>
                  <ResponsiveContainer><BarChart data={hours}>
                    <CartesianGrid stroke={brand.border} vertical={false} />
                    <XAxis dataKey="label" {...axis} /><YAxis {...axis} allowDecimals={false} />
                    <Tooltip {...tip} /><Bar dataKey="sales" name="Sales" fill={brand.purple} radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer>
                </Panel>
              </Grid>
            </Grid>
          )}

          {tab === 1 && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={7}>
                <Panel title="Top items by revenue" height={340} empty={!data.topItems.length}>
                  <ResponsiveContainer><BarChart data={data.topItems} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke={brand.border} horizontal={false} />
                    <XAxis type="number" {...axis} tickFormatter={short} />
                    <YAxis type="category" dataKey="name" width={130} {...axis} />
                    <Tooltip {...tip} formatter={(v: any) => rwf(Number(v))} />
                    <Bar dataKey="revenue" name="Revenue" fill={brand.primary} radius={[0, 4, 4, 0]} />
                  </BarChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12} md={5}>
                <Panel title="Revenue by category" height={340} empty={!data.byCategory.length}>
                  <ResponsiveContainer><PieChart>
                    <Pie data={data.byCategory} dataKey="revenue" nameKey="name" outerRadius="80%" stroke="none">
                      {data.byCategory.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip {...tip} formatter={(v: any) => rwf(Number(v))} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12}>
                <Card><CardContent>
                  <Typography variant="h6">Slow movers</Typography>
                  <Typography variant="caption" color="text.secondary">In stock but not sold in this period — candidates for promotion or restock review</Typography>
                  <TableContainer sx={{ mt: 1 }}><Table><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Category</TableCell><TableCell align="right">In stock</TableCell></TableRow></TableHead>
                    <TableBody>{data.stock.slowMovers.map((r) => (<TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell>{r.category}</TableCell><TableCell align="right">{r.quantity}</TableCell></TableRow>))}
                      {!data.stock.slowMovers.length && <TableRow><TableCell colSpan={3} align="center" sx={{ color: "text.secondary" }}>None</TableCell></TableRow>}</TableBody>
                  </Table></TableContainer>
                </CardContent></Card>
              </Grid>
            </Grid>
          )}

          {tab === 2 && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <Panel title="Revenue by staff member" height={300} empty={!data.byUser.length}>
                  <ResponsiveContainer><BarChart data={data.byUser}>
                    <CartesianGrid stroke={brand.border} vertical={false} />
                    <XAxis dataKey="name" {...axis} /><YAxis {...axis} tickFormatter={short} />
                    <Tooltip {...tip} formatter={(v: any) => rwf(Number(v))} />
                    <Bar dataKey="revenue" name="Revenue" fill={brand.cyan} radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%" }}><CardContent>
                  <Typography variant="h6">Staff performance</Typography>
                  <TableContainer sx={{ mt: 1 }}><Table><TableHead><TableRow><TableCell>Staff</TableCell><TableCell align="right">Sales</TableCell><TableCell align="right">Units</TableCell><TableCell align="right">Revenue</TableCell></TableRow></TableHead>
                    <TableBody>{data.byUser.map((r) => (<TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell align="right">{r.sales}</TableCell><TableCell align="right">{r.units}</TableCell><TableCell align="right">{rwf(r.revenue || 0)}</TableCell></TableRow>))}
                      {!data.byUser.length && <TableRow><TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>No sales in this period</TableCell></TableRow>}</TableBody>
                  </Table></TableContainer>
                </CardContent></Card>
              </Grid>
            </Grid>
          )}

          {tab === 3 && (
            <Grid container spacing={1.5}>
              <Grid item xs={6} md={3}><Kpi label="Items" value={`${data.stock.items}`} hint={`${data.stock.units.toLocaleString()} units on hand`} /></Grid>
              <Grid item xs={6} md={3}><Kpi label="Out of stock" value={`${data.stock.outOfStock}`} /></Grid>
              <Grid item xs={6} md={3}><Kpi label="Low stock (<3)" value={`${data.stock.lowStock}`} /></Grid>
              <Grid item xs={6} md={3}><Kpi label="Units sent out" value={`${data.outgoing.totalUnits}`} hint="Outgoing stock this period" /></Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%" }}><CardContent>
                  <Typography variant="h6">Needs restocking</Typography>
                  <TableContainer sx={{ mt: 1, maxHeight: 340 }}><Table stickyHeader><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Category</TableCell><TableCell align="right">Qty</TableCell></TableRow></TableHead>
                    <TableBody>{data.stock.lowList.map((r) => (<TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell>{r.category}</TableCell>
                      <TableCell align="right"><Chip label={r.quantity} color={r.quantity === 0 ? "error" : "warning"} /></TableCell></TableRow>))}</TableBody>
                  </Table></TableContainer>
                </CardContent></Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Panel title="Outgoing stock by branch" subtitle="Units sent in the period" height={340} empty={!data.outgoing.byBranch.length}>
                  <ResponsiveContainer><BarChart data={data.outgoing.byBranch}>
                    <CartesianGrid stroke={brand.border} vertical={false} />
                    <XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} />
                    <Tooltip {...tip} /><Bar dataKey="units" name="Units" fill={brand.warning} radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer>
                </Panel>
              </Grid>
              <Grid item xs={12}>
                <Card><CardContent>
                  <Typography variant="h6">Stock by category</Typography>
                  <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                    {data.stock.byCategory.map((c) => (
                      <Box key={c.name}>
                        <Stack direction="row" justifyContent="space-between"><Typography variant="body2">{c.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{c.units} units · {c.items} items</Typography></Stack>
                        <LinearProgress variant="determinate" value={(c.units / maxUnits) * 100} sx={{ height: 6, borderRadius: 3 }} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent></Card>
              </Grid>
            </Grid>
          )}
        </>)}
      </Container>
    </Box>
  );
};

export default AnalyticsPage;
