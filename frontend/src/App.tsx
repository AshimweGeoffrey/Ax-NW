import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Toaster, toast } from "react-hot-toast";

// Import components (to be created)
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import SalesPage from "./pages/sales/SalesPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import OutgoingPage from "./pages/outgoing/OutgoingPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import Sidebar from "./components/Sidebar";
import NoticesPage from "./pages/notices/NoticesPage";

// Import hooks and stores
import { useAuthStore } from "./store/authStore";
import { useNotificationStore } from "./store/notificationStore";

// Create theme
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#40c793",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#0f1115",
      paper: "#151821",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (for login)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  return user?.role === "Administrator" ? (
    <>{children}</>
  ) : (
    <Navigate to="/" replace />
  );
};

function App() {
  const { isAuthenticated, user, getCurrentUser } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const addNotification = useNotificationStore((s) => s.add);

  useEffect(() => {
    if (isAuthenticated && !user) {
      getCurrentUser().catch(() => {});
    }
  }, [isAuthenticated, user, getCurrentUser]);

  // Intercept and cache toast calls
  useEffect(() => {
    const orig = {
      success: toast.success,
      error: toast.error,
      loading: toast.loading,
      custom: toast.custom,
      // info/blank fallbacks
    } as const;

    toast.success = ((message: any, opts?: any) => {
      try {
        addNotification({
          type: "success",
          message: String(message),
          path: window.location.pathname,
        });
      } catch {}
      return orig.success(message, opts);
    }) as any;
    toast.error = ((message: any, opts?: any) => {
      try {
        addNotification({
          type: "error",
          message: String(message),
          path: window.location.pathname,
        });
      } catch {}
      return orig.error(message, opts);
    }) as any;
    toast.loading = ((message: any, opts?: any) => {
      try {
        addNotification({
          type: "loading",
          message: String(message),
          path: window.location.pathname,
        });
      } catch {}
      return orig.loading(message, opts);
    }) as any;
    toast.custom = ((renderer: any, opts?: any) => {
      // custom content not captured as text reliably; skip
      return orig.custom(renderer, opts);
    }) as any;

    return () => {
      // restore on unmount to avoid leaks during tests/HMR
      toast.success = orig.success as any;
      toast.error = orig.error as any;
      toast.loading = orig.loading as any;
      toast.custom = orig.custom as any;
    };
  }, [addNotification]);

  // Ensure browser tab title is set correctly
  useEffect(() => {
    document.title = "Ax Stock";
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          {isAuthenticated && (
            <Sidebar
              mobileOpen={mobileOpen}
              onClose={() => setMobileOpen(false)}
            />
          )}
          {isAuthenticated && (
            <AppBar
              position="fixed"
              color="default"
              elevation={0}
              sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                width: "100%",
                ml: 0,
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
                display: { xs: "block", md: "none" },
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setMobileOpen(true)}
                  sx={{ mr: 2, display: { md: "none" } }}
                >
                  <MenuIcon />
                </IconButton>
                <Box
                  component="img"
                  src={`${process.env.PUBLIC_URL}/icon.png`}
                  alt="Ax Stock Logo"
                  sx={{ width: 24, height: 24, borderRadius: 0.5 }}
                />
                <Typography
                  variant="h6"
                  noWrap
                  sx={{
                    display: { xs: "block", md: "none" },
                    ml: 1,
                    fontFamily:
                      '"Abnes", "Inter", "Roboto", "Arial", sans-serif',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  Ax Stock
                </Typography>
              </Toolbar>
            </AppBar>
          )}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              pl: isAuthenticated ? { xs: 0, md: "60px" } : 0,
            }}
          >
            {isAuthenticated && (
              <Toolbar sx={{ display: { xs: "block", md: "none" } }} />
            )}
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute>
                    <SalesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/outgoing"
                element={
                  <ProtectedRoute>
                    <OutgoingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notices"
                element={
                  <ProtectedRoute>
                    <NoticesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AnalyticsPage />
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Router>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#222",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#40c793",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#f44336",
              secondary: "#fff",
            },
          },
        }}
      />
    </ThemeProvider>
  );
}

export default App;
