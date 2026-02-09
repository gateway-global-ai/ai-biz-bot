# In-Chat Configuration with OTP - Implementation Guide

## Overview

The configuration panel is embedded directly in the chat window. Clicking the gear icon triggers an OTP authentication flow (mocked with "000000"), then switches the chat to an admin settings interface.

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Journey                             │
└─────────────────────────────────────────────────────────────┘

1. Customer opens chat widget (floating FAB or embedded)
2. Chat shows normal customer interface
3. User notices ⚙️ gear icon in header (if enableConfig: true)
4. Click gear → OTP prompt overlays the chat
5. Mock "Sending OTP to admin@example.com..." (2 sec delay)
6. Input field appears → Enter "000000"
7. Click "Verify" → Success!
8. Chat content switches to admin settings panel
9. User adjusts colors, size, position, voice, content
10. Click "Save & Apply" → Settings saved to localStorage
11. Click "Back to Chat" → Returns to customer view with new settings
```

## Visual States

### State 1: Customer View (Default)

```
┌─────────────────────────────────────┐
│ 🤖 AI Assistant    ⚙️  [✕]        │ ← Gear icon visible
├─────────────────────────────────────┤
│                                     │
│  💬 Hi! How can I help you today?  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ What's your business hours? │  │
│  └─────────────────────────────┘  │
│                                     │
│ 💬 We're open Mon-Fri 9am-5pm...   │
│                                     │
├─────────────────────────────────────┤
│ [Type a message...]        [🔊][→] │
└─────────────────────────────────────┘
```

### State 2: OTP Prompt Overlay

```
┌─────────────────────────────────────┐
│ 🤖 AI Assistant    ⚙️  [✕]        │
├─────────────────────────────────────┤
│  ╔═══════════════════════════════╗ │
│  ║  🔐 Admin Access Required     ║ │
│  ║                               ║ │
│  ║  Sending OTP to:              ║ │
│  ║  admin@example.com            ║ │
│  ║  ⏳ Please wait...            ║ │
│  ╚═══════════════════════════════╝ │
└─────────────────────────────────────┘

[After 2 seconds]

┌─────────────────────────────────────┐
│ 🤖 AI Assistant    ⚙️  [✕]        │
├─────────────────────────────────────┤
│  ╔═══════════════════════════════╗ │
│  ║  🔐 Admin Access Required     ║ │
│  ║                               ║ │
│  ║  An OTP code has been sent to ║ │
│  ║  admin@example.com            ║ │
│  ║                               ║ │
│  ║  Enter Code:                  ║ │
│  ║  ┌───────────────────────┐   ║ │
│  ║  │     [●●●●●●]          │   ║ │
│  ║  └───────────────────────┘   ║ │
│  ║                               ║ │
│  ║  [Verify]      [Cancel]      ║ │
│  ║                               ║ │
│  ║  💡 Dev hint: Use 000000     ║ │
│  ╚═══════════════════════════════╝ │
└─────────────────────────────────────┘
```

### State 3: Admin Settings Panel

```
┌─────────────────────────────────────┐
│ ⚙️ Settings    [← Back to Chat]    │
├─────────────────────────────────────┤
│                                     │
│ 🎨 Appearance                       │
│  Primary Color:                     │
│  [#6366f1] ⬤ [Pick Color]          │
│  ┌───────────────────────────────┐ │
│  │ [Live Preview]                │ │
│  │ 💬 Hello! How can I help?     │ │
│  └───────────────────────────────┘ │
│                                     │
│ 📏 Size & Position                  │
│  Width:  300px ────●──── 600px     │
│           ↑ (360px)                │
│  Height: 400px ────●──── 800px     │
│           ↑ (500px)                │
│  Mode: ◉ Floating  ○ Fixed         │
│  Location: [Bottom Right ▼]        │
│                                     │
│ 🎤 Voice Settings                   │
│  ☑ Enable Voice Input              │
│  Visualizer: [Bars ▼]              │
│               ○ Bars                │
│               ○ Orb                 │
│               ○ Waveform            │
│                                     │
│ 📝 Content Customization            │
│  Bot Name:                          │
│  [AI Assistant___________________] │
│  Greeting Message:                  │
│  ┌─────────────────────────────┐  │
│  │ Hi! How can I help you      │  │
│  │ today?                      │  │
│  └─────────────────────────────┘  │
│  Avatar URL:                        │
│  [https://example.com/avatar.png_]│
│                                     │
├─────────────────────────────────────┤
│ [Reset to Defaults]  [Save & Apply] │
└─────────────────────────────────────┘
```

### State 4: Return to Customer View (Settings Applied)

```
┌─────────────────────────────────────┐
│ 🤖 My Business Bot  ⚙️  [✕]       │ ← Updated name
├─────────────────────────────────────┤ ← Updated color
│                                     │
│  💬 Welcome! How can I assist you  │ ← Updated greeting
│     today?                          │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ What services do you offer? │  │
│  └─────────────────────────────┘  │
│                                     │
│ 💬 We offer web design and...      │
│                                     │
├─────────────────────────────────────┤
│ [Message...]   [🎤][→]             │ ← Voice enabled
└─────────────────────────────────────┘
```

## Code Implementation

### 1. Add Gear Icon to Header

```javascript
// In gateway-chat.js header rendering
function renderHeader() {
  var header = document.createElement('div');
  header.className = 'gw-header';
  
  // Avatar
  var avatar = document.createElement('div');
  avatar.className = 'gw-avatar';
  avatar.textContent = getBotName().charAt(0).toUpperCase();
  
  // Bot info
  var info = document.createElement('div');
  info.className = 'gw-header-info';
  info.innerHTML = '<div class="gw-bot-name">' + esc(getBotName()) + '</div>'
    + '<div class="gw-bot-sub">Online</div>';
  
  // NEW: Config button (if enabled)
  if (config.enableConfig) {
    var configBtn = document.createElement('button');
    configBtn.className = 'gw-config-btn';
    configBtn.innerHTML = ICONS.settings; // Add settings icon
    configBtn.setAttribute('aria-label', 'Settings');
    configBtn.onclick = function() { openConfigPanel(); };
    header.appendChild(configBtn);
  }
  
  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.className = 'gw-close';
  closeBtn.innerHTML = ICONS.close;
  closeBtn.onclick = function() { api.close(); };
  
  header.appendChild(avatar);
  header.appendChild(info);
  if (config.enableConfig) header.appendChild(configBtn);
  header.appendChild(closeBtn);
  
  return header;
}
```

### 2. Config Panel State Management

```javascript
// State variables
var currentView = 'customer'; // 'customer' | 'otp' | 'settings'
var isAdmin = false;
var otpSent = false;
var adminConfig = null;

// Open config panel
function openConfigPanel() {
  currentView = 'otp';
  otpSent = false;
  render();
  
  // Mock OTP sending delay
  setTimeout(function() {
    otpSent = true;
    render();
  }, 2000);
}

// Verify OTP
function verifyOTP(code) {
  if (code === '000000') {
    isAdmin = true;
    currentView = 'settings';
    adminConfig = JSON.parse(JSON.stringify(config)); // Clone config
    render();
  } else {
    alert('Invalid OTP code');
  }
}

// Back to customer view
function backToCustomer() {
  isAdmin = false;
  currentView = 'customer';
  render();
}

// Save settings
function saveSettings(newConfig) {
  // Update global config
  Object.assign(config, newConfig);
  
  // Save to localStorage
  try {
    localStorage.setItem('gw-config-' + config.botId, JSON.stringify(newConfig));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
  
  // Apply theme changes
  applyTheme(hostEl, config.theme);
  if (config.width) hostEl.style.setProperty('--gw-width', config.width);
  if (config.height) hostEl.style.setProperty('--gw-height', config.height);
  
  // Return to customer view
  backToCustomer();
}
```

### 3. Render OTP Overlay

```javascript
function renderOTPOverlay() {
  var overlay = document.createElement('div');
  overlay.className = 'gw-otp-overlay';
  
  var card = document.createElement('div');
  card.className = 'gw-otp-card';
  
  if (!otpSent) {
    // Sending state
    card.innerHTML = `
      <div class="gw-otp-icon">🔐</div>
      <h3 class="gw-otp-title">Admin Access Required</h3>
      <p class="gw-otp-text">Sending OTP to:<br/><strong>${config.configAuth?.email || 'admin@example.com'}</strong></p>
      <div class="gw-otp-spinner">
        <div class="gw-spinner"></div>
        <p>Please wait...</p>
      </div>
    `;
  } else {
    // OTP input state
    card.innerHTML = `
      <div class="gw-otp-icon">🔐</div>
      <h3 class="gw-otp-title">Admin Access Required</h3>
      <p class="gw-otp-text">An OTP code has been sent to:<br/><strong>${config.configAuth?.email || 'admin@example.com'}</strong></p>
      
      <div class="gw-otp-input-group">
        <label>Enter Code:</label>
        <input 
          type="text" 
          id="gw-otp-input"
          class="gw-otp-input"
          maxlength="6"
          placeholder="000000"
          autocomplete="off"
        />
      </div>
      
      <div class="gw-otp-actions">
        <button class="gw-btn gw-btn-secondary" id="gw-otp-cancel">Cancel</button>
        <button class="gw-btn gw-btn-primary" id="gw-otp-verify">Verify</button>
      </div>
      
      <p class="gw-otp-hint">💡 Dev hint: Use 000000</p>
    `;
    
    // Add event listeners
    setTimeout(function() {
      var input = shadow.getElementById('gw-otp-input');
      var verifyBtn = shadow.getElementById('gw-otp-verify');
      var cancelBtn = shadow.getElementById('gw-otp-cancel');
      
      input.focus();
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          verifyOTP(input.value.trim());
        }
      });
      
      verifyBtn.onclick = function() {
        verifyOTP(input.value.trim());
      };
      
      cancelBtn.onclick = function() {
        currentView = 'customer';
        render();
      };
    }, 0);
  }
  
  overlay.appendChild(card);
  return overlay;
}
```

### 4. Render Settings Panel

```javascript
function renderSettingsPanel() {
  var panel = document.createElement('div');
  panel.className = 'gw-settings-panel';
  
  // Header
  var header = document.createElement('div');
  header.className = 'gw-settings-header';
  header.innerHTML = `
    <h2>⚙️ Settings</h2>
    <button class="gw-btn gw-btn-text" id="gw-back-to-chat">← Back to Chat</button>
  `;
  
  // Content
  var content = document.createElement('div');
  content.className = 'gw-settings-content';
  content.innerHTML = `
    <div class="gw-settings-section">
      <h3>🎨 Appearance</h3>
      <div class="gw-setting-row">
        <label>Primary Color</label>
        <input type="color" id="gw-set-color" value="${adminConfig.theme?.primaryColor || '#6366f1'}"/>
      </div>
      <div class="gw-preview-box">
        <div class="gw-preview-message" id="gw-color-preview">Hello! How can I help?</div>
      </div>
    </div>
    
    <div class="gw-settings-section">
      <h3>📏 Size & Position</h3>
      <div class="gw-setting-row">
        <label>Width: <span id="gw-width-val">${adminConfig.width || '360px'}</span></label>
        <input type="range" id="gw-set-width" min="300" max="600" value="${parseInt(adminConfig.width) || 360}"/>
      </div>
      <div class="gw-setting-row">
        <label>Height: <span id="gw-height-val">${adminConfig.height || '500px'}</span></label>
        <input type="range" id="gw-set-height" min="400" max="800" value="${parseInt(adminConfig.height) || 500}"/>
      </div>
      <div class="gw-setting-row">
        <label>Mode</label>
        <div class="gw-radio-group">
          <label><input type="radio" name="mode" value="floating" ${adminConfig.position?.includes('right') || adminConfig.position?.includes('left') ? 'checked' : ''}/> Floating</label>
          <label><input type="radio" name="mode" value="fixed" ${!adminConfig.position || adminConfig.position === 'fixed' ? 'checked' : ''}/> Fixed</label>
        </div>
      </div>
      <div class="gw-setting-row">
        <label>Location</label>
        <select id="gw-set-position">
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="top-right">Top Right</option>
          <option value="top-left">Top Left</option>
        </select>
      </div>
    </div>
    
    <div class="gw-settings-section">
      <h3>🎤 Voice Settings</h3>
      <div class="gw-setting-row">
        <label><input type="checkbox" id="gw-set-voice" ${adminConfig.voice?.enabled ? 'checked' : ''}/> Enable Voice Input</label>
      </div>
      <div class="gw-setting-row">
        <label>Visualizer Style</label>
        <select id="gw-set-visualizer">
          <option value="bars">Bars</option>
          <option value="orb">Orb</option>
          <option value="waveform">Waveform</option>
        </select>
      </div>
    </div>
    
    <div class="gw-settings-section">
      <h3>📝 Content</h3>
      <div class="gw-setting-row">
        <label>Bot Name</label>
        <input type="text" id="gw-set-botname" value="${adminConfig.botName || 'AI Assistant'}"/>
      </div>
      <div class="gw-setting-row">
        <label>Greeting Message</label>
        <textarea id="gw-set-greeting" rows="3">${adminConfig.greetingMessage || 'Hi! How can I help you today?'}</textarea>
      </div>
      <div class="gw-setting-row">
        <label>Avatar URL</label>
        <input type="text" id="gw-set-avatar" value="${adminConfig.botAvatar || ''}" placeholder="https://..."/>
      </div>
    </div>
  `;
  
  // Footer
  var footer = document.createElement('div');
  footer.className = 'gw-settings-footer';
  footer.innerHTML = `
    <button class="gw-btn gw-btn-secondary" id="gw-reset">Reset to Defaults</button>
    <button class="gw-btn gw-btn-primary" id="gw-save">Save & Apply</button>
  `;
  
  panel.appendChild(header);
  panel.appendChild(content);
  panel.appendChild(footer);
  
  // Add event listeners
  setTimeout(function() {
    // Back button
    shadow.getElementById('gw-back-to-chat').onclick = backToCustomer;
    
    // Live preview for color
    shadow.getElementById('gw-set-color').addEventListener('input', function(e) {
      shadow.getElementById('gw-color-preview').style.background = e.target.value;
    });
    
    // Width slider
    shadow.getElementById('gw-set-width').addEventListener('input', function(e) {
      shadow.getElementById('gw-width-val').textContent = e.target.value + 'px';
    });
    
    // Height slider
    shadow.getElementById('gw-set-height').addEventListener('input', function(e) {
      shadow.getElementById('gw-height-val').textContent = e.target.value + 'px';
    });
    
    // Reset button
    shadow.getElementById('gw-reset').onclick = function() {
      if (confirm('Reset all settings to default values?')) {
        adminConfig = getDefaultConfig();
        currentView = 'settings';
        render();
      }
    };
    
    // Save button
    shadow.getElementById('gw-save').onclick = function() {
      var newConfig = {
        theme: {
          primaryColor: shadow.getElementById('gw-set-color').value
        },
        width: shadow.getElementById('gw-set-width').value + 'px',
        height: shadow.getElementById('gw-set-height').value + 'px',
        position: shadow.getElementById('gw-set-position').value,
        voice: {
          enabled: shadow.getElementById('gw-set-voice').checked,
          visualizerStyle: shadow.getElementById('gw-set-visualizer').value
        },
        botName: shadow.getElementById('gw-set-botname').value,
        greetingMessage: shadow.getElementById('gw-set-greeting').value,
        botAvatar: shadow.getElementById('gw-set-avatar').value
      };
      
      saveSettings(newConfig);
    };
  }, 0);
  
  return panel;
}
```

### 5. Update Main Render Function

```javascript
function render() {
  rootEl.innerHTML = '';
  
  if (!isOpen) {
    // FAB button
    var fab = document.createElement('button');
    fab.className = 'gw-fab';
    fab.innerHTML = ICONS.chat;
    fab.onclick = function() { api.open(); };
    rootEl.appendChild(fab);
    return;
  }
  
  // Chat container
  var chat = document.createElement('div');
  chat.className = 'gw-chat';
  
  // Header (always visible)
  chat.appendChild(renderHeader());
  
  // Content - depends on current view
  if (currentView === 'otp') {
    chat.appendChild(renderOTPOverlay());
  } else if (currentView === 'settings') {
    chat.appendChild(renderSettingsPanel());
  } else {
    // Customer view - normal chat
    chat.appendChild(renderMessages());
    chat.appendChild(renderFooter());
  }
  
  rootEl.appendChild(chat);
}
```

## CSS Additions

```css
/* Config button in header */
.gw-config-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}
.gw-config-btn:hover { background: rgba(255,255,255,0.2); }
.gw-config-btn svg { width: 14px; height: 14px; }

/* OTP Overlay */
.gw-otp-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
}
.gw-otp-card {
  background: #1e293b;
  border-radius: 16px;
  padding: 32px 24px;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.gw-otp-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.gw-otp-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
}
.gw-otp-text {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 20px;
  line-height: 1.5;
}
.gw-otp-input-group {
  margin-bottom: 20px;
}
.gw-otp-input-group label {
  display: block;
  font-size: 13px;
  color: #cbd5e1;
  margin-bottom: 8px;
  font-weight: 500;
}
.gw-otp-input {
  width: 100%;
  padding: 12px 16px;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 8px;
  color: #fff;
  font-size: 20px;
  text-align: center;
  letter-spacing: 8px;
  font-family: 'Courier New', monospace;
  outline: none;
  transition: border-color 0.2s;
}
.gw-otp-input:focus { border-color: #6366f1; }
.gw-otp-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.gw-otp-actions button {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.gw-otp-actions button:hover { opacity: 0.9; }
.gw-btn-primary {
  background: #6366f1;
  color: #fff;
  border: none;
}
.gw-btn-secondary {
  background: #334155;
  color: #cbd5e1;
  border: none;
}
.gw-otp-hint {
  font-size: 11px;
  color: #64748b;
  font-style: italic;
}
.gw-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #334155;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: gw-spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes gw-spin {
  to { transform: rotate(360deg); }
}

/* Settings Panel */
.gw-settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
}
.gw-settings-header {
  padding: 16px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.gw-settings-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
.gw-btn-text {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.15s;
}
.gw-btn-text:hover { background: rgba(99,102,241,0.1); }
.gw-settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.gw-settings-section {
  margin-bottom: 24px;
}
.gw-settings-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 12px;
}
.gw-setting-row {
  margin-bottom: 16px;
}
.gw-setting-row label {
  display: block;
  font-size: 13px;
  color: #cbd5e1;
  margin-bottom: 6px;
  font-weight: 500;
}
.gw-setting-row input[type="text"],
.gw-setting-row input[type="color"],
.gw-setting-row textarea,
.gw-setting-row select {
  width: 100%;
  padding: 8px 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.gw-setting-row input:focus,
.gw-setting-row textarea:focus,
.gw-setting-row select:focus {
  border-color: #6366f1;
}
.gw-setting-row input[type="range"] {
  width: 100%;
}
.gw-radio-group {
  display: flex;
  gap: 16px;
}
.gw-radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #cbd5e1;
}
.gw-preview-box {
  margin-top: 12px;
  padding: 12px;
  background: #1e293b;
  border-radius: 8px;
  border: 1px solid #334155;
}
.gw-preview-message {
  padding: 8px 14px;
  background: #6366f1;
  color: #fff;
  border-radius: 12px;
  font-size: 13px;
  display: inline-block;
  transition: background 0.3s;
}
.gw-settings-footer {
  padding: 16px 20px;
  background: #1e293b;
  border-top: 1px solid #334155;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.gw-settings-footer button {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.gw-settings-footer button:hover { opacity: 0.9; }
```

## Testing Checklist

- [ ] Gear icon appears in header when `enableConfig: true`
- [ ] Clicking gear shows OTP overlay
- [ ] Mock delay shows "Sending OTP..." for 2 seconds
- [ ] Input field appears after delay
- [ ] Entering "000000" grants access
- [ ] Invalid codes show error
- [ ] Settings panel displays all options
- [ ] Color picker updates live preview
- [ ] Sliders update dimension values
- [ ] Save button applies all changes
- [ ] Settings persist in localStorage
- [ ] Back to Chat returns to customer view
- [ ] Applied settings visible in customer view
- [ ] Cancel button exits OTP without changes

## Next Steps

1. Add settings icon SVG to ICONS constant
2. Implement localStorage persistence
3. Add CSS animations for transitions
4. Create live preview component
5. Add validation for settings
6. Test on mobile devices
7. Prepare for production OTP integration

This feature transforms the chat widget into a self-service configuration tool accessible to admins while keeping the customer experience clean and simple.
