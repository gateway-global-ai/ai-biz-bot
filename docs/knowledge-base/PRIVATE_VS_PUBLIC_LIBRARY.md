# Private vs Public Knowledge Library

## Overview

- **Private library**: Internal docs (secrets, how we do business, platform economics, Clear Voice rules). Only admins can access. Used by the Knowledge Base agent when you ask questions from the Platform Knowledge page.
- **Public library**: Curated subset safe to share with agents and customers, by category. No secrets. Defined in `public-catalog.json`.

## Private library (admin-only)

- **Endpoint**: `GET /api/knowledge/platform-library` (requires `Authorization: Bearer <admin token>`).
- **Contents**: 
  - `docs/knowledge-base/index.json` (Cloudbeds, hospitality, hotel, global variables)
  - In-repo: `docs/*.md` (excluding `docs/knowledge-base/`) and `.cursor/rules/*.mdc` (Clear Voice)
- **UI**: Platform → Knowledge Library (when signed in as admin). Lists all private docs and provides the **Knowledge Base Agent** chat that searches these docs and answers questions.

## Public library (shareable)

- **Endpoint**: `GET /api/knowledge/public-library` (no auth). Returns taxonomy and item list only.
- **Content by id**: `GET /api/knowledge/public-library/:id/content` returns raw document content only for ids listed in the public catalog.
- **Definition**: `docs/knowledge-base/public-catalog.json`:
  - `taxonomy`: array of category names (e.g. `["hospitality", "api_guides", "best_practices"]`).
  - `items`: array of `{ "id", "title", "category", "description?", "source_path" }`.
  - `source_path`: path relative to project root to the file (e.g. `docs/knowledge-base/hospitality/industry-mapping/README.md`). Only these paths are ever served; no other repo files are exposed.

**Rule**: Add to `public-catalog.json` only docs that are safe for agents and customers (no secrets, no internal playbooks). Add new categories to `taxonomy` as needed.

## Knowledge Base Agent

- **Endpoint**: `POST /api/knowledge/chat` (requires admin auth). Body: `{ "message", "history" }`.
- **Behavior**: Searches the private library using the current message, injects top excerpts into context, and returns an answer from the model. Use it from the Platform Knowledge Library page (“Knowledge Base Agent” panel).

## Summary

| Audience        | What they see / use |
|-----------------|---------------------|
| Admin (signed in) | Private library list + Knowledge Base Agent chat |
| Agents / customers | Public library list by category + content only for catalog ids |
