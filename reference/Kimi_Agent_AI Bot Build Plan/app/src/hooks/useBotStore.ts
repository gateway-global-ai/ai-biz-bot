import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PageBot, BotTemplate, BotMessage } from '@/types';
import { botTemplates } from '@/data/templates';

interface BotStore {
  // Templates
  templates: BotTemplate[];
  
  // Deployed bots
  deployedBots: PageBot[];
  
  // Current editing state
  selectedTemplate: BotTemplate | null;
  editingBot: PageBot | null;
  isDeploying: boolean;
  
  // Chat state
  chatMessages: BotMessage[];
  isChatOpen: boolean;
  isStreaming: boolean;
  
  // Admin bar state
  isAdminBarVisible: boolean;
  isDrawerOpen: boolean;
  
  // Actions
  selectTemplate: (template: BotTemplate | null) => void;
  deployBot: (templateId: string, pageId: string) => Promise<PageBot>;
  updateBot: (botId: string, updates: Partial<PageBot>) => void;
  deleteBot: (botId: string) => void;
  toggleBotActive: (botId: string) => void;
  
  // Chat actions
  sendMessage: (content: string) => void;
  clearChat: () => void;
  toggleChat: () => void;
  
  // UI actions
  toggleAdminBar: () => void;
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
  
  // Wizard
  createCustomBot: (config: Partial<PageBot>) => PageBot;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createBotFromTemplate = (template: BotTemplate, pageId: string): PageBot => ({
  id: `bot-${generateId()}`,
  page_id: pageId,
  name: template.name,
  system_prompt: template.default_system_prompt,
  model_provider: template.default_model,
  model_name: template.default_model === 'openai' ? 'gpt-4' : template.default_model === 'anthropic' ? 'claude-3-sonnet' : 'kimi-k2',
  tools_config: template.default_tools,
  ui_config: {
    interface: 'chat',
    position: 'bottom-right',
    ...template.default_ui_config,
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const useBotStore = create<BotStore>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: botTemplates,
      deployedBots: [],
      selectedTemplate: null,
      editingBot: null,
      isDeploying: false,
      chatMessages: [],
      isChatOpen: false,
      isStreaming: false,
      isAdminBarVisible: false,
      isDrawerOpen: false,

      // Actions
      selectTemplate: (template) => {
        set({ selectedTemplate: template });
      },

      deployBot: async (templateId, pageId) => {
        set({ isDeploying: true });
        
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) {
          throw new Error('Template not found');
        }

        const newBot = createBotFromTemplate(template, pageId);
        
        set((state) => ({
          deployedBots: [...state.deployedBots, newBot],
          isDeploying: false,
          isDrawerOpen: false,
        }));

        return newBot;
      },

      updateBot: (botId, updates) => {
        set((state) => ({
          deployedBots: state.deployedBots.map((bot) =>
            bot.id === botId
              ? { ...bot, ...updates, updated_at: new Date().toISOString() }
              : bot
          ),
        }));
      },

      deleteBot: (botId) => {
        set((state) => ({
          deployedBots: state.deployedBots.filter((bot) => bot.id !== botId),
        }));
      },

      toggleBotActive: (botId) => {
        set((state) => ({
          deployedBots: state.deployedBots.map((bot) =>
            bot.id === botId ? { ...bot, is_active: !bot.is_active } : bot
          ),
        }));
      },

      // Chat actions
      sendMessage: (content) => {
        const userMessage: BotMessage = {
          id: `msg-${generateId()}`,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          chatMessages: [...state.chatMessages, userMessage],
          isStreaming: true,
        }));

        // Simulate AI response
        setTimeout(() => {
          const responses = [
            "I understand! Let me help you with that. Could you provide a bit more detail?",
            "That's a great question. Based on what you've shared, I'd recommend...",
            "I can definitely assist with that. Here's what I suggest...",
            "Thanks for reaching out! Let me look into this for you.",
            "Absolutely! This is exactly what I'm here for. Let's work through this together.",
          ];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];

          const assistantMessage: BotMessage = {
            id: `msg-${generateId()}`,
            role: 'assistant',
            content: randomResponse,
            timestamp: new Date().toISOString(),
          };

          set((state) => ({
            chatMessages: [...state.chatMessages, assistantMessage],
            isStreaming: false,
          }));
        }, 1500);
      },

      clearChat: () => {
        set({ chatMessages: [] });
      },

      toggleChat: () => {
        set((state) => ({ isChatOpen: !state.isChatOpen }));
      },

      // UI actions
      toggleAdminBar: () => {
        set((state) => ({ isAdminBarVisible: !state.isAdminBarVisible }));
      },

      toggleDrawer: () => {
        set((state) => ({ isDrawerOpen: !state.isDrawerOpen }));
      },

      setDrawerOpen: (open) => {
        set({ isDrawerOpen: open });
      },

      // Wizard
      createCustomBot: (config) => {
        const newBot: PageBot = {
          id: `bot-${generateId()}`,
          page_id: config.page_id || 'page-default',
          name: config.name || 'Custom Bot',
          system_prompt: config.system_prompt || 'You are a helpful AI assistant.',
          model_provider: config.model_provider || 'openai',
          model_name: config.model_name || 'gpt-4',
          tools_config: config.tools_config || {},
          ui_config: {
            interface: 'chat',
            position: 'bottom-right',
            ...config.ui_config,
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          deployedBots: [...state.deployedBots, newBot],
        }));

        return newBot;
      },
    }),
    {
      name: 'gateway-bot-storage',
      partialize: (state) => ({
        deployedBots: state.deployedBots,
        isAdminBarVisible: state.isAdminBarVisible,
      }),
    }
  )
);
