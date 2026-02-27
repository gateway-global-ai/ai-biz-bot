/**
 * client/src/sdk/platformConfig.ts
 *
 * Singleton store for the Gateway Global platform base URL.
 *
 * In the MAIN APP:    _platformUrl is '' → all fetch/WebSocket URLs remain relative
 *                     (no behaviour change for the existing application).
 *
 * In the SDK BUNDLE:  The SDK entry point calls setPlatformUrl() once at mount
 *                     time with the value baked in at build time via Vite's
 *                     `define` (__GATEWAY_PLATFORM_URL__), or with the
 *                     `data-platform-url` attribute from the script tag (for
 *                     self-hosted / white-label deployments).
 *
 * All network callers (GeminiStreamingClient, GatewayWidget, etc.) read
 * getPlatformUrl() to resolve their base URL so they always call home to the
 * correct host regardless of which third-party domain embeds the widget.
 */

declare const __GATEWAY_PLATFORM_URL__: string;

let _platformUrl = '';

/** Returns the platform base URL (e.g. 'https://aibizbot.gatewayglobal.ai'). */
export function getPlatformUrl(): string {
  return _platformUrl;
}

/**
 * Called once by the SDK entry point before mounting React.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function setPlatformUrl(url: string): void {
  if (_platformUrl) return; // already set
  _platformUrl = url.replace(/\/$/, ''); // strip trailing slash
}

/**
 * Resolves a platform-relative path to an absolute URL.
 * Returns a relative path when running inside the main app (platformUrl = '').
 *
 * @example
 *   resolvePlatformUrl('/ws/gemini-live')
 *   // In SDK:  'https://aibizbot.gatewayglobal.ai/ws/gemini-live'
 *   // In app:  '/ws/gemini-live'
 */
export function resolvePlatformUrl(path: string): string {
  return _platformUrl ? `${_platformUrl}${path}` : path;
}

/**
 * Converts a platform HTTP URL to a WebSocket URL (ws:// or wss://).
 * Falls back to window.location.host when running inside the main app.
 *
 * @example
 *   resolvePlatformWs('/ws/gemini-live')
 *   // In SDK:  'wss://aibizbot.gatewayglobal.ai/ws/gemini-live'
 *   // In app:  'wss://localhost:3004/ws/gemini-live'
 */
export function resolvePlatformWs(path: string): string {
  if (_platformUrl) {
    const wsProtocol = _platformUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = new URL(_platformUrl).host;
    return `${wsProtocol}//${host}${path}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

/**
 * Returns the build-time baked platform URL constant.
 * This is only defined when building with vite.sdk.config.ts.
 * In the main app build it will be undefined (caught by the try/catch).
 */
export function getBakedPlatformUrl(): string {
  try {
    return typeof __GATEWAY_PLATFORM_URL__ !== 'undefined'
      ? __GATEWAY_PLATFORM_URL__
      : '';
  } catch {
    return '';
  }
}
