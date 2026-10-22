/* ==========================================================================
   IKEDA AI Clinical Assistant — Interactive Chat Widget
   Floating popup with glassmorphism, typing indicators, quick-reply chips,
   and action buttons. Connects to /api/ai/chat backend.
   ========================================================================== */

(function () {
  'use strict';

  // ── Build DOM ──────────────────────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'ikeda-ai-widget';
  widget.innerHTML = `
    <button id="ai-fab" aria-label="Open IKEDA AI Assistant" title="IKEDA AI Assistant">
      <span class="ai-fab-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a7 7 0 0 1 7 7v1a7 7 0 0 1-14 0V9a7 7 0 0 1 7-7z"/>
          <circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="9.5" r="1" fill="currentColor" stroke="none"/>
          <path d="M9 14c.6 1 1.5 1.5 3 1.5s2.4-.5 3-1.5"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
        </svg>
      </span>
      <span class="ai-fab-pulse"></span>
    </button>

    <div id="ai-panel" class="ai-panel-hidden" role="dialog" aria-label="IKEDA AI Clinical Assistant">
      <div class="ai-panel-header">
        <div class="ai-panel-header-left">
          <div class="ai-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7v1a7 7 0 0 1-14 0V9a7 7 0 0 1 7-7z"/>
              <circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none"/>
              <circle cx="15" cy="9.5" r="1" fill="currentColor" stroke="none"/>
              <path d="M9 14c.6 1 1.5 1.5 3 1.5s2.4-.5 3-1.5"/>
            </svg>
          </div>
          <div>
            <strong class="ai-panel-title">IKEDA AI Assistant</strong>
            <span class="ai-panel-status"><span class="ai-status-dot"></span> Clinical Equipment Advisor</span>
          </div>
        </div>
        <button id="ai-close" aria-label="Close AI Assistant" title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div id="ai-messages" class="ai-messages"></div>

      <div id="ai-suggestions" class="ai-suggestions"></div>

      <form id="ai-form" class="ai-input-bar" autocomplete="off">
        <input id="ai-input" type="text" placeholder="Ask about equipment, prices, specs…" aria-label="Type your question" maxlength="300" />
        <button type="submit" id="ai-send" aria-label="Send message" title="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  `;

  // ── Inject into page ───────────────────────────────────────────────────
  document.body.appendChild(widget);

  const fab = document.getElementById('ai-fab');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-close');
  const messagesEl = document.getElementById('ai-messages');
  const suggestionsEl = document.getElementById('ai-suggestions');
  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');

  let isOpen = false;
  let isFirstOpen = true;

  // ── Toggle Panel ───────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.remove('ai-panel-hidden');
    panel.classList.add('ai-panel-visible');
    fab.classList.add('ai-fab-active');
    input.focus();

    if (isFirstOpen) {
      isFirstOpen = false;
      sendToAI('');  // trigger welcome message
    }
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('ai-panel-visible');
    panel.classList.add('ai-panel-hidden');
    fab.classList.remove('ai-fab-active');
  }

  fab.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

  // ── Render helpers ─────────────────────────────────────────────────────
  function scrollDown() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function addMessage(content, sender) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-msg ai-msg-' + sender;

    if (sender === 'bot') {
      // Parse markdown-lite bold **text**
      let html = content
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      bubble.innerHTML = '<div class="ai-msg-content">' + html + '</div>';
    } else {
      bubble.textContent = content;
    }

    messagesEl.appendChild(bubble);
    scrollDown();
    return bubble;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-bot ai-typing';
    el.innerHTML = '<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>';
    el.id = 'ai-typing-indicator';
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }

  function removeTyping() {
    const el = document.getElementById('ai-typing-indicator');
    if (el) el.remove();
  }

  function renderSuggestions(suggestions) {
    suggestionsEl.innerHTML = '';
    if (!suggestions || !suggestions.length) return;

    suggestions.forEach(text => {
      const chip = document.createElement('button');
      chip.className = 'ai-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        sendToAI(text);
      });
      suggestionsEl.appendChild(chip);
    });
  }

  function renderActions(actions) {
    if (!actions || !actions.length) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'ai-actions';

    actions.forEach(action => {
      const btn = document.createElement('a');
      btn.className = 'ai-action-btn';
      btn.textContent = action.label;
      btn.href = action.url;

      if (action.url.startsWith('http') || action.url.startsWith('tel:')) {
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
      }
      wrapper.appendChild(btn);
    });

    messagesEl.appendChild(wrapper);
    scrollDown();
  }

  // ── API Communication ──────────────────────────────────────────────────
  async function sendToAI(message) {
    if (message) {
      addMessage(message, 'user');
    }

    suggestionsEl.innerHTML = '';
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    const typing = showTyping();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
      });

      // Simulate a slight human delay (300-800ms)
      await new Promise(r => setTimeout(r, 350 + Math.random() * 450));

      removeTyping();

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();

      addMessage(data.reply || 'I apologize, I was unable to process that. Please try again.', 'bot');

      if (data.actions && data.actions.length) {
        renderActions(data.actions);
      }

      if (data.suggestions && data.suggestions.length) {
        renderSuggestions(data.suggestions);
      }
    } catch (err) {
      removeTyping();
      addMessage('I apologize for the interruption. Please try again or contact us directly at +250 795 360 359.', 'bot');
      renderSuggestions(['Request Quotation', '4K Laparoscopy', 'Contact Sales']);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // ── Form Submit ────────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    sendToAI(msg);
  });

})();
