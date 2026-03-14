export interface LocalVoiceConfig {
  useStubs: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  pythonSidecarBaseUrl: string;
  requestTimeoutMs: number;
}

export function getLocalVoiceConfig(): LocalVoiceConfig {
  return {
    useStubs: process.env.LOCAL_VOICE_USE_STUBS !== "false",
    ollamaBaseUrl: process.env.LOCAL_LLM_BASE_URL?.trim() || "http://127.0.0.1:11434",
    ollamaModel: process.env.LOCAL_LLM_MODEL?.trim() || "qwen2.5:7b-instruct",
    pythonSidecarBaseUrl:
      process.env.LOCAL_VOICE_SIDECAR_URL?.trim() || "http://127.0.0.1:8000",
    requestTimeoutMs: Number(process.env.LOCAL_VOICE_TIMEOUT_MS || 30000),
  };
}
