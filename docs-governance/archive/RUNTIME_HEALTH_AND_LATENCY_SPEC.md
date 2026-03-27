# Runtime Health and Latency Spec

## Purpose
Define the observability layer required for a voice-first OS where latency is part of intelligence.

## Why this matters
Traditional checks like CPU, memory, and storage are necessary but insufficient. A PTT-first Gemini OS also depends on:
- event-loop health
- WebSocket stability
- audio buffer timing
- prompt compile latency
- tool dispatch latency
- time to first transcript
- time to first response
- time to first audio

## Observability layers

### 1. System health
- CPU
- memory
- storage
- disk IO
- uptime

### 2. Runtime health
- event loop lag
- active session count
- queue depth
- slow handler detection

### 3. Execution-plane health
- WebSocket connect time
- audio chunk processing latency
- buffer underrun/overrun events
- interruption recovery latency
- dropped sessions
- reconnect success rate

### 4. Control-plane latency
- prompt compile latency
- route resolution latency
- menu resolver latency
- policy gate evaluation latency

### 5. Domain and tool latency
- database latency on hot paths
- action dispatch latency
- tool execution latency
- external integration latency

## Reporting surfaces
- install-time readiness report
- runtime health dashboard
- latency dashboard
- bottleneck report
- local flight recorder / inspector stream

## Rules
- observability must be low-overhead by default
- deep diagnostics must not block the hot audio path
- metrics should help identify bottlenecks before UX visibly degrades
- structured sync and route events should be capturable through the flight recorder defined in `FLIGHT_RECORDER_GOVERNANCE.md`
- resilience and timeout behavior should follow `RESILIENCE_AND_CHAOS_GOVERNANCE.md`
