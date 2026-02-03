#!/bin/bash

# SILIP Portainer/Docker Compose Deployment Script for OCI
# This script automates the deployment of SILIP to an OCI instance

set -e

echo "🚀 SILIP Deployment Script for OCI"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
print_status "Docker is installed"

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_status "Docker Compose is installed"

# Check if net external network exists
if docker network ls | grep -q "\bnet\b"; then
    print_status "External network 'net' exists"
else
    print_warning "Creating external network 'net'"
    docker network create net
    print_status "Network created"
fi

# Create .env.production if it doesn't exist
if [ ! -f .env.production ]; then
    print_warning "Creating .env.production from template"
    cp .env.production.example .env.production
    echo ""
    print_error "IMPORTANT: Edit .env.production and set a secure DB_PASSWORD"
    echo "Run: nano .env.production"
    echo ""
    exit 1
else
    print_status ".env.production exists"
fi

# Pull latest code
echo -e "\n${YELLOW}Updating code from GitHub...${NC}"
git pull origin main
print_status "Code updated"

# Build and start services
echo -e "\n${YELLOW}Building and starting services...${NC}"
docker-compose up -d --build
print_status "Services started"

# Wait for database to be healthy
echo -e "\n${YELLOW}Waiting for database to be healthy...${NC}"
for i in {1..30}; do
    if docker-compose exec -T silip-db pg_isready -U silip &> /dev/null; then
        print_status "Database is healthy"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        print_error "Database failed to start"
        exit 1
    fi
done

# Run bootstrap unless explicitly skipped
if [ "${SKIP_BOOTSTRAP}" = "true" ]; then
    print_warning "Skipping bootstrap (SKIP_BOOTSTRAP=true)"
    echo "Run later: docker-compose exec silip-app npm run bootstrap"
else
    echo -e "\n${YELLOW}Running database bootstrap...${NC}"
    docker-compose exec -T silip-app npm run bootstrap
    print_status "Bootstrap complete"
fi

# Show status
echo -e "\n${GREEN}Deployment complete!${NC}"
echo ""
echo "Services:"
docker-compose ps

echo ""
echo "URLs:"
echo "  Main: https://silip.sanchez.ph"
echo "  API: https://silip.sanchez.ph/api"
echo "  API Docs: https://silip.sanchez.ph/api-docs"
echo ""
echo "Logs:"
echo "  docker-compose logs -f silip-app"
echo ""
