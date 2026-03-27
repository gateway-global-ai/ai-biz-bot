# Menu Resolver Contract

## Purpose
Determine what the user is allowed to see and do next from the current context.

## Inputs
- role scope
- permissions
- active context keys
- current entity
- current route
- current shell mode
- agent policy
- related child entities

## Outputs
- breadcrumb
- valid menu items
- suggested next actions
- target route id
- target render mode
- confirmation requirement
- escalation requirement
- refusal requirement

## Resolution rules
1. resolve role scope
2. resolve active context keys
3. load related entities from approved schema anchors
4. filter by policy and permissions
5. generate child menu items
6. promote suggested next actions
7. select next render mode

## UX rules
- If only one valid option exists, the system may skip the extra menu.
- Menus render in the content pane, not as tiny uncontrolled dropdowns.
- The resolver may not return actions or routes not declared in registries.
