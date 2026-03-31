#!/usr/bin/env node
/**
 * Regenerates registry-yaml/shadcn-io-catalog/component_index.v1.json
 * from the same link set as shadcnio/react-shadcn-components README (+ panel, canvas).
 * Run: node scripts/generate-shadcn-io-component-index.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "registry-yaml/shadcn-io-catalog/component_index.v1.json");

/** @type {Array<[string, string, string]>} [categorySegment, pathSuffix, title] — doc is www.shadcn.io/{pathSuffix} */
const rows = [
  // React AI (README) + extras used in Sovereign canvas planning
  ["ai", "actions", "Actions"],
  ["ai", "branch", "Branch"],
  ["ai", "canvas", "Canvas"],
  ["ai", "code-block", "Code Block"],
  ["ai", "conversation", "Conversation"],
  ["ai", "image", "Image"],
  ["ai", "inline-citation", "Inline Citation"],
  ["ai", "loader", "Loader"],
  ["ai", "message", "Message"],
  ["ai", "panel", "Panel"],
  ["ai", "prompt-input", "Prompt Input"],
  ["ai", "reasoning", "Reasoning"],
  ["ai", "response", "Response"],
  ["ai", "sources", "Sources"],
  ["ai", "suggestion", "Suggestion"],
  ["ai", "task", "Task"],
  ["ai", "tool", "Tool"],
  ["ai", "web-preview", "Web Preview"],
  // Buttons (README)
  ["button", "animated-modal", "Animated Modal"],
  ["button", "copy", "Copy"],
  ["button", "corner-accent-button", "Corner Accent"],
  ["button", "counter", "Counter"],
  ["button", "flip", "Flip"],
  ["button", "github-stars", "GitHub Stars"],
  ["button", "icon", "Icon"],
  ["button", "input", "Input"],
  ["button", "liquid", "Liquid"],
  ["button", "magnetic-button", "Magnetic"],
  ["button", "rating", "Rating"],
  ["button", "ripple", "Ripple"],
  ["button", "text-reveal", "Text Reveal"],
  ["button", "theme-switcher", "Theme Switcher"],
  ["button", "theme-toggle", "Theme Toggle"],
  // Hooks (README)
  ["hooks", "use-boolean", "useBoolean"],
  ["hooks", "use-click-anywhere", "useClickAnyWhere"],
  ["hooks", "use-copy-to-clipboard", "useCopyToClipboard"],
  ["hooks", "use-countdown", "useCountdown"],
  ["hooks", "use-counter", "useCounter"],
  ["hooks", "use-dark-mode", "useDarkMode"],
  ["hooks", "use-debounce-callback", "useDebounceCallback"],
  ["hooks", "use-debounce-value", "useDebounceValue"],
  ["hooks", "use-document-title", "useDocumentTitle"],
  ["hooks", "use-event-callback", "useEventCallback"],
  ["hooks", "use-event-listener", "useEventListener"],
  ["hooks", "use-hover", "useHover"],
  ["hooks", "use-intersection-observer", "useIntersectionObserver"],
  ["hooks", "use-interval", "useInterval"],
  ["hooks", "use-is-client", "useIsClient"],
  ["hooks", "use-is-mounted", "useIsMounted"],
  ["hooks", "use-isomorphic-layout-effect", "useIsomorphicLayoutEffect"],
  ["hooks", "use-local-storage", "useLocalStorage"],
  ["hooks", "use-map", "useMap"],
  ["hooks", "use-media-query", "useMediaQuery"],
  ["hooks", "use-mouse-position", "useMousePosition"],
  ["hooks", "use-on-click-outside", "useOnClickOutside"],
  ["hooks", "use-read-local-storage", "useReadLocalStorage"],
  ["hooks", "use-resize-observer", "useResizeObserver"],
  ["hooks", "use-screen", "useScreen"],
  ["hooks", "use-script", "useScript"],
  ["hooks", "use-scroll-lock", "useScrollLock"],
  ["hooks", "use-session-storage", "useSessionStorage"],
  ["hooks", "use-step", "useStep"],
  ["hooks", "use-ternary-dark-mode", "useTernaryDarkMode"],
  ["hooks", "use-timeout", "useTimeout"],
  ["hooks", "use-toggle", "useToggle"],
  ["hooks", "use-unmount", "useUnmount"],
  ["hooks", "use-window-size", "useWindowSize"],
  // Text (README)
  ["text", "counting-number", "Counting Number"],
  ["text", "gradient-text", "Gradient Text"],
  ["text", "highlight-text", "Highlight Text"],
  ["text", "rolling-text", "Rolling Text"],
  ["text", "rotating-text", "Rotating Text"],
  ["text", "shimmering-text", "Shimmering Text"],
  ["text", "sliding-number", "Sliding Number"],
  ["text", "splitting-text", "Splitting Text"],
  ["text", "typing-text", "Typing Text"],
  ["text", "writing-text", "Writing Text"],
];

const base = "https://www.shadcn.io";
const entries = rows.map(([category, slug, title]) => {
  const path = `${category}/${slug}`;
  const docUrl = `${base}/${path}`;
  const recipeSlug = slug;
  const recipeUrl = `${base}/r/${recipeSlug}.json`;
  return {
    id: `${category}:${slug}`,
    category,
    slug,
    title,
    docUrl,
    recipeUrl,
    installCommand: `npx shadcn@latest add ${recipeUrl}`,
  };
});

const doc = {
  spec: "shadcn_io_component_index_v1",
  version: "1.0.0",
  sourceReadme:
    "https://github.com/shadcnio/react-shadcn-components/blob/main/README.md",
  disclaimer:
    "shadcn.io is not affiliated with official shadcn/ui. Recipe URLs are conventional; confirm on each doc page.",
  entryCount: entries.length,
  entries,
};

writeFileSync(out, JSON.stringify(doc, null, 2), "utf-8");
console.log(`Wrote ${entries.length} entries → ${out}`);
