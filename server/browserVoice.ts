/**
 * browserVoice.ts
 *
 * @deprecated Voice route: /ws/browser-voice is now powered entirely by the unified
 * Gemini Live API proxy (geminiVoice.ts). All Kimi pipeline logic has been purged.
 *
 * This file is retained only to export setupBrowserAudioTempRoute (temp audio URLs).
 * The /ws/browser-voice WebSocket is registered in geminiVoice.ts and shares the same
 * Gemini 2.5 Flash Native Audio handler as /ws/gemini-live.
 */

import { Express } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function setupBrowserAudioTempRoute(app: Express): void {
  app.get("/api/browser-audio-temp/:filename", (req, res) => {
    const tmpDir = path.join(os.tmpdir(), "gateway-browser-audio");
    const filepath = path.join(tmpDir, req.params.filename);
    if (fs.existsSync(filepath)) {
      const ext = req.params.filename.endsWith(".webm") ? "audio/webm" : "audio/wav";
      res.setHeader("Content-Type", ext);
      res.sendFile(filepath);
    } else {
      res.status(404).send("Audio not found");
    }
  });
}
