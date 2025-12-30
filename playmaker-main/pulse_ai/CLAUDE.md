# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pulse AI** is a "Shazam for Sports" - an AI system that recognizes sports broadcast audio and generates real-time, contextual voice recaps with sub-second latency (<1 second end-to-end).

## System Architecture

The system consists of four sequential layers, each optimized for speed and accuracy:

### Layer 1: Content Synchronization (ACR)
- Uses Acoustic Content Recognition (ACR) to identify game broadcasts
- Maps audio fingerprints to precise timestamps in play-by-play data
- **Critical Performance Target**: Sub-200ms lookup time
- Recommended solution: Commercial ACR providers (Audible Magic, Gracenote)
- Returns time offset to sync with data stream

### Layer 2: Real-Time Data Pipeline
- **Storage**: In-memory cache (Redis/Memcached) for sub-50ms retrieval
- **Data Source**: Real-time sports APIs (SportsDataIO, BALLDONTLIE, Stats Perform)
- **Processing Steps**:
  1. Standardization: Convert feeds (XML/JSON) to unified data model
  2. Enrichment: Augment with historical stats, player profiles, predictive metrics
  3. Validation: Filter duplicates, errors, missing values
- **Schema**: Must be indexed by synchronized timestamp and game ID
- **API Latency Target**: <100ms response time (prefer BALLDONTLIE or SportsDataIO)

### Layer 3: Natural Language Generation (NLG)
- **Model**: Fine-tuned T5 variant or similar LLM
- **Input**: Structured tabular features (Team Name, Metric ID, Situation, Rank)
- **Two-Phase Approach**:
  1. Feature-to-Template Mapping (>99% BLEU score for accuracy)
  2. Enhancement via back translation/paraphrasing
- **Quality Metric**: Perplexity (aim for 13% lower than rule-based templates)
- **Output**: Natural, broadcast-ready narrative script

### Layer 4: Voice Delivery (TTS)
- **Quality**: Broadcast-grade (44.1kHz PCM)
- **Latency Target**: 75-100ms
- **Commercial Providers**:
  - ElevenLabs Flash v2.5 (75ms latency, Starter plan $5/mo minimum)
  - Cartesia Sonic (lowest latency claim)
  - Google Cloud TTS (Gemini-TTS, Chirp 3)
- **Legal Requirement**: Commercial license mandatory for public demos/broadcasts

## Performance Constraints

**Critical Latency Budget** (must sum to <1000ms):
- ACR Synchronization: <200ms
- Data Retrieval: <50ms
- NLG Generation: <300-400ms
- TTS Synthesis: <75-100ms
- Network/Overhead: <250ms

## Development Approach

### For Demos/POC
Use **controlled simulation environment** with:
- Pre-curated historical play-by-play data (CSV/JSON)
- Data replay utility configured for real-time streaming:
  - `interval_for_sending_events`: 1000ms or less
  - `convert_to_current_time`: true
  - `features_per_execution`: 1
- Pre-loaded ACR fingerprints for demo video clips

### For Production
- Stream-processing architecture (similar to sports betting platforms)
- API Gateway for Layer 3 to query cached game state
- Monitoring & Fault Recovery Layer with real-time alerting
- Fallback logic for primary feed failures

## Data Providers

### Sports Data APIs
- **SportsDataIO**: Enterprise-grade, explicit PBP feeds, free trial available
- **BALLDONTLIE**: Sub-100ms response, developer-friendly, free tier
- **API-SPORTS**: Multi-sport, 15-second updates, $10/mo
- **Stats Perform (Opta)**: Premium data for AI, enterprise pricing

### ACR Technology
- Commercial solutions strongly recommended over custom development
- Providers: Audible Magic, Gracenote, BMAT

## Key Technical Considerations

1. **Storage**: Never use disk-based databases for real-time data - Redis/Memcached only
2. **Licensing**: All TTS usage requires commercial license (not free tier) for demos/production
3. **Data Enrichment**: NLG quality depends heavily on enriched context (historical stats, rankings)
4. **Sequential Processing**: ACR → Data Retrieval → NLG → TTS must execute serially
5. **Demo Reliability**: Pre-load and curate data; don't rely on live feeds for investor demos

## NLG Feature Requirements

The NLG model expects structured input with these fields:
- `team_name`: Subject identification
- `metric_id`: Statistical measure (e.g., PRSS for presses)
- `situation`: Game state context (e.g., score_differential_leading)
- `rank`: Comparative positioning (e.g., "7th highest")
- Additional enrichment: Player profiles, season stats, predictive metrics

## Future Enhancements

- Multimodal inputs: Player detection and action recognition from video streams
- Voice cloning for brand signature voice
- Multi-sport support expansion
- Advanced perplexity optimization for narrative quality
