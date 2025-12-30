# PLAYMAKER Full-Stack Sports AI Application

A comprehensive sports analytics platform that provides real-time game scores, player statistics, team information, and AI-powered insights using multiple sports data APIs.

## Features

- **Real-time Sports Data**: Live scores, player stats, and game information
- **AI-Powered Chat**: Intelligent sports analysis and Q&A using Perplexity and Gemini AI
- **Team Logos & Images**: Visual representation with Highlightly API integration
- **Interactive Charts**: Score breakdowns, player performance trends, and statistics visualization
- **Multi-Sport Support**: NBA, NFL, NCAA, and other major sports leagues
- **User Authentication**: JWT-based authentication system
- **Responsive UI**: Modern React frontend with Tailwind CSS

## Prerequisites

Before running the application, ensure you have the following installed:

- **Python 3.8+** (Python 3.13 recommended)
- **Node.js 16+** and npm
- **MongoDB** (local installation or cloud instance)
- **Git** for cloning the repository

## API Keys Required

You'll need to obtain API keys from the following services:

1. **Highlightly Football API** - For team logos and match data
2. **Sportradar API** - For comprehensive sports data
3. **Perplexity AI API** - For AI-powered analysis
4. **MongoDB Connection** - Database connection string
5. Optional: **ScoreBat API** - Soccer video highlights (SCOREBAT_API_KEY)
6. Optional: **TheSportsDB API** - Player info and images (THESPORTSDB_API_KEY)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YashwantAvula/PLAYMAKER_FULL_STACK.git
cd PLAYMAKER_FULL_STACK
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your API keys:

```bash
# Database
MONGO_URL=mongodb://localhost:27017/playmaker

# Authentication
JWT_SECRET=your-secure-jwt-secret-key-here

# API Keys
HIGHLIGHTLY_API_KEY=your-highlightly-api-key
SPORTRADAR_API_KEY=your-sportradar-api-key
PPLX_API_KEY=your-perplexity-api-key
# Optional integrations (media tab enrichments)
SCOREBAT_API_KEY=your-scorebat-api-key
THESPORTSDB_API_KEY=your-thesportsdb-api-key
```

Notes:
- Balldontlie (NBA) is public and does not require an API key. The backend will enrich NBA player cards with season averages when player IDs are available.
- If optional keys are not set, the backend will skip those external calls gracefully.

SportsDB integration (free tier):
- Endpoints used:
  - Players: `https://www.thesportsdb.com/api/v2/json/{THESPORTSDB_API_KEY}/searchplayers.php?t={team_name}` (fallback `?p={player_or_team}`)
  - Teams/images: `https://www.thesportsdb.com/api/v2/json/{THESPORTSDB_API_KEY}/searchteams.php?t={team_name}`
- Response fields consumed:
  - Players: `strPlayer` (name), `strPosition` (position), `strThumb` (image), `idPlayer`
  - Teams: `strTeamBadge`, `strTeamLogo`, `strTeamFanart`, `strTeamBanner`
- Fallback behavior: If SportsDB returns empty, roster/images cards are skipped without error.

### Media Tabs & External Integrations

- Videos tab: supports both `highlight_video` (internal) and `videos` (legacy) card types. ScoreBat soccer highlights will populate as `highlight_video` when `SCOREBAT_API_KEY` is set.
- Images tab: supports both `image_gallery` (internal) and `images` (legacy) card types. Image cards are built from Highlightly payloads where available.
- Players tab: renders `player`, `top_player`, and `comparison` types. TheSportsDB integration emits additional player profile cards when `THESPORTSDB_API_KEY` is set.

### Quick Validation

1. Set environment variables:
   - `export SCOREBAT_API_KEY="your_scorebat_key"`
   - `export THESPORTSDB_API_KEY="your_sportsdb_key"`
2. Restart backend and try a prompt like: "Dolphins vs Jets stats and images and players highlight".
3. Backend logs should show `[AUDIT][CARDS]` with types like `highlight_video`, `image_gallery`, `player`, `scorecard` and no HTTP errors from ScoreBat or SportsDB.
4. In browser console, `[AUDIT][TABS]` should list all types and tabs should filter correctly.

### 3. Backend Setup

```bash
# Navigate to the project root
cd /path/to/PLAYMAKER_FULL_STACK

# Install Python dependencies
pip install -r backend/requirements.txt

# The backend will automatically load environment variables from .env

# Create demo user for testing (optional but recommended)
# Make sure MongoDB is running and MONGO_URL is set in .env
python -m backend.seed_demo_user
```

**Demo User Credentials:**
- Email: `test@example.com`
- Password: `password123`

These credentials are displayed on the login screen. Run the seed script above to create this user in your database.

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install --legacy-peer-deps

# Return to root directory
cd ..
```

## Running the Application

### Demo Mode (Test Visuals Without API Keys)

You can test the visual responses without any API keys by using demo mode:

**Terminal 1 - Backend (Demo Mode):**
```bash
# From project root
source venv/bin/activate  # If using virtual environment
DEMO_MODE=true PYTHONPATH=/Users/maanyachugh/playmaker-1 python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
# From project root
cd frontend && npm start
```

This will return mock game data (Bears vs Bengals) with scorecards and player stats to test the visual components.

### Option 1: Run Both Backend and Frontend (With Real API Keys)

**Terminal 1 - Backend:**
```bash
# From project root
source venv/bin/activate  # If using virtual environment
PYTHONPATH=/Users/maanyachugh/playmaker-1 python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
# From project root
cd frontend && npm start
```

### Option 2: Run Backend Only (API Mode)

```bash
# From project root
PYTHONPATH=/Users/tarun/workspace/PLAYMAKER_FULL_STACK python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at: `http://localhost:8000`

### Option 3: Development Mode with Auto-reload

```bash
# Backend with auto-reload
PYTHONPATH=/Users/tarun/workspace/PLAYMAKER_FULL_STACK python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

# Frontend with auto-reload (in another terminal)
cd frontend && npm start
```

## Accessing the Application

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Health Check**: http://localhost:8000/api/

**First Time Setup:**
1. Make sure MongoDB is running
2. Run `python -m backend.seed_demo_user` to create the demo user
3. Login with: `test@example.com` / `password123`

## Visual AI Responses

The application supports rich visual responses with structured data:

- **Scorecards**: Game scores with team comparisons (NFL, NBA, etc.)
- **Player Stats**: Individual player performance cards with statistics
- **Top Players**: Team-by-team breakdown of top performers
- **Statistics Tables**: Detailed stat comparisons and breakdowns
- **Video Highlights**: Embedded video content when available
- **Image Galleries**: Team logos and player photos

These visual components are automatically rendered when the backend returns structured `ChatAnswer` data with `cards`. The frontend uses `StructuredContentRenderer` to display scorecards, player stats, and other rich content types.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Chat & AI
- `POST /api/chats/{chat_id}/messages` - Send message and get AI response
- `POST /api/agent/ask` - Direct AI agent query

### Sports Data
- `GET /api/sports/trending` - Get trending sports topics
- `GET /api/sports/{sport}` - Get data for specific sport
- `POST /api/sports/analyze` - Analyze sports query

## Demo Mode

The application includes a demo authentication mode. To bypass login:

1. The frontend automatically uses demo authentication
2. API calls include a demo token for testing

## Troubleshooting

### Common Issues

**Backend Import Errors:**
- Ensure `PYTHONPATH` is set correctly
- Check that all dependencies are installed
- Verify `.env` file exists with required variables

**Frontend Build Errors:**
- Clear node_modules: `rm -rf node_modules && npm install --legacy-peer-deps`
- Check Node.js version: `node --version`

**Port Already in Use:**
```bash
# Kill processes on specific ports
pkill -f uvicorn
pkill -f "npm start"
```

**MongoDB Connection Issues:**
- Ensure MongoDB is running locally or update `MONGO_URL` for cloud instance
- Check network connectivity for cloud databases

### Environment Variables

If environment variables aren't loading:
```bash
# Test environment loading
python3 -c "from dotenv import load_dotenv; load_dotenv(); import os; print('MONGO_URL:', os.getenv('MONGO_URL'))"
```

## Development

### Project Structure

```
PLAYMAKER_FULL_STACK/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── models.py          # Pydantic models
│   ├── auth.py            # Authentication logic
│   ├── database.py        # MongoDB connection
│   ├── ai_service.py      # AI integration
│   ├── sports_service.py  # Sports data services
│   └── services/
│       ├── agent.py       # Main AI agent
│       ├── highlightly.py # Highlightly API client
│       └── sportradar.py  # Sportradar API client
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React app
│   │   ├── components/    # React components
│   │   └── services/      # API services
│   └── package.json
├── .env                   # Environment variables
└── README.md             # This file
```

### Adding New Features

1. **Backend**: Add new endpoints in `server.py`, models in `models.py`
2. **Frontend**: Add components in `frontend/src/components/`
3. **API Integration**: Add new clients in `backend/services/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review API documentation at `/docs`
- Check the terminal output for error messages

---

**Happy analyzing! 🏆**
