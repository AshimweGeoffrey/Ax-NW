import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, RadioGroup, FormControlLabel,
  Radio, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import api from "../services/api";
import toast from "react-hot-toast";

interface Result { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] }

export const downloadInventoryTemplate = async () => {
  try {
    const res = await api.get("/inventory/template", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = "inventory_template.csv"; a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Failed to download template");
  }
};

const ImportCsvDialog: React.FC<{ open: boolean; onClose: () => void; onDone: () => void }> = ({ open, onClose, onDone }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"add" | "skip">("add");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => { setFile(null); setResult(null); setMode("add"); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    setBusy(true);
    try {
      const res = await api.post("/inventory/import", form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data.data);
      toast.success(`Import finished: ${res.data.data.created} created, ${res.data.data.updated} updated`);
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Import failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Import inventory from CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Columns: <b>name, category, quantity</b>. Categories must already exist. Max 5,000 rows, 2 MB.
          </Typography>
          <Button size="small" variant="outlined" onClick={downloadInventoryTemplate} sx={{ alignSelf: "flex-start" }}>
            Download template
          </Button>

          <Box>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
              {file ? file.name : "Choose CSV file"}
              <input hidden type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} />
            </Button>
          </Box>

          <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as "add" | "skip")}>
            <FormControlLabel value="add" control={<Radio size="small" />} label="Existing items: add the quantity to current stock" />
            <FormControlLabel value="skip" control={<Radio size="small" />} label="Existing items: leave unchanged (only create new items)" />
          </RadioGroup>

          {result && (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <Chip color="success" label={`${result.created} created`} />
                <Chip color="info" label={`${result.updated} updated`} />
                <Chip label={`${result.skipped} skipped`} />
                <Chip color={result.errors.length ? "error" : "default"} label={`${result.errors.length} errors`} />
              </Stack>
              {result.errors.length > 0 && (
                <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                  <Alert severity="warning" sx={{ mb: 1 }}>These rows were not imported; fix them and upload again.</Alert>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Row</TableCell><TableCell>Problem</TableCell></TableRow></TableHead>
                    <TableBody>{result.errors.map((er) => (<TableRow key={er.row}><TableCell>{er.row}</TableCell><TableCell>{er.message}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{result ? "Close" : "Cancel"}</Button>
        <Button variant="contained" disabled={!file || busy} onClick={submit}>{busy ? "Importing…" : "Import"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportCsvDialog;
