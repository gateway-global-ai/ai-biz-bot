/**
 * Gateway Bot Matrix - Embed Script
 * Lightweight vanilla JS for injecting bots on any page
 * ~3KB minified + gzipped
 */

(function() {
  'use strict';

  const GATEWAY_API = window.GATEWAY_API_URL || 'https://api.gateway.ai';
  const GATEWAY_CDN = window.GATEWAY_CDN_URL || 'https://cdn.gateway.ai';

  // Get bot ID from script tag
  const currentScript = document.currentScript;
  const botId = currentScript?.dataset?.botId;

  if (!botId) {
    console.error('[Gateway Bot] No bot-id provided');
    return;
  }

  // State
  let config = null;
  let isOpen = false;
  let messages = [];
  let isLoading = false;

  // Create shadow DOM for style isolation
  function createShadowContainer() {
    const host = document.createElement('div');
    host.id = `gateway-bot-${botId}`;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      .gateway-widget {
        position: fixed;
        z-index: 2147483647;
      }
      .gateway-widget.bottom-right { bottom: 16px; right: 16px; }
      .gateway-widget.bottom-left { bottom: 16px; left: 16px; }
      .gateway-widget.top-right { top: 16px; right: 16px; }
      .gateway-widget.top-left { top: 16px; left: 16px; }
      
      .gateway-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .gateway-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(0,0,0,0.2);
      }
      .gateway-button:active {
        transform: scale(0.95);
      }
      
      .gateway-chat {
        position: absolute;
        bottom: 72px;
        right: 0;
        width: 360px;
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: gateway-slide-in 0.2s ease-out;
      }
      .gateway-widget.bottom-left .gateway-chat,
      .gateway-widget.top-left .gateway-chat {
        right: auto;
        left: 0;
      }
      .gateway-widget.top-right .gateway-chat,
      .gateway-widget.top-left .gateway-chat {
        bottom: auto;
        top: 72px;
      }
      
      @keyframes gateway-slide-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .gateway-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #e5e7eb;
      }
      .gateway-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 16px;
      }
      .gateway-info {
        flex: 1;
      }
      .gateway-name {
        font-weight: 600;
        font-size: 14px;
        color: #111827;
      }
      .gateway-status {
        font-size: 12px;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .gateway-status::before {
        content: '';
        width: 6px;
        height: 6px;
        background: #10b981;
        border-radius: 50%;
      }
      .gateway-close {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: background 0.2s;
      }
      .gateway-close:hover {
        background: #f3f4f6;
      }
      
      .gateway-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 300px;
        max-height: 400px;
      }
      .gateway-message {
        display: flex;
        gap: 8px;
        max-width: 85%;
      }
      .gateway-message.user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      .gateway-message-bubble {
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        word-break: break-word;
      }
      .gateway-message.assistant .gateway-message-bubble {
        background: #f3f4f6;
        color: #111827;
        border-bottom-left-radius: 4px;
      }
      .gateway-message.user .gateway-message-bubble {
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .gateway-typing {
        display: flex;
        gap: 4px;
        padding: 12px 14px;
        background: #f3f4f6;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        width: fit-content;
      }
      .gateway-typing-dot {
        width: 6px;
        height: 6px;
        background: #9ca3af;
        border-radius: 50%;
        animation: gateway-bounce 1.4s infinite ease-in-out both;
      }
      .gateway-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .gateway-typing-dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes gateway-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      .gateway-input-area {
        padding: 12px 16px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 8px;
      }
      .gateway-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #e5e7eb;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      .gateway-input:focus {
        border-color: var(--gateway-primary, #10b981);
      }
      .gateway-send {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
      }
      .gateway-send:hover {
        opacity: 0.9;
      }
      .gateway-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .gateway-empty {
        text-align: center;
        padding: 32px 16px;
        color: #9ca3af;
      }
      .gateway-empty-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 12px;
        opacity: 0.5;
      }
      
      @media (max-width: 480px) {
        .gateway-chat {
          position: fixed;
          bottom: 80px !important;
          right: 16px !important;
          left: 16px !important;
          width: auto !important;
          max-height: calc(100vh - 120px);
        }
        .gateway-widget.top-right .gateway-chat,
        .gateway-widget.top-left .gateway-chat {
          top: 16px !important;
          bottom: auto !important;
        }
      }
    `;
    shadow.appendChild(style);

    return { host, shadow };
  }

  // Fetch bot configuration
  async function fetchConfig() {
    try {
      const response = await fetch(`${GATEWAY_API}/page_bots/${botId}/public`);
      if (!response.ok) throw new Error('Failed to fetch config');
      config = await response.json();
      return config;
    } catch (error) {
      console.error('[Gateway Bot] Failed to load config:', error);
      // Fallback config
      config = {
        name: 'Bot',
        ui_config: {
          position: 'bottom-right',
          primaryColor: '#10b981',
          greetingMessage: 'Hello! How can I help you today?',
          placeholderText: 'Type a message...',
        },
      };
      return config;
    }
  }

  // Send message to API
  async function sendMessage(content) {
    if (!content.trim() || isLoading) return;

    // Add user message
    messages.push({ role: 'user', content, timestamp: Date.now() });
    isLoading = true;
    render();

    try {
      const response = await fetch(`${GATEWAY_API}/edge/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      
      messages.push({
        role: 'assistant',
        content: data.message || 'I apologize, but I\'m having trouble responding right now.',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[Gateway Bot] Chat error:', error);
      messages.push({
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble responding right now. Please try again later.',
        timestamp: Date.now(),
      });
    } finally {
      isLoading = false;
      render();
    }
  }

  // Render the widget
  function render(shadow) {
    const container = shadow.querySelector('.gateway-widget') || document.createElement('div');
    container.className = `gateway-widget ${config?.ui_config?.position || 'bottom-right'}`;
    container.innerHTML = '';

    if (!isOpen) {
      // Render button
      const button = document.createElement('button');
      button.className = 'gateway-button';
      button.style.backgroundColor = config?.ui_config?.primaryColor || '#10b981';
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;
      button.onclick = () => { isOpen = true; render(shadow); };
      container.appendChild(button);
    } else {
      // Render chat
      const chat = document.createElement('div');
      chat.className = 'gateway-chat';
      
      const primaryColor = config?.ui_config?.primaryColor || '#10b981';
      
      chat.innerHTML = `
        <div class="gateway-header">
          <div class="gateway-avatar" style="background-color: ${primaryColor}">
            ${(config?.name || 'B')[0].toUpperCase()}
          </div>
          <div class="gateway-info">
            <div class="gateway-name">${config?.name || 'Bot'}</div>
            <div class="gateway-status">Online</div>
          </div>
          <button class="gateway-close" onclick="this.closest('.gateway-chat').dispatchEvent(new CustomEvent('close'))">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="gateway-messages">
          ${messages.length === 0 ? `
            <div class="gateway-empty">
              <svg class="gateway-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
              </svg>
              <p>${config?.ui_config?.greetingMessage || 'How can I help you today?'}</p>
            </div>
          ` : messages.map(msg => `
            <div class="gateway-message ${msg.role}">
              <div class="gateway-message-bubble" style="${msg.role === 'user' ? `background-color: ${primaryColor}` : ''}">
                ${escapeHtml(msg.content)}
              </div>
            </div>
          `).join('')}
          ${isLoading ? `
            <div class="gateway-message assistant">
              <div class="gateway-typing">
                <span class="gateway-typing-dot"></span>
                <span class="gateway-typing-dot"></span>
                <span class="gateway-typing-dot"></span>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="gateway-input-area">
          <input 
            type="text" 
            class="gateway-input" 
            placeholder="${config?.ui_config?.placeholderText || 'Type a message...'}"
            onkeydown="if(event.key==='Enter'){this.nextElementSibling.click()}"
          />
          <button class="gateway-send" style="background-color: ${primaryColor}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      `;

      // Add event listeners
      chat.querySelector('.gateway-close').addEventListener('click', () => {
        isOpen = false;
        render(shadow);
      });

      const input = chat.querySelector('.gateway-input');
      const sendBtn = chat.querySelector('.gateway-send');
      
      sendBtn.addEventListener('click', () => {
        const content = input.value.trim();
        if (content) {
          input.value = '';
          sendMessage(content).then(() => render(shadow));
        }
      });

      container.appendChild(chat);
    }

    shadow.appendChild(container);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize
  async function init() {
    await fetchConfig();
    const { shadow } = createShadowContainer();
    render(shadow);
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
