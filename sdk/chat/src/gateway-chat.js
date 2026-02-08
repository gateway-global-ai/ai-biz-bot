/**
 * Gateway Global AI - Chat Widget SDK v1.0.0
 * 
 * Frontend-only embeddable chat widget that connects to the
 * Gateway Global AI platform APIs for AI-powered conversations.
 * 
 * Usage (script tag):
 *   <script src="https://your-gateway.com/sdk/gateway-chat.js" data-bot-id="xxx"></script>
 * 
 * Usage (programmatic):
 *   const widget = GatewayChat.init({ botId: 'xxx', apiBase: 'https://your-gateway.com' });
 *   widget.open();
 * 
 * @license MIT
 * @copyright Gateway Global AI
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // STYLES - Injected into Shadow DOM for full isolation
  // ---------------------------------------------------------------------------
  var CSS = `
    :host { all: initial; font-family: var(--gw-font, system-ui, -apple-system, sans-serif); }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Position classes */
    .gw-root { position: fixed; z-index: var(--gw-z, 2147483647); }
    .gw-root.bottom-right { bottom: 16px; right: 16px; }
    .gw-root.bottom-left  { bottom: 16px; left: 16px; }
    .gw-root.top-right    { top: 16px; right: 16px; }
    .gw-root.top-left     { top: 16px; left: 16px; }

    /* FAB button */
    .gw-fab {
      width: var(--gw-fab-size, 56px);
      height: var(--gw-fab-size, 56px);
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gw-primary, #2563eb);
      color: #fff;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .gw-fab:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(0,0,0,0.25); }
    .gw-fab:active { transform: scale(0.95); }
    .gw-fab svg { width: 24px; height: 24px; }

    /* Chat window */
    .gw-chat {
      position: absolute;
      width: var(--gw-width, 360px);
      max-width: calc(100vw - 32px);
      height: var(--gw-height, 500px);
      max-height: calc(100vh - 100px);
      background: #fff;
      border-radius: var(--gw-radius, 24px);
      box-shadow: 0 8px 48px rgba(0,0,0,0.20);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: gw-slide-in 0.25s ease-out;
    }
    .bottom-right .gw-chat, .bottom-left .gw-chat { bottom: calc(var(--gw-fab-size, 56px) + 16px); }
    .top-right .gw-chat, .top-left .gw-chat { top: calc(var(--gw-fab-size, 56px) + 16px); }
    .bottom-right .gw-chat, .top-right .gw-chat { right: 0; }
    .bottom-left .gw-chat, .top-left .gw-chat { left: 0; }

    @keyframes gw-slide-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .gw-header {
      padding: 14px 16px;
      background: var(--gw-header-bg, var(--gw-primary, #2563eb));
      color: var(--gw-header-text, #fff);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .gw-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      background: rgba(255,255,255,0.2);
      color: inherit;
      overflow: hidden;
    }
    .gw-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .gw-header-info { flex: 1; min-width: 0; }
    .gw-bot-name { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gw-bot-sub { font-size: 11px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
    .gw-bot-sub::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #34d399; flex-shrink: 0; }
    .gw-close {
      width: 28px; height: 28px;
      border: none;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: inherit;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .gw-close:hover { background: rgba(255,255,255,0.3); }
    .gw-close svg { width: 14px; height: 14px; }

    /* Messages area */
    .gw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--gw-chat-bg, #f8fafc);
      scrollbar-width: none;
    }
    .gw-messages::-webkit-scrollbar { display: none; }

    /* Message bubbles */
    .gw-msg { display: flex; max-width: 82%; }
    .gw-msg.user { align-self: flex-end; }
    .gw-msg.assistant { align-self: flex-start; }
    .gw-bubble {
      padding: 10px 16px;
      font-size: 14px;
      line-height: 1.55;
      word-break: break-word;
    }
    .gw-msg.user .gw-bubble {
      background: var(--gw-user-bubble, var(--gw-primary, #2563eb));
      color: var(--gw-user-text, #fff);
      border-radius: 18px 18px 4px 18px;
    }
    .gw-msg.assistant .gw-bubble {
      background: var(--gw-assist-bubble, #fff);
      color: var(--gw-assist-text, #1e293b);
      border-radius: 18px 18px 18px 4px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    /* Typing indicator */
    .gw-typing { display: flex; gap: 5px; align-items: center; padding: 12px 16px; }
    .gw-typing .gw-bubble { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px 18px 18px 4px; }
    .gw-dot {
      width: 7px; height: 7px;
      background: #94a3b8;
      border-radius: 50%;
      animation: gw-bounce 1.2s infinite;
    }
    .gw-dot:nth-child(2) { animation-delay: 0.15s; }
    .gw-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes gw-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* Voice visualizer */
    .gw-voice {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 20px;
      padding: 24px;
    }
    .gw-voice-orb-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
    .gw-voice-ring {
      position: absolute;
      border-radius: 50%;
      background: var(--gw-primary, #2563eb);
      opacity: 0.15;
      animation: gw-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    .gw-voice-pulse {
      position: absolute;
      border-radius: 50%;
      background: var(--gw-primary, #2563eb);
      opacity: 0.25;
      animation: gw-pulse-anim 2s ease-in-out infinite;
    }
    @keyframes gw-ping { 75%, 100% { transform: scale(1.6); opacity: 0; } }
    @keyframes gw-pulse-anim { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    .gw-voice-orb {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--gw-primary, #2563eb), color-mix(in srgb, var(--gw-primary, #2563eb), #000 25%));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px color-mix(in srgb, var(--gw-primary, #2563eb) 40%, transparent);
      transition: transform 0.15s ease;
      position: relative;
      z-index: 1;
    }
    .gw-voice-orb svg { width: 28px; height: 28px; color: #fff; }
    .gw-voice-status { font-size: 14px; font-weight: 600; color: #334155; }
    .gw-voice-hint { font-size: 12px; color: #94a3b8; }
    .gw-voice-bars {
      display: flex;
      gap: 3px;
      align-items: flex-end;
      height: 40px;
    }
    .gw-voice-bar {
      width: 4px;
      background: var(--gw-primary, #2563eb);
      border-radius: 2px;
      transition: height 0.1s ease;
      min-height: 3px;
    }
    .gw-voice-end {
      padding: 8px 24px;
      background: #ef4444;
      color: #fff;
      border: none;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .gw-voice-end:hover { background: #dc2626; }

    /* Footer / input area */
    .gw-footer {
      padding: 12px 14px;
      background: #fff;
      border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .gw-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .gw-input {
      flex: 1;
      padding: 10px 18px;
      background: #f1f5f9;
      border: none;
      border-radius: 999px;
      font-size: 14px;
      font-family: inherit;
      color: #1e293b;
      outline: none;
      transition: box-shadow 0.15s;
    }
    .gw-input:focus { box-shadow: 0 0 0 2px var(--gw-primary, #2563eb); background: #fff; }
    .gw-input::placeholder { color: #94a3b8; }
    .gw-input:disabled { opacity: 0.5; cursor: not-allowed; }
    .gw-btn {
      width: 38px; height: 38px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s, transform 0.15s;
    }
    .gw-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .gw-btn:active:not(:disabled) { transform: scale(0.92); }
    .gw-btn svg { width: 18px; height: 18px; }
    .gw-btn-send { background: var(--gw-primary, #2563eb); color: #fff; }
    .gw-btn-send:hover:not(:disabled) { opacity: 0.9; }
    .gw-btn-mic { background: #f1f5f9; color: #64748b; }
    .gw-btn-mic:hover { background: #e2e8f0; color: #334155; }
    .gw-btn-mic.active { background: #ef4444; color: #fff; }

    .gw-powered {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      padding: 4px 0 2px;
    }
    .gw-powered a { color: #64748b; text-decoration: none; }
    .gw-powered a:hover { text-decoration: underline; }

    /* Mobile fullscreen */
    @media (max-width: 480px) {
      .gw-chat {
        position: fixed;
        inset: 0;
        width: 100% !important;
        max-width: 100% !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
      }
    }
  `;

  // ---------------------------------------------------------------------------
  // SVG ICONS
  // ---------------------------------------------------------------------------
  var ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z"/><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z"/></svg>'
  };

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------
  function esc(text) {
    var el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
  }

  function applyTheme(host, theme) {
    if (!theme) return;
    var map = {
      primaryColor:         '--gw-primary',
      chatBackground:       '--gw-chat-bg',
      headerBackground:     '--gw-header-bg',
      headerText:           '--gw-header-text',
      userBubbleColor:      '--gw-user-bubble',
      userBubbleText:       '--gw-user-text',
      assistantBubbleColor: '--gw-assist-bubble',
      assistantBubbleText:  '--gw-assist-text',
      fontFamily:           '--gw-font',
      borderRadius:         '--gw-radius',
      fabSize:              '--gw-fab-size'
    };
    for (var key in map) {
      if (theme[key]) host.style.setProperty(map[key], theme[key]);
    }
  }

  // ---------------------------------------------------------------------------
  // WIDGET FACTORY
  // ---------------------------------------------------------------------------
  function createWidget(config) {
    var botId = config.botId;
    var apiBase = config.apiBase || '';
    var position = config.position || 'bottom-right';
    var isOpen = false;
    var isVoice = false;
    var messages = [];
    var loading = false;
    var voiceInterval = null;
    var voiceIntensity = 0;
    var serverConfig = null;

    // Create shadow DOM host
    var hostEl = document.createElement('div');
    hostEl.id = 'gateway-chat-' + botId;
    document.body.appendChild(hostEl);
    var shadow = hostEl.attachShadow({ mode: 'open' });

    // Inject styles
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);

    // Apply theme
    applyTheme(hostEl, config.theme);
    if (config.zIndex) hostEl.style.setProperty('--gw-z', String(config.zIndex));
    if (config.width)  hostEl.style.setProperty('--gw-width', config.width);
    if (config.height) hostEl.style.setProperty('--gw-height', config.height);

    // Root container
    var rootEl = document.createElement('div');
    rootEl.className = 'gw-root ' + position.replace('-', '-');
    // Fix position class
    var posMap = { 'bottom-right': 'bottom-right', 'bottom-left': 'bottom-left', 'top-right': 'top-right', 'top-left': 'top-left' };
    rootEl.className = 'gw-root ' + (posMap[position] || 'bottom-right');
    shadow.appendChild(rootEl);

    // ---------------------------------------------------------------------------
    // API CALLS (all frontend -> Gateway platform)
    // ---------------------------------------------------------------------------
    function fetchBotConfig() {
      return fetch(apiBase + '/api/bots/' + botId + '/public')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function (data) {
          serverConfig = data;
          return data;
        })
        .catch(function () {
          serverConfig = { name: 'Assistant', ui_config: {} };
          return serverConfig;
        });
    }

    function sendToAPI(text) {
      return fetch(apiBase + '/api/website-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          siteConfigId: botId,
          visitorId: 'sdk-' + botId + '-' + (sessionStorage.getItem('gw-vid') || (function () {
            var vid = Math.random().toString(36).slice(2);
            sessionStorage.setItem('gw-vid', vid);
            return vid;
          })()),
          history: messages.filter(function (m) { return m.role !== 'system'; }).slice(-10)
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) { return d.response || 'Sorry, I could not respond.'; })
        .catch(function () { return 'Sorry, something went wrong. Please try again.'; });
    }

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------
    function getBotName() {
      return config.botName || (serverConfig && serverConfig.name) || 'Assistant';
    }

    function getGreeting() {
      return config.greetingMessage
        || (serverConfig && serverConfig.ui_config && serverConfig.ui_config.greetingMessage)
        || 'Hello! How can I help you today?';
    }

    function getPlaceholder() {
      return config.placeholderText
        || (serverConfig && serverConfig.ui_config && serverConfig.ui_config.placeholderText)
        || 'Type a message...';
    }

    function render() {
      rootEl.innerHTML = '';

      if (!isOpen) {
        // FAB button
        var fab = document.createElement('button');
        fab.className = 'gw-fab';
        fab.innerHTML = ICONS.chat;
        fab.setAttribute('aria-label', 'Open chat');
        fab.onclick = function () { api.open(); };
        rootEl.appendChild(fab);
        return;
      }

      // Chat container
      var chat = document.createElement('div');
      chat.className = 'gw-chat';

      // Header
      var header = document.createElement('div');
      header.className = 'gw-header';

      var avatar = document.createElement('div');
      avatar.className = 'gw-avatar';
      if (config.botAvatar) {
        avatar.innerHTML = '<img src="' + esc(config.botAvatar) + '" alt="' + esc(getBotName()) + '">';
      } else {
        avatar.textContent = getBotName().charAt(0).toUpperCase();
      }

      var info = document.createElement('div');
      info.className = 'gw-header-info';
      info.innerHTML = '<div class="gw-bot-name">' + esc(getBotName()) + '</div>'
        + '<div class="gw-bot-sub">' + esc(config.headerSubtitle || 'Online') + '</div>';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'gw-close';
      closeBtn.innerHTML = ICONS.close;
      closeBtn.setAttribute('aria-label', 'Close chat');
      closeBtn.onclick = function () { api.close(); };

      header.appendChild(avatar);
      header.appendChild(info);
      header.appendChild(closeBtn);
      chat.appendChild(header);

      // Messages area
      var msgArea = document.createElement('div');
      msgArea.className = 'gw-messages';

      if (isVoice) {
        // Voice visualizer (inside chat body)
        var voiceDiv = document.createElement('div');
        voiceDiv.className = 'gw-voice';

        var orbWrap = document.createElement('div');
        orbWrap.className = 'gw-voice-orb-wrap';

        var ring = document.createElement('div');
        ring.className = 'gw-voice-ring';
        var ringSize = 80 + voiceIntensity * 0.8;
        ring.style.width = ringSize + 'px';
        ring.style.height = ringSize + 'px';

        var pulse = document.createElement('div');
        pulse.className = 'gw-voice-pulse';
        var pulseSize = 70 + voiceIntensity * 0.6;
        pulse.style.width = pulseSize + 'px';
        pulse.style.height = pulseSize + 'px';

        var orb = document.createElement('div');
        orb.className = 'gw-voice-orb';
        orb.style.transform = 'scale(' + (0.9 + (voiceIntensity / 100) * 0.3) + ')';
        orb.innerHTML = ICONS.mic;

        orbWrap.appendChild(ring);
        orbWrap.appendChild(pulse);
        orbWrap.appendChild(orb);
        voiceDiv.appendChild(orbWrap);

        var statusText = document.createElement('div');
        statusText.innerHTML = '<div class="gw-voice-status">' + esc(config.voice && config.voice.listeningText || 'Listening...') + '</div>'
          + '<div class="gw-voice-hint">Speak to the AI assistant</div>';
        voiceDiv.appendChild(statusText);

        // Frequency bars
        var barsDiv = document.createElement('div');
        barsDiv.className = 'gw-voice-bars';
        for (var b = 0; b < 20; b++) {
          var bar = document.createElement('div');
          bar.className = 'gw-voice-bar';
          var h = Math.max(3, Math.sin((b / 20) * Math.PI + voiceIntensity * 0.05) * voiceIntensity * 0.35 + Math.random() * 6);
          bar.style.height = h + 'px';
          bar.style.opacity = String(0.4 + (h / 40) * 0.6);
          barsDiv.appendChild(bar);
        }
        voiceDiv.appendChild(barsDiv);

        var endBtn = document.createElement('button');
        endBtn.className = 'gw-voice-end';
        endBtn.textContent = 'End Voice';
        endBtn.onclick = function () { api.setVoiceMode(false); };
        voiceDiv.appendChild(endBtn);

        msgArea.appendChild(voiceDiv);
      } else {
        // Chat messages
        var displayMsgs = messages.length > 0 ? messages : [{ role: 'assistant', content: getGreeting(), timestamp: Date.now() }];
        displayMsgs.forEach(function (msg) {
          if (msg.role === 'system') return;
          var row = document.createElement('div');
          row.className = 'gw-msg ' + msg.role;
          row.innerHTML = '<div class="gw-bubble">' + esc(msg.content) + '</div>';
          msgArea.appendChild(row);
        });

        if (loading) {
          var typingRow = document.createElement('div');
          typingRow.className = 'gw-msg assistant gw-typing';
          typingRow.innerHTML = '<div class="gw-bubble"><span class="gw-dot"></span><span class="gw-dot"></span><span class="gw-dot"></span></div>';
          msgArea.appendChild(typingRow);
        }
      }

      chat.appendChild(msgArea);

      // Footer
      var footer = document.createElement('div');
      footer.className = 'gw-footer';

      var inputRow = document.createElement('div');
      inputRow.className = 'gw-input-row';

      var input = document.createElement('input');
      input.className = 'gw-input';
      input.type = 'text';
      input.placeholder = getPlaceholder();
      input.disabled = loading || isVoice;

      // Mic button (if voice enabled)
      if (config.voice && config.voice.enabled) {
        var micBtn = document.createElement('button');
        micBtn.className = 'gw-btn gw-btn-mic' + (isVoice ? ' active' : '');
        micBtn.innerHTML = ICONS.mic;
        micBtn.setAttribute('aria-label', isVoice ? 'Stop voice' : 'Start voice');
        micBtn.onclick = function () { api.setVoiceMode(!isVoice); };
        inputRow.appendChild(input);
        inputRow.appendChild(micBtn);
      } else {
        inputRow.appendChild(input);
      }

      var sendBtn = document.createElement('button');
      sendBtn.className = 'gw-btn gw-btn-send';
      sendBtn.innerHTML = ICONS.send;
      sendBtn.disabled = loading || isVoice;
      sendBtn.setAttribute('aria-label', 'Send message');

      function doSend() {
        var text = input.value.trim();
        if (!text || loading || isVoice) return;
        input.value = '';
        api.sendMessage(text);
      }

      sendBtn.onclick = doSend;
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSend(); });
      inputRow.appendChild(sendBtn);

      footer.appendChild(inputRow);

      // Powered by
      var powered = document.createElement('div');
      powered.className = 'gw-powered';
      powered.innerHTML = 'Powered by <a href="https://gatewayglobal.ai" target="_blank" rel="noopener">Gateway Global AI</a>';
      footer.appendChild(powered);

      chat.appendChild(footer);
      rootEl.appendChild(chat);

      // Auto-scroll
      requestAnimationFrame(function () { msgArea.scrollTop = msgArea.scrollHeight; });
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    var api = {
      open: function () {
        isOpen = true;
        render();
        if (config.onOpen) config.onOpen();
      },

      close: function () {
        isOpen = false;
        if (isVoice) api.setVoiceMode(false);
        render();
        if (config.onClose) config.onClose();
      },

      toggle: function () {
        if (isOpen) api.close(); else api.open();
      },

      destroy: function () {
        if (isVoice) api.setVoiceMode(false);
        if (hostEl.parentNode) hostEl.parentNode.removeChild(hostEl);
      },

      sendMessage: function (text) {
        var msg = { role: 'user', content: text, timestamp: Date.now() };
        messages.push(msg);
        if (config.onMessage) config.onMessage(msg);
        loading = true;
        render();

        return sendToAPI(text).then(function (response) {
          var reply = { role: 'assistant', content: response, timestamp: Date.now() };
          messages.push(reply);
          loading = false;
          if (config.onMessage) config.onMessage(reply);
          render();
        });
      },

      getMessages: function () {
        return messages.slice();
      },

      setVoiceMode: function (enabled) {
        isVoice = enabled;
        if (enabled) {
          voiceInterval = setInterval(function () {
            voiceIntensity = Math.random() * 100;
            if (isOpen && isVoice) render();
          }, 180);
        } else {
          if (voiceInterval) { clearInterval(voiceInterval); voiceInterval = null; }
          voiceIntensity = 0;
        }
        render();
      },

      isOpen: function () { return isOpen; },
      isVoiceActive: function () { return isVoice; }
    };

    // Initialize
    fetchBotConfig().then(function (cfg) {
      // Apply server theme if no local theme provided
      if (!config.theme && cfg && cfg.ui_config) {
        if (cfg.ui_config.primaryColor) {
          hostEl.style.setProperty('--gw-primary', cfg.ui_config.primaryColor);
        }
        if (cfg.ui_config.position && !config.position) {
          var posMap2 = { 'bottom-right': 'bottom-right', 'bottom-left': 'bottom-left', 'top-right': 'top-right', 'top-left': 'top-left' };
          rootEl.className = 'gw-root ' + (posMap2[cfg.ui_config.position] || 'bottom-right');
        }
      }
      render();
      if (config.autoOpen) api.open();
    });

    return api;
  }

  // ---------------------------------------------------------------------------
  // GLOBAL API + AUTO-INIT
  // ---------------------------------------------------------------------------
  var GatewayChat = {
    init: function (config) {
      if (!config || !config.botId) {
        console.error('[GatewayChat] botId is required');
        return null;
      }
      return createWidget(config);
    }
  };

  // Auto-init from script tag: <script src="..." data-bot-id="xxx">
  var currentScript = document.currentScript;
  if (currentScript && currentScript.dataset.botId) {
    var autoConfig = {
      botId: currentScript.dataset.botId,
      apiBase: currentScript.dataset.apiBase || currentScript.src.replace(/\/sdk\/gateway-chat\.js.*$/, '').replace(/\/embed\.js.*$/, ''),
    };
    if (currentScript.dataset.position)   autoConfig.position = currentScript.dataset.position;
    if (currentScript.dataset.color)      autoConfig.theme = { primaryColor: currentScript.dataset.color };
    if (currentScript.dataset.greeting)   autoConfig.greetingMessage = currentScript.dataset.greeting;
    if (currentScript.dataset.botName)    autoConfig.botName = currentScript.dataset.botName;
    if (currentScript.dataset.voice === 'true') autoConfig.voice = { enabled: true };
    if (currentScript.dataset.autoOpen === 'true') autoConfig.autoOpen = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { GatewayChat.init(autoConfig); });
    } else {
      GatewayChat.init(autoConfig);
    }
  }

  // Export
  root.GatewayChat = GatewayChat;

})(typeof window !== 'undefined' ? window : this);
