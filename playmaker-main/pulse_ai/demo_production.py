#!/usr/bin/env python3
"""
Pulse AI Production Demo Script

This script demonstrates the production-ready version with:
- Real ElevenLabs TTS integration
- Audio file saving capability
- Multiple game scenarios

Usage:
1. Set your API keys in .env file:
   ELEVENLABS_API_KEY=your_key_here
   ELEVENLABS_VOICE_ID=your_voice_id_here

2. Run: python demo_production.py
"""

import sys
import os
import time
from pathlib import Path
from datetime import datetime
from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO"
)

from src.models import AudioFingerprint, PlayByPlayEvent, PulseAIResponse
from src.layer1_acr.acr_service import MockACRService
from src.layer2_data.data_pipeline import DataPipeline, DataSimulator
from src.layer3_nlg.nlg_engine import TemplateNLGEngine
from src.layer4_tts.tts_service import ElevenLabsTTSService, MockTTSService
from src.api.pulse_ai import PulseAI
from src.config import get_settings


def save_audio_output(result: PulseAIResponse, output_dir: str = "./static/audio"):
    """Save generated audio to file

    Args:
        result: Pulse AI response with audio data
        output_dir: Directory to save audio files

    Returns:
        Path to saved audio file
    """
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    game_id = result.acr_result.game_id.replace("_", "-")
    filename = f"pulse_ai_{game_id}_{timestamp}.{result.voice.format}"
    filepath = Path(output_dir) / filename

    # Save audio data
    with open(filepath, "wb") as f:
        f.write(result.voice.audio_data)

    logger.success(f"Audio saved to: {filepath}")
    return str(filepath)


def create_production_pulse_ai() -> PulseAI:
    """Create production Pulse AI instance with real TTS

    Returns:
        Configured Pulse AI instance
    """
    settings = get_settings()
    logger.info("Creating production Pulse AI instance...")

    # Layer 1: ACR (still using mock for demo, replace with real ACR in production)
    acr = MockACRService(fixed_latency_ms=50)

    # Layer 2: Data Pipeline
    data = DataPipeline(use_redis=False)  # Set to True if Redis is running

    # Layer 3: NLG Engine
    nlg = TemplateNLGEngine()

    # Layer 4: TTS - Use real ElevenLabs if API key is configured
    if settings.elevenlabs_api_key and settings.elevenlabs_api_key != "your_elevenlabs_api_key":
        logger.info("Using ElevenLabs TTS (production mode)")
        tts = ElevenLabsTTSService()
    else:
        logger.warning("ElevenLabs API key not configured, using mock TTS")
        logger.info("To enable real TTS, set ELEVENLABS_API_KEY in .env file")
        tts = MockTTSService(fixed_latency_ms=75)

    pulse_ai = PulseAI(
        acr_service=acr,
        data_pipeline=data,
        nlg_engine=nlg,
        tts_service=tts
    )

    logger.success("Production Pulse AI instance ready")
    return pulse_ai


def setup_demo_environment(pulse_ai: PulseAI):
    """Load demo data into the pipeline"""
    logger.info("Setting up demo environment...")

    simulator = DataSimulator(pulse_ai.data)
    simulator.load_demo_data("./data/demo_pbp.json")

    # Ingest all events
    for event in simulator.events:
        pulse_ai.data.ingest_pbp_event(event)

    logger.success(f"Loaded {len(simulator.events)} demo events")


def run_production_demo():
    """Run production demo with real TTS and audio saving"""
    logger.info("\n" + "=" * 70)
    logger.info("PULSE AI PRODUCTION DEMO - Shazam for Sports")
    logger.info("=" * 70 + "\n")

    # Initialize
    pulse_ai = create_production_pulse_ai()
    setup_demo_environment(pulse_ai)

    # Demo scenarios
    scenarios = [
        {
            "name": "Christian McCaffrey Touchdown",
            "audio_data": b"demo_game_1_moment_1",
            "description": "49ers vs Chiefs - 2nd quarter touchdown"
        }
    ]

    for i, scenario in enumerate(scenarios, 1):
        logger.info("\n" + "─" * 70)
        logger.info(f"SCENARIO {i}: {scenario['name']}")
        logger.info(f"Description: {scenario['description']}")
        logger.info("─" * 70 + "\n")

        # Create audio fingerprint
        audio = AudioFingerprint(
            audio_data=scenario["audio_data"],
            duration_seconds=5.0,
            sample_rate=44100
        )

        try:
            # Process through pipeline
            result = pulse_ai.process_audio(audio)

            # Save audio output
            audio_path = save_audio_output(result)

            # Display results
            logger.info("\n" + "=" * 70)
            logger.info("RESULTS")
            logger.info("=" * 70)
            logger.info(f"\nGame: {result.acr_result.game_id}")
            logger.info(f"Timestamp: {result.acr_result.timestamp_offset}s")
            logger.info(f"Team: {result.features.team_name}")
            logger.info(f"Event: {result.features.metric_id}")
            logger.info(f"\nNarrative:")
            logger.info(f'  "{result.narrative.text}"')
            logger.info(f"\nAudio saved: {audio_path}")
            logger.info(f"Audio size: {len(result.voice.audio_data)} bytes")
            logger.info(f"Format: {result.voice.format} @ {result.voice.sample_rate}Hz")

            # Performance metrics
            logger.info("\n" + "=" * 70)
            logger.info("PERFORMANCE")
            logger.info("=" * 70)
            logger.info(f"\nTotal Latency: {result.total_latency_ms:.2f}ms")

            if result.total_latency_ms < 1000:
                logger.success(f"✓ SUB-SECOND TARGET ACHIEVED!")
                logger.success(f"  {1000 - result.total_latency_ms:.2f}ms under target")
            else:
                logger.warning(f"⚠ Exceeded target by {result.total_latency_ms - 1000:.2f}ms")

            logger.info("\n" + "=" * 70 + "\n")

        except Exception as e:
            logger.error(f"Scenario failed: {e}")
            import traceback
            traceback.print_exc()


def run_specific_event(event_description: str):
    """Run demo for a specific event description

    Args:
        event_description: Natural language description of the event
    """
    logger.info(f"\nProcessing specific event: {event_description}")

    pulse_ai = create_production_pulse_ai()
    setup_demo_environment(pulse_ai)

    # For now, use the first demo event
    # In production, you would match the description to actual events
    audio = AudioFingerprint(
        audio_data=b"demo_game_1_moment_1",
        duration_seconds=5.0,
        sample_rate=44100
    )

    result = pulse_ai.process_audio(audio)
    audio_path = save_audio_output(result)

    logger.success(f"\nProcessed event: {event_description}")
    logger.info(f"Narrative: {result.narrative.text}")
    logger.info(f"Audio: {audio_path}")
    logger.info(f"Latency: {result.total_latency_ms:.2f}ms")

    return result


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Pulse AI Production Demo")
    parser.add_argument(
        "--event",
        type=str,
        help="Describe a specific event to generate audio for"
    )

    args = parser.parse_args()

    if args.event:
        run_specific_event(args.event)
    else:
        run_production_demo()
