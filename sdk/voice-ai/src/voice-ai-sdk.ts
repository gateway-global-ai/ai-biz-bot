/**
 * Voice AI Unified SDK
 * Main entry point for voice AI operations
 */

import {
  VoiceProvider,
  VoiceConfig,
  TTSOptions,
  TTSResponse,
  StreamingTTSOptions,
  STTOptions,
  STTResponse,
  RealtimeVoiceOptions,
  VoiceCloneOptions,
  VoiceCloneResponse,
  CostEstimate,
  ProviderCapabilities
} from './types';
import { VoiceProviderInterface, RealtimeConnection } from './types/provider';
import { createProvider, AVAILABLE_PROVIDERS } from './providers';
import { CostCalculator } from './utils/cost-calculator';

export interface SDKConfig {
  defaultProvider?: VoiceProvider;
  providers: Record<VoiceProvider, VoiceConfig>;
}

export class VoiceAI {
  private providers: Map<VoiceProvider, VoiceProviderInterface> = new Map();
  private config: SDKConfig;

  constructor(config: SDKConfig) {
    this.config = config;
  }

  /**
   * Initialize the SDK and all configured providers
   */
  async initialize(): Promise<void> {
    for (const [name, providerConfig] of Object.entries(this.config.providers)) {
      const provider = createProvider(name as VoiceProvider);
      await provider.initialize(providerConfig);
      this.providers.set(name as VoiceProvider, provider);
    }
  }

  /**
   * Get a provider instance
   */
  getProvider(provider?: VoiceProvider): VoiceProviderInterface {
    const name = provider || this.config.defaultProvider;
    if (!name) {
      throw new Error('No provider specified and no default provider configured');
    }

    const instance = this.providers.get(name);
    if (!instance) {
      throw new Error(`Provider ${name} not initialized`);
    }

    return instance;
  }

  /**
   * Text-to-Speech
   */
  async synthesize(options: TTSOptions & { provider?: VoiceProvider }): Promise<TTSResponse> {
    const provider = this.getProvider(options.provider);
    return provider.synthesize(options);
  }

  /**
   * Streaming Text-to-Speech
   */
  async synthesizeStreaming(options: StreamingTTSOptions & { provider?: VoiceProvider }): Promise<void> {
    const provider = this.getProvider(options.provider);
    return provider.synthesizeStreaming(options);
  }

  /**
   * Speech-to-Text
   */
  async transcribe(options: STTOptions & { provider?: VoiceProvider }): Promise<STTResponse> {
    const provider = this.getProvider(options.provider);
    if (!provider.transcribe) {
      throw new Error(`Provider ${provider.name} does not support STT`);
    }
    return provider.transcribe(options);
  }

  /**
   * Connect to real-time voice API
   */
  async connectRealtime(options: RealtimeVoiceOptions & { provider?: VoiceProvider }): Promise<RealtimeConnection> {
    const provider = this.getProvider(options.provider);
    if (!provider.connectRealtime) {
      throw new Error(`Provider ${provider.name} does not support real-time voice`);
    }
    return provider.connectRealtime(options);
  }

  /**
   * Clone a voice
   */
  async cloneVoice(options: VoiceCloneOptions & { provider?: VoiceProvider }): Promise<VoiceCloneResponse> {
    const provider = this.getProvider(options.provider);
    if (!provider.cloneVoice) {
      throw new Error(`Provider ${provider.name} does not support voice cloning`);
    }
    return provider.cloneVoice(options);
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string, provider?: VoiceProvider): Promise<void> {
    const p = this.getProvider(provider);
    if (!p.deleteVoice) {
      throw new Error(`Provider ${p.name} does not support voice deletion`);
    }
    return p.deleteVoice(voiceId);
  }

  /**
   * List available voices
   */
  async listVoices(provider?: VoiceProvider): Promise<Array<{id: string; name: string; preview?: string}>> {
    const p = this.getProvider(provider);
    if (!p.listVoices) {
      throw new Error(`Provider ${p.name} does not support voice listing`);
    }
    return p.listVoices();
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(provider?: VoiceProvider): ProviderCapabilities {
    const p = this.getProvider(provider);
    return p.capabilities;
  }

  /**
   * Estimate cost for an operation
   */
  estimateCost(
    service: 'tts' | 'stt' | 'realtime',
    inputUnits: number,
    provider?: VoiceProvider
  ): CostEstimate {
    const p = this.getProvider(provider);
    return p.estimateCost(service, inputUnits);
  }

  /**
   * Compare costs across all providers
   */
  compareCosts(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate[] {
    return CostCalculator.compareCosts(service, inputUnits);
  }

  /**
   * Get the most cost-effective provider
   */
  getMostCostEffective(service: 'tts' | 'stt' | 'realtime', inputUnits: number): CostEstimate | null {
    return CostCalculator.getMostCostEffective(service, inputUnits);
  }

  /**
   * Calculate voice agent session cost
   */
  calculateVoiceAgentSession(
    sttProvider: VoiceProvider,
    ttsProvider: VoiceProvider,
    sessionMinutes: number,
    userTalkRatio?: number,
    agentTalkRatio?: number
  ) {
    return CostCalculator.calculateVoiceAgentSession(
      sttProvider,
      ttsProvider,
      sessionMinutes,
      userTalkRatio,
      agentTalkRatio
    );
  }

  /**
   * Project monthly costs
   */
  projectMonthlyCost(
    dailySessions: number,
    avgSessionMinutes: number,
    sttProvider: VoiceProvider,
    ttsProvider: VoiceProvider,
    workingDays?: number
  ) {
    return CostCalculator.projectMonthlyCost(
      dailySessions,
      avgSessionMinutes,
      sttProvider,
      ttsProvider,
      workingDays
    );
  }

  /**
   * Health check for a provider
   */
  async healthCheck(provider?: VoiceProvider): Promise<boolean> {
    const p = this.getProvider(provider);
    if (!p.healthCheck) {
      return true; // Assume healthy if not implemented
    }
    return p.healthCheck();
  }

  /**
   * Dispose of all providers
   */
  async dispose(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.dispose();
    }
    this.providers.clear();
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): VoiceProvider[] {
    return AVAILABLE_PROVIDERS;
  }
}

export default VoiceAI;
