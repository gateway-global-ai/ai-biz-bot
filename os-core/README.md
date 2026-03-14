# Gateway OS Core

This folder is the initial isolation boundary for the AI OS kernel work.

## Purpose
- host the governed OS runtime layer in parallel to the current application
- keep control-plane and execution-plane extraction work separated from the reference app
- allow shell, registry, policy, and prompt/runtime boundaries to be proven before selective migration

## Scope for the first setup
- governance-first documentation
- registry-driven architecture
- execution-plane boundary definitions
- YAML registry layer
- shell/bootstrap placeholders

## Non-goals
- do not copy the entire current app into this folder
- do not move frozen live voice infrastructure here yet
- do not merge domain logic until registries and policies are in place
