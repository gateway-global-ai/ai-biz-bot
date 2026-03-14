# Execution Plane

The execution plane contains latency-sensitive runtime machinery, especially Gemini live voice session handling.

It may:
- stream audio
- maintain session state
- dispatch typed actions

It may not:
- own business logic
- compile prompts in the hot path
- perform heavy blocking work
