import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from "@mui/icons-material";
import { useAuthStore } from "../../store/authStore";

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { login, isLoading } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      await login(formData);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Login failed");
    }
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        py: 4,
      }}
    >
      <Card
        elevation={8}
        sx={{
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "background.paper",
          border: "1px solid rgba(52,211,153,0.15)",
          boxShadow: "none",
        }}
      >
        <Box
          sx={{
            background: "#34d399",
            color: "white",
            py: 4,
            px: 3,
            textAlign: "center",
            borderBottom: "1px solid rgba(52,211,153,0.35)",
          }}
        >
          <LoginIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            AX Stock
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root > fieldset": {
                  borderColor: "rgba(52,211,153,0.25)",
                },
                "& .MuiOutlinedInput-root:hover > fieldset": {
                  borderColor: "rgba(52,211,153,0.45)",
                },
                "& .MuiOutlinedInput-root.Mui-focused > fieldset": {
                  borderColor: "primary.main",
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root > fieldset": {
                  borderColor: "rgba(52,211,153,0.25)",
                },
                "& .MuiOutlinedInput-root:hover > fieldset": {
                  borderColor: "rgba(52,211,153,0.45)",
                },
                "& .MuiOutlinedInput-root.Mui-focused > fieldset": {
                  borderColor: "primary.main",
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                py: 1.5,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#0b0f19",
                background: "#34d399",
                boxShadow: "none",
                "&:hover": {
                  background:
                    "#10b981",
                  boxShadow: "none",
                },
              }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Login;
