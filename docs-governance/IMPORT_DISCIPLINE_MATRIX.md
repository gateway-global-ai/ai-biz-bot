# Import Discipline Matrix

## Purpose
Define legal dependency directions so the OS does not collapse back into a monolith.

## Rules

### `app/`
May import:
- shell bootstrap
- provider setup
- browser route mount

May not import:
- domain handlers
- execution-plane internals

### `shell/`
May import:
- route/view contracts
- shell state adapters
- governed view registry outputs

May not import:
- raw storage adapters
- execution-plane internals
- direct domain mutation handlers

### `views/`
May import:
- view contracts
- UI primitives
- selectors / typed view data

May not import:
- execution-plane internals
- prompt compiler internals
- direct storage repositories

### `os-core/control-plane/`
May import:
- schema contracts
- policy data
- registry data

May not import:
- UI layers
- execution-plane internals

### `os-core/execution-plane/`
May import:
- typed action-registry contracts
- session/runtime utilities

May not import:
- domain modules directly
- views
- shell
- prompt templates authored outside prompt runtime

### `domains/`
May import:
- repositories
- schema contracts
- registry contracts

May not import:
- prompt compiler internals
- shell rendering
- execution-plane session logic

### `storage/`
May import:
- schema
- database/cache/session clients

May not import:
- views
- shell
- prompt runtime
- policy engine
