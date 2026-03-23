import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, ChevronRight, Shield, FileText, List, HelpCircle, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GovernanceWizard, GovernanceConfig } from '../onboarding/GovernanceWizard';
import { motion, AnimatePresence } from 'framer-motion';

interface OperationsPanelProps {
  siteConfigId?: string;
}

export function OperationsPanel({ siteConfigId }: OperationsPanelProps) {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!siteConfigId) return;
    try {
      const res = await fetch(`/api/site-configs/${siteConfigId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load site config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [siteConfigId]);

  const handleSave = async (newConfig: GovernanceConfig) => {
    if (!siteConfigId) return;
    
    try {
      await fetch(`/api/site-configs/${siteConfigId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentConfig: {
            ...config.agentConfig,
            verificationPolicy: { level: newConfig.verificationLevel },
            intakePolicy: newConfig.intakePolicy
          },
          serviceMenu: newConfig.serviceMenu,
          faqs: newConfig.faqs,
          crmConfig: { statuses: newConfig.clientStatuses }
        })
      });
      await fetchConfig(); // Reload
      setEditingSection(null);
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading operations data...</div>;
  if (!config) return <div className="p-8 text-center text-slate-400">No configuration found.</div>;

  // Map DB data to Wizard format
  const wizardData: Partial<GovernanceConfig> = {
    verificationLevel: config.agentConfig?.verificationPolicy?.level || 'standard',
    intakePolicy: config.agentConfig?.intakePolicy || { insurance: false, attorney: false, referral: false },
    serviceMenu: config.serviceMenu || [],
    faqs: config.faqs || [],
    clientStatuses: config.crmConfig?.statuses || ['Intake', 'Waiting', 'In Service', 'Checkout']
  };

  const sections = [
    {
      id: 'verification',
      title: "Security & Verification",
      icon: Shield,
      isConfigured: !!config.agentConfig?.verificationPolicy?.level,
      details: config.agentConfig?.verificationPolicy?.level 
        ? `${config.agentConfig.verificationPolicy.level.charAt(0).toUpperCase() + config.agentConfig.verificationPolicy.level.slice(1)} verification active` 
        : "Default (Standard)",
    },
    {
      id: 'intake',
      title: "Intake Policy",
      icon: FileText,
      isConfigured: Object.values(config.agentConfig?.intakePolicy || {}).some(v => v),
      details: [
        config.agentConfig?.intakePolicy?.insurance ? 'Insurance' : null,
        config.agentConfig?.intakePolicy?.attorney ? 'Attorney' : null,
        config.agentConfig?.intakePolicy?.referral ? 'Referral' : null
      ].filter(Boolean).join(', ') || "No specific requirements",
    },
    {
      id: 'services',
      title: "Service Menu",
      icon: List,
      isConfigured: (config.serviceMenu?.length || 0) > 0,
      details: `${config.serviceMenu?.length || 0} services active`,
    },
    {
      id: 'faqs',
      title: "Common Questions (FAQs)",
      icon: HelpCircle,
      isConfigured: (config.faqs?.length || 0) > 0,
      details: `${config.faqs?.length || 0} questions configured`,
    },
    {
      id: 'statuses',
      title: "Client Flow Statuses",
      icon: Users,
      isConfigured: (config.crmConfig?.statuses?.length || 0) > 0,
      details: `${config.crmConfig?.statuses?.length || 4} statuses defined`,
    }
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Operations & Governance</h2>
          <p className="text-sm text-slate-400">Configure how the AI Agent handles your business rules.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {editingSection ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900/50 border border-slate-700/50 rounded-sui p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-md font-medium text-white">Edit Configuration</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <GovernanceWizard 
              initialData={wizardData}
              initialStep={editingSection as any}
              onComplete={handleSave}
              onBack={() => setEditingSection(null)}
            />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4"
          >
            {sections.map((section) => (
              <div 
                key={section.id} 
                className="flex items-center justify-between p-4 rounded-sui bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                onClick={() => setEditingSection(section.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${section.isConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{section.title}</p>
                    <p className="text-xs text-slate-400">{section.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {section.isConfigured ? (
                    <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-700 text-slate-500">
                      Default
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
