#!/usr/bin/env python3
"""Validate: every indexed entry points to existing file; canonical YAML present; index parity."""
import json
from pathlib import Path

LIBRARY_ROOT = Path(__file__).resolve().parent
errors = []

# 1. Load index.json and index.yaml item ids
with open(LIBRARY_ROOT / "index.json") as f:
    data = json.load(f)
json_items = {e["library_path"]: e for e in data["items"]}

with open(LIBRARY_ROOT / "index.yaml") as f:
    import yaml
    ydata = yaml.safe_load(f)
yaml_items = {e["library_path"]: e for e in ydata["items"]}

# 2. Same item set
json_paths = set(json_items.keys())
yaml_paths = set(yaml_items.keys())
if json_paths != yaml_paths:
    errors.append(f"Index parity: json has {len(json_paths)} paths, yaml has {len(yaml_paths)}; symmetric diff: {json_paths ^ yaml_paths}")

# 3. Every indexed entry points to existing file
for lp in json_paths:
    path = LIBRARY_ROOT / lp
    if not path.exists():
        errors.append(f"Missing file: {lp}")
    elif not path.is_file():
        errors.append(f"Not a file: {lp}")

# 4. Canonical YAML presence
openapi = LIBRARY_ROOT / "cloudbeds/api/pms-v1.3-openapi.yaml"
validation = LIBRARY_ROOT / "cloudbeds/validation/validation-rules.yaml"
if not openapi.exists():
    errors.append("Canonical OpenAPI missing: cloudbeds/api/pms-v1.3-openapi.yaml")
if not validation.exists():
    errors.append("Canonical validation YAML missing: cloudbeds/validation/validation-rules.yaml")

if errors:
    for e in errors:
        print("ERROR:", e)
    exit(1)
print("Validation passed: file existence, canonical YAML, index parity OK.")
exit(0)
