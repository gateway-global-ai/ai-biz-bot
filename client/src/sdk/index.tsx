/**
 * client/src/sdk/index.tsx
 *
 * Gateway Global Web SDK — Self-Initializing Entry Point
 *
 * This is the compiled bundle served as:
 *   https://aibizbot.gatewayglobal.ai/sdk/v1/gateway.js
 *
 * Usage (third-party website):
 *   <script
 *     src="https://aibizbot.gatewayglobal.ai/sdk/v1/gateway.js"
 *     data-site-id="YOUR_SITE_CONFIG_ID"
 *     defer
 *   ></script>
 *
 * Optional overrides:
 *   data-platform-url  — Override the platform base URL (for self-hosted / white-label).
 *                        Defaults to the URL baked in at SDK build time.
 *
 * How it works:
 *  1. Captures `document.currentScript` immediately (only valid during sync execution).
 *  2. Reads `data-site-id` from the script tag.
 *  3. Sets the platform URL in platformConfig so all downstream callers
 *     (GeminiStreamingClient, GatewayWidget) use absolute platform URLs.
 *  4. Injects a fixed container <div> into the host page body.
 *  5. Mounts <GatewayWidget> inside that container using a React 18 root.
 *
 * Design constraints:
 *  - Must NOT throw unhandled errors that could break the host page.
 *  - Container uses `all:initial` to prevent host-page CSS leaking into the widget.
 *  - The SDK bundle is IIFE format (no module system required on host page).
 *  - React and all dependencies are BUNDLED (not CDN-dependent).
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { setPlatformUrl, getBakedPlatformUrl } from './platformConfig';
import { GatewayWidget } from './GatewayWidget';

// ── 1. Capture script tag reference IMMEDIATELY (before any async boundary) ──
// `document.currentScript` is only defined while the script is executing synchronously.
const scriptTag = document.currentScript as HTMLScriptElement | null;

// ── 2. Read configuration from script tag attributes ──────────────────────
const siteId = scriptTag?.getAttribute('data-site-id') ?? '';
const scriptPlatformUrl = scriptTag?.getAttribute('data-platform-url') ?? '';

if (!siteId) {
  console.warn(
    '[Gateway SDK] Missing required attribute: data-site-id\n' +
    'The widget will not mount. Add it to your script tag:\n' +
    '<script src="...gateway.js" data-site-id="YOUR_SITE_ID" defer></script>'
  );
} else {
  // ── 3. Set the platform URL (baked build-time URL, overridable via attribute) ──
  const platformUrl = scriptPlatformUrl || getBakedPlatformUrl();
  if (platformUrl) {
    setPlatformUrl(platformUrl);
  }

  // ── 4. Mount function ─────────────────────────────────────────────────────
  const mount = () => {
    // Guard against double-mounting (e.g. script loaded twice via SPA router)
    const existingRoot = document.getElementById('gateway-global-root');
    if (existingRoot) return;

    try {
      // Create a fixed container that sits above all host-page content
      const container = document.createElement('div');
      container.id = 'gateway-global-root';

      // `all:initial` prevents host-page CSS inheritance from reaching the widget.
      // We then restore only the layout properties we need.
      container.setAttribute('style', [
        'all:initial',
        'position:fixed',
        'bottom:0',
        'right:0',
        'z-index:2147483647',
        'font-family:system-ui,-apple-system,sans-serif',
        'pointer-events:none', // container itself is transparent to clicks
      ].join(';'));

      document.body.appendChild(container);

      // ── 5. Mount the React widget ─────────────────────────────────────────
      const root = createRoot(container);
      root.render(
        <React.StrictMode>
          <GatewayWidget siteId={siteId} />
        </React.StrictMode>
      );

      console.log(`[Gateway SDK] Mounted successfully for site: ${siteId}`);
    } catch (err) {
      // Never let SDK errors surface to the host page console as uncaught exceptions
      console.error('[Gateway SDK] Failed to mount widget:', err);
    }
  };

  // ── 6. Wait for DOM if needed ─────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    // DOM already ready (script loaded with `defer` fires after DOMContentLoaded)
    mount();
  }
}
