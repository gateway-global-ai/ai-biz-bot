import { useState } from "react";
import StandardizedChatInterface from "@/components/StandardizedChatInterface";
import MenuDisplay from "@/components/MenuDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, UtensilsCrossed } from "lucide-react";

export default function CustomerChatInterface() {
  const [activeTab, setActiveTab] = useState("chat");
  const siteConfigId = "customer-portal";

  return (
    <div className="h-screen w-full bg-slate-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
          <h1 className="text-2xl font-bold text-white mb-3">Customer Portal</h1>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="menu" className="data-[state=active]:bg-purple-600">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Menu
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full max-w-7xl">
              <StandardizedChatInterface
                mode="customer"
                siteConfigId={siteConfigId}
                botName="AI Biz Bot"
                greetingMessage="Welcome! I'm here to help you. Browse our menu, chat with me, or place an order. How can I assist you today?"
                fullscreen={true}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <MenuDisplay siteConfigId={siteConfigId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
