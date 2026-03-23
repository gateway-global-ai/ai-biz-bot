import yaml from "js-yaml";

import viewsRaw from "../../../../../registry-yaml/views.yaml?raw";
import { ensureRegistryVersion, validateViews } from "./validateRegistry";
import type { ViewsRegistry } from "./types";

interface ViewsYaml {
  version?: unknown;
  views?: unknown;
}

export function loadViews(): ViewsRegistry {
  const parsed = yaml.load(viewsRaw) as ViewsYaml;
  ensureRegistryVersion(parsed, "views.yaml");
  return {
    version: parsed.version as number,
    views: validateViews(parsed.views ?? []),
  };
}
