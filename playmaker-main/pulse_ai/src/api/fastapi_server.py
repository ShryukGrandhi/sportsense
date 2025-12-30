"""FastAPI server for Pulse AI REST API"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from ..models import AudioFingerprint, PulseAIResponse
from .pulse_ai import create_pulse_ai_demo

# Initialize FastAPI app
app = FastAPI(
    title="Pulse AI API",
    description="Shazam for Sports - Real-time voice AI recaps",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Pulse AI system
pulse_ai = create_pulse_ai_demo()

# Load demo data on startup
from ..layer2_data.data_pipeline import DataSimulator

@app.on_event("startup")
async def startup_event():
    """Load demo data on server startup"""
    simulator = DataSimulator(pulse_ai.data)
    simulator.load_demo_data("./data/demo_pbp.json")
    for event in simulator.events:
        pulse_ai.data.ingest_pbp_event(event)
    logger.success(f"Loaded {len(simulator.events)} demo events into pipeline")


@app.get("/")
def root():
    """Health check"""
    return {"service": "Pulse AI", "status": "operational", "version": "0.1.0"}


@app.get("/health")
def health():
    """Health check endpoint"""
    return {
        "service": "Pulse AI",
        "status": "operational",
        "version": "0.1.0"
    }


@app.post("/recognize", response_model=PulseAIResponse)
async def recognize_audio(audio_file: UploadFile = File(...)):
    """Process audio and return voice recap

    Args:
        audio_file: Audio file to recognize

    Returns:
        Complete Pulse AI response with voice output

    Target: <1000ms end-to-end
    """
    try:
        # Read audio data
        audio_data = await audio_file.read()

        # Create audio fingerprint
        audio = AudioFingerprint(
            audio_data=audio_data,
            duration_seconds=5.0,  # Assumed duration
            sample_rate=44100
        )

        # Process through Pulse AI pipeline
        result = pulse_ai.process_audio(audio)

        return result

    except ValueError as e:
        logger.error(f"Recognition failed: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/recognize/voice-only")
async def recognize_audio_voice_only(audio_file: UploadFile = File(...)):
    """Process audio and return only the voice output

    Args:
        audio_file: Audio file to recognize

    Returns:
        MP3 audio response
    """
    try:
        audio_data = await audio_file.read()

        audio = AudioFingerprint(
            audio_data=audio_data,
            duration_seconds=5.0,
            sample_rate=44100
        )

        result = pulse_ai.process_audio(audio)

        # Return audio directly
        return Response(
            content=result.voice.audio_data,
            media_type="audio/mpeg",
            headers={
                "X-Total-Latency-Ms": str(result.total_latency_ms),
                "X-Narrative-Text": result.narrative.text
            }
        )

    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
def get_metrics():
    """Get system performance metrics"""
    return {
        "targets": {
            "acr_latency_ms": 200,
            "data_latency_ms": 50,
            "nlg_latency_ms": 400,
            "tts_latency_ms": 100,
            "total_latency_ms": 1000
        },
        "status": "demo_mode"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
