# Local Voice Sidecar

This FastAPI sidecar provides the Python ML execution layer for the Mission Control local voice sandbox.

## Endpoints

- `GET /health`
- `POST /transcribe`
  - input: raw PCM16 bytes from Node
  - output:
    ```json
    {
      "text": "Turn on the chaos engine.",
      "language": "en",
      "duration_ms": 842,
      "processing_ms": 317,
      "model": "small",
      "audio_bytes": 26944,
      "language_probability": 0.98
    }
    ```
- `POST /synthesize`
  - input: `{"text": "..."}`
  - output: streamed `application/octet-stream` PCM16 bytes

## Run

```bash
cd server/local-voice/sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

The sidecar listens on `127.0.0.1:8000` by default, matching the Node local voice provider configuration.

## Docker

### Build

```bash
cd server/local-voice/sidecar
docker build -t local-voice-sidecar .
```

### Compose

```bash
cd server/local-voice/sidecar
cp .env.example .env
docker compose up --build
```

The compose service exposes the sidecar on `${LOCAL_VOICE_PORT:-8000}` and mounts persistent cache/log volumes so model files do not need to be baked into the image.

## Environment Contract

### Core Runtime

- `LOCAL_VOICE_PORT` default: `8000`
- `LOCAL_VOICE_WARMUP` default: `true`
- `LOCAL_VOICE_LOG_LEVEL` default: `info`

### Faster-Whisper

- `LOCAL_WHISPER_MODEL` default: `small`
- `LOCAL_WHISPER_DEVICE` default: `cpu`
- `LOCAL_WHISPER_COMPUTE_TYPE` default: `int8`

### Kokoro / TTS

- `LOCAL_TTS_MODEL` default: `kokoro-v1`
- `LOCAL_TTS_VOICE` default: `default`
- `LOCAL_TTS_SAMPLE_RATE` default: `24000`

### Governance / Future Routing

- `LOCAL_VOICE_PRIVACY_MODE` default: `strict_local`
- `LOCAL_VOICE_ALLOW_CLOUD_FALLBACK` default: `false`

## Volume Contract

### Persistent Volumes

- `/models`
  - model cache root
  - also used for `HF_HOME=/models/huggingface`
- `/logs`
  - optional runtime log destination for future structured inference logs

### Design Guidance

- Do not bake large model files permanently into the image unless there is a specific offline-appliance requirement.
- Prefer mounted cache volumes or first-boot downloads.
- Keep the Node orchestrator unaware of model file layout; it should only call the HTTP contract.

## Health Contract

Two levels matter:

- liveness: process is up
- readiness: STT/TTS models are loaded and warm enough to serve

Current `/health` reports structured STT readiness. TTS readiness should be added alongside Kokoro integration.

## Optional Environment Variables

- `LOCAL_WHISPER_MODEL` default: `small`
- `LOCAL_WHISPER_DEVICE` default: `cpu`
- `LOCAL_WHISPER_COMPUTE_TYPE` default: `int8`

## V1 Notes

- `transcribe` now uses Faster-Whisper directly when the model loads successfully
- `synthesize` is stubbed to stream a short PCM16 silence frame
- Replace the TODO blocks in `main.py` with Faster-Whisper and Kokoro integrations once the Node/WebSocket path is validated end-to-end
