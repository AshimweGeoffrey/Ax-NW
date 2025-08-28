import React, { useEffect, useState } from "react";
import {
  Box,
  Toolbar,
  Container,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Button,
} from "@mui/material";
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

  const filtered = items.filter((r) =>
    r.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Toolbar />
      <Container maxWidth="md">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Typography variant="h4" sx={{ flex: 1 }}>
            Notices
          </Typography>
          <TextField
            placeholder="Search notices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
          />
          <Button variant="outlined" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </Stack>

        <Card>
          <CardContent>
            {loading ? (
              <Typography>Loading…</Typography>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary">No notices found</Typography>
            ) : (
              <List>
                {filtered.map((r) => (
                  <ListItem key={r.id} divider>
                    <ListItemText
                      primary={r.message}
                      secondary={new Date(r.timeStamp).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default NoticesPage;
