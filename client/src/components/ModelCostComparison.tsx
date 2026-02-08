import React, { useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Zap, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  GEMINI_VOICE_MODELS,
  calculateMonthlyCost,
  compareModelCosts,
  type GeminiModelConfig,
} from '@shared/geminiVoiceModels';

interface ModelCostComparisonProps {
  onSelectModel?: (modelId: string) => void;
}

export const ModelCostComparison: React.FC<ModelCostComparisonProps> = ({
  onSelectModel,
}) => {
  const [dailyMinutes, setDailyMinutes] = useState(60); // 60 minutes per day default
  
  const comparisons = compareModelCosts(dailyMinutes);
  
  return (
    <div className="space-y-6">
      {/* Usage Input */}
      <Card>
        <CardHeader>
          <CardTitle>Estimate Your Usage</CardTitle>
          <CardDescription>
            Adjust the slider to see cost comparisons based on your expected daily voice minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Daily Voice Minutes</label>
              <span className="text-2xl font-bold text-purple-600">{dailyMinutes}</span>
            </div>
            <Slider
              value={[dailyMinutes]}
              onValueChange={([value]) => setDailyMinutes(value)}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>10 min/day</span>
              <span>500 min/day</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t text-sm">
            <div>
              <p className="text-slate-500">Monthly Minutes</p>
              <p className="font-semibold">{(dailyMinutes * 30).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500">Avg Session Length</p>
              <p className="font-semibold">5 minutes</p>
            </div>
            <div>
              <p className="text-slate-500">Sessions/Month</p>
              <p className="font-semibold">{((dailyMinutes * 30) / 5).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Comparisons */}
      <div className="grid gap-4 md:grid-cols-2">
        {comparisons.map((comparison, index) => {
          const model = GEMINI_VOICE_MODELS[comparison.modelId];
          const isLatest = model.isLatest;
          const isCheapest = index === 0;
          
          return (
            <Card
              key={comparison.modelId}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                isLatest ? 'border-purple-500 border-2' : ''
              }`}
            >
              {/* Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {isLatest && (
                  <Badge className="bg-purple-500 hover:bg-purple-600">
                    <Zap className="w-3 h-3 mr-1" />
                    Latest
                  </Badge>
                )}
                {isCheapest && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Best Value
                  </Badge>
                )}
                {model.isBudgetFriendly && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    Budget Friendly
                  </Badge>
                )}
              </div>
              
              <CardHeader>
                <CardTitle className="text-xl pr-24">{model.displayName}</CardTitle>
                <CardDescription className="text-sm">
                  {model.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-600">
                    ${comparison.totalMonthlyCost.toFixed(2)}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                
                <div className="text-sm text-slate-600">
                  ${comparison.costPerSession.toFixed(4)} per session
                </div>
                
                {/* Features */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Available Voices</span>
                    <span className="font-semibold">{model.availableVoices.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Audio Quality</span>
                    <span className="font-semibold">{model.performance.audioQuality}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Avg Latency</span>
                    <span className="font-semibold">{model.performance.averageLatency}ms</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Function Calling</span>
                    <span className="font-semibold">
                      {model.capabilities.functionCalling ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
                
                {/* Pricing Details */}
                <details className="text-xs space-y-2">
                  <summary className="cursor-pointer text-slate-600 hover:text-slate-900 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    View pricing breakdown
                  </summary>
                  <div className="pl-4 pt-2 space-y-1 text-slate-600">
                    <div>Input Audio: ${model.pricing.inputAudioPerMinute}/min</div>
                    <div>Output Audio: ${model.pricing.outputAudioPerMinute}/min</div>
                    <div>Input Text: ${model.pricing.inputTextPer1MTokens}/1M tokens</div>
                    <div>Output Text: ${model.pricing.outputTextPer1MTokens}/1M tokens</div>
                  </div>
                </details>
                
                {/* Select Button */}
                {onSelectModel && (
                  <button
                    onClick={() => onSelectModel(comparison.modelId)}
                    className={`
                      w-full py-2 px-4 rounded-lg font-semibold transition-colors
                      ${isLatest 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }
                    `}
                  >
                    {isLatest ? 'Select Latest Model' : 'Select This Model'}
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Savings Comparison */}
      {comparisons.length > 1 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <DollarSign className="w-5 h-5" />
              Potential Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-green-900">
                By choosing <strong>{comparisons[0].model}</strong> over{' '}
                <strong>{comparisons[comparisons.length - 1].model}</strong>, you save:
              </p>
              <div className="text-3xl font-bold text-green-700">
                ${(comparisons[comparisons.length - 1].totalMonthlyCost - comparisons[0].totalMonthlyCost).toFixed(2)}
                <span className="text-lg font-normal">/month</span>
              </div>
              <p className="text-sm text-green-800">
                That's <strong>${((comparisons[comparisons.length - 1].totalMonthlyCost - comparisons[0].totalMonthlyCost) * 12).toFixed(2)}</strong> saved annually!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recommendation */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-800">💡 Our Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-purple-900">
          <p>
            <strong>For best quality & latest features:</strong> Choose{' '}
            {GEMINI_VOICE_MODELS['gemini-2.5-flash-native-audio-preview'].displayName}
          </p>
          <p>
            <strong>For budget-conscious deployments:</strong> Choose{' '}
            {GEMINI_VOICE_MODELS['gemini-2.0-flash-native-audio'].displayName}
          </p>
          <p className="text-xs text-purple-700 pt-2 border-t border-purple-200">
            Both models use Google's native audio technology with excellent quality. 
            The main differences are in advanced features, voice options, and pricing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelCostComparison;
