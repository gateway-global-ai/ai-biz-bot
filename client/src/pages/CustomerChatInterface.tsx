import StandardizedChatInterface from "@/components/StandardizedChatInterface";

export default function CustomerChatInterface() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-950">
      <div className="w-full h-full max-w-7xl">
        <StandardizedChatInterface
          mode="customer"
          siteConfigId="customer-portal"
          botName="AI Biz Bot"
          greetingMessage="Welcome! I'm here to help you with your business inquiries. How can I assist you today?"
          fullscreen={true}
        />
      </div>
    </div>
  );
}
