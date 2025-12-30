"""TTS Service - Layer 4: Voice Delivery

Requirements:
- Broadcast quality (44.1kHz PCM)
- Ultra-low latency (<75-100ms)
- Commercial license required

Supported providers:
- ElevenLabs (Flash v2.5: 75ms)
- Cartesia Sonic (lowest latency claim)
- Google Cloud TTS (Gemini-TTS)
"""

import time
from typing import Optional
from loguru import logger

from ..models import NarrativeScript, VoiceOutput
from ..config import get_settings


class TTSService:
    """Text-to-Speech Service

    Target: <100ms synthesis latency
    """

    def __init__(self, provider: str = "elevenlabs"):
        self.provider = provider
        self.settings = get_settings()
        self._init_client()
        logger.info(f"TTS Service initialized with provider: {provider}")

    def _init_client(self):
        """Initialize TTS provider client"""
        if self.provider == "elevenlabs":
            # In production: initialize ElevenLabs client
            # from elevenlabs import ElevenLabs
            # self.client = ElevenLabs(api_key=self.settings.elevenlabs_api_key)
            pass
        elif self.provider == "cartesia":
            # Initialize Cartesia Sonic client
            pass
        elif self.provider == "google":
            # Initialize Google Cloud TTS client
            pass

    def synthesize(self, narrative: NarrativeScript) -> VoiceOutput:
        """Convert narrative text to broadcast-quality audio

        Args:
            narrative: Generated narrative script

        Returns:
            High-quality audio output

        Target: <100ms
        """
        start_time = time.perf_counter()

        # In production: call TTS API
        # audio_data = self._call_tts_api(narrative.text)

        # For demo: simulate TTS with mock audio
        audio_data = self._generate_mock_audio(narrative.text)

        latency_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            f"Synthesized audio in {latency_ms:.2f}ms "
            f"(text length: {len(narrative.text)} chars)"
        )

        return VoiceOutput(
            audio_data=audio_data,
            format="mp3",
            sample_rate=44100,
            latency_ms=latency_ms
        )

    def _call_tts_api(self, text: str) -> bytes:
        """Call commercial TTS API

        ElevenLabs example:
        ```python
        audio = self.client.text_to_speech.convert(
            voice_id=self.settings.elevenlabs_voice_id,
            text=text,
            model_id="eleven_flash_v2_5"  # Low latency model
        )
        return b''.join(audio)
        ```
        """
        raise NotImplementedError("TTS API integration required")

    def _generate_mock_audio(self, text: str) -> bytes:
        """Generate mock audio for demo purposes"""
        # Simulate audio generation time
        time.sleep(0.075)  # 75ms simulated latency

        # Return mock audio data (empty MP3 header)
        mock_audio = b"MOCK_AUDIO_DATA_" + text.encode()[:50]
        return mock_audio


class MockTTSService(TTSService):
    """Mock TTS service for testing with controlled latency"""

    def __init__(self, fixed_latency_ms: float = 75):
        self.fixed_latency_ms = fixed_latency_ms
        self.provider = "mock"
        logger.info(f"Mock TTS Service initialized (latency: {fixed_latency_ms}ms)")

    def _init_client(self):
        """Skip client initialization"""
        pass

    def synthesize(self, narrative: NarrativeScript) -> VoiceOutput:
        """Mock synthesis with controlled latency"""
        # Simulate TTS processing
        time.sleep(self.fixed_latency_ms / 1000)

        mock_audio = f"[AUDIO: {narrative.text[:50]}...]".encode()

        return VoiceOutput(
            audio_data=mock_audio,
            format="mp3",
            sample_rate=44100,
            latency_ms=self.fixed_latency_ms
        )


class ElevenLabsTTSService(TTSService):
    """ElevenLabs TTS integration (Flash v2.5 model)"""

    def __init__(self):
        super().__init__(provider="elevenlabs")
        self.client = None
        self._init_elevenlabs_client()

    def _init_elevenlabs_client(self):
        """Initialize ElevenLabs client if API key is available"""
        if self.settings.elevenlabs_api_key and self.settings.elevenlabs_api_key != "your_elevenlabs_api_key":
            try:
                from elevenlabs.client import ElevenLabs
                self.client = ElevenLabs(api_key=self.settings.elevenlabs_api_key)
                logger.info("ElevenLabs client initialized successfully")
            except ImportError:
                logger.warning("elevenlabs package not installed. Run: pip install elevenlabs")
            except Exception as e:
                logger.warning(f"Failed to initialize ElevenLabs client: {e}")
        else:
            logger.info("ElevenLabs API key not configured, will use mock audio")

    def synthesize(self, narrative: NarrativeScript) -> VoiceOutput:
        """Convert narrative text to broadcast-quality audio using ElevenLabs"""
        start_time = time.perf_counter()

        if self.client and self.settings.elevenlabs_voice_id:
            audio_data = self._call_tts_api(narrative.text)
        else:
            logger.warning("Using mock audio - configure ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID for real TTS")
            audio_data = self._generate_mock_audio(narrative.text)

        latency_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            f"Synthesized audio in {latency_ms:.2f}ms "
            f"(text length: {len(narrative.text)} chars)"
        )

        return VoiceOutput(
            audio_data=audio_data,
            format="mp3",
            sample_rate=44100,
            latency_ms=latency_ms
        )

    def _call_tts_api(self, text: str) -> bytes:
        """Call ElevenLabs API with Flash v2.5 (75ms latency)"""
        try:
            logger.info("Calling ElevenLabs API...")
            audio_generator = self.client.text_to_speech.convert(
                voice_id=self.settings.elevenlabs_voice_id,
                text=text,
                model_id="eleven_flash_v2_5",  # Low latency model
                output_format="mp3_44100_128"  # Broadcast quality
            )

            # Collect audio chunks
            audio_bytes = b''.join(audio_generator)
            logger.success(f"ElevenLabs API call successful, received {len(audio_bytes)} bytes")
            return audio_bytes

        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {e}")
            logger.warning("Falling back to mock audio")
            return self._generate_mock_audio(text)
