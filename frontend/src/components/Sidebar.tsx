import React from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import OutboundIcon from "@mui/icons-material/Outbound";
import InsightsIcon from "@mui/icons-material/Insights";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export const drawerWidth = 240;

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  isDesktop?: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onClose,
  isDesktop = true,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { label: "Sales", icon: <ShoppingCartIcon />, path: "/sales" },
    { label: "Inventory", icon: <InventoryIcon />, path: "/inventory" },
    { label: "Outgoing", icon: <OutboundIcon />, path: "/outgoing" },
    { label: "Notices", icon: <NotificationsIcon />, path: "/notices" },
  ];

  const adminOnly = [
    { label: "Analytics", icon: <InsightsIcon />, path: "/analytics" },
  ];

  const drawerContent = (
    <Box
      role="presentation"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/icon.png`}
            alt="Ax Stock Logo"
            sx={{ width: 28, height: 28, borderRadius: 1 }}
          />
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontFamily: '"Abnes", "Inter", "Roboto", "Arial", sans-serif',
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            Ax Stock
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ flex: 1 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              onClose?.();
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        {user?.role === "Administrator" &&
          adminOnly.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                onClose?.();
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="sidebar"
    >
      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
