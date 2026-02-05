import OpenAI from "openai";

const KIMI_K2_MODEL = "kimi-k2-0711-preview";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: { code: number; message: string };
}

const kimiK2Client = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

const MCP_TOOLS: MCPTool[] = [
  {
    name: "analyze_code",
    description: "Analyze code for bugs, security issues, and improvements",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The code to analyze" },
        language: { type: "string", description: "Programming language (e.g., typescript, python, javascript)" },
        focus: { type: "string", description: "What to focus on: bugs, security, performance, style" },
      },
      required: ["code", "language"],
    },
  },
  {
    name: "fix_code",
    description: "Fix bugs or issues in code and return corrected version",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The code to fix" },
        language: { type: "string", description: "Programming language" },
        issue: { type: "string", description: "Description of the issue to fix" },
      },
      required: ["code", "language", "issue"],
    },
  },
  {
    name: "generate_code",
    description: "Generate code based on requirements",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "What the code should do" },
        language: { type: "string", description: "Programming language to use" },
        context: { type: "string", description: "Additional context or constraints" },
      },
      required: ["task", "language"],
    },
  },
  {
    name: "explain_code",
    description: "Explain what code does in plain language",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The code to explain" },
        language: { type: "string", description: "Programming language" },
        audience: { type: "string", description: "Who is the explanation for: beginner, intermediate, expert" },
      },
      required: ["code", "language"],
    },
  },
  {
    name: "diagnose_error",
    description: "Diagnose an error message and suggest fixes",
    inputSchema: {
      type: "object",
      properties: {
        error: { type: "string", description: "The error message or stack trace" },
        context: { type: "string", description: "Code or situation where error occurred" },
        language: { type: "string", description: "Programming language" },
      },
      required: ["error"],
    },
  },
  {
    name: "review_pr",
    description: "Review a code diff/PR and provide feedback",
    inputSchema: {
      type: "object",
      properties: {
        diff: { type: "string", description: "The code diff to review" },
        description: { type: "string", description: "PR description or context" },
      },
      required: ["diff"],
    },
  },
];

async function callKimiK2(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await kimiK2Client.chat.completions.create({
      model: KIMI_K2_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 4096,
    });
    return response.choices[0]?.message?.content || "No response generated";
  } catch (error: any) {
    console.error("[Kimi K2] API Error:", error.message);
    throw new Error(`Kimi K2 API error: ${error.message}`);
  }
}

async function executeTool(toolName: string, args: Record<string, any>): Promise<string> {
  const systemPrompt = `You are Kimi K2, an expert coding assistant created by Moonshot AI. You specialize in:
- Code analysis and debugging
- Security vulnerability detection
- Performance optimization
- Code generation and refactoring
- Technical documentation

Be concise, accurate, and actionable in your responses. Use code blocks with language hints.`;

  switch (toolName) {
    case "analyze_code": {
      const prompt = `Analyze this ${args.language} code${args.focus ? ` focusing on ${args.focus}` : ""}:

\`\`\`${args.language}
${args.code}
\`\`\`

Provide:
1. Summary of what the code does
2. Issues found (bugs, security, performance)
3. Suggestions for improvement`;
      return callKimiK2(systemPrompt, prompt);
    }

    case "fix_code": {
      const prompt = `Fix this ${args.language} code. Issue: ${args.issue}

\`\`\`${args.language}
${args.code}
\`\`\`

Provide:
1. Explanation of the issue
2. Fixed code
3. What was changed and why`;
      return callKimiK2(systemPrompt, prompt);
    }

    case "generate_code": {
      const prompt = `Generate ${args.language} code for: ${args.task}
${args.context ? `\nContext: ${args.context}` : ""}

Provide clean, well-commented code with example usage.`;
      return callKimiK2(systemPrompt, prompt);
    }

    case "explain_code": {
      const prompt = `Explain this ${args.language} code for ${args.audience || "a developer"}:

\`\`\`${args.language}
${args.code}
\`\`\`

Break down what it does step by step.`;
      return callKimiK2(systemPrompt, prompt);
    }

    case "diagnose_error": {
      const prompt = `Diagnose this error${args.language ? ` in ${args.language}` : ""}:

Error:
\`\`\`
${args.error}
\`\`\`
${args.context ? `\nContext:\n${args.context}` : ""}

Provide:
1. What the error means
2. Likely causes
3. How to fix it`;
      return callKimiK2(systemPrompt, prompt);
    }

    case "review_pr": {
      const prompt = `Review this code diff:
${args.description ? `\nPR Description: ${args.description}\n` : ""}
\`\`\`diff
${args.diff}
\`\`\`

Provide:
1. Summary of changes
2. Potential issues or bugs
3. Suggestions for improvement
4. Overall assessment`;
      return callKimiK2(systemPrompt, prompt);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function handleMCPRequest(request: MCPRequest): MCPResponse {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "kimi-k2-coding-agent",
            version: "1.0.0",
          },
        },
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS,
        },
      };

    case "tools/call":
      return {
        jsonrpc: "2.0",
        id,
        result: { pending: true, toolName: params?.name, arguments: params?.arguments },
      };

    case "notifications/initialized":
      return { jsonrpc: "2.0", id, result: {} };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

export async function handleMCPToolCall(toolName: string, args: Record<string, any>): Promise<string> {
  return executeTool(toolName, args);
}

export function getMCPTools(): MCPTool[] {
  return MCP_TOOLS;
}

export function processMCPMessage(message: string): MCPResponse | null {
  try {
    const request = JSON.parse(message) as MCPRequest;
    return handleMCPRequest(request);
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: 0,
      error: { code: -32700, message: "Parse error" },
    };
  }
}

export { KIMI_K2_MODEL, MCP_TOOLS };
