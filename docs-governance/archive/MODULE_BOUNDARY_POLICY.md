# Module Boundary Policy

## Purpose
Define what each major OS module is allowed to know about and what it must never contain.

## `app/`
Allowed:
- bootstrap
- providers
- router mount
- shell mount

Forbidden:
- business logic
- prompt logic
- giant route trees
- direct domain orchestration

## `shell/`
Allowed:
- layout
- context bar
- breadcrumbs
- shell mode rendering
- conversational navigation controller

Forbidden:
- direct storage calls
- execution-plane logic
- domain mutation logic

## `os-core/control-plane/`
Allowed:
- registries
- policies
- context/entity resolvers
- menu resolver
- prompt registry/compiler
- governance review logic

Forbidden:
- direct UI rendering
- hot-path audio/session handling

## `os-core/execution-plane/`
Allowed:
- audio IO
- Gemini session state
- interruption handling
- typed action dispatch

Forbidden:
- business semantics
- UI rendering
- prompt authoring
- heavy blocking persistence logic

## `domains/`
Allowed:
- business truth
- workflow handlers
- domain services

Forbidden:
- shell layout logic
- raw prompt templates
- execution-plane session handling

## `views/`
Allowed:
- governed visual rendering
- structured forms/controllers/inspectors

Forbidden:
- hidden side-effect behavior
- direct execution-plane imports
- direct prompt compiler logic

## `storage/`
Allowed:
- repositories
- adapters
- session/cache access

Forbidden:
- UI logic
- policy logic
- prompt logic
