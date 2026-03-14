from __future__ import annotations

import os
import time
from typing import Iterable

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel

try:
    from kokoro import KPipeline
except Exception:  # pragma: no cover - depends on optional runtime package
    KPipeline = None


app = FastAPI(title="OS Voice Sidecar")

WHISPER_MODEL_NAME = os.getenv("LOCAL_WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("LOCAL_WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("LOCAL_WHISPER_COMPUTE_TYPE", "int8")
TTS_MODEL_NAME = os.getenv("LOCAL_TTS_MODEL", "kokoro-v1")
TTS_VOICE_NAME = os.getenv("LOCAL_TTS_VOICE", "af_heart")
TTS_SAMPLE_RATE = int(os.getenv("LOCAL_TTS_SAMPLE_RATE", "24000"))
TTS_LANG_CODE = os.getenv("LOCAL_TTS_LANG_CODE", "a")

whisper_model: WhisperModel | None = None
whisper_error: str | None = None
whisper_warm = False
tts_pipeline = None
tts_error: str | None = None
tts_warm = False


class SynthesizeRequest(BaseModel):
    text: str


def int16_bytes_to_float32(raw_audio: bytes) -> np.ndarray:
    audio_int16 = np.frombuffer(raw_audio, dtype=np.int16)
    return audio_int16.astype(np.float32) / 32768.0


def float32_to_int16_bytes(audio_float32: np.ndarray) -> bytes:
    clipped = np.clip(audio_float32, -1.0, 1.0)
    audio_int16 = (clipped * 32767.0).astype(np.int16)
    return audio_int16.tobytes()


def build_stub_pcm_chunk() -> bytes:
    # A short silence frame keeps the Node/WebSocket/audio-player path valid
    # without forcing real Kokoro integration during the first binding pass.
    silence = np.zeros(1600, dtype=np.float32)
    return float32_to_int16_bytes(silence)


def estimate_duration_ms(raw_audio: bytes, sample_rate: int = 16000) -> int:
    bytes_per_sample = 2  # PCM16 mono
    sample_count = len(raw_audio) / bytes_per_sample
    return int((sample_count / sample_rate) * 1000)


@app.on_event("startup")
async def startup_event():
    global whisper_model
    global whisper_error
    global tts_pipeline
    global tts_error

    try:
        whisper_model = WhisperModel(
            WHISPER_MODEL_NAME,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        whisper_error = None
    except Exception as exc:  # pragma: no cover - depends on local ML runtime
        whisper_model = None
        whisper_error = str(exc)

    try:
        if KPipeline is None:
            raise RuntimeError("kokoro package is not installed or failed to import.")
        tts_pipeline = KPipeline(lang_code=TTS_LANG_CODE)
        tts_error = None
    except Exception as exc:  # pragma: no cover - depends on local ML runtime
        tts_pipeline = None
        tts_error = str(exc)


@app.get("/health")
async def health():
    return {
        "status": "ok" if whisper_model is not None and tts_pipeline is not None else "degraded",
        "service": "local-voice-sidecar",
        "stt": {
            "model_loaded": whisper_model is not None,
            "model_name": WHISPER_MODEL_NAME,
            "device": WHISPER_DEVICE,
            "compute_type": WHISPER_COMPUTE_TYPE,
            "warm": whisper_warm,
            "error": whisper_error,
        },
        "tts": {
            "model_loaded": tts_pipeline is not None,
            "model_name": TTS_MODEL_NAME,
            "voice": TTS_VOICE_NAME,
            "sample_rate": TTS_SAMPLE_RATE,
            "warm": tts_warm,
            "error": tts_error,
        },
    }


@app.post("/transcribe")
async def transcribe(request: Request):
    global whisper_warm

    raw_audio = await request.body()
    audio_float32 = int16_bytes_to_float32(raw_audio)
    duration_ms = estimate_duration_ms(raw_audio)

    if whisper_model is None:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Faster-Whisper model is not loaded.",
                "model": WHISPER_MODEL_NAME,
                "device": WHISPER_DEVICE,
                "error": whisper_error,
            },
        )

    started_at = time.perf_counter()

    segments, info = whisper_model.transcribe(audio_float32, beam_size=5)
    transcript = "".join(segment.text for segment in segments).strip()
    processing_ms = int((time.perf_counter() - started_at) * 1000)
    whisper_warm = True

    return {
        "text": transcript,
        "language": getattr(info, "language", None),
        "duration_ms": duration_ms,
        "processing_ms": processing_ms,
        "model": WHISPER_MODEL_NAME,
        "audio_bytes": len(raw_audio),
        "language_probability": getattr(info, "language_probability", None),
    }


@app.post("/synthesize")
async def synthesize(payload: SynthesizeRequest):
    global tts_warm

    text = payload.text.strip()
    if tts_pipeline is None:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Kokoro pipeline is not loaded.",
                "model": TTS_MODEL_NAME,
                "voice": TTS_VOICE_NAME,
                "error": tts_error,
            },
        )

    def generate_pcm_chunks() -> Iterable[bytes]:
        nonlocal text
        if not text:
            yield b""
            return

        try:
            generator = tts_pipeline(
                text,
                voice=TTS_VOICE_NAME,
                speed=1.0,
                split_pattern=r"\n+",
            )

            for _graphemes, _phonemes, audio_float32 in generator:
                if audio_float32 is None:
                    continue
                yield float32_to_int16_bytes(audio_float32)
            tts_warm = True
        except Exception as exc:
            print(f"[TTS Error] {exc}")

    return StreamingResponse(
        generate_pcm_chunks(),
        media_type="application/octet-stream",
        headers={
            "X-TTS-Voice": TTS_VOICE_NAME,
            "X-TTS-Model": TTS_MODEL_NAME,
            "X-TTS-Sample-Rate": str(TTS_SAMPLE_RATE),
            "X-TTS-Text-Length": str(len(text)),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
