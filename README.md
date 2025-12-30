# Playmaker - AI Sports Assistant

A real-time sports AI assistant with live scores, player stats, chat interface, audio game detection (Pulse), and SMS notifications.

![Playmaker](https://via.placeholder.com/1200x600/1e293b/6366f1?text=Playmaker)

## Features

- **🎙️ Chat with AI** - Ask about live games, player stats, team performance
- **📻 Pulse** - Tap the mic to detect what game you're watching
- **📱 SMS Alerts** - Get notified about scores, touchdowns, and big plays
- **📊 Live Stats** - Beautiful animated stat cards with real-time updates
- **🏈 Multi-Sport** - Supports NFL, NBA, and more leagues

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, Framer Motion
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4
- **Sports Data**: API-Sports
- **SMS**: Twilio

## Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for:
  - [API-Sports](https://api-sports.io/) (sports data)
  - [OpenAI](https://platform.openai.com/) (AI chat)
  - [Twilio](https://www.twilio.com/) (SMS, optional)

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd SportSense
npm install
```

### 2. Configure Environment Variables

Copy the template and fill in your keys:

```bash
cp env.template .env
```

Edit `.env`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/playmaker?schema=public"

# Sports API (https://api-sports.io/)
SPORTS_API_KEY="your-api-sports-key"
SPORTS_API_BASE_URL="https://v1.american-football.api-sports.io"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Twilio SMS (optional)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

Generate Prisma client and push schema:

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sports/live` | GET | Get live games across leagues |
| `/api/sports/game/[id]` | GET | Get specific game details |
| `/api/chat` | POST | Chat with AI about sports |
| `/api/pulse` | POST | Detect game from audio/preferences |
| `/api/sms/webhook` | POST | Twilio inbound SMS webhook |
| `/api/sms/subscribe` | GET/POST/PATCH/DELETE | Notification preferences |

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── chat/
│   │   ├── pulse/
│   │   ├── sms/
│   │   └── sports/
│   ├── globals.css       # Design system & styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── components/
│   ├── cards/            # Stat cards (Player, Scoreboard)
│   ├── chat/             # Chat interface
│   ├── pulse/            # Audio detection UI
│   ├── sms/              # Notification settings
│   ├── ui/               # Base components
│   └── LiveGameStrip.tsx # Live score bar
└── lib/
    ├── chat/             # LLM integration
    ├── pulse/            # Game detection logic
    ├── sms/              # Twilio service
    └── sports/           # Sports data CRS
        ├── api-client.ts # API-Sports wrapper
        ├── crs.ts        # Content Retrieval Service
        └── types.ts      # TypeScript interfaces
```

## Sports API Setup

1. Create account at [api-sports.io](https://api-sports.io/)
2. Subscribe to desired leagues:
   - **American Football** (NFL)
   - **Basketball** (NBA)
3. Copy your API key to `SPORTS_API_KEY`

## SMS Setup (Twilio)

1. Create [Twilio account](https://www.twilio.com/)
2. Get phone number
3. Set webhook URL: `https://your-domain.com/api/sms/webhook`
4. Add credentials to `.env`

## Development

```bash
# Run dev server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Run tests
npm run test
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Works with any Node.js host (Railway, Render, Fly.io, etc.)

## Extending Pulse Detection

The Pulse feature supports pluggable ACR (Audio Content Recognition) providers:

```typescript
// src/lib/pulse/pulse-service.ts
import { registerACRProvider, ACRProvider } from '@/lib/pulse';

const gracenoteProvider: ACRProvider = {
  name: 'Gracenote',
  async matchAudio(audioBlob) {
    // Your ACR implementation
    return { gameId: 'detected-game-id', confidence: 0.95 };
  }
};

registerACRProvider(gracenoteProvider);
```

## License

MIT
