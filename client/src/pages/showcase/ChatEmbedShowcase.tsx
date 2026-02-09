import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Code2, Eye } from "lucide-react";
import StandardizedChatInterface from "@/components/StandardizedChatInterface";
import FloatingChatWidget from "@/components/FloatingChatWidget";

export default function ChatEmbedShowcase() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const floatingWidgetCode = `<!-- Add this to your website -->
<div id="gateway-chat-widget"></div>
<script src="https://your-domain.com/gateway-chat.js"></script>
<script>
  GatewayChat.init({
    containerId: 'gateway-chat-widget',
    siteConfigId: 'your-site-id',
    botName: 'AI Assistant',
    primaryColor: '#6366f1',
    position: 'bottom-right',
  });
</script>`;

  const reactComponentCode = `import FloatingChatWidget from '@/components/FloatingChatWidget';

function MyWebsite() {
  return (
    <div>
      {/* Your website content */}
      
      <FloatingChatWidget
        siteConfigId="your-site-id"
        botName="AI Assistant"
        greetingMessage="Hi! How can I help you today?"
        placeholderText="Ask me anything..."
        primaryColor="#6366f1"
      />
    </div>
  );
}`;

  const fullscreenChatCode = `import StandardizedChatInterface from '@/components/StandardizedChatInterface';

function CustomerChat() {
  return (
    <StandardizedChatInterface
      mode="customer"
      siteConfigId="customer-portal"
      botName="AI Biz Bot"
      fullscreen={true}
    />
  );
}`;

  const threeModesCode = `import StandardizedChatInterface from '@/components/StandardizedChatInterface';

function ChatWithModes() {
  const [mode, setMode] = useState('customer');
  
  return (
    <StandardizedChatInterface
      mode={mode}
      allowModeSwitch={true}
      onModeChange={(newMode) => setMode(newMode)}
      fullscreen={true}
    />
  );
}

// Available modes:
// - 'customer': Public-facing customer chat
// - 'owner': Business owner interface with settings, customers, projects
// - 'developer': Developer interface for technical management`;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Chat Interface Showcase</h1>
          <p className="text-slate-400">
            Portable chat components for embedding in any website with TTS voice, real-time conversation, and telephony
          </p>
        </div>

        <Tabs defaultValue="floating" className="space-y-6">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="floating">Floating Widget</TabsTrigger>
            <TabsTrigger value="fullscreen">Fullscreen Chat</TabsTrigger>
            <TabsTrigger value="modes">Three Interface Modes</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="floating" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Floating Chat Widget</CardTitle>
                <CardDescription>
                  Embeddable chat widget that appears in the bottom-right corner with responsive design
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">HTML Embed Code</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => copyToClipboard(floatingWidgetCode, 'floating-html')}
                    >
                      {copiedCode === 'floating-html' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    <code>{floatingWidgetCode}</code>
                  </pre>
                </div>

                <div className="bg-slate-950 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">React Component</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => copyToClipboard(reactComponentCode, 'floating-react')}
                    >
                      {copiedCode === 'floating-react' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    <code>{reactComponentCode}</code>
                  </pre>
                </div>

                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>

                {showPreview && (
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 relative h-[600px]">
                    <p className="text-sm text-slate-400 mb-4">Preview: Chat widget appears in bottom-right</p>
                    <div className="absolute inset-0 bg-slate-900 rounded-lg">
                      <FloatingChatWidget
                        siteConfigId="demo"
                        botName="AI Assistant"
                        greetingMessage="Hi! I'm a demo of the floating chat widget. Try me out!"
                        primaryColor="#6366f1"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fullscreen" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Fullscreen Chat Interface</CardTitle>
                <CardDescription>
                  100vh height with responsive design - perfect for dedicated chat pages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Implementation Code</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => copyToClipboard(fullscreenChatCode, 'fullscreen')}
                    >
                      {copiedCode === 'fullscreen' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    <code>{fullscreenChatCode}</code>
                  </pre>
                </div>

                <div className="bg-slate-800 rounded-lg border border-slate-700 h-[600px] overflow-hidden">
                  <StandardizedChatInterface
                    mode="customer"
                    siteConfigId="demo"
                    botName="AI Biz Bot"
                    fullscreen={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modes" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Three Interface Modes</CardTitle>
                <CardDescription>
                  Customer Chat, Business Owner, and Developer interfaces - all in one component
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Mode Switching Implementation</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => copyToClipboard(threeModesCode, 'modes')}
                    >
                      {copiedCode === 'modes' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    <code>{threeModesCode}</code>
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-sm text-indigo-400">Customer Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>• Public-facing chat</li>
                        <li>• Business inquiries</li>
                        <li>• Customer support</li>
                        <li>• Product information</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-sm text-purple-400">Owner Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>• Settings management</li>
                        <li>• Customer tracking</li>
                        <li>• Project management</li>
                        <li>• AI-generated reports</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-sm text-green-400">Developer Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>• Technical management</li>
                        <li>• Create pages/apps</li>
                        <li>• Deploy agents</li>
                        <li>• API integrations</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-slate-800 rounded-lg border border-slate-700 h-[500px] overflow-hidden">
                  <StandardizedChatInterface
                    mode="customer"
                    siteConfigId="demo"
                    allowModeSwitch={true}
                    fullscreen={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Core Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>100vh Height:</strong> Full viewport height on desktop with responsive design</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Max Width:</strong> Constrained to 600px on desktop for optimal readability</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Mobile Responsive:</strong> Adapts to phone screens seamlessly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Portable Component:</strong> Easy to embed in any website</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Advanced Capabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>TTS Voice:</strong> Text-to-speech with Gemini and Kimi Audio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Real-time Chat:</strong> WebSocket-based live conversations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Telephony:</strong> Voice calls and SMS via Twilio integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>AI Biz Bot:</strong> Intelligent assistant with context awareness</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Google Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Maps & Places:</strong> Business location and details lookup</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Workspace:</strong> Calendar, Drive, Tasks, Docs integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>MCP Server:</strong> Connect to Kimi K2 for agentic coding</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Customization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Brand Colors:</strong> Customizable primary color scheme</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Bot Name:</strong> Personalize assistant identity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Messages:</strong> Custom greetings and placeholders</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="bg-slate-900 border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/interface/customer" className="block">
              <Button variant="outline" className="w-full">
                <Code2 className="w-4 h-4 mr-2" />
                Try Customer Chat
              </Button>
            </a>
            <a href="/interface/owner" className="block">
              <Button variant="outline" className="w-full">
                <Code2 className="w-4 h-4 mr-2" />
                Try Owner Interface
              </Button>
            </a>
            <a href="/interface/developer" className="block">
              <Button variant="outline" className="w-full">
                <Code2 className="w-4 h-4 mr-2" />
                Try Developer Interface
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
