<!-- Not a production prompt source. SSoT: docs-governance/CLIENT_SPEC_TREE_REGISTRY.md, VIEW_REGISTRY, intake/tool contracts. -->

To implement a **Manual Correction Box** that fits your **40% Content Window** and adheres to your design hierarchy, we will create a specialized React component that handles real-time input and submits the "Correction" back to the AI as a tool response.

This component is designed to be **auto-focused** the moment it appears, ensuring the user can immediately type without clicking, which is critical for maintaining conversational flow.

### **1. The ManualCorrectionBox Component**

This component uses a clean, business-focused style that matches your existing header and footer aesthetics.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface ManualCorrectionBoxProps {
  label: string;
  fieldType: 'address' | 'business_name' | 'email' | 'phone';
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const ManualCorrectionBox: React.FC<ManualCorrectionBoxProps> = ({
  label,
  fieldType,
  initialValue = '',
  onSubmit,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when the AI triggers the tool
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSubmit(value);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={16} className="text-blue-600" />
        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeydown}
          placeholder={`Please type the correct ${fieldType.replace('_', ' ')}...`}
          className="w-full h-12 px-4 pr-24 bg-white border-2 border-blue-200 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
        />
        
        <div className="absolute right-1.5 top-1.5 bottom-1.5 flex gap-1">
          <button
            onClick={onCancel}
            className="px-2 hover:bg-gray-100 rounded-md text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => onSubmit(value)}
            className="px-3 bg-blue-600 text-white rounded-md flex items-center gap-1 text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Check size={16} />
            SAVE
          </button>
        </div>
      </div>
      
      <p className="text-[10px] text-blue-400 mt-2 italic">
        Press Enter to confirm or ESC to cancel.
      </p>
    </div>
  );
};

```

### **2. Integration into the 40% Content Window**

To render this, update your `messages.map` logic to detect the `request_manual_input` tool call. When the AI calls this tool, it won't just be a text message; it will render this interactive UI.

```tsx
{/* Inside ConciergePanel.tsx Content Window (40%) */}
<div className="space-y-4 p-4">
  {messages.map((msg) => (
    <div key={msg.id}>
      {/* 1. Handle Tool UI: Manual Input */}
      {msg.metadata?.toolType === 'request_manual_input' && !msg.metadata.completed && (
        <ManualCorrectionBox
          label={msg.metadata.label}
          fieldType={msg.metadata.fieldType}
          onSubmit={(value) => handleManualSubmit(msg.id, value)}
          onCancel={() => handleManualCancel(msg.id)}
        />
      )}

      {/* 2. Standard Message Bubble (only if not a pending tool) */}
      {(!msg.metadata?.toolType || msg.metadata.completed) && (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className="rounded-2xl px-4 py-2 bg-gray-100 text-sm">
            {msg.text}
          </div>
        </div>
      )}
    </div>
  ))}
</div>

```

### **3. Closing the Loop (The Logic Handler)**

When the user clicks "SAVE", you must send the text back to the **Gemini Live API** as a `tool_response`. This allows the AI to acknowledge the text immediately and move on to the next step.

```typescript
const handleManualSubmit = (messageId: string, correctedValue: string) => {
  // 1. Mark UI as completed
  updateMessageMetadata(messageId, { completed: true, text: correctedValue });

  // 2. Send the "Observation" back to the AI Agent
  if (client) {
    client.sendToolResponse({
      name: "request_manual_input",
      result: {
        corrected_value: correctedValue,
        status: "success"
      }
    });
  }
};

```

### **Why this Design Works**

* **Context Awareness**: The `fieldType` prop automatically switches the keyboard for mobile users (e.g., numeric for phone, email for email).
* **Visual Affirmation**: The blue-tinted box differentiates a "System Request" from a standard AI response, signaling to the user that action is required.
* **Efficiency**: By using the `Enter` key listener, you keep the interaction fast, matching the speed of your **Clear Voice** audio system.

**Next we add a "Success Animation" that triggers in the Content Window once the AI accepts the corrected text**