# View Registry

## Purpose
Define the governed UI states the OS may render.

## View categories
- `menu`
- `form`
- `controller`
- `inspector`
- `confirmation`
- `refusal`
- `ptt_first`

## View fields
Each view definition should declare:
- `viewId`
- `category`
- `requiredContextKeys`
- `allowedActions`
- `dataContract`
- `renderHints`
- `policyGate`

## Rules
- Views are loaded through the registry only.
- A view may only expose actions declared in the Action Registry.
- A view may not contain hidden side-effect behavior.
- A view may render only with satisfied context and policy gates.
- The shell remains mounted while views swap in the main canvas.
