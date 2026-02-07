import React, { useState, useEffect } from 'react';
import { Save, Lock, Volume2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

interface VoiceAdminConfig {
  model: string;
  voice: string;
  role: string;
  companyName: string;
  systemPrompt: string;
  voicePersona: string;
}

interface VoiceAdminPanelProps {
  userTier: 'free' | 'paid';
  currentConfig?: Partial<VoiceAdminConfig>;
  onSave: (config: VoiceAdminConfig) => Promise<void>;
}

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-native-audio-preview', name: 'Gemini 2.5 Flash Native Audio (Recommended)' },
  { id: 'gemini-2.0-flash-native-audio', name: 'Gemini 2.0 Flash Native Audio' },
];

const GEMINI_VOICES = [
  { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
  { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
  { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
  { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
  { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
  { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
];

const VOICE_PERSONAS = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-oriented' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and upbeat' },
  { id: 'calm', name: 'Calm', description: 'Soothing and relaxed' },
  { id: 'authoritative', name: 'Authoritative', description: 'Confident and directive' },
];

const DEFAULT_FREE_CONFIG: VoiceAdminConfig = {
  model: 'gemini-2.5-flash-native-audio-preview',
  voice: 'Puck',
  role: 'AI Business Assistant',
  companyName: 'AI Biz Bot',
  systemPrompt: `You are a helpful AI assistant for small businesses. You provide information about the business to customers in a friendly and professional manner. You can answer questions about business hours, services, location, and general inquiries. Keep responses concise and focused on helping customers.`,
  voicePersona: 'friendly',
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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
          onValueChange={(value) => setConfig({ ...config, model: value })}
          disabled={!isPaid}
        >
          <SelectTrigger id="model" className={!isPaid ? 'opacity-60' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GEMINI_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">
          The AI model used for voice interactions
        </p>
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
            {GEMINI_VOICES.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name} - {voice.description} ({voice.gender})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">
          The voice personality for your AI assistant
        </p>
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
    </div>
  );
};

export default VoiceAdminPanel;
