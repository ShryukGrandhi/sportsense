# Pulse AI - Shazam for Sports

A real-time AI system that recognizes sports broadcast audio and generates contextual voice recaps with sub-second latency.

## Architecture

Pulse AI consists of 4 sequential layers optimized for speed and accuracy:

### Layer 1: Content Synchronization (ACR)
- Acoustic Content Recognition identifies game broadcasts
- Maps audio to precise timestamps in play-by-play data
- **Target**: <200ms latency

### Layer 2: Real-Time Data Pipeline
- In-memory Redis cache for sub-50ms retrieval
- Processes and enriches play-by-play data
- Standardization → Enrichment → Validation
- **Target**: <50ms retrieval

### Layer 3: Natural Language Generation (NLG)
- Fine-tuned LLM generates natural narratives
- Two-phase: Feature-to-Template → Enhancement
- Measured by perplexity (13% better than templates)
- **Target**: <400ms generation

### Layer 4: Voice Delivery (TTS)
- Broadcast-quality audio (44.1kHz)
- Commercial TTS providers (ElevenLabs, Cartesia, Google)
- **Target**: <100ms synthesis

**Overall Target**: <1000ms end-to-end latency

## Quick Start

### Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

### Running the Demo

```bash
# Run single demo
python demo.py

# Run batch statistics
python demo.py --batch 10
```

### Starting the API Server

```bash
# Start FastAPI server
python -m src.api.fastapi_server

# Or with uvicorn
uvicorn src.api.fastapi_server:app --reload
```

API will be available at `http://localhost:8000`

## Demo Mode

The system includes mock services for demonstration without external dependencies:

- **MockACRService**: Simulated audio recognition (50ms)
- **DataSimulator**: Replays historical data as live
- **TemplateNLGEngine**: Fast template-based generation
- **MockTTSService**: Simulated voice synthesis (75ms)

## Project Structure

```
pulse_ai/
├── src/
│   ├── layer1_acr/       # Audio Content Recognition
│   ├── layer2_data/      # Data pipeline & Redis cache
│   ├── layer3_nlg/       # Natural Language Generation
│   ├── layer4_tts/       # Text-to-Speech
│   ├── api/              # FastAPI server & orchestration
│   ├── monitoring/       # Performance metrics
│   ├── models.py         # Pydantic data models
│   └── config.py         # Configuration management
├── data/
│   └── demo_pbp.json     # Demo play-by-play data
├── tests/                # Unit tests
├── demo.py               # Demo script
├── requirements.txt      # Python dependencies
└── CLAUDE.md            # Development guide
```

## API Endpoints

### POST /recognize
Process audio and return complete response with voice output.

### POST /recognize/voice-only
Process audio and return only the MP3 audio response.

### GET /metrics
Get system performance targets and status.

## Configuration

Edit `.env` file:

```bash
# Redis (Layer 2)
REDIS_HOST=localhost
REDIS_PORT=6379

# Sports Data API
SPORTS_API_KEY=your_key
SPORTS_API_PROVIDER=balldontlie

# TTS (Layer 4)
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id

# Demo Mode
DEMO_MODE=true
```

## Performance Targets

| Layer | Component | Target Latency |
|-------|-----------|----------------|
| 1     | ACR       | <200ms         |
| 2     | Data      | <50ms          |
| 3     | NLG       | <400ms         |
| 4     | TTS       | <100ms         |
| **Total** | **Pipeline** | **<1000ms** |

## Development

See [CLAUDE.md](CLAUDE.md) for detailed development guidance.

### Running Tests

```bash
pytest tests/
```

### Adding Custom Data

Edit `data/demo_pbp.json` to add more play-by-play events:

```json
{
  "event_id": "evt_006",
  "game_id": "nba_2024_lal_gsw_001",
  "timestamp": 750.0,
  "event_type": "three_pointer",
  "description": "...",
  "team": "Lakers",
  "player": "...",
  "stats": {...}
}
```

## Production Considerations

For production deployment:

1. **ACR**: Integrate commercial provider (Audible Magic, Gracenote)
2. **Data**: Connect to real-time sports API (SportsDataIO, BALLDONTLIE)
3. **Redis**: Deploy production Redis cluster
4. **NLG**: Fine-tune T5 model on sports commentary
5. **TTS**: Secure commercial license (ElevenLabs $5/mo minimum)
6. **Monitoring**: Add Prometheus metrics and alerting

## License

See LICENSE file for details.

## References

Built based on technical architecture from "Building a Sports AI Recap Demo" whitepaper.
