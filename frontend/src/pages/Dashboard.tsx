import React from "react";
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
} from "@mui/material";
import { useAuthStore } from "@/store/authStore";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to AX Stock Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Hello, {user?.name}! Your role: {user?.role}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4" color="primary">
                $0.00
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4" color="primary">
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inventory Items
              </Typography>
              <Typography variant="h4" color="primary">
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Low Stock Items
              </Typography>
              <Typography variant="h4" color="error">
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Typography variant="body1" paragraph>
                The AX Stock Management System is running successfully!
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This is a modern inventory and sales management system built
                with Node.js, React, and TypeScript.
              </Typography>
              <Button variant="contained" onClick={logout} color="error">
                Logout
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
