/**
 * Model Context Protocol (MCP) Server
 * For deployment and management of Voice AI resources
 */

import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
require('dotenv').config();

// MCP Protocol Types
interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Voice AI Deployment Types
interface Deployment {
  id: string;
  name: string;
  provider: string;
  type: 'tts' | 'stt' | 'voice-agent' | 'hybrid';
  status: 'pending' | 'deploying' | 'running' | 'error' | 'stopped';
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  endpoint?: string;
  metrics?: {
    requests: number;
    errors: number;
    latency: number;
    cost: number;
  };
}

interface VoiceAgentConfig {
  name: string;
  sttProvider: string;
  ttsProvider: string;
  llmProvider: string;
  systemPrompt: string;
  voice?: string;
  language?: string;
  enableTranscription?: boolean;
  enableRecording?: boolean;
}

class MCPVoiceServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private deployments: Map<string, Deployment> = new Map();
  private clients: Map<string, WebSocket> = new Map();

  // MCP Capabilities
  private readonly tools: MCPTool[] = [
    {
      name: 'deploy_voice_agent',
      description: 'Deploy a new voice agent with specified configuration',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the voice agent' },
          sttProvider: { type: 'string', enum: ['deepgram', 'assemblyai', 'openai'], description: 'STT provider' },
          ttsProvider: { type: 'string', enum: ['openai', 'elevenlabs', 'deepgram', 'inworld', 'cartesia'], description: 'TTS provider' },
          llmProvider: { type: 'string', enum: ['openai', 'gemini', 'kimi'], description: 'LLM provider' },
          systemPrompt: { type: 'string', description: 'System prompt for the agent' },
          voice: { type: 'string', description: 'Voice ID for TTS' },
          language: { type: 'string', description: 'Language code' }
        },
        required: ['name', 'sttProvider', 'ttsProvider', 'llmProvider', 'systemPrompt']
      }
    },
    {
      name: 'list_deployments',
      description: 'List all voice AI deployments',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'deploying', 'running', 'error', 'stopped'] },
          type: { type: 'string', enum: ['tts', 'stt', 'voice-agent', 'hybrid'] }
        }
      }
    },
    {
      name: 'get_deployment',
      description: 'Get details of a specific deployment',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Deployment ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'update_deployment',
      description: 'Update an existing deployment',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Deployment ID' },
          config: { type: 'object', description: 'Updated configuration' }
        },
        required: ['id', 'config']
      }
    },
    {
      name: 'stop_deployment',
      description: 'Stop a running deployment',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Deployment ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_deployment',
      description: 'Delete a deployment permanently',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Deployment ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'estimate_costs',
      description: 'Estimate costs for a voice agent deployment',
      parameters: {
        type: 'object',
        properties: {
          sttProvider: { type: 'string', description: 'STT provider' },
          ttsProvider: { type: 'string', description: 'TTS provider' },
          llmProvider: { type: 'string', description: 'LLM provider' },
          dailySessions: { type: 'number', description: 'Expected daily sessions' },
          avgSessionMinutes: { type: 'number', description: 'Average session duration in minutes' }
        },
        required: ['sttProvider', 'ttsProvider', 'llmProvider', 'dailySessions', 'avgSessionMinutes']
      }
    },
    {
      name: 'compare_providers',
      description: 'Compare voice AI providers by cost and quality',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', enum: ['tts', 'stt', 'realtime'], description: 'Service type' },
          monthlyUsage: { type: 'number', description: 'Expected monthly usage' }
        },
        required: ['service', 'monthlyUsage']
      }
    },
    {
      name: 'clone_voice',
      description: 'Clone a voice from audio samples',
      parameters: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['elevenlabs', 'inworld', 'cartesia'], description: 'Voice cloning provider' },
          name: { type: 'string', description: 'Name for the cloned voice' },
          description: { type: 'string', description: 'Description of the voice' },
          sampleUrls: { type: 'array', items: { type: 'string' }, description: 'URLs to audio samples' }
        },
        required: ['provider', 'name', 'sampleUrls']
      }
    },
    {
      name: 'get_deployment_logs',
      description: 'Get logs for a deployment',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Deployment ID' },
          lines: { type: 'number', description: 'Number of log lines to retrieve' }
        },
        required: ['id']
      }
    }
  ];

  private readonly resources: MCPResource[] = [
    {
      uri: 'voice-ai://providers',
      name: 'Voice AI Providers',
      description: 'List of available voice AI providers with capabilities and pricing',
      mimeType: 'application/json'
    },
    {
      uri: 'voice-ai://deployments',
      name: 'Deployments',
      description: 'All voice AI deployments',
      mimeType: 'application/json'
    },
    {
      uri: 'voice-ai://pricing',
      name: 'Pricing Comparison',
      description: 'Cost comparison across providers',
      mimeType: 'application/json'
    },
    {
      uri: 'voice-ai://docs/best-practices',
      name: 'Best Practices',
      description: 'Best practices for voice AI deployments',
      mimeType: 'text/markdown'
    }
  ];

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        deployments: this.deployments.size,
        clients: this.clients.size
      });
    });

    // SSE endpoint for MCP (Server-Sent Events)
    this.app.get('/mcp/sse', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const clientId = uuidv4();
      
      // Send endpoint event
      res.write(`event: endpoint\ndata: /mcp/message?clientId=${clientId}\n\n`);

      req.on('close', () => {
        this.clients.delete(clientId);
      });
    });

    // HTTP POST endpoint for MCP messages
    this.app.post('/mcp/message', (req, res) => {
      const message = req.body as MCPMessage;
      this.handleMCPMessage(message, (response) => {
        res.json(response);
      });
    });

    // REST API for deployments
    this.app.get('/api/deployments', (req, res) => {
      const deployments = Array.from(this.deployments.values());
      res.json(deployments);
    });

    this.app.get('/api/deployments/:id', (req, res) => {
      const deployment = this.deployments.get(req.params.id);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.json(deployment);
    });

    this.app.post('/api/deployments', async (req, res) => {
      try {
        const deployment = await this.createDeployment(req.body);
        res.status(201).json(deployment);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.delete('/api/deployments/:id', (req, res) => {
      const deleted = this.deployments.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.status(204).send();
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as MCPMessage;
          this.handleMCPMessage(message, (response) => {
            ws.send(JSON.stringify(response));
          });
        } catch (error) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error'
            }
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }

  private handleMCPMessage(message: MCPMessage, sendResponse: (response: MCPMessage) => void): void {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id: message.id
    };

    switch (message.method) {
      case 'initialize':
        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'voice-ai-mcp-server',
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        response.result = { tools: this.tools };
        break;

      case 'tools/call':
        this.handleToolCall(message.params || {}, (result) => {
          response.result = result;
          sendResponse(response);
        });
        return; // Async response

      case 'resources/list':
        response.result = { resources: this.resources };
        break;

      case 'resources/read':
        response.result = this.handleResourceRead(message.params?.uri as string);
        break;

      default:
        response.error = {
          code: -32601,
          message: `Method not found: ${message.method}`
        };
    }

    sendResponse(response);
  }

  private handleToolCall(params: Record<string, unknown>, callback: (result: unknown) => void): void {
    const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> };

    switch (name) {
      case 'deploy_voice_agent':
        this.deployVoiceAgent(args as VoiceAgentConfig)
          .then(deployment => callback({ content: [{ type: 'text', text: JSON.stringify(deployment, null, 2) }] }))
          .catch(error => callback({ content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }));
        break;

      case 'list_deployments':
        const deployments = Array.from(this.deployments.values());
        if (args?.status) {
          deployments.filter(d => d.status === args.status);
        }
        if (args?.type) {
          deployments.filter(d => d.type === args.type);
        }
        callback({ content: [{ type: 'text', text: JSON.stringify(deployments, null, 2) }] });
        break;

      case 'get_deployment':
        const deployment = this.deployments.get(args?.id as string);
        callback({ 
          content: [{ 
            type: 'text', 
            text: deployment ? JSON.stringify(deployment, null, 2) : 'Deployment not found' 
          }] 
        });
        break;

      case 'stop_deployment':
        this.stopDeployment(args?.id as string)
          .then(() => callback({ content: [{ type: 'text', text: 'Deployment stopped' }] }))
          .catch(error => callback({ content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }));
        break;

      case 'delete_deployment':
        this.deployments.delete(args?.id as string);
        callback({ content: [{ type: 'text', text: 'Deployment deleted' }] });
        break;

      case 'estimate_costs':
        const costEstimate = this.estimateCosts(args as any);
        callback({ content: [{ type: 'text', text: JSON.stringify(costEstimate, null, 2) }] });
        break;

      case 'compare_providers':
        const comparison = this.compareProviders(args?.service as string, args?.monthlyUsage as number);
        callback({ content: [{ type: 'text', text: JSON.stringify(comparison, null, 2) }] });
        break;

      default:
        callback({ content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true });
    }
  }

  private handleResourceRead(uri: string): unknown {
    switch (uri) {
      case 'voice-ai://providers':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.getProvidersInfo(), null, 2)
          }]
        };

      case 'voice-ai://deployments':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(Array.from(this.deployments.values()), null, 2)
          }]
        };

      case 'voice-ai://pricing':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.getPricingInfo(), null, 2)
          }]
        };

      case 'voice-ai://docs/best-practices':
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: this.getBestPractices()
          }]
        };

      default:
        return { error: { code: -32002, message: 'Resource not found' } };
    }
  }

  private async createDeployment(config: Record<string, unknown>): Promise<Deployment> {
    const deployment: Deployment = {
      id: uuidv4(),
      name: config.name as string,
      provider: config.provider as string,
      type: config.type as any,
      status: 'pending',
      config,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.deployments.set(deployment.id, deployment);
    
    // Simulate deployment
    setTimeout(() => {
      deployment.status = 'running';
      deployment.endpoint = `https://api.voice-ai.io/v1/${deployment.type}/${deployment.id}`;
      deployment.metrics = {
        requests: 0,
        errors: 0,
        latency: 0,
        cost: 0
      };
    }, 2000);

    return deployment;
  }

  private async deployVoiceAgent(config: VoiceAgentConfig): Promise<Deployment> {
    return this.createDeployment({
      name: config.name,
      provider: config.llmProvider,
      type: 'voice-agent',
      ...config
    });
  }

  private async stopDeployment(id: string): Promise<void> {
    const deployment = this.deployments.get(id);
    if (deployment) {
      deployment.status = 'stopped';
      deployment.updatedAt = new Date();
    }
  }

  private estimateCosts(params: {
    sttProvider: string;
    ttsProvider: string;
    llmProvider: string;
    dailySessions: number;
    avgSessionMinutes: number;
  }): Record<string, unknown> {
    const { dailySessions, avgSessionMinutes } = params;
    const workingDays = 22;
    
    // STT costs (per minute)
    const sttRates: Record<string, number> = {
      deepgram: 0.0077,
      assemblyai: 0.0025,
      openai: 0.006
    };

    // TTS costs (per character, assuming 750 chars/min)
    const ttsRates: Record<string, number> = {
      openai: 0.000015,
      elevenlabs: 0.000206,
      deepgram: 0.000030,
      inworld: 0.000010,
      cartesia: 0.000047
    };

    // LLM costs (per 1K tokens, assuming 500 tokens/min)
    const llmRates: Record<string, { input: number; output: number }> = {
      openai: { input: 0.004, output: 0.016 },
      gemini: { input: 0.0005, output: 0.002 },
      kimi: { input: 0.0006, output: 0.0025 }
    };

    const sttRate = sttRates[params.sttProvider] || 0.005;
    const ttsRate = ttsRates[params.ttsProvider] || 0.00002;
    const llmRate = llmRates[params.llmProvider] || { input: 0.003, output: 0.012 };

    const dailyMinutes = dailySessions * avgSessionMinutes;
    const monthlyMinutes = dailyMinutes * workingDays;

    // Assume 50% user talk time, 40% agent talk time
    const userTalkMinutes = monthlyMinutes * 0.5;
    const agentTalkMinutes = monthlyMinutes * 0.4;
    const agentChars = agentTalkMinutes * 750;

    const sttCost = userTalkMinutes * sttRate;
    const ttsCost = agentChars * ttsRate;
    const llmCost = (monthlyMinutes * 500 / 1000) * (llmRate.input + llmRate.output);

    return {
      monthly: {
        stt: Math.round(sttCost * 100) / 100,
        tts: Math.round(ttsCost * 100) / 100,
        llm: Math.round(llmCost * 100) / 100,
        total: Math.round((sttCost + ttsCost + llmCost) * 100) / 100
      },
      assumptions: {
        workingDaysPerMonth: workingDays,
        userTalkRatio: 0.5,
        agentTalkRatio: 0.4,
        charsPerMinute: 750,
        tokensPerMinute: 500
      }
    };
  }

  private compareProviders(service: string, monthlyUsage: number): unknown {
    const { CostCalculator } = require('../src/utils/cost-calculator');
    return CostCalculator.compareCosts(service as any, monthlyUsage);
  }

  private getProvidersInfo(): unknown {
    return {
      stt: [
        { name: 'deepgram', languages: '50+', latency: '<500ms', bestFor: 'Accuracy and speed' },
        { name: 'assemblyai', languages: 6, latency: '~300ms', bestFor: 'Reliable streaming' },
        { name: 'openai', languages: 99, latency: '~500ms', bestFor: 'Whisper model quality' }
      ],
      tts: [
        { name: 'inworld', quality: '#1 ELO 1160', price: '$10/M chars', bestFor: 'Best quality/price' },
        { name: 'openai', quality: 'ELO 1105', price: '$15/M chars', bestFor: 'Ecosystem integration' },
        { name: 'elevenlabs', quality: 'ELO 1108', price: '$206/M chars', bestFor: 'Voice cloning' },
        { name: 'deepgram', quality: 'Good', price: '$30/M chars', bestFor: 'Unified STT/TTS' },
        { name: 'cartesia', quality: 'ELO 1054', price: '$47/M chars', bestFor: 'Ultra-low latency' }
      ],
      realtime: [
        { name: 'openai', audioIn: '$0.06/min', audioOut: '$0.24/min', bestFor: 'Full conversational' },
        { name: 'gemini', audioIn: '$0.18/min', audioOut: '$0.72/min', bestFor: 'Google ecosystem' }
      ]
    };
  }

  private getPricingInfo(): unknown {
    return {
      lastUpdated: '2026-02-07',
      providers: {
        stt: {
          deepgram: { perMinute: '$0.0043 batch, $0.0077 streaming' },
          assemblyai: { perMinute: '$0.0025' },
          openai: { perMinute: '$0.006' }
        },
        tts: {
          inworld: { perMillionChars: '$10 (Max), $5 (Mini)' },
          openai: { perMillionChars: '$15 (TTS-1), $30 (TTS-HD)' },
          elevenlabs: { perMillionChars: '$206 (Scale plan)' },
          deepgram: { perMillionChars: '$30 (Aura-2)' },
          cartesia: { perMillionChars: '$47 (Sonic-3)' }
        },
        realtime: {
          openai: { audioIn: '$0.06/min', audioOut: '$0.24/min' },
          gemini: { audioIn: '$0.18/min', audioOut: '$0.72/min' }
        }
      }
    };
  }

  private getBestPractices(): string {
    return `# Voice AI Deployment Best Practices

## Cost Optimization

1. **Use Inworld for TTS**: At $10/M characters with #1 quality ranking, it offers the best price-performance ratio
2. **Use Deepgram Nova-2 for STT**: Best accuracy at $0.0077/min for streaming
3. **Combine providers**: Use best-of-breed for each component rather than all-in-one
4. **Enable caching**: Cache common responses to reduce LLM calls
5. **Use compression**: Stream compressed audio to reduce bandwidth

## Latency Optimization

1. **Streaming architecture**: Always use WebSocket streaming, never batch
2. **Parallel processing**: Start TTS while LLM is still generating
3. **Pre-warm connections**: Keep provider connections warm
4. **Edge deployment**: Deploy close to users
5. **Use Cartesia for ultra-low latency**: 40ms TTFA if budget allows

## Quality Optimization

1. **Voice selection**: Test multiple voices for your use case
2. **Prompt engineering**: Good system prompts improve response quality
3. **Interruption handling**: Implement proper VAD and interruption
4. **Noise cancellation**: Pre-process audio for better STT
5. **A/B testing**: Continuously test provider combinations

## Security

1. **API key rotation**: Rotate keys regularly
2. **Webhook validation**: Validate Twilio signatures
3. **Encryption**: Use TLS for all communications
4. **PII handling**: Don't log sensitive audio or transcripts
5. **Compliance**: Ensure HIPAA/GDPR compliance if needed
`;
  }

  start(port: number): void {
    this.server.listen(port, () => {
      console.log(`[MCP Server] Running on port ${port}`);
      console.log(`[MCP Server] WebSocket: ws://localhost:${port}`);
      console.log(`[MCP Server] HTTP: http://localhost:${port}`);
    });
  }

  stop(): void {
    this.wss.close();
    this.server.close();
    console.log('[MCP Server] Stopped');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new MCPVoiceServer();
  const PORT = parseInt(process.env.MCP_PORT || '3001');
  server.start(PORT);
}

export { MCPVoiceServer };
export default MCPVoiceServer;
