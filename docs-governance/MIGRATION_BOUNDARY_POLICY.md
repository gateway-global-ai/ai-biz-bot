# Migration Boundary Policy

## Purpose
Define how code is extracted from the current reference application into the new OS-core branch.

## Core principle
Do not rewrite the whole product. Extract and prove the governance kernel first.

## What belongs in OS core first
- registries
- policies
- shell contracts
- route/view/action contracts
- prompt runtime structure
- execution-plane boundaries
- install and observability contracts

## What remains in the current app initially
- full historical feature sprawl
- frozen live voice pipeline implementation
- experimental modules
- integrations not needed to prove the OS kernel

## Migration rules
- copy or abstract only proven patterns needed for the kernel
- do not bulk-copy giant files into `os-core/`
- migrate by contract first, implementation second
- every migration candidate must map to a registry, policy, or shell/runtime responsibility

## Graduation rule
A module should only move into OS core when:
- its responsibility is clear
- its dependencies obey the import matrix
- it strengthens the kernel rather than bloating it
