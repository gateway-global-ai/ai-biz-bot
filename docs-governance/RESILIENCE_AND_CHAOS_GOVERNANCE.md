# Resilience and Chaos Governance

## Purpose
Define the resilience rules that protect the OS shell when the execution plane becomes slow, unreliable, or temporarily unavailable.

## Core principle
The shell must never freeze while waiting on the execution plane.

## Shell resilience mandate
- All execution-plane bridge communication must be wrapped in a strict timeout.
- The current approved timeout threshold is **5000ms** unless a future governance change updates it.
- The shell may await an execution-plane acknowledgment, but it may not depend on the execution plane for its own rendering cycle.

## Graceful degradation
If a sync fails or times out:

- local UI state must remain intact
- shell status must clearly indicate `Sync Error`
- an immutable `ERROR` event must be written to the Flight Recorder
- the OS must remain usable for non-AI interactions

Examples:
- a slider stays where the user committed it
- a route stays navigable
- the shell does not deadlock or hide the rest of the interface

## Chaos testing prerequisite
Before approving future:
- inbound tools
- outbound sync payload expansions
- execution-plane bridge changes

the feature must be tested against the Test/Chaos bridge under adverse conditions such as:
- high latency
- failure spikes
- dropped requests
- hung responses

The OS must prove it survives its own nervous system failing.

## Bridge swapping architecture
The OS must support swappable bridge implementations such as:
- Mock bridge
- Chaos/Test bridge
- Live bridge

Bridge selection must remain an execution-plane composition concern rather than a control-plane code change.

Valid control surfaces may include:
- environmental configuration
- developer inspector controls
- test harness configuration

## Governance rules
- no sync path may assume guaranteed success
- no execution-plane delay may permanently block shell progress
- no future bridge implementation may bypass timeout handling
- resilience behavior must be testable, not merely described
