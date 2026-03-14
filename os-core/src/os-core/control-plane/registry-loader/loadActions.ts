import yaml from "js-yaml";

import actionsRaw from "../../../../../registry-yaml/actions.yaml?raw";
import { ensureRegistryVersion, validateActions } from "./validateRegistry";
import type { ActionsRegistry } from "./types";

interface ActionsYaml {
  version?: unknown;
  actions?: unknown;
}

export function loadActions(): ActionsRegistry {
  const parsed = yaml.load(actionsRaw) as ActionsYaml;
  ensureRegistryVersion(parsed, "actions.yaml");
  return {
    version: parsed.version as number,
    actions: validateActions(parsed.actions ?? []),
  };
}
