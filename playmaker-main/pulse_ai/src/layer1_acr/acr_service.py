"""ACR Service - Layer 1: Content Synchronization

In production, this would integrate with commercial ACR providers like:
- Audible Magic
- Gracenote
- BMAT

For demo purposes, this provides a simulated ACR with pre-loaded fingerprints.
"""

import time
import hashlib
from typing import Dict, Optional
from loguru import logger

from ..models import AudioFingerprint, ACRResult


class ACRService:
    """Acoustic Content Recognition Service

    Target: <200ms latency for fingerprint lookup
    """

    def __init__(self):
        # Simulated fingerprint database
        # In production: connects to commercial ACR provider API
        self.fingerprint_db: Dict[str, Dict] = {}
        logger.info("ACR Service initialized")

    def register_fingerprint(
        self,
        audio_hash: str,
        game_id: str,
        timestamp_offset: float
    ):
        """Register a fingerprint for demo mode

        Args:
            audio_hash: Hash of audio segment
            game_id: Identifier for the game
            timestamp_offset: Seconds from game start
        """
        self.fingerprint_db[audio_hash] = {
            "game_id": game_id,
            "timestamp_offset": timestamp_offset,
        }
        logger.debug(f"Registered fingerprint: {audio_hash[:8]}... -> {game_id}@{timestamp_offset}s")

    def recognize(self, audio: AudioFingerprint) -> ACRResult:
        """Recognize audio and return synchronized game state

        Args:
            audio: Audio fingerprint data

        Returns:
            ACR result with game_id and timestamp offset

        Raises:
            ValueError: If audio not recognized
        """
        start_time = time.perf_counter()

        # Generate fingerprint hash (simplified for demo)
        # In production: use commercial ACR algorithm
        audio_hash = self._generate_fingerprint(audio.audio_data)

        # Lookup in database
        if audio_hash not in self.fingerprint_db:
            # Try partial match (simulating ACR robustness)
            audio_hash = self._fuzzy_match(audio_hash)

        if audio_hash not in self.fingerprint_db:
            raise ValueError("Audio not recognized - no matching fingerprint")

        result_data = self.fingerprint_db[audio_hash]

        latency_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            f"ACR recognized: {result_data['game_id']} @ "
            f"{result_data['timestamp_offset']}s (latency: {latency_ms:.2f}ms)"
        )

        return ACRResult(
            game_id=result_data["game_id"],
            timestamp_offset=result_data["timestamp_offset"],
            confidence=0.95,  # Simulated confidence
            latency_ms=latency_ms
        )

    def _generate_fingerprint(self, audio_data: bytes) -> str:
        """Generate audio fingerprint hash

        In production: Use commercial ACR algorithm (Shazam-style)
        For demo: Use simple hash
        """
        return hashlib.sha256(audio_data).hexdigest()

    def _fuzzy_match(self, audio_hash: str) -> Optional[str]:
        """Attempt fuzzy matching for robustness

        In production: ACR algorithms are tolerant to compression/noise
        For demo: Try first registered fingerprint
        """
        if self.fingerprint_db:
            return list(self.fingerprint_db.keys())[0]
        return None


class MockACRService(ACRService):
    """Mock ACR service for testing with guaranteed low latency"""

    def __init__(self, fixed_latency_ms: float = 50):
        super().__init__()
        self.fixed_latency_ms = fixed_latency_ms
        # Pre-load demo fingerprints
        self._load_demo_data()

    def _load_demo_data(self):
        """Pre-load demo game fingerprints"""
        # Demo game: NFL Seahawks vs Texans (2024 season)
        self.register_fingerprint(
            audio_hash="demo_game_1_moment_1",
            game_id="nfl_2024_sea_hou_001",
            timestamp_offset=425.0
        )
        self.register_fingerprint(
            audio_hash="demo_game_audio_sb58",
            game_id="nfl_2024_sea_hou_001",
            timestamp_offset=425.0
        )
        logger.info("Loaded demo ACR fingerprints for Seahawks vs Texans")

    def recognize(self, audio: AudioFingerprint) -> ACRResult:
        """Mock recognition with controlled latency"""
        # Simulate ACR processing time
        time.sleep(self.fixed_latency_ms / 1000)

        # For demo, always return first fingerprint
        if not self.fingerprint_db:
            self._load_demo_data()

        first_hash = list(self.fingerprint_db.keys())[0]
        result_data = self.fingerprint_db[first_hash]

        return ACRResult(
            game_id=result_data["game_id"],
            timestamp_offset=result_data["timestamp_offset"],
            confidence=0.98,
            latency_ms=self.fixed_latency_ms
        )
