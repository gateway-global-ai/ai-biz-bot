import yaml from "js-yaml";

import uiElementsRaw from "../../../../../registry-yaml/ui-elements.yaml?raw";
import { ensureRegistryVersion, validateUIElements } from "./validateRegistry";
import type { UIElementsRegistry } from "./types";

interface UIElementsYaml {
  version?: unknown;
  elements?: unknown;
}

export function loadUIElements(): UIElementsRegistry {
  const parsed = yaml.load(uiElementsRaw) as UIElementsYaml;
  ensureRegistryVersion(parsed, "ui-elements.yaml");
  return {
    version: parsed.version as number,
    elements: validateUIElements(parsed.elements ?? []),
  };
}
