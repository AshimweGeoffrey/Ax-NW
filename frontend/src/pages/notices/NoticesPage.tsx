import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Toolbar,
  Container,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  InputAdornment,
  Avatar,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { remarksService, Remark } from "../../services/remarks";
import toast from "react-hot-toast";

const NoticesPage: React.FC = () => {
  const [items, setItems] = useState<Remark[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await remarksService.list();
      setItems(res.data?.items || []);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "Failed to load notices"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => items.filter((r) => r.message.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const fmt = (s: string) => new Date(s).toLocaleString();

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="md">
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, flex: 1 }}>Notices</Typography>
          <TextField
            placeholder="Search notices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
          />
          <Button variant="contained" onClick={load} disabled={loading} sx={{ fontWeight: 700, borderRadius: 999, px: 2.5 }}>
            Refresh
          </Button>
        </Stack>

        <Card sx={{ overflow: "hidden", border: "1px solid rgba(52,211,153,0.15)" }}>
          <Box sx={{ height: 4, background: "linear-gradient(90deg,#34d399,#22d3ee)" }} />
          <CardContent>
            {loading ? (
              <Typography>Loading…</Typography>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary">No notices found</Typography>
            ) : (
              <Stack spacing={2}>
                {filtered.map((r, idx) => (
                  <Box key={r.id}>
                    <Stack direction="row" spacing={2} alignItems="flex-start"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid rgba(52,211,153,0.18)",
                        background: idx % 2 === 0 ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.03)",
                        boxShadow: "none",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        "&:hover": { transform: "translateY(-1px)", boxShadow: "none" },
                        borderLeft: "3px solid #34d399",
                      }}
                    >
                      <Avatar sx={{ bgcolor: "#34d39933", color: "#34d399" }}>
                        <NotificationsIcon fontSize="small" />
                      </Avatar>
                      <Stack spacing={0.5} sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {r.message}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Posted at {fmt(r.timeStamp)}
                        </Typography>
                      </Stack>
                    </Stack>
                    {idx < filtered.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default NoticesPage;
