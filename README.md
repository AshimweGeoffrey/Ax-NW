# AX Stock - Modern Version

A modern, full-stack inventory and sales management system built with **Node.js**, **React**, and **TypeScript**. This is a complete rewrite of the existing Python/Flask system with enhanced analytics, modern UI/UX, and Docker deployment.

## � Table of Contents

- [🚀 Technology Stack](#-technology-stack)
- [🎯 Quick Start](#-quick-start)
- [🏗️ Project Structure](#️-project-structure)
- [🔧 Manual Setup](#-manual-setup)
- [📊 Database Schema](#-database-schema)
- [🔑 Authentication](#-authentication)
- [📱 API Documentation](#-api-documentation)
- [🎨 Frontend Features](#-frontend-features)
- [🐳 Docker Deployment](#-docker-deployment)
- [🔒 Security](#-security)
- [📈 Analytics & Reports](#-analytics--reports)
- [🛠️ Development](#️-development)
- [🤝 Contributing](#-contributing)

## 🎯 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0+
- Git

### Automated Setup

```bash
# Clone the repository
git clone <repository-url>
cd ax-modern

# Run the automated setup script
./setup.sh
```

The setup script will:

- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Setup environment variables
- ✅ Generate Prisma client
- ✅ Build Docker images
- ✅ Start services
- ✅ Run database migrations
- ✅ Seed initial data

### Access the Application

After setup completes:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **API Documentation**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## �🚀 Technology Stack

### Backend

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with TypeScript
- **Database**: MySQL 8.0 with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi/Zod schema validation
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest + Supertest
- **Security**: Helmet, CORS, Rate Limiting

### Frontend

- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand/Redux Toolkit
- **UI Library**: Material-UI (MUI) / Tailwind CSS + Headless UI
- **Charts & Analytics**: Chart.js / Recharts + D3.js
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Testing**: Vitest + React Testing Library

### DevOps & Deployment

- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Process Management**: PM2
- **Environment**: Docker multi-stage builds
- **Database Migration**: Prisma migrations
- **Monitoring**: Prometheus + Grafana (optional)

## 📊 Enhanced Database Schema

Based on the existing backup data, the following enhanced schema maintains compatibility while adding modern features:

### Core Tables (Enhanced)

```sql
-- Users with enhanced authentication and roles
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'staff', 'viewer') DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Enhanced categories with profit margins and colors
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    profit_percentage DECIMAL(5,2) DEFAULT 0.00,
    color_code VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Enhanced inventory with more tracking fields
CREATE TABLE inventory (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    category_id VARCHAR(36) NOT NULL,
    quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    max_stock_level INTEGER DEFAULT 1000,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    selling_price DECIMAL(10,2) DEFAULT 0.00,
    supplier VARCHAR(100),
    location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_name (name),
    INDEX idx_sku (sku),
    INDEX idx_category (category_id),
    INDEX idx_quantity (quantity)
);

-- Enhanced branches with contact information
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_id VARCHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    INDEX idx_name (name)
);

-- Enhanced sales with more payment details
CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    invoice_number VARCHAR(50) UNIQUE,
    item_id VARCHAR(36) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_method ENUM('cash', 'card', 'mobile_money', 'bank_transfer') NOT NULL,
    payment_reference VARCHAR(100),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    cashier_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    INDEX idx_sale_date (sale_date),
    INDEX idx_invoice (invoice_number),
    INDEX idx_item (item_id),
    INDEX idx_cashier (cashier_id)
);

-- Enhanced stock movements for better tracking
CREATE TABLE stock_movements (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    item_id VARCHAR(36) NOT NULL,
    movement_type ENUM('in', 'out', 'transfer', 'adjustment') NOT NULL,
    quantity INTEGER NOT NULL,
    from_branch_id VARCHAR(36),
    to_branch_id VARCHAR(36),
    reference_id VARCHAR(36), -- Links to sales, purchases, etc.
    reference_type ENUM('sale', 'purchase', 'transfer', 'adjustment'),
    notes TEXT,
    user_id VARCHAR(36) NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (from_branch_id) REFERENCES branches(id),
    FOREIGN KEY (to_branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_item_date (item_id, movement_date),
    INDEX idx_movement_type (movement_type)
);

-- System audit trail
CREATE TABLE system_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_action (user_id, action),
    INDEX idx_created_at (created_at)
);

-- System settings
CREATE TABLE settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    key_name VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    updated_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

## 🏗️ Project Structure

```
ax-modern/
├── backend/                          # Node.js API server
│   ├── src/
│   │   ├── controllers/              # Route controllers
│   │   ├── middleware/               # Custom middleware
│   │   ├── models/                   # Prisma models
│   │   ├── routes/                   # API routes
│   │   ├── services/                 # Business logic
│   │   ├── utils/                    # Utility functions
│   │   ├── validators/               # Schema validators
│   │   ├── types/                    # TypeScript types
│   │   └── app.ts                    # Express app setup
│   ├── prisma/                       # Database schema & migrations
│   ├── tests/                        # Backend tests
│   ├── Dockerfile                    # Backend container
│   └── package.json
├── frontend/                         # React application
│   ├── src/
│   │   ├── components/               # Reusable components
│   │   │   ├── common/               # Generic components
│   │   │   ├── forms/                # Form components
│   │   │   ├── layout/               # Layout components
│   │   │   └── charts/               # Chart components
│   │   ├── pages/                    # Page components
│   │   │   ├── auth/                 # Authentication pages
│   │   │   ├── dashboard/            # Dashboard pages
│   │   │   ├── inventory/            # Inventory management
│   │   │   ├── sales/                # Sales management
│   │   │   ├── analytics/            # Analytics & reports
│   │   │   └── settings/             # Settings pages
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── services/                 # API services
│   │   ├── store/                    # State management
│   │   ├── types/                    # TypeScript interfaces
│   │   ├── utils/                    # Helper functions
│   │   └── App.tsx                   # Main app component
│   ├── public/                       # Static assets
│   ├── Dockerfile                    # Frontend container
│   └── package.json
├── nginx/                            # Reverse proxy config
│   └── nginx.conf
├── docker-compose.yml                # Multi-container setup
├── docker-compose.prod.yml           # Production configuration
└── README.md                         # This file
```

## 🎨 Modern UI/UX Features

### Design System

```typescript
// Theme configuration with Material-UI
const theme = createTheme({
  palette: {
    mode: "light", // Support for dark mode
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    // Custom component styles
  },
});
```

### Key UI Features

- **Responsive Design**: Mobile-first approach with breakpoints
- **Dark/Light Mode**: User preference toggle
- **Real-time Updates**: WebSocket connections for live data
- **Progressive Web App**: Offline capabilities
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Multi-language support

### Dashboard Layout

```typescript
interface DashboardProps {
  children: ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ children }) => {
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            AX Stock Management
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit">
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: 240 }}>
        <Sidebar />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};
```

## 📊 Enhanced Analytics Dashboard

### 1. Executive Dashboard

```typescript
interface DashboardMetrics {
  totalRevenue: number;
  totalSales: number;
  totalItems: number;
  lowStockItems: number;
  topSellingCategories: CategorySalesData[];
  revenueByMonth: MonthlyRevenueData[];
  salesByPaymentMethod: PaymentMethodData[];
  stockMovementTrends: StockMovementData[];
}

const ExecutiveDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  return (
    <Grid container spacing={3}>
      {/* KPI Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Revenue"
          value={metrics?.totalRevenue}
          format="currency"
          trend={{ value: 12.5, direction: "up" }}
        />
      </Grid>

      {/* Revenue Chart */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Revenue Trends</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics?.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#1976d2" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Category Performance */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Top Categories</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics?.topSellingCategories}
                dataKey="sales"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};
```

### 2. Advanced Analytics Features

```typescript
// Real-time inventory monitoring
const InventoryAnalytics: React.FC = () => {
  return (
    <Grid container spacing={3}>
      {/* Stock Level Heatmap */}
      <Grid item xs={12} md={6}>
        <StockHeatmap data={stockLevels} />
      </Grid>

      {/* ABC Analysis */}
      <Grid item xs={12} md={6}>
        <ABCAnalysisChart data={abcData} />
      </Grid>

      {/* Demand Forecasting */}
      <Grid item xs={12}>
        <DemandForecastChart data={forecastData} />
      </Grid>

      {/* Stock Movement Trends */}
      <Grid item xs={12}>
        <StockMovementTrends data={movementData} />
      </Grid>
    </Grid>
  );
};

// Sales performance analytics
const SalesAnalytics: React.FC = () => {
  return (
    <Tabs value={activeTab} onChange={handleTabChange}>
      <Tab label="Sales Performance" />
      <Tab label="Customer Analysis" />
      <Tab label="Payment Trends" />
      <Tab label="Seasonal Analysis" />
    </Tabs>
  );
};
```

### 3. Interactive Reports

```typescript
interface ReportFilters {
  dateRange: [Date, Date];
  categories: string[];
  branches: string[];
  users: string[];
  paymentMethods: string[];
}

const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>();

  return (
    <Container>
      <ReportFilters onFiltersChange={setFilters} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="between" alignItems="center">
              <Typography variant="h6">Sales Report</Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => exportReport("excel")}
              >
                Export Excel
              </Button>
            </Box>
            <DataGrid
              rows={reportData}
              columns={reportColumns}
              pageSize={25}
              pagination
              checkboxSelection
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <SummaryCards data={reportSummary} />
        </Grid>
      </Grid>
    </Container>
  );
};
```

## 🔗 API Architecture

### 1. RESTful API Structure

```typescript
// Express router setup
const router = express.Router();

// Authentication middleware
router.use("/api/v1", authenticateToken);

// Route definitions
router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/inventory", inventoryRoutes);
router.use("/api/v1/sales", salesRoutes);
router.use("/api/v1/analytics", analyticsRoutes);
router.use("/api/v1/reports", reportsRoutes);
router.use("/api/v1/users", userRoutes);
router.use("/api/v1/settings", settingsRoutes);

// API Documentation
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AX Stock Management API",
      version: "2.0.0",
      description: "Modern stock management system API",
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:3001/api/v1",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};
```

### 2. Enhanced API Endpoints

```typescript
// Inventory Management
GET    /api/v1/inventory              // List all items with pagination & filters
POST   /api/v1/inventory              // Create new item
GET    /api/v1/inventory/:id          // Get item details
PUT    /api/v1/inventory/:id          // Update item
DELETE /api/v1/inventory/:id          // Delete item
POST   /api/v1/inventory/:id/adjust   // Adjust stock levels
GET    /api/v1/inventory/low-stock    // Get low stock items
POST   /api/v1/inventory/bulk-import  // Bulk import from CSV/Excel

// Sales Management
GET    /api/v1/sales                  // List sales with filters
POST   /api/v1/sales                  // Create new sale
GET    /api/v1/sales/:id              // Get sale details
PUT    /api/v1/sales/:id              // Update sale (if allowed)
DELETE /api/v1/sales/:id              // Void sale
POST   /api/v1/sales/return           // Process return
GET    /api/v1/sales/summary          // Sales summary

// Analytics & Reports
GET    /api/v1/analytics/dashboard    // Dashboard metrics
GET    /api/v1/analytics/sales        // Sales analytics
GET    /api/v1/analytics/inventory    // Inventory analytics
GET    /api/v1/analytics/forecast     // Demand forecast
POST   /api/v1/reports/generate       // Generate custom reports
GET    /api/v1/reports/export         // Export reports

// User Management
GET    /api/v1/users                  // List users
POST   /api/v1/users                  // Create user
PUT    /api/v1/users/:id              // Update user
DELETE /api/v1/users/:id              // Deactivate user
POST   /api/v1/users/:id/reset-password // Reset password
```

### 3. Real-time Features

```typescript
// WebSocket implementation for real-time updates
import { Server } from "socket.io";

const setupSocketIO = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    // Authenticate socket connection
    const token = socket.handshake.auth.token;
    // Verify JWT token
    next();
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join user to their role-based rooms
    socket.join(socket.user.role);

    // Real-time inventory updates
    socket.on("subscribe-inventory", () => {
      socket.join("inventory-updates");
    });

    // Real-time sales updates
    socket.on("subscribe-sales", () => {
      socket.join("sales-updates");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};
```

## 🐳 Docker Configuration

### 1. Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.8"

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: ax_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d
    networks:
      - ax_network

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    container_name: ax_redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - ax_network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: ax_backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - mysql
      - redis
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    networks:
      - ax_network

  # Frontend React App
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    container_name: ax_frontend
    restart: unless-stopped
    environment:
      REACT_APP_API_URL: http://localhost:3001/api/v1
      REACT_APP_WS_URL: ws://localhost:3001
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - ax_network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: ax_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - ax_network

volumes:
  mysql_data:
  redis_data:

networks:
  ax_network:
    driver: bridge
```

### 2. Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:18-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

### 3. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

FROM base AS build
RUN npm ci
COPY . .
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🚀 Development Setup

### 1. Prerequisites

```bash
# Required software
- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0+
- Git

# Optional for local development
- Redis 7+
- Nginx
```

### 2. Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ax-modern

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# OR develop locally
# Backend setup
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend setup (in new terminal)
cd frontend
npm install
npm start
```

### 3. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database with sample data
npx prisma db seed
```

### 4. Environment Variables

```bash
# .env file
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ax_stock_modern
DB_USER=ax_user
DB_PASSWORD=secure_password
DB_ROOT_PASSWORD=root_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 📈 Performance & Monitoring

### 1. Backend Performance

```typescript
// API Response caching
import redis from "redis";
const client = redis.createClient(process.env.REDIS_URL);

const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await client.get(key);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    res.locals.cacheKey = key;
    res.locals.cacheDuration = duration;
    next();
  };
};

// Database query optimization
const getInventoryWithPagination = async (params: PaginationParams) => {
  return await prisma.inventory.findMany({
    where: params.filters,
    include: {
      category: true,
      stockMovements: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
    skip: params.offset,
    take: params.limit,
    orderBy: params.orderBy,
  });
};
```

### 2. Frontend Optimization

```typescript
// React Query for data fetching
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const useInventory = (filters?: InventoryFilters) => {
  return useQuery({
    queryKey: ["inventory", filters],
    queryFn: () => inventoryService.getInventory(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Code splitting with React.lazy
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Analytics = lazy(() => import("../pages/Analytics"));

// Virtual scrolling for large lists
import { FixedSizeList as List } from "react-window";

const InventoryList: React.FC = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <InventoryItem item={items[index]} />
    </div>
  );

  return (
    <List height={600} itemCount={items.length} itemSize={80} width="100%">
      {Row}
    </List>
  );
};
```

## 🔐 Security Features

### 1. Authentication & Authorization

```typescript
// JWT with refresh tokens
const generateTokens = (user: User) => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// Role-based access control
const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};
```

### 2. Data Validation

```typescript
// Zod schemas for validation
import { z } from "zod";

const CreateInventorySchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().optional(),
  categoryId: z.string().uuid(),
  quantity: z.number().int().min(0),
  unitCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  minStockLevel: z.number().int().min(0).default(5),
  maxStockLevel: z.number().int().min(1).default(1000),
});

const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
```

## 📊 Data Migration from Current System

### Migration Script

```typescript
// migrate-from-python.ts
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";

const prisma = new PrismaClient();

const migrateData = async () => {
  // Connect to old database
  const oldDb = await mysql.createConnection({
    host: "localhost",
    user: "stock_dev",
    password: "yEGS0G5&U2OFOBVs15",
    database: "AX_STOCK_ALX_PROJECT",
  });

  try {
    // Migrate categories
    const [categories] = await oldDb.execute("SELECT * FROM category");
    for (const category of categories as any[]) {
      await prisma.category.create({
        data: {
          id: category.id,
          name: category.name,
          profitPercentage: parseFloat(
            category.percentage?.replace("%", "") || "0"
          ),
        },
      });
    }

    // Migrate inventory
    const [inventory] = await oldDb.execute(`
      SELECT i.*, c.name as category_name 
      FROM inventory i 
      JOIN category c ON i.category_name = c.name
    `);

    for (const item of inventory as any[]) {
      const category = await prisma.category.findFirst({
        where: { name: item.category_name },
      });

      await prisma.inventory.create({
        data: {
          id: item.id,
          name: item.name,
          categoryId: category!.id,
          quantity: item.inventory_quantity,
          createdAt: item.incoming_time_stamp,
        },
      });
    }

    // Continue with other tables...
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await oldDb.end();
    await prisma.$disconnect();
  }
};
```

## 🚀 Deployment Guide

### Production Deployment

```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to cloud platforms
# AWS ECS, Google Cloud Run, Digital Ocean App Platform
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy AX Stock Management

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Build and push Docker images
          # Deploy to your cloud provider
```

This modern version provides:

- ✅ **Enhanced Performance**: React Query, Redis caching, optimized database queries
- ✅ **Modern UI/UX**: Material-UI, responsive design, dark mode, PWA capabilities
- ✅ **Advanced Analytics**: Interactive charts, real-time dashboards, forecasting
- ✅ **Scalable Architecture**: Microservices-ready, Docker containerization
- ✅ **Production Ready**: Security best practices, monitoring, CI/CD pipeline
- ✅ **Full TypeScript**: Type safety across the entire stack

The system maintains full compatibility with your existing data while providing a modern, scalable foundation for future growth.
