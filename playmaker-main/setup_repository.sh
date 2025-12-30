#!/bin/bash

echo "🚀 PLAYMAKER Repository Setup Script"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Check current git status${NC}"
git status

echo ""
echo -e "${YELLOW}Step 2: Create GitHub repository manually${NC}"
echo "Please go to: https://github.com/new"
echo "Repository name: playmaker"
echo "Owner: tarundevi"
echo "Description: PLAYMAKER - AI-Powered Sports Analytics Platform"
echo "Visibility: Private (recommended)"
echo "Press Enter when repository is created..."
read

echo ""
echo -e "${BLUE}Step 3: Configure git remote${NC}"
# Check if remote exists
if git remote | grep -q '^origin$'; then
    echo "Updating existing origin remote..."
    git remote set-url origin https://github.com/tarundevi/playmaker.git
else
    echo "Adding new origin remote..."
    git remote add origin https://github.com/tarundevi/playmaker.git
fi

echo ""
echo -e "${BLUE}Step 4: Verify remote${NC}"
git remote -v

echo ""
echo -e "${BLUE}Step 5: Review files to be committed${NC}"
git status

echo ""
echo -e "${YELLOW}Do you want to commit the Docker deployment files? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git add .dockerignore
    git add railway.toml
    git add nixpacks.toml
    git add vercel.json
    git add DOCKER_DEPLOYMENT.md
    git add backend/Dockerfile
    git add frontend/Dockerfile
    git add frontend/nginx.conf
    git add docker-compose.prod.yml
    
    git commit -m "Add Docker deployment configuration for Railway and Vercel

- Add production-ready Dockerfiles for backend and frontend
- Add Railway configuration (railway.toml, nixpacks.toml)
- Add Vercel configuration (vercel.json)
- Add .dockerignore files for security
- Add comprehensive deployment documentation
- Configure secure environment variable handling"
fi

echo ""
echo -e "${BLUE}Step 6: Push to GitHub${NC}"
echo -e "${YELLOW}Ready to push to GitHub? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git push -u origin main
    echo ""
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
    echo ""
    echo "Repository URL: https://github.com/tarundevi/playmaker"
else
    echo "Skipping push. You can push manually later with:"
    echo "  git push -u origin main"
fi

echo ""
echo -e "${GREEN}Repository setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy backend to Railway: https://railway.app"
echo "2. Deploy frontend to Vercel: https://vercel.com"
echo "3. Configure custom domain: sportssense.dev"
echo "4. Read DOCKER_DEPLOYMENT.md for detailed instructions"
