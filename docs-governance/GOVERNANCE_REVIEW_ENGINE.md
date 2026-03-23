# Governance Review Engine

## Purpose
Provide a pre-implementation review layer that analyzes plans, specs, requests, and proposed features before coding begins.

## Problem solved
Most systems review code after changes exist. The AI OS must also review:
- plans
- architecture proposals
- feature requests
- coding-agent instructions
- YAML / registry changes

before implementation starts.

## Engine responsibilities
- check alignment with the System Manifest
- validate proposals against schema anchors
- detect route/view/action drift
- detect violations of agent policy and Safe Mode
- detect file-system and module-boundary violations
- detect prompt-runtime and execution-plane violations
- produce a structured review report

## Inputs
- plan text or spec text
- optional target domain
- optional affected files
- optional proposed routes / views / actions

## Review sequence
1. Read `SYSTEM_MANIFEST.md`
2. Identify referenced entities and map them to schema anchors
3. Identify route, view, action, and policy implications
4. Check file/module boundary implications
5. Check prompt/runtime and execution-plane implications
6. Emit structured review findings

## Output
The engine outputs a structured review report defined in `REVIEW_REPORT_SCHEMA.md`.

## Required behavior
- never approve a plan that invents canonical entities without registry/schema evolution
- never approve execution-plane contamination
- never approve hidden side-effect UI behavior
- flag missing contracts before implementation begins
