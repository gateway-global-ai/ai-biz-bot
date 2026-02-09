import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Download,
  RefreshCw,
  FileText,
  TestTube,
  List,
  BarChart3
} from 'lucide-react';
import AgentOrchestration from '@/components/AgentOrchestration';

interface AgentTestResult {
  agentId: string;
  agentName: string;
  templateId: string;
  status: 'pass' | 'fail' | 'warning';
  tests: {
    configurationValid: boolean;
    systemPromptPresent: boolean;
    capabilitiesDefined: boolean;
    modalValid: boolean;
    registeredInManager: boolean;
  };
  issues: string[];
  warnings: string[];
  metadata: {
    testedAt: string;
    testDuration: number;
  };
}

interface AgentTestReport {
  summary: {
    totalAgents: number;
    passed: number;
    failed: number;
    warnings: number;
    testDuration: number;
  };
  results: AgentTestResult[];
  generatedAt: string;
}

export default function AgentTestingDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { 
    data: testReport, 
    isLoading, 
    refetch,
    isFetching 
  } = useQuery<AgentTestReport>({
    queryKey: ['/api/agents/test'],
    refetchOnWindowFocus: false,
  });

  const { data: templates } = useQuery({
    queryKey: ['/api/agents/templates'],
  });

  const downloadMarkdownReport = async () => {
    const response = await fetch('/api/agents/test/report');
    const markdown = await response.text();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-test-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  };

  const downloadTextReport = async () => {
    const response = await fetch('/api/agents/test/report/text');
    const text = await response.text();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-test-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const getStatusIcon = (status: AgentTestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: AgentTestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'border-green-500 bg-green-500/10';
      case 'fail':
        return 'border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-gray-400">Running agent tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Agent Testing Dashboard</h1>
            <p className="text-gray-400">
              Validate agent configurations, system prompts, and registry status
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Tests
            </Button>
            <Button
              variant="outline"
              onClick={downloadMarkdownReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Download MD
            </Button>
            <Button
              variant="outline"
              onClick={downloadTextReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Download TXT
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {testReport && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4 bg-slate-900/50 border-slate-700">
              <div className="flex items-center gap-3">
                <TestTube className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {testReport.summary.totalAgents}
                  </div>
                  <div className="text-sm text-gray-400">Total Agents</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {testReport.summary.passed}
                  </div>
                  <div className="text-sm text-gray-400">Passed</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {testReport.summary.failed}
                  </div>
                  <div className="text-sm text-gray-400">Failed</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {testReport.summary.warnings}
                  </div>
                  <div className="text-sm text-gray-400">Warnings</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-900/50 border-slate-700">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {testReport.summary.testDuration}ms
                  </div>
                  <div className="text-sm text-gray-400">Duration</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-700">
            <TabsTrigger value="results">
              <List className="w-4 h-4 mr-2" />
              Test Results
            </TabsTrigger>
            <TabsTrigger value="orchestration">
              <TestTube className="w-4 h-4 mr-2" />
              Orchestration Demo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {testReport?.results.map((result) => (
              <Card
                key={result.agentId}
                className={`border-2 ${getStatusColor(result.status)} overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {result.agentName}
                        </h3>
                        <div className="flex gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {result.templateId}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {result.agentId}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          result.status === 'pass'
                            ? 'bg-green-500/20 text-green-400 border-green-500'
                            : result.status === 'fail'
                            ? 'bg-red-500/20 text-red-400 border-red-500'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                        }
                      >
                        {result.status.toUpperCase()}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-2">
                        {result.metadata.testDuration}ms
                      </div>
                    </div>
                  </div>

                  {/* Test Results Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {Object.entries(result.tests).map(([testName, passed]) => (
                      <div
                        key={testName}
                        className={`p-2 rounded border ${
                          passed
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {passed ? (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-xs font-medium text-gray-300">
                            {testName.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-red-400">
                          Issues ({result.issues.length})
                        </span>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {result.issues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-gray-300">
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-semibold text-yellow-400">
                          Warnings ({result.warnings.length})
                        </span>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {result.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-gray-300">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="orchestration">
            <AgentOrchestration showThoughtProcess={true} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
