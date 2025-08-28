import React from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import OutboundIcon from "@mui/icons-material/Outbound";
import InsightsIcon from "@mui/icons-material/Insights";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const drawerWidth = 240;

const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { label: "Sales", icon: <ShoppingCartIcon />, path: "/sales" },
    { label: "Inventory", icon: <InventoryIcon />, path: "/inventory" },
    { label: "Outgoing", icon: <OutboundIcon />, path: "/outgoing" },
  ];

  const adminOnly = [
    { label: "Analytics", icon: <InsightsIcon />, path: "/analytics" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
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
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
