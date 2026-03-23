/**
 * ClearVoice Developer UI Kit route gate (in-app component catalog; not LiveKit).
 * Enable in development, or set VITE_UI_KIT=1 in the environment for staged access.
 */
export function isUiKitEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_UI_KIT === "1" || import.meta.env.VITE_UI_KIT === "true";
}
