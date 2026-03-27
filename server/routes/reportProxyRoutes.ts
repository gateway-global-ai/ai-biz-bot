/**
 * Report Proxy Routes — /api/report
 *
 * Server-side proxy for interactive features in the AIOS Enterprise Report.
 * Keeps the GEMINI_API_KEY server-side per the API lockdown governance rule.
 */
import { Router } from "express";

const router = Router();

const GEMINI_MODEL = "gemini-2.5-flash-preview-04-17";

async function callGemini(
  prompt: string,
  systemInstruction: string,
  structuredSchema?: object
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };

  if (structuredSchema) {
    body.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: structuredSchema,
    };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  return data.candidates[0].content.parts[0].text;
}

/** POST /api/report/analyze-risk — Architecture Risk Analyzer */
router.post("/analyze-risk", async (req, res) => {
  try {
    const { architecture } = req.body as { architecture?: string };
    if (!architecture?.trim()) {
      return res.status(400).json({ error: "architecture description required" });
    }

    const schema = {
      type: "OBJECT",
      properties: {
        score: {
          type: "STRING",
          description: "Risk score: Low, Medium, High, or Critical",
        },
        vulnerabilities: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of 3 specific governance vulnerabilities",
        },
        recommendation: {
          type: "STRING",
          description: "One specific, actionable architectural recommendation",
        },
      },
      required: ["score", "vulnerabilities", "recommendation"],
    };

    const sysPrompt =
      "You are an Enterprise AI Risk Analyst and Systems Architect. Evaluate the provided AI architecture description against Governed AI OS principles (strict domains, no autonomous drift, schema-enforced outputs). Identify the risks.";

    const result = await callGemini(architecture, sysPrompt, schema);
    return res.json(JSON.parse(result));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return res.status(500).json({ error: msg });
  }
});

/** POST /api/report/generate-policy — Dynamic Governance Policy Generator */
router.post("/generate-policy", async (req, res) => {
  try {
    const { role } = req.body as { role?: string };
    if (!role?.trim()) {
      return res.status(400).json({ error: "agent role required" });
    }

    const sysPrompt =
      "You are a Governed AI Systems Architect. Create a strict YAML execution policy for the requested agent role. Output ONLY valid YAML. No markdown formatting, no backticks, no introductory text. Include keys: agent_execution_policy (id, domain, allowed_tools, cross_domain_calls: false, output_format, schema_contract, on_schema_failure (action, log_level)).";

    const yaml = await callGemini(`Agent Role: ${role}`, sysPrompt);
    return res.json({ yaml: yaml.replace(/```yaml/g, "").replace(/```/g, "").trim() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Policy generation failed";
    return res.status(500).json({ error: msg });
  }
});

export default router;
