import React, { useState, useEffect } from 'react';
import { Save, Lock, Volume2, DollarSign, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { GEMINI_VOICE_MODELS, calculateMonthlyCost, type GeminiModelConfig } from '@shared/geminiVoiceModels';
import { ModelCostComparison } from './ModelCostComparison';

interface VoiceAdminConfig {
  model: string;
  voice: string;
  role: string;
  companyName: string;
  systemPrompt: string;
  voicePersona: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
}

interface VoiceAdminPanelProps {
  userTier: 'free' | 'paid';
  currentConfig?: Partial<VoiceAdminConfig>;
  onSave: (config: VoiceAdminConfig) => Promise<void>;
}

const VOICE_PERSONAS = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-oriented' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and upbeat' },
  { id: 'calm', name: 'Calm', description: 'Soothing and relaxed' },
  { id: 'authoritative', name: 'Authoritative', description: 'Confident and directive' },
];

const DEFAULT_FREE_CONFIG: VoiceAdminConfig = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  voice: 'Puck',
  role: 'AI Business Assistant',
  companyName: 'AI Biz Bot',
  systemPrompt: `You are a helpful AI assistant for small businesses. You provide information about the business to customers in a friendly and professional manner. You can answer questions about business hours, services, location, and general inquiries. Keep responses concise and focused on helping customers.`,
  voicePersona: 'friendly',
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
};

/**
 * Voice Admin Panel Component
 * - Allows configuration of voice AI settings
 * - Free tier: defaults only (locked)
 * - Paid tier: full editing capabilities
 */
export const VoiceAdminPanel: React.FC<VoiceAdminPanelProps> = ({
  userTier,
  currentConfig = {},
  onSave,
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<VoiceAdminConfig>({
    ...DEFAULT_FREE_CONFIG,
    ...currentConfig,
  });
  const [isSaving, setIsSaving] = useState(false);
  const isPaid = userTier === 'paid';

  // Get current model configuration
  const currentModelConfig: GeminiModelConfig = GEMINI_VOICE_MODELS[config.model] || GEMINI_VOICE_MODELS['gemini-2.5-flash-native-audio-preview'];
  const availableVoices = currentModelConfig.availableVoices;

  // Handle model change and validate voice compatibility
  const handleModelChange = (newModel: string) => {
    const newModelConfig = GEMINI_VOICE_MODELS[newModel];
    if (!newModelConfig) return;
    
    const newAvailableVoices = newModelConfig.availableVoices;
    const isCurrentVoiceAvailable = newAvailableVoices.some(v => v.id === config.voice);
    
    // Use recommended sampling parameters for new model
    setConfig({
      ...config,
      model: newModel,
      voice: isCurrentVoiceAvailable ? config.voice : newAvailableVoices[0]?.id || 'Puck',
      temperature: newModelConfig.samplingConfig.temperature.recommended,
      topP: newModelConfig.samplingConfig.topP.recommended,
      topK: newModelConfig.samplingConfig.topK.recommended,
      maxOutputTokens: newModelConfig.samplingConfig.maxOutputTokens.recommended,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
      toast({
        title: 'Settings Saved',
        description: 'Voice AI configuration has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="costs">Cost Comparison</TabsTrigger>
          <TabsTrigger value="sdk">SDK Templates</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Volume2 className="w-8 h-8 text-purple-500" />
              <h2 className="text-2xl font-bold">Voice AI Settings</h2>
            </div>
            <p className="text-slate-600">
              Configure your voice AI assistant's behavior and personality.
              {!isPaid && (
                <span className="block mt-2 text-sm text-amber-600">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Upgrade to a paid plan to customize these settings
                </span>
              )}
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={config.model}
              onValueChange={handleModelChange}
              disabled={!isPaid}
            >
              <SelectTrigger id="model" className={!isPaid ? 'opacity-60' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(GEMINI_VOICE_MODELS).map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.displayName}
                    {model.isLatest && ' ⭐'}
                    {model.isBudgetFriendly && ' 💰'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500">
              {currentModelConfig.description}
            </p>
            <div className="text-xs text-slate-400 mt-2 space-y-1">
              <div>Release: {currentModelConfig.releaseDate}</div>
              <div>Audio Quality: {currentModelConfig.performance.audioQuality}</div>
              <div>Latency: ~{currentModelConfig.performance.averageLatency}ms</div>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            <Select
              value={config.voice}
              onValueChange={(value) => setConfig({ ...config, voice: value })}
              disabled={!isPaid}
            >
              <SelectTrigger id="voice" className={!isPaid ? 'opacity-60' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description} ({voice.gender}) [{voice.quality}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500">
              {availableVoices.length} voice{availableVoices.length !== 1 ? 's' : ''} available for this model
            </p>
          </div>

          {/* Sampling Parameters */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
            <h3 className="font-semibold text-sm text-slate-700">Sampling Parameters</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">Temperature</Label>
                <span className="text-sm font-mono">{config.temperature.toFixed(2)}</span>
              </div>
              <Input
                id="temperature"
                type="range"
                min={currentModelConfig.samplingConfig.temperature.min}
                max={currentModelConfig.samplingConfig.temperature.max}
                step={0.05}
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                disabled={!isPaid}
                className={!isPaid ? 'opacity-60' : ''}
              />
              <p className="text-xs text-slate-500">
                Recommended: {currentModelConfig.samplingConfig.temperature.recommended}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="topP">Top P</Label>
                <span className="text-sm font-mono">{config.topP.toFixed(2)}</span>
              </div>
              <Input
                id="topP"
                type="range"
                min={currentModelConfig.samplingConfig.topP.min}
                max={currentModelConfig.samplingConfig.topP.max}
                step={0.05}
                value={config.topP}
                onChange={(e) => setConfig({ ...config, topP: parseFloat(e.target.value) })}
                disabled={!isPaid}
                className={!isPaid ? 'opacity-60' : ''}
              />
              <p className="text-xs text-slate-500">
                Recommended: {currentModelConfig.samplingConfig.topP.recommended}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxTokens">Max Output Tokens</Label>
                <span className="text-sm font-mono">{config.maxOutputTokens}</span>
              </div>
              <Input
                id="maxTokens"
                type="range"
                min={currentModelConfig.samplingConfig.maxOutputTokens.min}
                max={currentModelConfig.samplingConfig.maxOutputTokens.max}
                step={128}
                value={config.maxOutputTokens}
                onChange={(e) => setConfig({ ...config, maxOutputTokens: parseInt(e.target.value) })}
                disabled={!isPaid}
                className={!isPaid ? 'opacity-60' : ''}
              />
              <p className="text-xs text-slate-500">
                Recommended: {currentModelConfig.samplingConfig.maxOutputTokens.recommended}
              </p>
            </div>
          </div>

      {/* Voice Persona */}
      <div className="space-y-2">
        <Label htmlFor="persona">Voice Persona</Label>
        <Select
          value={config.voicePersona}
          onValueChange={(value) => setConfig({ ...config, voicePersona: value })}
          disabled={!isPaid}
        >
          <SelectTrigger id="persona" className={!isPaid ? 'opacity-60' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_PERSONAS.map((persona) => (
              <SelectItem key={persona.id} value={persona.id}>
                {persona.name} - {persona.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">
          The overall personality and tone of the voice interactions
        </p>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={config.role}
          onChange={(e) => setConfig({ ...config, role: e.target.value })}
          disabled={!isPaid}
          placeholder="e.g., Customer Service Representative"
          className={!isPaid ? 'opacity-60' : ''}
        />
        <p className="text-sm text-slate-500">
          The role or title of your AI assistant
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          value={config.companyName}
          onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
          disabled={!isPaid}
          placeholder="Your Business Name"
          className={!isPaid ? 'opacity-60' : ''}
        />
        <p className="text-sm text-slate-500">
          Your business or brand name
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          value={config.systemPrompt}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
          disabled={!isPaid}
          rows={8}
          placeholder="Instructions for how your AI should behave..."
          className={!isPaid ? 'opacity-60' : ''}
        />
        <p className="text-sm text-slate-500">
          Detailed instructions that define how your AI assistant should behave and respond to customers.
          {!isPaid && ' This is locked to a generic business assistant prompt for free accounts.'}
        </p>
      </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || !isPaid}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
            {!isPaid && (
              <p className="mt-3 text-sm text-slate-500">
                To customize these settings, please upgrade to a paid plan
              </p>
            )}
          </div>
        </TabsContent>

        {/* Cost Comparison Tab */}
        <TabsContent value="costs">
          <ModelCostComparison onSelectModel={(modelId) => {
            handleModelChange(modelId);
            // Switch back to config tab
            document.querySelector('[value="config"]')?.dispatchEvent(new Event('click', { bubbles: true }));
          }} />
        </TabsContent>

        {/* SDK Templates Tab */}
        <TabsContent value="sdk" className="space-y-6">
          <div className="border-b pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Code className="w-8 h-8 text-purple-500" />
              <h2 className="text-2xl font-bold">SDK Templates</h2>
            </div>
            <p className="text-slate-600">
              Model-specific SDK examples and integration templates
            </p>
          </div>

          {Object.values(GEMINI_VOICE_MODELS).map((model) => (
            <div key={model.id} className="space-y-4 p-6 bg-slate-50 rounded-lg border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{model.displayName}</h3>
                  <p className="text-sm text-slate-600 mt-1">{model.description}</p>
                </div>
                <div className="flex gap-2">
                  {model.isLatest && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      Latest
                    </span>
                  )}
                  {model.isBudgetFriendly && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                      Budget
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">API Type:</span>
                  <span className="ml-2 font-semibold">{model.usesLiveAPI ? 'Live API' : 'Standard API'}</span>
                </div>
                <div>
                  <span className="text-slate-600">Streaming:</span>
                  <span className="ml-2 font-semibold">{model.usesBidiStreaming ? 'Bidirectional' : 'Unidirectional'}</span>
                </div>
                <div>
                  <span className="text-slate-600">System Prompt Format:</span>
                  <span className="ml-2 font-semibold">{model.systemPromptConfig.format}</span>
                </div>
                <div>
                  <span className="text-slate-600">Max Prompt Length:</span>
                  <span className="ml-2 font-semibold">{model.systemPromptConfig.maxLength} chars</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm text-slate-700">Example Code:</h4>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{model.exampleCode}</code>
                </pre>
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t">
                <strong>Key Configuration Notes:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Temperature range: {model.samplingConfig.temperature.min}-{model.samplingConfig.temperature.max} (recommended: {model.samplingConfig.temperature.recommended})</li>
                  <li>Max tokens: {model.samplingConfig.maxOutputTokens.max} (recommended: {model.samplingConfig.maxOutputTokens.recommended})</li>
                  <li>Available voices: {model.availableVoices.length} ({model.availableVoices.map(v => v.name).join(', ')})</li>
                  {model.capabilities.functionCalling && <li>Supports function calling for advanced interactions</li>}
                </ul>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VoiceAdminPanel;
