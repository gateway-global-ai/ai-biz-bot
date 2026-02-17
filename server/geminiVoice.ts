import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { IncomingMessage } from "http";
import { registerWebSocketRoute } from "./websocketRouter";

/**
 * Gemini Multimodal Live API Proxy
 * 
 * This server acts as a proxy between the browser and Google's Gemini Multimodal Live API.
 * It hides the GOOGLE_API_KEY from the client and handles the "Double Socket" pipeline.
 * 
 * Flow: Browser <-> Node.js Server (Proxy) <-> Google Gemini API
 */

export function setupGeminiLiveWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Register with the central router
  registerWebSocketRoute('/ws/gemini-live', wss, 'GeminiVoice');

  console.log("[GeminiVoice] WebSocket proxy initialized on /ws/gemini-live");

  wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
    console.log(`[GeminiVoice] New client connected to Gemini Proxy from ${request.socket.remoteAddress}`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("[GeminiVoice] GEMINI_API_KEY is not set in environment variables");
      clientWs.close(1011, "Server configuration error: Missing API Key");
      return;
    }

    // The URL for the Gemini Multimodal Live API (Gemini 2.0 Flash)
    const googleUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    console.log("[GeminiVoice] Attempting to connect to Google Gemini API...");
    
    const googleWs = new WebSocket(googleUrl);
    let messageQueue: Buffer[] = [];
    let isGoogleWsOpen = false;

    const processClientMessage = (data: Buffer) => {
      // The client, GeminiStreamingClient, sends JSON strings. It does not send binary data.
      try {
        const messageString = data.toString();
        const message = JSON.parse(messageString);

        // Log outbound setup message
        if (message.setup) {
          console.log('📤 [PROXY -> GOOGLE] Sending Setup:', JSON.stringify(message, null, 2));
          // #region agent log
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:50',message:'Setup message sent',data:{model:message.setup?.model,hasConfig:!!message.setup?.generation_config},timestamp:Date.now(),hypothesisId:'H2,H5'})}).catch(()=>{});
          // #endregion
        }

        if (message.type === 'audio' && message.data) {
          const audioMessageForGoogle = {
            realtime_input: {
              media_chunks: [{
                mime_type: 'audio/pcm;rate=16000', 
                data: message.data 
              }]
            }
          };
          googleWs.send(JSON.stringify(audioMessageForGoogle));
        } else if (message.setup || message.realtime_input) {
          googleWs.send(messageString);
        } else {
          console.warn('[GeminiVoice] Received unknown message type from client:', messageString.slice(0, 200));
        }
      } catch (error) {
        console.error('[GeminiVoice] Error processing client message:', error, 'Raw data:', data.toString().slice(0, 200));
      }
    };

    // Handle connection to Google
    googleWs.on("open", () => {
      console.log("[GeminiVoice] ✅ Successfully connected to Google Gemini API");
      isGoogleWsOpen = true;
      
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:75',message:'Google WS opened',data:{queueSize:messageQueue.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      // Process any messages that were queued (including the setup message)
      console.log(`[GeminiVoice] Processing ${messageQueue.length} queued messages.`);
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg) {
          processClientMessage(msg);
        }
      }

      // DON'T send server_ready yet - wait for setupComplete from Google
    });

    // Handle messages FROM Google -> TO Browser
    googleWs.on("message", (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // Log the Setup Acknowledgement
        if (response.setupComplete) {
          console.log('✅ [GOOGLE] Setup Complete received. Session is officially active.');
          // #region agent log
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:96',message:'setupComplete received',data:{clientReady:clientWs.readyState===WebSocket.OPEN},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          // NOW it's safe to tell the client to start audio
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "server_ready", status: "ready" }));
          }
        } 
        // Capture specific error messages from the Google backend
        else if (response.error) {
          console.error('❌ [GOOGLE ERROR]:', JSON.stringify(response.error, null, 2));
          // #region agent log
          fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:105',message:'Google error received',data:{error:response.error},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
          // #endregion
        }
        // Capture transcription or content responses
        else {
          console.log('📩 [GOOGLE DATA]:', JSON.stringify(response).substring(0, 100) + '...');
        }
        
        // Forward all messages to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      } catch (e) {
        console.log('🔣 [GOOGLE RAW BINARY/TEXT]:', data.toString().substring(0, 200));
        // Forward raw data to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      }
    });

    // Handle messages FROM Browser -> TO Google
    clientWs.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        console.warn('[GeminiVoice] Received unexpected binary data from client. Ignoring.');
        return;
      }

      if (isGoogleWsOpen) {
        processClientMessage(data);
      } else {
        console.log('[GeminiVoice] Google WS not ready, queuing message from client.');
        // #region agent log
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:135',message:'Client message queued',data:{queueSize:messageQueue.length+1},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        messageQueue.push(data);
      }
    });

    // Error handling
    googleWs.on("error", (error) => {
      console.error("[GeminiVoice] ❌ Google WebSocket error:", error);
      console.error("[GeminiVoice] Error details:", {
        message: error.message,
        code: (error as any).code,
        type: error.constructor.name
      });
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:141',message:'Google WS error',data:{errMsg:error.message,errCode:(error as any).code},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", message: "Google API connection error" }));
      }
    });

    clientWs.on("error", (error) => {
      console.error("[GeminiVoice] Client WebSocket error:", error);
      googleWs.close();
    });

    // Close synchronization
    googleWs.on("close", (code, reason) => {
      console.warn(`⚠️ [GOOGLE CLOSED] Code: ${code} | Reason: ${reason.toString() || 'No reason provided'}`);
      
      if (code === 1011) {
        console.error('💡 DEBUG: A 1011 during setup usually means your JSON config is invalid or the model name is wrong.');
      }
      
      // #region agent log
      fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'geminiVoice.ts:142',message:'Google WS closed',data:{code:code,reason:reason.toString(),timestamp:Date.now()},timestamp:Date.now(),hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
    });

    clientWs.on("close", (code, reason) => {
      console.log(`[GeminiVoice] Client connection closed - Code: ${code}, Reason: ${reason.toString()}`);
      if (googleWs.readyState === WebSocket.OPEN || googleWs.readyState === WebSocket.CONNECTING) {
        googleWs.close();
      }
    });
  });
}
