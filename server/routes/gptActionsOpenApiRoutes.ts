/**
 * OpenAPI 3.0 document for ChatGPT Custom GPT → Actions ("Import from URL").
 * Serves JSON with correct server URL for the deployment.
 *
 * Import URL (after deploy): https://<your-host>/openapi/business-resonance-gpt.json
 */
import { Router, type Request, type Response } from "express";

const router = Router();

function getPublicOrigin(req: Request): string {
  const env =
    process.env.APP_URL?.trim() ||
    process.env.WEBHOOK_BASE_URL?.trim() ||
    process.env.SERVER_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : (protoHeader || req.protocol || "https").split(",")[0].trim();
  const host = req.get("host") || "localhost";
  return `${proto}://${host}`;
}

function buildBusinessResonanceOpenApi(origin: string): Record<string, unknown> {
  return {
    openapi: "3.0.3",
    info: {
      title: "Gateway Global AI — Business Resonance (GPT Actions)",
      version: "1.0.0",
      description:
        "Public API surface for a Custom GPT that grounds on Gateway Global AI site config and agent chat. " +
        "Flow: (1) GET site config by slug to read `assignedAgentId`. " +
        "(2) POST /api/chat with that `agentId` and the user message. " +
        "Authentication: these routes are public; in the GPT editor set Authentication to **None**. " +
        "If you add optional API key gating later, use Bearer with a custom header.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/site-configs/by-slug/{slug}": {
        get: {
          operationId: "getSiteConfigBySlug",
          summary: "Public site config by URL slug",
          description:
            "Returns the site row used by public agent pages (name, knowledge, assignedAgentId, governance, etc.).",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "ai-biz-bots",
            },
            {
              name: "from",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["qr"] },
              description: "Optional; omit unless recording a QR landing.",
            },
          ],
          responses: {
            "200": {
              description: "Site configuration JSON",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
            "404": { description: "Business not found" },
          },
        },
      },
      "/api/chat": {
        post: {
          operationId: "postGatewayAgentChat",
          summary: "Gemini-backed agent chat (concierge)",
          description:
            "Uses the assigned agent's DISC/ARCH prompt and governance. " +
            "Pass `agentId` from GET /api/site-configs/by-slug/{slug} → `assignedAgentId`.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["agentId", "message"],
                  properties: {
                    agentId: { type: "string", description: "UUID of the agent (from site assignedAgentId)" },
                    message: { type: "string", maxLength: 4000 },
                    projectId: { type: "string", description: "Optional project context" },
                    history: {
                      type: "array",
                      maxItems: 20,
                      items: {
                        type: "object",
                        required: ["role", "content"],
                        properties: {
                          role: { type: "string", enum: ["user", "assistant"] },
                          content: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Assistant reply + optional communication telemetry",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      response: { type: "string" },
                      communication: { type: "object" },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error" },
            "404": { description: "Agent not found" },
            "429": { description: "Rate limit" },
            "503": { description: "Model not configured" },
          },
        },
      },
    },
  };
}

router.get("/openapi/business-resonance-gpt.json", (req: Request, res: Response) => {
  const origin = getPublicOrigin(req);
  const doc = buildBusinessResonanceOpenApi(origin);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(doc);
});

export default router;
