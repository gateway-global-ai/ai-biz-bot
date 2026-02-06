import { useState } from "react";
import StandardizedChatInterface from "@/components/StandardizedChatInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, Calendar, FileText, TrendingUp } from "lucide-react";

export default function OwnerChatInterface() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="h-screen w-full bg-slate-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
          <h1 className="text-2xl font-bold text-white mb-3">Business Owner Portal</h1>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600">
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-purple-600">
              <Calendar className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full max-w-7xl">
              <StandardizedChatInterface
                mode="owner"
                siteConfigId="owner-portal"
                botName="AI Biz Bot"
                fullscreen={true}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
                <CardDescription>Manage your business profile and integrations</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2">Google Workspace Integration</h3>
                    <p className="text-sm text-slate-400">Connect Calendar, Drive, Tasks, and more</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2">Telephony Settings</h3>
                    <p className="text-sm text-slate-400">Configure phone numbers and SMS settings</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="font-semibold mb-2">Billing & Subscription</h3>
                    <p className="text-sm text-slate-400">Manage your plan and payment methods</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Customer Management</CardTitle>
                <CardDescription>View contacts, inquiries, orders, and appointments</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <p>Customer management interface will be displayed here.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Project Manager</CardTitle>
                <CardDescription>Track projects and tasks</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <p>Project management interface will be displayed here.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">AI-Generated Reports</CardTitle>
                <CardDescription>View reports created by AI Biz Bot</CardDescription>
              </CardHeader>
              <CardContent className="text-slate-300">
                <p>Reports interface will be displayed here.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
