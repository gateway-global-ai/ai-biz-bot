import { useState } from "react";
import StandardizedChatInterface from "@/components/StandardizedChatInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, FileCode, Layers, Rocket, Terminal } from "lucide-react";

export default function DeveloperChatInterface() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="h-screen w-full bg-slate-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
          <h1 className="text-2xl font-bold text-white mb-3">Developer Interface</h1>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="chat" className="data-[state=active]:bg-green-600">
              AI Developer Assistant
            </TabsTrigger>
            <TabsTrigger value="pages" className="data-[state=active]:bg-green-600">
              <FileCode className="w-4 h-4 mr-2" />
              Pages & Apps
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-green-600">
              <Rocket className="w-4 h-4 mr-2" />
              Deploy Agents
            </TabsTrigger>
            <TabsTrigger value="technical" className="data-[state=active]:bg-green-600">
              <Terminal className="w-4 h-4 mr-2" />
              Technical
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full max-w-7xl">
              <StandardizedChatInterface
                mode="developer"
                siteConfigId="developer-portal"
                botName="AI Biz Bot Developer"
                fullscreen={true}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Create Pages & Apps</CardTitle>
                <CardDescription>Generate and deploy new static pages and applications</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <FileCode className="w-5 h-5" />
                      Static Page Generator
                    </h3>
                    <p className="text-sm text-slate-400">Use AI to create new landing pages and content</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      App Builder
                    </h3>
                    <p className="text-sm text-slate-400">Create custom applications with AI assistance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Agent Deployment</CardTitle>
                <CardDescription>Deploy and manage AI agents for various tasks</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      Telephony Agent
                    </h3>
                    <p className="text-sm text-slate-400">Deploy phone number and voice response system</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      Task Automation Agent
                    </h3>
                    <p className="text-sm text-slate-400">Automate scheduling, document creation, and file management</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="technical" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Technical Management</CardTitle>
                <CardDescription>Advanced website and infrastructure management</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2">API Integrations</h3>
                    <p className="text-sm text-slate-400">Manage Google Maps, Places API, and Workspace integrations</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2">MCP Server</h3>
                    <p className="text-sm text-slate-400">Connect to Kimi K2 for agentic coding capabilities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
