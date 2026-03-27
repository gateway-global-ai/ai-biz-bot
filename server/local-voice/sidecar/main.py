from __future__ import annotations

import os
import time
from typing import Iterable

import numpy as np
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel

try:
    from kokoro import KPipeline
except Exception:  # pragma: no cover - depends on optional runtime package
    KPipeline = None

# audioop was removed in Python 3.13; provide a pure-numpy fallback
try:
    import audioop as _audioop  # type: ignore
    _HAS_AUDIOOP = True
except ImportError:
    _audioop = None  # type: ignore
    _HAS_AUDIOOP = False

# Silero VAD — neural speech boundary detection (immune to background noise)
try:
    import torch as _torch
    _silero_vad_model, _silero_utils = _torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
        verbose=False,
    )
    _SILERO_AVAILABLE = True
except Exception:
    _silero_vad_model = None
    _silero_utils = None
    _SILERO_AVAILABLE = False


app = FastAPI(title="OS Voice Sidecar")

WHISPER_MODEL_NAME = os.getenv("LOCAL_WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("LOCAL_WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("LOCAL_WHISPER_COMPUTE_TYPE", "int8")
TTS_MODEL_NAME = os.getenv("LOCAL_TTS_MODEL", "kokoro-v1")
TTS_VOICE_NAME = os.getenv("LOCAL_TTS_VOICE", "af_heart")
TTS_SAMPLE_RATE = int(os.getenv("LOCAL_TTS_SAMPLE_RATE", "24000"))
TTS_LANG_CODE = os.getenv("LOCAL_TTS_LANG_CODE", "a")

# VAD tuning — adjust via env for different environments
VAD_SILENCE_THRESHOLD_MS = int(os.getenv("VAD_SILENCE_MS", "700"))
VAD_SPEECH_THRESHOLD = float(os.getenv("VAD_SPEECH_THRESHOLD", "0.5"))
VAD_MIN_SPEECH_FRAMES = int(os.getenv("VAD_MIN_SPEECH_FRAMES", "3"))  # ~96ms at 16kHz/512
SILERO_CHUNK_SAMPLES = 512   # 32ms window at 16kHz (Silero requirement)
SILERO_SAMPLE_RATE = 16000

whisper_model: WhisperModel | None = None
whisper_error: str | None = None
whisper_warm = False
tts_pipeline = None
tts_error: str | None = None
tts_warm = False
silero_model = _silero_vad_model
silero_error: str | None = None if _SILERO_AVAILABLE else "Silero VAD not available (torch not installed); using energy-based fallback"


class SynthesizeRequest(BaseModel):
    text: str


# ── Audio utilities ────────────────────────────────────────────────────────────

def ulaw_to_int16(ulaw_bytes: bytes) -> np.ndarray:
    """Decode μ-law bytes to int16 PCM. Uses audioop when available (faster)."""
    if _HAS_AUDIOOP:
        linear = _audioop.ulaw2lin(ulaw_bytes, 2)  # type: ignore[union-attr]
        return np.frombuffer(linear, dtype=np.int16)
    # Pure-numpy fallback (compatible with Python 3.13+)
    u = np.frombuffer(ulaw_bytes, dtype=np.uint8).astype(np.int32)
    u = ~u
    sign = u & 0x80
    exponent = (u >> 4) & 0x07
    mantissa = u & 0x0f
    sample = ((mantissa << 3) + 33) << exponent
    sample -= 33
    sample = np.where(sign != 0, -sample, sample)
    return sample.astype(np.int16)


def upsample_linear_int16(pcm: np.ndarray, in_rate: int, out_rate: int) -> np.ndarray:
    """Linear interpolation resampler for int16 arrays."""
    ratio = in_rate / out_rate
    out_len = int(len(pcm) / ratio)
    indices = np.arange(out_len, dtype=np.float64) * ratio
    idx_floor = np.floor(indices).astype(np.int64)
    idx_ceil = np.minimum(idx_floor + 1, len(pcm) - 1)
    frac = (indices - idx_floor).astype(np.float32)
    result = (pcm[idx_floor] * (1 - frac) + pcm[idx_ceil] * frac)
    return result.astype(np.int16)


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
        "vad": {
            "silero_available": _SILERO_AVAILABLE,
            "error": silero_error,
        },
    }


@app.websocket("/ws/stream-vad-stt")
async def stream_vad_stt(websocket: WebSocket):
    """
    Streaming VAD + STT endpoint for sovereign Twilio Media Streams.

    Protocol:
      IN  — raw binary μ-law 8kHz chunks (direct from Twilio base64-decoded)
      OUT — JSON messages:
              {"type": "transcript", "text": "...", "is_final": true}
              {"type": "vad_status", "speaking": true|false}
              {"type": "error", "message": "..."}
    """
    await websocket.accept()
    print("[VAD+STT] WebSocket client connected")

    # Buffers: keep both 8kHz (for Whisper after upsampling) and 16kHz float (for Silero)
    speech_pcm8k: list[np.ndarray] = []          # speech frames at 8kHz int16
    silero_pending = np.array([], dtype=np.float32)  # partial Silero chunk accumulator

    # VAD state
    is_speaking = False
    silence_frame_count = 0
    speech_frame_count = 0
    # How many 32ms Silero frames of silence trigger end-of-speech
    silence_frames_needed = max(1, VAD_SILENCE_THRESHOLD_MS // 32)

    def run_silero(chunk_float32: np.ndarray) -> float:
        """Return speech probability [0..1] for a 512-sample 16kHz float32 chunk."""
        if silero_model is None or not _SILERO_AVAILABLE:
            # Energy-based fallback: rms > threshold
            rms = float(np.sqrt(np.mean(chunk_float32 ** 2)))
            return 1.0 if rms > 0.01 else 0.0
        try:
            import torch  # type: ignore
            tensor = _torch.tensor(chunk_float32).unsqueeze(0)
            with _torch.no_grad():
                return float(silero_model(tensor, SILERO_SAMPLE_RATE).item())
        except Exception:
            rms = float(np.sqrt(np.mean(chunk_float32 ** 2)))
            return 1.0 if rms > 0.01 else 0.0

    async def transcribe_and_send(pcm8k_frames: list[np.ndarray]) -> None:
        """Concatenate speech frames, upsample to 16kHz, run Faster-Whisper, send result."""
        if not pcm8k_frames:
            return
        combined = np.concatenate(pcm8k_frames)
        pcm16k = upsample_linear_int16(combined, 8000, 16000)
        audio_float32 = pcm16k.astype(np.float32) / 32768.0
        if whisper_model is None:
            await websocket.send_json({"type": "error", "message": "Whisper model not loaded"})
            return
        try:
            segments, _info = whisper_model.transcribe(audio_float32, beam_size=5)
            text = "".join(seg.text for seg in segments).strip()
            if text:
                await websocket.send_json({"type": "transcript", "text": text, "is_final": True})
                print(f"[VAD+STT] Transcript: {text!r}")
        except Exception as exc:
            await websocket.send_json({"type": "error", "message": str(exc)})

    try:
        while True:
            ulaw_bytes = await websocket.receive_bytes()
            if not ulaw_bytes:
                continue

            # Decode μ-law → int16 PCM @ 8kHz
            pcm8k = ulaw_to_int16(ulaw_bytes)

            # Upsample 8kHz → 16kHz for Silero
            pcm16k = upsample_linear_int16(pcm8k, 8000, 16000)
            pcm16k_float = pcm16k.astype(np.float32) / 32768.0

            # Accumulate for Silero chunking
            silero_pending = np.concatenate([silero_pending, pcm16k_float])

            # Always accumulate 8kHz speech frames (we keep them even during silence;
            # we reset after confirmed end-of-speech)
            speech_pcm8k.append(pcm8k)

            # Process as many complete Silero chunks as available
            while len(silero_pending) >= SILERO_CHUNK_SAMPLES:
                chunk = silero_pending[:SILERO_CHUNK_SAMPLES]
                silero_pending = silero_pending[SILERO_CHUNK_SAMPLES:]

                prob = run_silero(chunk)

                if prob >= VAD_SPEECH_THRESHOLD:
                    speech_frame_count += 1
                    silence_frame_count = 0
                    if not is_speaking and speech_frame_count >= VAD_MIN_SPEECH_FRAMES:
                        is_speaking = True
                        await websocket.send_json({"type": "vad_status", "speaking": True})
                else:
                    if is_speaking:
                        silence_frame_count += 1
                    speech_frame_count = 0

                if is_speaking and silence_frame_count >= silence_frames_needed:
                    # End-of-speech: transcribe accumulated frames then reset
                    is_speaking = False
                    await websocket.send_json({"type": "vad_status", "speaking": False})
                    frames_to_transcribe = speech_pcm8k[:]
                    speech_pcm8k.clear()
                    silence_frame_count = 0
                    # Run transcription on accumulated speech
                    await transcribe_and_send(frames_to_transcribe)

    except WebSocketDisconnect:
        print("[VAD+STT] Client disconnected")
    except Exception as exc:
        print(f"[VAD+STT] Error: {exc}")
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass


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
