#!/usr/bin/env python3
"""Generate INDEX.md, index.json, index.yaml from source-mapping and file list."""
import json
import os
from pathlib import Path

LIBRARY_ROOT = Path(__file__).resolve().parent
TAXONOMY = [
    "auth_oauth", "api_endpoints", "reservation_flow", "payments", "housekeeping",
    "webhooks", "global_variables", "schema_aliasing", "ui_react", "voice_workflow", "best_practices"
]

def topic_tags(library_path, name):
    """Assign topic and tags from path and filename."""
    topics = []
    tags = []
    lp = library_path.lower()
    name_l = name.lower()
    if "oauth" in lp or "oauth" in name_l or "auth" in name_l:
        topics.append("auth_oauth")
        tags.append("oauth")
    if "api" in lp or "openapi" in lp or "endpoint" in lp or "api" in name_l:
        topics.append("api_endpoints")
        tags.append("api")
    if "reservation" in lp or "booking" in lp or "reservation" in name_l or "booking" in name_l:
        topics.append("reservation_flow")
        tags.append("reservation")
    if "payment" in lp or "payment" in name_l:
        topics.append("payments")
        tags.append("payments")
    if "housekeeping" in lp or "housekeeping" in name_l:
        topics.append("housekeeping")
        tags.append("housekeeping")
    if "webhook" in lp or "webhook" in name_l:
        topics.append("webhooks")
        tags.append("webhooks")
    if "global" in lp or "variable" in lp or "global_variables" in name_l:
        topics.append("global_variables")
        tags.append("global-variables")
    if "schema" in lp or "alias" in lp or "schema" in name_l or "aliasing" in name_l:
        topics.append("schema_aliasing")
        tags.append("schema-aliasing")
    if "workflow" in lp or "workflow" in name_l:
        topics.append("voice_workflow")
        tags.append("workflow")
    if "validation" in lp or "best" in name_l or "guide" in name_l or "developer" in name_l:
        topics.append("best_practices")
        tags.append("best-practices")
    if "template" in lp or "ui" in name_l:
        topics.append("ui_react")
        tags.append("templates")
    if "matching" in lp or "rate" in lp or "hotel" in name_l:
        tags.append("hotel-matching")
    if "hospitality" in lp or "industry" in lp:
        tags.append("hospitality")
    if not topics:
        topics.append("best_practices")
    if not tags:
        tags.append("reference")
    return list(dict.fromkeys(topics)), list(dict.fromkeys(tags))

def title_from_path(library_path):
    name = Path(library_path).stem
    return name.replace("_", " ").replace("-", " ").title()

def main():
    with open(LIBRARY_ROOT / "source-mapping.json") as f:
        data = json.load(f)
    items = data["items"]
    # Exclude source-inventory from index (internal doc)
    entries = []
    for it in items:
        lp = it["library_path"]
        if lp.startswith("source-inventory") or "source-inventory" in lp:
            continue
        ext = Path(lp).suffix.lstrip(".")
        file_type = "yaml" if ext in ("yaml", "yml") else ext if ext else "md"
        if file_type not in ("md", "yaml", "yml", "json", "mdc"):
            continue
        title = title_from_path(lp)
        category = lp.split("/")[0]
        topics, tags = topic_tags(lp, title)
        integration_stage = "build" if "workflow" in lp or "guide" in lp else "runtime" if "api" in lp or "oauth" in lp else "reference"
        best_practice_flags = ["guardrails"] if "best_practices" in topics or "validation" in lp else []
        if "CRITICAL" in lp or "pattern" in lp.lower():
            best_practice_flags.append("critical")
        related = []
        if "oauth" in lp:
            related = [e["library_path"] for e in items if "OAUTH" in e["library_path"] and e["library_path"] != lp][:3]
        elif "reservation" in lp or "booking" in lp:
            related = [e["library_path"] for e in items if ("reservation" in e["library_path"] or "booking" in e["library_path"]) and e["library_path"] != lp][:3]
        elif "payment" in lp:
            related = [e["library_path"] for e in items if "payment" in e["library_path"] and e["library_path"] != lp][:3]
        entry = {
            "id": lp.replace("/", "_").replace(".", "_"),
            "title": title,
            "category": category,
            "tags": tags,
            "source_path": it["source_path"],
            "library_path": lp,
            "file_type": file_type,
            "topic": topics,
            "integration_stage": integration_stage,
            "best_practice_flags": best_practice_flags,
            "related_items": related,
        }
        entries.append(entry)

    # index.json
    with open(LIBRARY_ROOT / "index.json", "w") as f:
        json.dump({"version": "1.0", "taxonomy": TAXONOMY, "items": entries}, f, indent=2)

    # index.yaml
    import yaml
    try:
        from yaml import CDumper as Dumper
    except ImportError:
        from yaml import Dumper
    with open(LIBRARY_ROOT / "index.yaml", "w") as f:
        yaml.dump({"version": "1.0", "taxonomy": TAXONOMY, "items": entries}, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    # INDEX.md
    lines = [
        "# Cloudbeds & Hotel Knowledge Library — Index",
        "",
        "Human-readable navigation and usage notes for agent retrieval.",
        "",
        "## Usage",
        "",
        "- **Build-time:** Query by `category`, `topic`, or `tags` for implementation docs.",
        "- **Runtime:** Use `api_endpoints`, `auth_oauth`, `reservation_flow` for live flows.",
        "- **Guardrails:** Use `best_practices` and `validation` for operational safety.",
        "",
        "## Taxonomy (tags)",
        "",
        "| Tag | Description |",
        "|-----|-------------|",
    ]
    for t in TAXONOMY:
        lines.append(f"| `{t}` | See items tagged with this topic |")
    lines.extend([
        "",
        "## Sections",
        "",
        "| Section | Description | Count |",
        "|---------|-------------|-------|",
    ])
    by_cat = {}
    for e in entries:
        by_cat.setdefault(e["category"], []).append(e)
    for cat in ["cloudbeds", "hospitality", "hotel-matching", "global-variables"]:
        count = len(by_cat.get(cat, []))
        desc = {"cloudbeds": "API, OAuth, workflows, validation", "hospitality": "Templates, industry mapping", "hotel-matching": "Matching and rate intelligence", "global-variables": "Variable mapping and schema aliasing"}.get(cat, "")
        lines.append(f"| [{cat}/]({cat}/INDEX.md) | {desc} | {count} |")
    lines.extend(["", "## All items", ""])
    for cat in ["cloudbeds", "hospitality", "hotel-matching", "global-variables"]:
        lines.append(f"### {cat}")
        for e in by_cat.get(cat, []):
            lines.append(f"- [{e['title']}]({e['library_path']}) — `{' '.join(e['topic'][:2])}`")
        lines.append("")
    with open(LIBRARY_ROOT / "INDEX.md", "w") as f:
        f.write("\n".join(lines))

    print("Generated INDEX.md, index.json, index.yaml with", len(entries), "items")

if __name__ == "__main__":
    main()
