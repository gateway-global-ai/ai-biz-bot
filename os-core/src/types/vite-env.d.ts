interface ImportMetaEnv {
  readonly VITE_OS_GEMINI_BRIDGE_URL?: string;
  readonly VITE_OS_GEMINI_MODEL_ID?: string;
  readonly VITE_OS_GEMINI_READY?: string;
  readonly VITE_ALLOW_LOCAL_MISSION_CONTROL_BYPASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
