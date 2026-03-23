import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, HelpCircle, Clock, List, Users } from 'lucide-react';

export interface GovernanceConfig {
  verificationLevel: 'standard' | 'strict';
  intakePolicy: {
    insurance: boolean;
    attorney: boolean;
    referral: boolean;
  };
  serviceMenu: Array<{ name: string; price?: string; duration?: number }>;
  faqs: Array<{ question: string; answer: string }>;
  clientStatuses: string[];
}

interface GovernanceWizardProps {
  onComplete: (config: GovernanceConfig) => void;
  onBack: () => void;
  initialData?: Partial<GovernanceConfig>;
  initialStep?: 'verification' | 'intake' | 'services' | 'faqs' | 'statuses';
}

export function GovernanceWizard({ onComplete, onBack, initialData, initialStep = 'verification' }: GovernanceWizardProps) {
  const [step, setStep] = useState<'verification' | 'intake' | 'services' | 'faqs' | 'statuses'>(initialStep);
  
  const [config, setConfig] = useState<GovernanceConfig>({
    verificationLevel: initialData?.verificationLevel || 'standard',
    intakePolicy: {
      insurance: initialData?.intakePolicy?.insurance || false,
      attorney: initialData?.intakePolicy?.attorney || false,
      referral: initialData?.intakePolicy?.referral || false,
    },
    serviceMenu: initialData?.serviceMenu || [],
    faqs: initialData?.faqs || [],
    clientStatuses: initialData?.clientStatuses || ['Intake', 'Waiting', 'In Service', 'Checkout'],
  });

  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [newStatus, setNewStatus] = useState('');

  const updateConfig = (key: keyof GovernanceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addService = () => {
    if (newService.name) {
      updateConfig('serviceMenu', [...config.serviceMenu, { 
        ...newService, 
        duration: newService.duration ? parseInt(newService.duration) : undefined 
      }]);
      setNewService({ name: '', price: '', duration: '' });
    }
  };

  const addFaq = () => {
    if (newFaq.question && newFaq.answer) {
      updateConfig('faqs', [...config.faqs, newFaq]);
      setNewFaq({ question: '', answer: '' });
    }
  };

  const addStatus = () => {
    if (newStatus) {
      updateConfig('clientStatuses', [...config.clientStatuses, newStatus]);
      setNewStatus('');
    }
  };

  const renderVerificationStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
             onClick={() => updateConfig('verificationLevel', 'standard')}
             style={{ borderColor: config.verificationLevel === 'standard' ? 'var(--primary)' : undefined }}>
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              Standard Verification
              {config.verificationLevel === 'standard' && <Badge>Selected</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              Phone number verification via OTP code. Suitable for most businesses.
            </div>
          </div>
          <Shield className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
             onClick={() => updateConfig('verificationLevel', 'strict')}
             style={{ borderColor: config.verificationLevel === 'strict' ? 'var(--primary)' : undefined }}>
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              Strict Verification
              {config.verificationLevel === 'strict' && <Badge>Selected</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              Requires ID scan or insurance card upload. Best for medical/legal.
            </div>
          </div>
          <Shield className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => setStep('intake')}>Next: Intake Policy</Button>
      </div>
    </div>
  );

  const renderIntakeStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Insurance Collection</Label>
            <div className="text-sm text-muted-foreground">
              Ask clients to upload insurance card during intake
            </div>
          </div>
          <Switch
            checked={config.intakePolicy.insurance}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, intakePolicy: { ...prev.intakePolicy, insurance: checked } }))
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Attorney Information</Label>
            <div className="text-sm text-muted-foreground">
              Collect attorney contact details (for PI/Legal cases)
            </div>
          </div>
          <Switch
            checked={config.intakePolicy.attorney}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, intakePolicy: { ...prev.intakePolicy, attorney: checked } }))
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Referral Source</Label>
            <div className="text-sm text-muted-foreground">
              Ask clients how they heard about you
            </div>
          </div>
          <Switch
            checked={config.intakePolicy.referral}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, intakePolicy: { ...prev.intakePolicy, referral: checked } }))
            }
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('verification')}>Back</Button>
        <Button onClick={() => setStep('services')}>Next: Services</Button>
      </div>
    </div>
  );

  const renderServicesStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Input 
            placeholder="Service Name" 
            value={newService.name}
            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
          />
          <Input 
            placeholder="Price (opt)" 
            value={newService.price}
            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
          />
          <div className="flex gap-2">
            <Input 
              placeholder="Min (opt)" 
              type="number"
              value={newService.duration}
              onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
            />
            <Button onClick={addService} size="icon">+</Button>
          </div>
        </div>

        <div className="space-y-2">
          {config.serviceMenu.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">{service.name}</div>
                <div className="text-sm text-muted-foreground">
                  {service.price && `${service.price} • `}{service.duration && `${service.duration} min`}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => updateConfig('serviceMenu', config.serviceMenu.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </div>
          ))}
          {config.serviceMenu.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No services added yet. Add your main services above.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('intake')}>Back</Button>
        <Button onClick={() => setStep('faqs')}>Next: FAQs</Button>
      </div>
    </div>
  );

  const renderFaqsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Input 
            placeholder="Question (e.g., Do you take walk-ins?)" 
            value={newFaq.question}
            onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
          />
          <div className="flex gap-2">
            <Textarea 
              placeholder="Answer" 
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
            />
            <Button onClick={addFaq} className="h-auto">Add</Button>
          </div>
        </div>

        <div className="space-y-2">
          {config.faqs.map((faq, idx) => (
            <div key={idx} className="p-3 border rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between items-start">
                <div className="font-medium">Q: {faq.question}</div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6"
                  onClick={() => updateConfig('faqs', config.faqs.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">A: {faq.answer}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('services')}>Back</Button>
        <Button onClick={() => setStep('statuses')}>Next: Client Flow</Button>
      </div>
    </div>
  );

  const renderStatusesStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="Status Name (e.g. Waiting Room)" 
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStatus()}
          />
          <Button onClick={addStatus}>Add</Button>
        </div>

        <div className="space-y-2">
          {config.clientStatuses.map((status, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{idx + 1}</Badge>
                <span className="font-medium">{status}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => updateConfig('clientStatuses', config.clientStatuses.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          These statuses define the flow of a client through your business.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('faqs')}>Back</Button>
        <Button onClick={() => onComplete(config)}>Complete Setup</Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step === 'verification' && <Shield className="h-5 w-5" />}
          {step === 'intake' && <FileText className="h-5 w-5" />}
          {step === 'services' && <List className="h-5 w-5" />}
          {step === 'faqs' && <HelpCircle className="h-5 w-5" />}
          {step === 'statuses' && <Users className="h-5 w-5" />}
          
          {step === 'verification' && 'Security & Verification'}
          {step === 'intake' && 'Intake Policy'}
          {step === 'services' && 'Service Menu'}
          {step === 'faqs' && 'Common Questions'}
          {step === 'statuses' && 'Client Flow'}
        </CardTitle>
        <CardDescription>
          Configure how the AI Agent handles your business rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'verification' && renderVerificationStep()}
        {step === 'intake' && renderIntakeStep()}
        {step === 'services' && renderServicesStep()}
        {step === 'faqs' && renderFaqsStep()}
        {step === 'statuses' && renderStatusesStep()}
      </CardContent>
    </Card>
  );
}
