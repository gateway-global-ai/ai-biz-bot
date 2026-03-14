import type { UIElementDef, UIElementsRegistry } from "./types";

export function findUIElementBySemanticAlias(
  registry: UIElementsRegistry,
  semanticAlias: string
): UIElementDef | null {
  return (
    registry.elements.find((element) =>
      element.semantic_aliases.includes(semanticAlias)
    ) ?? null
  );
}

export function findUIElementByElementId(
  registry: UIElementsRegistry,
  elementId: string
): UIElementDef | null {
  return (
    registry.elements.find((element) => element.elementId === elementId) ?? null
  );
}
