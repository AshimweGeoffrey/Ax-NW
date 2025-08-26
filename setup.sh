#!/bin/bash

# AX Stock Management System Setup Script
echo "🚀 Setting up AX Stock Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
}

# Check if Docker is installed
check_docker() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_status "Docker is installed: $DOCKER_VERSION"
        
        if command -v docker-compose &> /dev/null; then
            COMPOSE_VERSION=$(docker-compose --version)
            print_status "Docker Compose is installed: $COMPOSE_VERSION"
        else
            print_error "Docker Compose is not installed. Please install Docker Compose."
            exit 1
        fi
    else
        print_error "Docker is not installed. Please install Docker and Docker Compose first."
        exit 1
    fi
}

# Install backend dependencies
install_backend() {
    print_header "Installing backend dependencies..."
    cd backend
    
    if [ -f "package.json" ]; then
        npm install
        if [ $? -eq 0 ]; then
            print_status "Backend dependencies installed successfully"
        else
            print_error "Failed to install backend dependencies"
            exit 1
        fi
    else
        print_error "Backend package.json not found"
        exit 1
    fi
    
    cd ..
}

# Install frontend dependencies
install_frontend() {
    print_header "Installing frontend dependencies..."
    cd frontend
    
    if [ -f "package.json" ]; then
        npm install
        if [ $? -eq 0 ]; then
            print_status "Frontend dependencies installed successfully"
        else
            print_error "Failed to install frontend dependencies"
            exit 1
        fi
    else
        print_error "Frontend package.json not found"
        exit 1
    fi
    
    cd ..
}

# Setup environment variables
setup_env() {
    print_header "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found, creating from template..."
        
        cat > .env << EOL
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=AX_STOCK_ALX_PROJECT1
DB_USER=ax_user
DB_PASSWORD=Ashimwe#001
DATABASE_URL="mysql://ax_user:Ashimwe%23001@localhost:3306/AX_STOCK_ALX_PROJECT1"

# JWT
JWT_SECRET=ax_stock_jwt_secret_2024_development
JWT_REFRESH_SECRET=ax_stock_refresh_secret_2024_development
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

# API
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000
EOL
        print_status ".env file created successfully"
    else
        print_status ".env file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_header "Creating necessary directories..."
    
    mkdir -p backend/logs
    mkdir -p backend/uploads
    mkdir -p frontend/public
    
    print_status "Directories created successfully"
}

# Generate Prisma client
generate_prisma() {
    print_header "Generating Prisma client..."
    cd backend
    
    if command -v npx &> /dev/null; then
        npx prisma generate
        if [ $? -eq 0 ]; then
            print_status "Prisma client generated successfully"
        else
            print_error "Failed to generate Prisma client"
            exit 1
        fi
    else
        print_error "npx not available"
        exit 1
    fi
    
    cd ..
}

# Build Docker images
build_docker() {
    print_header "Building Docker images..."
    
    docker-compose build
    if [ $? -eq 0 ]; then
        print_status "Docker images built successfully"
    else
        print_error "Failed to build Docker images"
        exit 1
    fi
}

# Start services
start_services() {
    print_header "Starting services..."
    
    docker-compose up -d mysql redis
    print_status "Database and Redis services started"
    
    # Wait for MySQL to be ready
    print_status "Waiting for MySQL to be ready..."
    sleep 10
    
    # Run database migrations
    print_header "Running database migrations..."
    cd backend
    npx prisma migrate deploy
    if [ $? -eq 0 ]; then
        print_status "Database migrations completed"
    else
        print_warning "Database migrations failed, you may need to run them manually"
    fi
    
    # Seed database
    print_header "Seeding database..."
    npx prisma db seed
    if [ $? -eq 0 ]; then
        print_status "Database seeded successfully"
    else
        print_warning "Database seeding failed, you may need to run it manually"
    fi
    
    cd ..
    
    # Start all services
    docker-compose up -d
    print_status "All services started successfully"
}

# Main setup function
main() {
    print_header "AX Stock Management System Setup"
    echo "======================================"
    
    # Check prerequisites
    check_node
    check_npm
    check_docker
    
    # Setup project
    setup_env
    create_directories
    install_backend
    install_frontend
    generate_prisma
    build_docker
    start_services
    
    echo "======================================"
    print_status "🎉 Setup completed successfully!"
    echo ""
    print_status "Services are now running:"
    print_status "  📊 Frontend: http://localhost:3000"
    print_status "  🔧 Backend API: http://localhost:3001"
    print_status "  📚 API Documentation: http://localhost:3001/api-docs"
    print_status "  🏥 Health Check: http://localhost:3001/health"
    echo ""
    print_status "Default admin credentials:"
    print_status "  Username: admin"
    print_status "  Password: admin123"
    echo ""
    print_status "To stop services: docker-compose down"
    print_status "To view logs: docker-compose logs -f"
    print_status "To access database: docker-compose exec mysql mysql -u ax_user -p AX_STOCK_ALX_PROJECT1"
}

# Run main function
main "$@"
