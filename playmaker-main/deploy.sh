#!/bin/bash

# PLAYMAKER Deployment Script for sportsense.dev
# This script helps automate the deployment process

set -e  # Exit on error

echo "🏈 PLAYMAKER Deployment Script for sportsense.dev"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo "Creating .env from .env.production template..."
    cp .env.production .env
    echo ""
    echo -e "${RED}🚨 IMPORTANT: Edit .env and add your API keys and secrets!${NC}"
    echo "Run: nano .env"
    echo ""
    exit 1
fi

# Check if required variables are set
echo "🔍 Checking environment variables..."

check_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env | cut -d '=' -f2)

    if [ -z "$var_value" ] || [ "$var_value" = "CHANGE_ME_SECURE_PASSWORD_HERE" ] || [ "$var_value" = "CHANGE_ME_GENERATE_RANDOM_SECRET_MIN_32_CHARS" ] || [[ "$var_value" == *"your-"* ]]; then
        echo -e "${RED}❌ $var_name is not set or using default value${NC}"
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name is set"
        return 0
    fi
}

all_set=true
check_env_var "MONGO_PASSWORD" || all_set=false
check_env_var "JWT_SECRET" || all_set=false
check_env_var "HIGHLIGHTLY_API_KEY" || all_set=false
check_env_var "PPLX_API_KEY" || all_set=false
check_env_var "SPORTRADAR_API_KEY" || all_set=false

if [ "$all_set" = false ]; then
    echo ""
    echo -e "${RED}🚨 Please update your .env file with real values!${NC}"
    echo "Run: nano .env"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All environment variables are configured${NC}"
echo ""

# Menu
echo "Select deployment option:"
echo "1) Deploy (start all services)"
echo "2) Update (pull latest code and rebuild)"
echo "3) Stop services"
echo "4) View logs"
echo "5) Backup database"
echo "6) Check status"
read -p "Enter option (1-6): " option

case $option in
    1)
        echo ""
        echo "🚀 Starting deployment..."
        docker-compose -f docker-compose.prod.yml up -d
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo ""
        echo "Your app should be running at:"
        echo "  Frontend: http://localhost:3000 (or https://sportsense.dev with nginx)"
        echo "  Backend:  http://localhost:8000 (or https://api.sportsense.dev with nginx)"
        echo ""
        echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
        ;;

    2)
        echo ""
        echo "🔄 Updating application..."
        git pull
        docker-compose -f docker-compose.prod.yml up -d --build
        echo ""
        echo -e "${GREEN}✅ Update complete!${NC}"
        ;;

    3)
        echo ""
        echo "🛑 Stopping services..."
        docker-compose -f docker-compose.prod.yml down
        echo ""
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;

    4)
        echo ""
        echo "📋 Viewing logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.prod.yml logs -f
        ;;

    5)
        echo ""
        echo "💾 Creating database backup..."
        DATE=$(date +%Y%m%d_%H%M%S)
        BACKUP_DIR="./backups"
        mkdir -p $BACKUP_DIR

        MONGO_PASSWORD=$(grep "^MONGO_PASSWORD=" .env | cut -d '=' -f2)

        docker exec sportsense-mongodb mongodump \
            --username admin \
            --password "$MONGO_PASSWORD" \
            --authenticationDatabase admin \
            --out /backup/backup_$DATE

        docker cp sportsense-mongodb:/backup/backup_$DATE $BACKUP_DIR/

        echo ""
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR/backup_$DATE${NC}"
        ;;

    6)
        echo ""
        echo "📊 Service Status:"
        echo ""
        docker-compose -f docker-compose.prod.yml ps
        echo ""
        echo "📈 Resource Usage:"
        echo ""
        docker stats --no-stream
        ;;

    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac
