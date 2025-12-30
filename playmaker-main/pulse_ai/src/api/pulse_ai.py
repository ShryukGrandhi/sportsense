"""Pulse AI - Main Orchestration Layer

Coordinates all 4 layers:
1. ACR: Identify game and timestamp
2. Data: Retrieve enriched features
3. NLG: Generate narrative
4. TTS: Synthesize voice

Target: <1000ms end-to-end latency
"""

import time
from loguru import logger

from ..models import AudioFingerprint, PulseAIResponse
from ..layer1_acr.acr_service import ACRService, MockACRService
from ..layer2_data.data_pipeline import DataPipeline
from ..layer3_nlg.nlg_engine import NLGEngine, TemplateNLGEngine
from ..layer4_tts.tts_service import TTSService, MockTTSService


class PulseAI:
    """Main orchestration class for Pulse AI system"""

    def __init__(
        self,
        acr_service: ACRService,
        data_pipeline: DataPipeline,
        nlg_engine: NLGEngine,
        tts_service: TTSService
    ):
        self.acr = acr_service
        self.data = data_pipeline
        self.nlg = nlg_engine
        self.tts = tts_service

        logger.info("Pulse AI system initialized")

    def process_audio(self, audio: AudioFingerprint) -> PulseAIResponse:
        """Process audio through all 4 layers

        End-to-end pipeline:
        1. ACR: Recognize audio → game_id + timestamp
        2. Data: Retrieve features at timestamp
        3. NLG: Generate narrative from features
        4. TTS: Synthesize voice from narrative

        Args:
            audio: Audio fingerprint to process

        Returns:
            Complete response with voice output and metrics

        Target: <1000ms total latency
        """
        pipeline_start = time.perf_counter()

        logger.info("=" * 60)
        logger.info("PULSE AI PIPELINE START")
        logger.info("=" * 60)

        # Layer 1: ACR - Content Synchronization
        logger.info("[Layer 1] ACR: Identifying content...")
        acr_result = self.acr.recognize(audio)
        logger.success(
            f"[Layer 1] ✓ Identified: {acr_result.game_id} @ {acr_result.timestamp_offset}s "
            f"({acr_result.latency_ms:.2f}ms)"
        )

        # Layer 2: Data Pipeline - Retrieve Features
        logger.info("[Layer 2] Data: Retrieving game features...")
        try:
            features = self.data.get_features_at_timestamp(
                acr_result.game_id,
                acr_result.timestamp_offset
            )
            logger.success(f"[Layer 2] ✓ Retrieved features for {features.team_name}")
        except ValueError as e:
            logger.error(f"[Layer 2] ✗ Data retrieval failed: {e}")
            raise

        # Layer 3: NLG - Generate Narrative
        logger.info("[Layer 3] NLG: Generating narrative...")
        narrative = self.nlg.generate_narrative(features)
        logger.success(
            f"[Layer 3] ✓ Generated: '{narrative.text[:60]}...' "
            f"({narrative.latency_ms:.2f}ms, perplexity: {narrative.perplexity_score:.2f})"
        )

        # Layer 4: TTS - Synthesize Voice
        logger.info("[Layer 4] TTS: Synthesizing voice...")
        voice = self.tts.synthesize(narrative)
        logger.success(f"[Layer 4] ✓ Synthesized audio ({voice.latency_ms:.2f}ms)")

        # Calculate total latency
        total_latency_ms = (time.perf_counter() - pipeline_start) * 1000

        logger.info("=" * 60)
        logger.success(f"PIPELINE COMPLETE: {total_latency_ms:.2f}ms total")
        logger.info("=" * 60)

        # Check if we met the sub-second target
        if total_latency_ms < 1000:
            logger.success(f"✓ Sub-second target achieved! ({total_latency_ms:.2f}ms)")
        else:
            logger.warning(f"⚠ Exceeded 1-second target ({total_latency_ms:.2f}ms)")

        # Log latency breakdown
        self._log_latency_breakdown(
            acr_result.latency_ms,
            narrative.latency_ms,
            voice.latency_ms,
            total_latency_ms
        )

        return PulseAIResponse(
            acr_result=acr_result,
            features=features,
            narrative=narrative,
            voice=voice,
            total_latency_ms=total_latency_ms
        )

    def _log_latency_breakdown(
        self,
        acr_ms: float,
        nlg_ms: float,
        tts_ms: float,
        total_ms: float
    ):
        """Log detailed latency breakdown"""
        logger.info("\nLatency Breakdown:")
        logger.info(f"  Layer 1 (ACR):  {acr_ms:>7.2f}ms ({acr_ms/total_ms*100:>5.1f}%)")
        logger.info(f"  Layer 2 (Data): {0:>7.2f}ms (included in total)")
        logger.info(f"  Layer 3 (NLG):  {nlg_ms:>7.2f}ms ({nlg_ms/total_ms*100:>5.1f}%)")
        logger.info(f"  Layer 4 (TTS):  {tts_ms:>7.2f}ms ({tts_ms/total_ms*100:>5.1f}%)")
        logger.info(f"  {'─' * 40}")
        logger.info(f"  Total:          {total_ms:>7.2f}ms")


def create_pulse_ai_demo() -> PulseAI:
    """Factory function to create a demo-ready Pulse AI instance

    Uses mock services with controlled latencies to demonstrate
    the sub-second performance target.

    Returns:
        Configured Pulse AI instance for demos
    """
    logger.info("Creating Pulse AI demo instance...")

    # Initialize mock services with target latencies
    acr = MockACRService(fixed_latency_ms=50)  # Target: <200ms
    data = DataPipeline()
    nlg = TemplateNLGEngine()  # Fast template-based generation
    tts = MockTTSService(fixed_latency_ms=75)  # Target: <100ms

    pulse_ai = PulseAI(
        acr_service=acr,
        data_pipeline=data,
        nlg_engine=nlg,
        tts_service=tts
    )

    logger.success("Pulse AI demo instance ready")
    return pulse_ai
