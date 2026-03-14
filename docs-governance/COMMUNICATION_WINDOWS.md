# Communication Windows

## Purpose
Define the governed conversational pacing model used by voice-first business agents so they remain concise, human-like, and bounded under pressure.

## Core principle
Business interaction voice agents should communicate in short, purposeful windows rather than long-form explanatory dumps.

The OS should express this in machine-native terms:

- token budgets
- percentage allocations
- window limits
- handoff thresholds

not vague instructions like "keep it short" or "send an SMS if needed." Models respond much more reliably to budgets, ratios, and bounded decision rules than to soft human phrasing.

The recommended sequence is:

1. **Role / Emotion / DISC first**
2. **ARCH second**

This ensures the agent knows who it is, how it should sound, and how it should structure the reply before adding richer behavior.

## ARCH window model

ARCH windows are:

- **Acknowledge**
- **Reflect**
- **Context**
- **Handoff**

These are not only personality controls. They are pacing controls for multi-model communication and should be treated as governed runtime parameters.

### Why they matter
- they constrain over-talking
- they reduce voice latency pressure caused by long explanations
- they help the agent decide when to switch from voice to link/UI/SMS
- they encourage more human-like business interaction
- they lower reliance on giant prompt text because the communication window itself is bounded
- they force the model to prioritize the most important conversational job for that turn

### Typical business-voice pattern
- short acknowledgement
- short reflection
- brief context window
- fast handoff to the next medium if the answer is too large for efficient voice delivery

Example pattern:
- acknowledge the caller
- reflect their likely need or current state
- provide just enough context to justify the next move
- hand off to:
  - a link
  - the on-screen view
  - SMS
  - another governed step

## Recommended starting profile
Historically effective test values:

- `A: 5`
- `R: 5`
- `C: 10`
- `H: 2`

These values should be represented internally as governed budgets, such as:

- token allocation
- relative percentages of response budget
- time-window caps

The implementation may choose one of these internally, but the runtime contract should stay explicit and machine-readable.

## Machine-native interpretation
The model should not be expected to reason from abstract instructions like:

- "be concise"
- "send an SMS"
- "shorten the response"

Instead, the compiler/runtime should provide explicit constraints such as:

- maximum response budget
- A/R/C/H allocation percentages
- handoff threshold
- maximum context expansion before switching medium

This gives the model a bounded decision space it can actually follow.

## Emotion interaction
Emotion materially changes how the communication windows land.

Examples:

- an upbeat or energized emotion can make the same DISC/ARCH profile feel more alive and commercially effective
- when the user is upset, insufficient **Acknowledge** and **Reflect** allocation will often prolong frustration
- a calmer or more empathetic emotional profile can make the same handoff feel supportive instead of dismissive

This means Role, Emotion, DISC, and ARCH should be compiled in that order because each layer changes how the next one is interpreted.

## Behavior rule
If the answer cannot fit cleanly inside the governed communication window, the agent should:

1. give a short, bounded verbal response
2. explain the switch briefly
3. hand off to a better medium

That better medium may be:
- a generated link
- an SMS link
- a governed UI view
- another specialist or route

The trigger for that switch should ideally be machine-governed, for example:

- context budget exceeded
- explanation exceeds allowed response window
- data-heavy answer requires structured UI
- confirmation or follow-up requires a governed non-voice medium

## Practical business effect
When the communication windows are enforced, the model often becomes more efficient and more situationally aware.

Examples of positive effects:

- if there is little to reflect on, the model may use the short window to identify the caller and move directly into a useful business question
- the model becomes less likely to dump long explanations when a fast handoff would serve the user better
- the model sounds more human because it must choose what matters most in a bounded turn

## Governance rule
- ARCH windows belong to governed structured controls, not raw prompt editing
- communication windows must not be reintroduced as ad hoc prompt prose inside UI or route files
- prompt/runtime logic should treat them as first-class behavior contracts
- upset-user handling should preserve sufficient Acknowledge and Reflect capacity by policy, not by chance
