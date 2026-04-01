/**
 * System Menu Authority Hook — L1 System Authority
 *
 * Resolves which L1 menu categories and L2 items an actor
 * is allowed to see based on their identity and role.
 *
 * Doctrine: Menu structure is registry-driven, not hardcoded.
 * The menu is a governed surface — PolicyDecision determines what renders.
 *
 * Route Authority:
 *   L1 categories are fixed (system authority)
 *   L2 items within categories are filtered by role
 */

import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Palette, Share2, User, Bot, BookOpen, Settings, LogOut,
  Maximize2, Image, Star, Shuffle, Globe, QrCode,
  MessageSquare, Phone, Clock, Shield, AudioLines,
  Sparkles, FileText, Terminal, Upload, Mic, ListChecks, Code, FolderOpen
} from 'lucide-react';

export type SystemMenuCategoryId =
  | 'canvas'
  | 'share'
  | 'session'
  | 'agent'
  | 'ai_tools'
  | 'developer'
  | 'files';

export interface SystemMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action: 'navigate' | 'toggle' | 'trigger' | 'sub_view';
  subViewKey?: string;
  requiresAuth: boolean;
  gated?: boolean;
}

export interface SystemMenuCategory {
  id: SystemMenuCategoryId;
  label: string;
  icon: LucideIcon;
  items: SystemMenuItem[];
}

interface UseSystemMenuAuthorityOptions {
  isAuthenticated: boolean;
  isOwner: boolean;
  hasAgents: boolean;
  hasKnowledge: boolean;
  websiteUrl?: string | null;
}

export function useSystemMenuAuthority({
  isAuthenticated,
  isOwner,
  hasAgents,
  hasKnowledge,
  websiteUrl,
}: UseSystemMenuAuthorityOptions): SystemMenuCategory[] {
  return useMemo(() => {
    const categories: SystemMenuCategory[] = [];

    // L1 Category: Canvas & Personalization
    const canvasItems: SystemMenuItem[] = [
      {
        id: 'canvas_backgrounds',
        label: 'Backgrounds',
        icon: Image,
        action: 'sub_view',
        subViewKey: 'canvas_backgrounds',
        requiresAuth: false,
      },
      {
        id: 'visualizer_studio',
        label: 'Visualizer Studio',
        icon: AudioLines,
        action: 'sub_view',
        subViewKey: 'visualizer_studio',
        requiresAuth: false,
      },
      {
        id: 'canvas_fullscreen',
        label: 'Fullscreen mode',
        icon: Maximize2,
        action: 'trigger',
        requiresAuth: false,
      },
    ];

    if (isAuthenticated) {
      canvasItems.push(
        {
          id: 'canvas_favorites',
          label: 'Saved backgrounds',
          icon: Star,
          action: 'sub_view',
          subViewKey: 'canvas_favorites',
          requiresAuth: true,
        },
        {
          id: 'canvas_random',
          label: 'Random background',
          icon: Shuffle,
          action: 'trigger',
          requiresAuth: false,
        },
      );
    }

    categories.push({
      id: 'canvas',
      label: 'Canvas',
      icon: Palette,
      items: canvasItems,
    });

    // L1 Category: Share & Connect
    const shareItems: SystemMenuItem[] = [
      {
        id: 'share_qr',
        label: 'QR Code',
        icon: QrCode,
        action: 'trigger',
        requiresAuth: false,
      },
      {
        id: 'share_link',
        label: 'Share link',
        icon: Share2,
        action: 'trigger',
        requiresAuth: false,
      },
    ];

    if (websiteUrl) {
      shareItems.push({
        id: 'share_website',
        label: 'Website',
        icon: Globe,
        action: 'trigger',
        requiresAuth: false,
      });
    }

    categories.push({
      id: 'share',
      label: 'Share',
      icon: Share2,
      items: shareItems,
    });

    // L1 Category: Session
    const sessionItems: SystemMenuItem[] = [
      {
        id: 'session_history',
        label: 'Conversation history',
        icon: Clock,
        action: 'sub_view',
        subViewKey: 'session_history',
        requiresAuth: true,
        gated: !isAuthenticated,
      },
    ];

    if (isAuthenticated) {
      sessionItems.push(
        {
          id: 'session_account',
          label: 'My account',
          icon: User,
          action: 'sub_view',
          subViewKey: 'session_account',
          requiresAuth: true,
        },
        {
          id: 'session_logout',
          label: 'Sign out',
          icon: LogOut,
          action: 'trigger',
          requiresAuth: true,
        },
      );
    }

    categories.push({
      id: 'session',
      label: 'Session',
      icon: Shield,
      items: sessionItems,
    });

    // L1 Category: Agent
    const agentItems: SystemMenuItem[] = [];

    if (hasAgents) {
      agentItems.push({
        id: 'agent_switch',
        label: 'Switch agent',
        icon: Bot,
        action: 'sub_view',
        subViewKey: 'agent_switch',
        requiresAuth: false,
      });
    }

    if (hasKnowledge) {
      agentItems.push({
        id: 'agent_knowledge',
        label: 'Knowledge base',
        icon: BookOpen,
        action: 'sub_view',
        subViewKey: 'agent_knowledge',
        requiresAuth: true,
        gated: !isAuthenticated,
      });
    }

    if (isOwner) {
      agentItems.push({
        id: 'agent_settings',
        label: 'Agent settings',
        icon: Settings,
        action: 'sub_view',
        subViewKey: 'agent_settings',
        requiresAuth: true,
      });
    }

    if (agentItems.length > 0) {
      categories.push({
        id: 'agent',
        label: 'Agent',
        icon: Bot,
        items: agentItems,
      });
    }

    // L1 Category: AI Tools — accessible to all users
    categories.push({
      id: 'ai_tools',
      label: 'AI Tools',
      icon: Sparkles,
      items: [
        {
          id: 'ai_transcription',
          label: 'Transcription',
          icon: Mic,
          action: 'sub_view',
          subViewKey: 'ai_transcription',
          requiresAuth: false,
        },
        {
          id: 'ai_document_generator',
          label: 'Generate document',
          icon: FileText,
          action: 'sub_view',
          subViewKey: 'ai_document_generator',
          requiresAuth: true,
          gated: !isAuthenticated,
        },
        {
          id: 'ai_voice_selector',
          label: 'Voice selector',
          icon: AudioLines,
          action: 'sub_view',
          subViewKey: 'ai_voice_selector',
          requiresAuth: false,
        },
        {
          id: 'ai_task_queue',
          label: 'Task queue',
          icon: ListChecks,
          action: 'sub_view',
          subViewKey: 'ai_task_queue',
          requiresAuth: true,
          gated: !isAuthenticated,
        },
      ],
    });

    // L1 Category: Developer Tools — owner only
    if (isOwner) {
      categories.push({
        id: 'developer',
        label: 'Developer',
        icon: Code,
        items: [
          {
            id: 'dev_terminal',
            label: 'Terminal',
            icon: Terminal,
            action: 'sub_view',
            subViewKey: 'dev_terminal',
            requiresAuth: true,
          },
          {
            id: 'dev_api_tester',
            label: 'API tester',
            icon: Globe,
            action: 'sub_view',
            subViewKey: 'dev_api_tester',
            requiresAuth: true,
          },
        ],
      });
    }

    // L1 Category: Files — authenticated users
    if (isAuthenticated) {
      categories.push({
        id: 'files',
        label: 'Files',
        icon: FolderOpen,
        items: [
          {
            id: 'files_upload',
            label: 'Upload files',
            icon: Upload,
            action: 'sub_view',
            subViewKey: 'files_upload',
            requiresAuth: true,
          },
          {
            id: 'files_browse',
            label: 'My files',
            icon: FolderOpen,
            action: 'sub_view',
            subViewKey: 'files_browse',
            requiresAuth: true,
          },
        ],
      });
    }

    return categories;
  }, [isAuthenticated, isOwner, hasAgents, hasKnowledge, websiteUrl]);
}
