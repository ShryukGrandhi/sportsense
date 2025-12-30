#!/usr/bin/env python3
"""
Pulse AI Demo Script

Demonstrates the complete 4-layer pipeline:
1. ACR: Audio recognition
2. Data: Feature retrieval
3. NLG: Narrative generation
4. TTS: Voice synthesis

Target: <1000ms end-to-end latency
"""

import sys
import time
from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO"
)

from src.models import AudioFingerprint, PlayByPlayEvent
from src.api.pulse_ai import create_pulse_ai_demo
from src.layer2_data.data_pipeline import DataSimulator


def setup_demo_environment(pulse_ai):
    """Set up demo data in the pipeline"""
    logger.info("Setting up demo environment...")

    # Load demo play-by-play data
    simulator = DataSimulator(pulse_ai.data)
    simulator.load_demo_data("./data/demo_pbp.json")

    # Ingest events into the pipeline
    logger.info(f"Ingesting {len(simulator.events)} demo events...")
    for event in simulator.events:
        pulse_ai.data.ingest_pbp_event(event)

    logger.success("Demo environment ready")


def run_demo():
    """Run the Pulse AI demo"""
    logger.info("\n" + "=" * 70)
    logger.info("PULSE AI DEMO - Shazam for Sports")
    logger.info("=" * 70 + "\n")

    # Initialize Pulse AI
    logger.info("Initializing Pulse AI system...")
    pulse_ai = create_pulse_ai_demo()

    # Setup demo data
    setup_demo_environment(pulse_ai)

    # Simulate audio capture
    logger.info("\n" + "─" * 70)
    logger.info("DEMO SCENARIO: User captures audio during 49ers vs Chiefs game")
    logger.info("─" * 70 + "\n")

    # Create mock audio fingerprint
    mock_audio = AudioFingerprint(
        audio_data=b"demo_game_1_moment_1",  # Matches pre-loaded fingerprint
        duration_seconds=5.0,
        sample_rate=44100
    )

    # Process through pipeline
    try:
        result = pulse_ai.process_audio(mock_audio)

        # Display results
        logger.info("\n" + "=" * 70)
        logger.info("DEMO RESULTS")
        logger.info("=" * 70)
        logger.info(f"\nGame Identified: {result.acr_result.game_id}")
        logger.info(f"Timestamp: {result.acr_result.timestamp_offset}s into the game")
        logger.info(f"Confidence: {result.acr_result.confidence * 100:.1f}%")
        logger.info(f"\nTeam: {result.features.team_name}")
        logger.info(f"Event: {result.features.metric_id}")
        logger.info(f"Context: {result.features.situation}")
        logger.info(f"\nGenerated Narrative:")
        logger.info(f"  \"{result.narrative.text}\"")
        logger.info(f"\nQuality Metrics:")
        logger.info(f"  Perplexity: {result.narrative.perplexity_score:.2f}")
        logger.info(f"\nAudio Output: {len(result.voice.audio_data)} bytes")
        logger.info(f"  Format: {result.voice.format}")
        logger.info(f"  Sample Rate: {result.voice.sample_rate}Hz")

        # Performance Summary
        logger.info("\n" + "=" * 70)
        logger.info("PERFORMANCE SUMMARY")
        logger.info("=" * 70)
        logger.info(f"\nTotal Latency: {result.total_latency_ms:.2f}ms")

        if result.total_latency_ms < 1000:
            logger.success(f"✓ SUB-SECOND TARGET ACHIEVED!")
            logger.success(f"  {1000 - result.total_latency_ms:.2f}ms under target")
        else:
            logger.warning(f"⚠ Exceeded target by {result.total_latency_ms - 1000:.2f}ms")

        logger.info("\n" + "=" * 70 + "\n")

    except Exception as e:
        logger.error(f"Demo failed: {e}")
        raise


def run_batch_demo(num_requests: int = 10):
    """Run multiple requests to gather statistics"""
    logger.info(f"\nRunning batch demo with {num_requests} requests...")

    pulse_ai = create_pulse_ai_demo()
    setup_demo_environment(pulse_ai)

    latencies = []
    successes = 0

    mock_audio = AudioFingerprint(
        audio_data=b"demo_game_1_moment_1",
        duration_seconds=5.0,
        sample_rate=44100
    )

    for i in range(num_requests):
        try:
            result = pulse_ai.process_audio(mock_audio)
            latencies.append(result.total_latency_ms)
            if result.total_latency_ms < 1000:
                successes += 1
        except Exception as e:
            logger.error(f"Request {i+1} failed: {e}")

    # Statistics
    logger.info("\n" + "=" * 70)
    logger.info("BATCH STATISTICS")
    logger.info("=" * 70)
    logger.info(f"\nTotal Requests: {num_requests}")
    logger.info(f"Success Rate: {successes}/{num_requests} ({successes/num_requests*100:.1f}%)")
    logger.info(f"Average Latency: {sum(latencies)/len(latencies):.2f}ms")
    logger.info(f"Min Latency: {min(latencies):.2f}ms")
    logger.info(f"Max Latency: {max(latencies):.2f}ms")
    logger.info("=" * 70 + "\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Pulse AI Demo")
    parser.add_argument(
        "--batch",
        type=int,
        metavar="N",
        help="Run N requests for batch statistics"
    )

    args = parser.parse_args()

    if args.batch:
        run_batch_demo(args.batch)
    else:
        run_demo()
