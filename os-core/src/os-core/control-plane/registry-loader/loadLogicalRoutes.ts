import yaml from "js-yaml";

import logicalRoutesRaw from "../../../../../registry-yaml/logical-routes.yaml?raw";
import { ensureRegistryVersion, validateLogicalRoutes } from "./validateRegistry";
import type { LogicalRoutesRegistry } from "./types";

interface LogicalRoutesYaml {
  version?: unknown;
  routes?: unknown;
}

export function loadLogicalRoutes(): LogicalRoutesRegistry {
  const parsed = yaml.load(logicalRoutesRaw) as LogicalRoutesYaml;
  ensureRegistryVersion(parsed, "logical-routes.yaml");
  return {
    version: parsed.version as number,
    routes: validateLogicalRoutes(parsed.routes ?? []),
  };
}
