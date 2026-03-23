# AI OS Control Plane

This document is the stable entry alias for the current governed control-plane specification.

## Canonical spec
- `AI_OS_CONTROL_PLANE_v1.md`

## Why this file exists
- gives humans and future agents a stable filename to reference
- avoids drift if versioned specs continue as `AI_OS_CONTROL_PLANE_v2.md`, `v3.md`, etc.
- acts as the high-level constitutional pointer for the OS architecture

## Core philosophy
- registry declares reality
- OS enforces reality
- agent navigates reality

## Core boundaries
- kernel remains small and responsibility-bounded
- control plane owns laws, policies, registries, and state contracts
- execution plane owns transport, audio, sockets, and retry logic
- application/domain layers own business truth and workflow handlers

## Current constitutional rule
The model must never decide what exists. It may only navigate what the OS has already declared valid.
