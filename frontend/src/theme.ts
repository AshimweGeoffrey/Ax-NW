import { createTheme } from "@mui/material/styles";

// Single source of truth for colors. Pages should use theme palette keys
// (primary.main, info.main, ...) or these tokens for charts.
export const brand = {
  primary: "#34d399",
  primaryDark: "#10b981",
  info: "#60a5fa",
  warning: "#fbbf24",
  error: "#f87171",
  purple: "#a78bfa",
  cyan: "#22d3ee",
  bg: "#0b0f19",
  paper: "#111827",
  border: "rgba(255,255,255,0.08)",
};

export const chartColors = [
  brand.primary,
  brand.info,
  brand.warning,
  brand.purple,
  brand.cyan,
  brand.error,
];

const fontFamily =
  '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: brand.primary, dark: brand.primaryDark, contrastText: "#06210f" },
    secondary: { main: brand.purple },
    info: { main: brand.info },
    warning: { main: brand.warning },
    error: { main: brand.error },
    success: { main: brand.primary },
    background: { default: brand.bg, paper: brand.paper },
    divider: brand.border,
    text: { primary: "#e5e7eb", secondary: "#9ca3af" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    fontSize: 13, // MUI default is 14; smaller across the whole app
    h1: { fontSize: "2rem", fontWeight: 700 },
    h2: { fontSize: "1.7rem", fontWeight: 700 },
    h3: { fontSize: "1.45rem", fontWeight: 700 },
    h4: { fontSize: "1.3rem", fontWeight: 700 },
    h5: { fontSize: "1.1rem", fontWeight: 600 },
    h6: { fontSize: "0.98rem", fontWeight: 600 },
    subtitle1: { fontSize: "0.92rem" },
    subtitle2: { fontSize: "0.82rem", fontWeight: 600 },
    body1: { fontSize: "0.85rem" },
    body2: { fontSize: "0.78rem" },
    caption: { fontSize: "0.7rem" },
    button: { textTransform: "none", fontWeight: 600, fontSize: "0.82rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFeatureSettings: '"tnum" 1, "cv11" 1', backgroundColor: brand.bg },
      },
    },
    MuiButton: {
      defaultProps: { size: "small", disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiChip: { defaultProps: { size: "small" } },
    MuiIconButton: { defaultProps: { size: "small" } },
    MuiTable: { defaultProps: { size: "small" } },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: "8px 12px", borderColor: brand.border },
        head: { fontWeight: 600, color: "#9ca3af", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.4 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: "none",
          border: `1px solid ${brand.border}`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiListItemText: { styleOverrides: { primary: { fontSize: "0.85rem" } } },
  },
});

export default theme;
