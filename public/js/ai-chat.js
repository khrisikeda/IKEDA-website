/* ==========================================================================
   IKEDA Assistant — Interactive Chat Widget (English / Français)
   Floating chat with product cards, department quotation builder and a
   running "My inquiry" list that is compiled into a clear quotation request
   for WhatsApp or the contact form. Connects to /api/ai/chat.
   ========================================================================== */

(function () {
  'use strict';

  const WHATSAPP_DEFAULT = '250795360359';
  const STORE_KEY = 'ikeda_assistant_v4';

  // ── UI text ────────────────────────────────────────────────────────────
  const UI = {
    en: {
      open: 'Open IKEDA Assistant', title: 'IKEDA Assistant', status: 'Equipment advisor · EN / FR',
      placeholder: 'Ask about equipment, departments, quotes…', send: 'Send message', close: 'Close',
      myInquiry: 'My inquiry', viewSpecs: 'View specifications', openCatalog: 'Open in catalog',
      add: '＋ Add to inquiry', added: '✓ In inquiry', bestChoice: '⭐ Best match: ', alt: 'Note: ',
      inqTitle: 'Quotation request', inqBadge: 'Ready to send', inqEmpty: 'Your list is empty. Ask me about products, or add items from product cards.',
      products: 'Products', questions: 'Your questions', yourDetails: 'Your details (optional)',
      name: 'Name / title', facility: 'Hospital / clinic', location: 'City, country', preview: 'Message preview',
      sendWa: 'Send on WhatsApp', fillForm: 'Fill inquiry form', copy: 'Copy', copied: 'Copied ✓', qty: 'Qty',
      remove: 'Remove', decrease: 'Decrease quantity', increase: 'Increase quantity',
      error: 'Sorry, something went wrong. Please try again or contact us on WhatsApp at +250 795 360 359.',
      fallback: 'Sorry, I could not process that. Please try again.',
      rfqAccept: 'Yes, add these to my inquiry', rfqDecline: 'No thanks',
      rfqAdded: (n) => `Added ${n} items to your inquiry.`, rfqDeclined: 'No problem — you can review the list above anytime.',
      rfqPrompt: (d) => `Would you like me to add this recommended list for your ${d} to your quotation request?`
    },
    fr: {
      open: "Ouvrir l'assistant IKEDA", title: 'Assistant IKEDA', status: 'Conseiller équipements · FR / EN',
      placeholder: 'Équipements, services, devis…', send: 'Envoyer', close: 'Fermer',
      myInquiry: 'Ma demande', viewSpecs: 'Voir les caractéristiques', openCatalog: 'Voir dans le catalogue',
      add: '＋ Ajouter à la demande', added: '✓ Dans la demande', bestChoice: '⭐ Meilleur choix : ', alt: 'Note : ',
      inqTitle: 'Demande de devis', inqBadge: 'Prête à envoyer', inqEmpty: 'Votre liste est vide. Posez-moi vos questions sur les produits ou ajoutez des articles depuis les fiches.',
      products: 'Produits', questions: 'Vos questions', yourDetails: 'Vos coordonnées (facultatif)',
      name: 'Nom / fonction', facility: 'Hôpital / clinique', location: 'Ville, pays', preview: 'Aperçu du message',
      sendWa: 'Envoyer sur WhatsApp', fillForm: 'Remplir le formulaire', copy: 'Copier', copied: 'Copié ✓', qty: 'Qté',
      remove: 'Retirer', decrease: 'Diminuer la quantité', increase: 'Augmenter la quantité',
      error: 'Désolé, une erreur est survenue. Réessayez ou contactez-nous sur WhatsApp au +250 795 360 359.',
      fallback: "Désolé, je n'ai pas pu traiter votre message. Veuillez réessayer.",
      rfqAccept: 'Oui, ajouter à ma demande', rfqDecline: 'Non merci',
      rfqAdded: (n) => `${n} articles ajoutés à votre demande.`, rfqDeclined: 'Pas de souci — vous pouvez revoir la liste ci-dessus à tout moment.',
      rfqPrompt: (d) => `Voulez-vous que j'ajoute cette liste recommandée pour « ${d} » à votre demande de devis ?`
    }
  };

  // ── Persistent state (survives page changes within the visit) ─────────
  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  const saved = loadState() || {};
  const browserLang = ((navigator.language || 'en') + '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const state = {
    // The site's language switch (i18n.js) wins; otherwise the last chat language
    lang: (window.IKEDA_I18N && window.IKEDA_I18N.lang) || saved.lang || browserLang,
    inquiry: Array.isArray(saved.inquiry) ? saved.inquiry : [],   // [{ name, category, qty, source }]
    notes: Array.isArray(saved.notes) ? saved.notes : [],         // client questions
    details: saved.details || { name: '', facility: '', location: '' },
    project: saved.project || '',
    whatsapp: saved.whatsapp || WHATSAPP_DEFAULT
  };

  function saveState() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable */ }
  }

  const L = () => UI[state.lang] || UI.en;

  // ── Build DOM ──────────────────────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'ikeda-ai-widget';
  widget.innerHTML = `
    <button id="ai-fab" aria-expanded="false" aria-controls="ai-panel">
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

    <div id="ai-panel" class="ai-panel-hidden" role="dialog" aria-modal="false" aria-hidden="true">
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
            <strong class="ai-panel-title" id="ai-title"></strong>
            <span class="ai-panel-status"><span class="ai-status-dot"></span> <span id="ai-status"></span></span>
          </div>
        </div>
        <div class="ai-header-actions">
          <button type="button" id="ai-inq-chip" class="ai-inq-chip" hidden>
            <span aria-hidden="true">📋</span> <span id="ai-inq-chip-label"></span> <span id="ai-inq-count" class="ai-inq-count">0</span>
          </button>
          <button id="ai-close" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div id="ai-messages" class="ai-messages" aria-live="polite"></div>

      <form id="ai-form" class="ai-input-bar" autocomplete="off">
        <input id="ai-input" type="text" maxlength="400" />
        <button type="submit" id="ai-send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(widget);

  const fab = document.getElementById('ai-fab');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-close');
  const messagesEl = document.getElementById('ai-messages');
  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');
  const inqChip = document.getElementById('ai-inq-chip');

  let isOpen = false;
  let isFirstOpen = true;
  let recentProducts = [];
  let conversationHistory = [];
  let activeProcurementSession = null;
  let consultationContext = { active: false, facilityType: '', specialty: '', tier: '', items: [] };

  function applyLanguage() {
    const t = L();
    fab.setAttribute('aria-label', t.open);
    fab.title = t.open;
    panel.setAttribute('aria-label', t.title);
    document.getElementById('ai-title').textContent = t.title;
    document.getElementById('ai-status').textContent = t.status;
    document.getElementById('ai-inq-chip-label').textContent = t.myInquiry;
    closeBtn.setAttribute('aria-label', t.close);
    closeBtn.title = t.close;
    input.placeholder = t.placeholder;
    input.setAttribute('aria-label', t.placeholder);
    sendBtn.setAttribute('aria-label', t.send);
    sendBtn.title = t.send;
  }

  function updateInquiryChip() {
    const count = state.inquiry.length + state.notes.length;
    inqChip.hidden = count === 0;
    document.getElementById('ai-inq-count').textContent = String(state.inquiry.length || count);
  }

  applyLanguage();
  updateInquiryChip();

  // Follow the site's EN / FR switch
  window.addEventListener('ikeda:langchange', (e) => {
    const next = e.detail && e.detail.lang;
    if (!UI[next] || next === state.lang) return;
    state.lang = next;
    saveState();
    applyLanguage();
    syncProductButtons();
    // If the visitor hasn't asked anything yet, redo the welcome in the new language
    if (!isFirstOpen && !conversationHistory.some((m) => m.role === 'user')) {
      messagesEl.innerHTML = '';
      conversationHistory = [];
      sendToAI('');
    }
  });

  // ── Toggle Panel ───────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.remove('ai-panel-hidden');
    panel.classList.add('ai-panel-visible');
    fab.classList.add('ai-fab-active');
    fab.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    input.focus();

    if (isFirstOpen) {
      isFirstOpen = false;
      sendToAI(''); // welcome message
    }
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('ai-panel-visible');
    panel.classList.add('ai-panel-hidden');
    fab.classList.remove('ai-fab-active');
    fab.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  fab.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
  closeBtn.addEventListener('click', closePanel);
  inqChip.addEventListener('click', () => renderInquiryCard());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

  // ── Render helpers ─────────────────────────────────────────────────────
  function scrollDown() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatInline(str) {
    if (!str) return '';
    return escapeHtml(str)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let inTable = false;
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<div class="ai-table-wrap"><table class="ai-table">';
          inTable = true;
        }
        const cells = line.trim().split('|').slice(1, -1).map((c) => c.trim());
        if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
        const isHeader = !html.includes('<tbody>') && (i === 0 || !lines[i - 1].trim().startsWith('|') || /^:?-+:?$/.test((lines[i + 1] || '').trim().split('|').slice(1, -1)[0]));
        html += '<tr>';
        cells.forEach((cell) => {
          const formatted = formatInline(cell);
          html += isHeader ? `<th>${formatted}</th>` : `<td>${formatted}</td>`;
        });
        html += '</tr>';
        continue;
      } else if (inTable) {
        html += '</table></div>';
        inTable = false;
      }

      // Headings
      if (line.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h4 class="ai-h4">${formatInline(line.slice(4))}</h4>`;
        continue;
      }
      if (line.startsWith('#### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h5 class="ai-h5">${formatInline(line.slice(5))}</h5>`;
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<blockquote class="ai-quote">${formatInline(line.slice(2))}</blockquote>`;
        continue;
      }

      // Horizontal Divider
      if (/^(---|\*\*\*|___)$/.test(line.trim())) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<hr class="ai-hr" />';
        continue;
      }

      // Bullet Lists
      if (/^[•\-*]\s+/.test(line.trim())) {
        if (!inList) {
          html += '<ul class="ai-list">';
          inList = true;
        }
        const itemContent = line.trim().replace(/^[•\-*]\s+/, '');
        html += `<li>${formatInline(itemContent)}</li>`;
        continue;
      } else if (inList && line.trim() === '') {
        html += '</ul>';
        inList = false;
      }

      // Paragraphs
      if (line.trim()) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="ai-p">${formatInline(line)}</p>`;
      }
    }

    if (inTable) html += '</table></div>';
    if (inList) html += '</ul>';
    return html;
  }

  function addMessage(content, sender) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-msg ai-msg-' + sender;

    if (sender === 'bot') {
      const body = document.createElement('div');
      body.className = 'ai-msg-content';
      body.innerHTML = formatMarkdown(content);
      bubble.appendChild(body);
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

  function renderActions(actions) {
    if (!actions || !actions.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-actions';

    actions.forEach((action) => {
      let url;
      try {
        url = new URL(action.url, window.location.origin);
      } catch (e) {
        return;
      }
      if (!['http:', 'https:', 'tel:'].includes(url.protocol)) return;
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

  function renderSuggestions(suggestions) {
    if (!Array.isArray(suggestions) || !suggestions.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-suggestions';
    suggestions.forEach((text) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ai-suggestion-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        wrapper.remove();
        sendToAI(text);
      });
      wrapper.appendChild(chip);
    });
    messagesEl.appendChild(wrapper);
    scrollDown();
  }

  // ── Inquiry list ───────────────────────────────────────────────────────
  function inquiryKey(name) {
    return String(name || '').trim().toLowerCase();
  }

  function isInInquiry(name) {
    return state.inquiry.some((it) => inquiryKey(it.name) === inquiryKey(name));
  }

  function addToInquiry(item, source) {
    if (!item || !item.name) return;
    const existing = state.inquiry.find((it) => inquiryKey(it.name) === inquiryKey(item.name));
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    if (existing) {
      if (qty > existing.qty) existing.qty = qty;
    } else {
      state.inquiry.push({ name: item.name, category: item.category || '', qty, source: source || 'asked' });
    }
    saveState();
    updateInquiryChip();
  }

  function removeFromInquiry(name) {
    state.inquiry = state.inquiry.filter((it) => inquiryKey(it.name) !== inquiryKey(name));
    saveState();
    updateInquiryChip();
  }

  function addNote(text) {
    const note = String(text || '').trim();
    if (!note) return;
    if (state.notes.some((n) => n.toLowerCase() === note.toLowerCase())) return;
    state.notes.push(note);
    if (state.notes.length > 8) state.notes.shift();
    saveState();
    updateInquiryChip();
  }

  function buildInquiryLetter() {
    const fr = state.lang === 'fr';
    const lines = [];
    lines.push(fr ? 'Bonjour IKEDA Endoscopy Africa,' : 'Hello IKEDA Endoscopy Africa,');
    lines.push('');
    if (state.inquiry.length) {
      lines.push(fr ? 'Je souhaite recevoir un devis pour :' : 'I would like to request a quotation for:');
      state.inquiry.forEach((it, i) => {
        lines.push(`${i + 1}. ${it.name} — ${fr ? 'Qté :' : 'Qty:'} ${it.qty}`);
      });
    } else {
      lines.push(fr ? 'Je souhaite obtenir des informations et un devis.' : 'I would like some information and a quotation.');
    }
    if (state.project) {
      lines.push('');
      lines.push(`${fr ? 'Projet / service :' : 'Project / department:'} ${state.project}`);
    }
    if (state.notes.length) {
      lines.push('');
      lines.push(fr ? 'Mes questions :' : 'My questions:');
      state.notes.forEach((n) => lines.push(`• ${n}`));
    }
    lines.push('');
    lines.push(fr
      ? 'Merci de joindre les caractéristiques techniques, la garantie et les conditions de livraison et d’installation.'
      : 'Please include specifications, warranty, and delivery & installation terms.');
    const d = state.details || {};
    if (d.name || d.facility || d.location) {
      lines.push('');
      if (d.name) lines.push(`${fr ? 'Nom' : 'Name'}: ${d.name}`);
      if (d.facility) lines.push(`${fr ? 'Établissement' : 'Facility'}: ${d.facility}`);
      if (d.location) lines.push(`${fr ? 'Localisation' : 'Location'}: ${d.location}`);
    }
    lines.push('');
    lines.push(fr ? 'Merci.' : 'Thank you.');
    return lines.join('\n');
  }

  function renderInquiryCard() {
    const t = L();
    const card = document.createElement('div');
    card.className = 'ai-rfq-card ai-inq-card';

    const header = document.createElement('div');
    header.className = 'ai-rfq-header';
    header.innerHTML = `
      <div class="ai-rfq-title-wrap">
        <span class="ai-rfq-dept-badge">${escapeHtml(t.inqBadge)}</span>
        <strong class="ai-rfq-title">${escapeHtml(t.inqTitle)}</strong>
      </div>`;
    card.appendChild(header);

    const body = document.createElement('div');
    card.appendChild(body);

    const preview = document.createElement('textarea');
    preview.className = 'ai-inq-preview';
    preview.rows = 8;
    preview.setAttribute('aria-label', t.preview);
    let previewEdited = false;
    preview.addEventListener('input', () => { previewEdited = true; });

    function refreshPreview() {
      if (!previewEdited) preview.value = buildInquiryLetter();
    }

    function renderBody() {
      body.innerHTML = '';

      // Products
      const prodTitle = document.createElement('div');
      prodTitle.className = 'ai-rfq-category-title';
      prodTitle.textContent = `${t.products} (${state.inquiry.length})`;
      body.appendChild(prodTitle);

      if (!state.inquiry.length) {
        const empty = document.createElement('p');
        empty.className = 'ai-inq-empty';
        empty.textContent = t.inqEmpty;
        body.appendChild(empty);
      }

      state.inquiry.forEach((it) => {
        const row = document.createElement('div');
        row.className = 'ai-rfq-item-row';
        const info = document.createElement('div');
        info.className = 'ai-rfq-item-info';
        const nameEl = document.createElement('span');
        nameEl.className = 'ai-rfq-item-name';
        nameEl.textContent = it.name;
        info.appendChild(nameEl);
        if (it.category) {
          const cat = document.createElement('div');
          cat.className = 'ai-rfq-item-specs';
          cat.textContent = it.category;
          info.appendChild(cat);
        }

        const controls = document.createElement('div');
        controls.className = 'ai-rfq-qty-stepper';
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.className = 'ai-rfq-qty-btn';
        minus.textContent = '−';
        minus.title = t.decrease;
        minus.setAttribute('aria-label', `${t.decrease}: ${it.name}`);
        const val = document.createElement('span');
        val.className = 'ai-rfq-qty-val';
        val.textContent = it.qty;
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'ai-rfq-qty-btn';
        plus.textContent = '+';
        plus.title = t.increase;
        plus.setAttribute('aria-label', `${t.increase}: ${it.name}`);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'ai-rfq-remove-btn';
        del.textContent = '×';
        del.title = t.remove;
        del.setAttribute('aria-label', `${t.remove}: ${it.name}`);

        minus.addEventListener('click', () => {
          if (it.qty > 1) { it.qty -= 1; val.textContent = it.qty; saveState(); refreshPreview(); }
        });
        plus.addEventListener('click', () => {
          it.qty += 1; val.textContent = it.qty; saveState(); refreshPreview();
        });
        del.addEventListener('click', () => {
          removeFromInquiry(it.name); syncProductButtons(); renderBody(); refreshPreview();
        });

        controls.append(minus, val, plus, del);
        row.append(info, controls);
        body.appendChild(row);
      });

      // Questions
      if (state.notes.length) {
        const qTitle = document.createElement('div');
        qTitle.className = 'ai-rfq-category-title ai-inq-section';
        qTitle.textContent = t.questions;
        body.appendChild(qTitle);
        state.notes.forEach((n, idx) => {
          const row = document.createElement('div');
          row.className = 'ai-inq-note-row';
          const txt = document.createElement('span');
          txt.textContent = n;
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'ai-rfq-remove-btn';
          del.textContent = '×';
          del.title = t.remove;
          del.setAttribute('aria-label', `${t.remove}: ${n}`);
          del.addEventListener('click', () => {
            state.notes.splice(idx, 1); saveState(); updateInquiryChip(); renderBody(); refreshPreview();
          });
          row.append(txt, del);
          body.appendChild(row);
        });
      }

      // Contact details
      const dTitle = document.createElement('div');
      dTitle.className = 'ai-rfq-category-title ai-inq-section';
      dTitle.textContent = t.yourDetails;
      body.appendChild(dTitle);
      const fields = document.createElement('div');
      fields.className = 'ai-inq-fields';
      [['name', t.name], ['facility', t.facility], ['location', t.location]].forEach(([key, label]) => {
        const field = document.createElement('input');
        field.type = 'text';
        field.className = 'ai-inq-input';
        field.placeholder = label;
        field.setAttribute('aria-label', label);
        field.maxLength = 120;
        field.value = (state.details && state.details[key]) || '';
        field.addEventListener('input', () => {
          state.details[key] = field.value;
          saveState();
          refreshPreview();
        });
        fields.appendChild(field);
      });
      body.appendChild(fields);

      // Preview
      const pTitle = document.createElement('div');
      pTitle.className = 'ai-rfq-category-title ai-inq-section';
      pTitle.textContent = t.preview;
      body.appendChild(pTitle);
      body.appendChild(preview);
    }

    renderBody();
    refreshPreview();

    // Send buttons
    const buttons = document.createElement('div');
    buttons.className = 'ai-inq-buttons';

    const waBtn = document.createElement('button');
    waBtn.type = 'button';
    waBtn.className = 'ai-rfq-btn-accept ai-inq-wa';
    waBtn.textContent = t.sendWa;
    waBtn.addEventListener('click', () => {
      const url = `https://wa.me/${state.whatsapp || WHATSAPP_DEFAULT}?text=${encodeURIComponent(preview.value)}`;
      window.open(url, '_blank', 'noopener');
    });

    const formBtn = document.createElement('button');
    formBtn.type = 'button';
    formBtn.className = 'ai-rfq-btn-accept';
    formBtn.textContent = t.fillForm;
    formBtn.addEventListener('click', () => {
      const payload = { formattedMessage: preview.value };
      if (state.project) payload.department = state.project;
      if (typeof window.populateContactFormWithRfq === 'function') {
        window.populateContactFormWithRfq(payload);
        closePanel();
      } else {
        try {
          sessionStorage.setItem('ikeda_rfq_payload', JSON.stringify(payload));
        } catch (e) { /* storage unavailable */ }
        window.location.href = '/contact?rfq=ai';
      }
    });

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'ai-rfq-btn-decline';
    copyBtn.textContent = t.copy;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(preview.value);
      } catch (e) {
        preview.select();
        document.execCommand('copy');
      }
      copyBtn.textContent = t.copied;
      setTimeout(() => { copyBtn.textContent = t.copy; }, 1800);
    });

    buttons.append(waBtn, formBtn, copyBtn);
    card.appendChild(buttons);
    messagesEl.appendChild(card);
    scrollDown();
  }

  // Keep "Add to inquiry" buttons in sync after removals
  function syncProductButtons() {
    const t = L();
    messagesEl.querySelectorAll('.ai-add-btn').forEach((btn) => {
      const added = isInInquiry(btn.dataset.name);
      btn.textContent = added ? t.added : t.add;
      btn.classList.toggle('is-added', added);
      btn.setAttribute('aria-pressed', added ? 'true' : 'false');
    });
  }

  function renderProducts(products) {
    if (!Array.isArray(products) || !products.length) return;
    const t = L();

    products.forEach((product) => {
      const card = document.createElement('article');
      card.className = product.isRecommended ? 'ai-product-card ai-product-card-recommended' : 'ai-product-card';

      if (product.isRecommended && product.recommendationBadge) {
        const badge = document.createElement('div');
        badge.className = 'ai-product-badge-recommended';
        badge.textContent = product.recommendationBadge;
        card.appendChild(badge);
      }

      if (product.image) {
        try {
          const imageUrl = new URL(product.image, window.location.origin);
          if (imageUrl.origin === window.location.origin) {
            const image = document.createElement('img');
            image.className = 'ai-product-image';
            image.src = imageUrl.href;
            image.alt = product.name || '';
            image.loading = 'lazy';
            image.addEventListener('error', () => image.remove());
            card.appendChild(image);
          }
        } catch (e) { /* bad image url */ }
      }

      const details = document.createElement('div');
      details.className = 'ai-product-details';
      const title = document.createElement('strong');
      title.className = 'ai-product-title';
      title.textContent = product.name || '';
      details.appendChild(title);

      const categoryLabel = [product.category, product.subtitle].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
      if (categoryLabel) {
        const category = document.createElement('span');
        category.className = 'ai-product-category';
        category.textContent = categoryLabel;
        details.appendChild(category);
      }

      if (product.recommendationReason) {
        const reasonBox = document.createElement('div');
        reasonBox.className = product.isRecommended ? 'ai-product-reason ai-product-reason-recommended' : 'ai-product-reason';
        reasonBox.textContent = product.recommendationReason;
        details.appendChild(reasonBox);
      }

      const specification = document.createElement('details');
      specification.className = 'ai-product-specs';
      const summary = document.createElement('summary');
      summary.textContent = t.viewSpecs;
      specification.appendChild(summary);
      if (Array.isArray(product.features) && product.features.length) {
        const featureList = document.createElement('ul');
        product.features.forEach((feature) => {
          const li = document.createElement('li');
          li.textContent = String(feature).replace(/^►\s*/, '');
          featureList.appendChild(li);
        });
        specification.appendChild(featureList);
      } else if (product.specification) {
        const specText = document.createElement('p');
        specText.textContent = product.specification;
        specification.appendChild(specText);
      }
      details.appendChild(specification);

      // Catalog deep link
      const params = new URLSearchParams();
      if (product.name) params.set('product', product.name);
      if (product.slug) params.set('cat', product.slug);
      if (typeof product.itemIdx === 'number') params.set('idx', product.itemIdx);
      if (product.name) params.set('search', product.name);
      const catalogHref = `/products?${params.toString()}`;

      function goToCatalog(e) {
        const onProductsPage = window.location.pathname.replace(/\.html$/, '').endsWith('/products');
        if (onProductsPage && typeof window.openCatalogProduct === 'function') {
          if (e) e.preventDefault();
          closePanel();
          window.openCatalogProduct({ name: product.name, catSlug: product.slug, itemIdx: product.itemIdx });
          return true;
        }
        return false;
      }

      title.style.cursor = 'pointer';
      title.title = t.openCatalog;
      title.addEventListener('click', (e) => {
        if (!goToCatalog(e)) window.location.href = catalogHref;
      });

      const linkRow = document.createElement('div');
      linkRow.className = 'ai-product-link-row';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'ai-add-btn';
      addBtn.dataset.name = product.name;
      addBtn.addEventListener('click', () => {
        if (isInInquiry(product.name)) removeFromInquiry(product.name);
        else addToInquiry(product, 'asked');
        syncProductButtons();
      });

      const catalogLink = document.createElement('a');
      catalogLink.className = 'ai-product-link';
      catalogLink.href = catalogHref;
      catalogLink.textContent = t.openCatalog;
      catalogLink.addEventListener('click', (e) => goToCatalog(e));

      linkRow.append(addBtn, catalogLink);
      details.appendChild(linkRow);
      card.appendChild(details);
      messagesEl.appendChild(card);
    });

    syncProductButtons();
    scrollDown();
  }

  // ── Department quotation builder card (from the procurement engine) ────
  function renderProcurementCard(rfqPayload) {
    if (!rfqPayload || !Array.isArray(rfqPayload.items)) return;
    const t = L();

    const card = document.createElement('div');
    card.className = 'ai-rfq-card';
    const items = rfqPayload.items.map((it) => ({ ...it, qty: it.qty || 1 }));
    const completeness = { ...(rfqPayload.completeness || {}) };

    const header = document.createElement('div');
    header.className = 'ai-rfq-header';
    header.innerHTML = `
      <div class="ai-rfq-title-wrap">
        <span class="ai-rfq-dept-badge">${state.lang === 'fr' ? 'Liste recommandée' : 'Recommended list'}</span>
        <strong class="ai-rfq-title">${escapeHtml(rfqPayload.department)}</strong>
      </div>
      ${completeness.score != null ? `<div class="ai-rfq-badge"><span class="ai-rfq-score-num">${escapeHtml(completeness.score)}%</span> ${state.lang === 'fr' ? 'Complétude' : 'Readiness'}</div>` : ''}
    `;
    card.appendChild(header);

    if (Array.isArray(completeness.coveredDomains) && completeness.coveredDomains.length) {
      const audit = document.createElement('details');
      audit.className = 'ai-rfq-details';
      const s = document.createElement('summary');
      s.textContent = `📊 ${state.lang === 'fr' ? 'Analyse de complétude' : 'Completeness check'} (${completeness.status || ''})`;
      audit.appendChild(s);
      const content = document.createElement('div');
      content.className = 'ai-rfq-audit-body';
      let html = `<div class="ai-rfq-audit-sec"><strong>${state.lang === 'fr' ? 'Domaines couverts' : 'Covered areas'}:</strong><ul>`;
      completeness.coveredDomains.forEach((d) => { html += `<li>✓ ${escapeHtml(d)}</li>`; });
      html += '</ul></div>';
      if (Array.isArray(completeness.gaps) && completeness.gaps.length) {
        html += `<div class="ai-rfq-audit-sec ai-rfq-gaps-sec"><strong>${state.lang === 'fr' ? 'Éléments manquants' : 'Gaps to consider'}:</strong><ul>`;
        completeness.gaps.forEach((g) => {
          html += `<li>⚠️ <strong>${escapeHtml(g.item)}</strong> (${escapeHtml(g.domain)}): ${escapeHtml(g.clinicalNecessity)}</li>`;
        });
        html += '</ul></div>';
      }
      content.innerHTML = html;
      audit.appendChild(content);
      card.appendChild(audit);
    }

    const list = document.createElement('div');
    list.className = 'ai-rfq-items-list';

    function renderItems() {
      list.innerHTML = '';
      const groups = [
        ['equipment', '🏥 ' + (state.lang === 'fr' ? 'Équipements' : 'Equipment')],
        ['instruments', '✂️ Instruments'],
        ['accessories', '🔌 ' + (state.lang === 'fr' ? 'Accessoires' : 'Accessories')],
        ['consumables', '📦 ' + (state.lang === 'fr' ? 'Consommables' : 'Consumables')]
      ];
      groups.forEach(([key, label]) => {
        const groupItems = items.filter((i) => (i.category || 'equipment') === key);
        if (!groupItems.length) return;
        const block = document.createElement('div');
        block.className = 'ai-rfq-category-block';
        const bt = document.createElement('div');
        bt.className = 'ai-rfq-category-title';
        bt.textContent = `${label} (${groupItems.length})`;
        block.appendChild(bt);

        groupItems.forEach((it) => {
          const row = document.createElement('div');
          row.className = 'ai-rfq-item-row';
          const info = document.createElement('div');
          info.className = 'ai-rfq-item-info';
          const top = document.createElement('div');
          top.className = 'ai-rfq-item-top';
          const nm = document.createElement('span');
          nm.className = 'ai-rfq-item-name';
          nm.textContent = it.name;
          top.appendChild(nm);
          info.appendChild(top);
          if (it.specs) {
            const sp = document.createElement('div');
            sp.className = 'ai-rfq-item-specs';
            sp.textContent = it.specs.length > 110 ? it.specs.slice(0, 110) + '…' : it.specs;
            info.appendChild(sp);
          }

          const controls = document.createElement('div');
          controls.className = 'ai-rfq-qty-stepper';
          const minus = document.createElement('button');
          minus.type = 'button'; minus.className = 'ai-rfq-qty-btn'; minus.textContent = '−'; minus.title = t.decrease;
          const val = document.createElement('span');
          val.className = 'ai-rfq-qty-val'; val.textContent = it.qty;
          const plus = document.createElement('button');
          plus.type = 'button'; plus.className = 'ai-rfq-qty-btn'; plus.textContent = '+'; plus.title = t.increase;
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'ai-rfq-remove-btn'; del.textContent = '×'; del.title = t.remove;
          minus.addEventListener('click', () => { if (it.qty > 1) { it.qty -= 1; val.textContent = it.qty; sync(); } });
          plus.addEventListener('click', () => { it.qty += 1; val.textContent = it.qty; sync(); });
          del.addEventListener('click', () => { items.splice(items.indexOf(it), 1); sync(); renderItems(); });
          controls.append(minus, val, plus, del);
          row.append(info, controls);
          block.appendChild(row);
        });
        list.appendChild(block);
      });
    }

    function sync() {
      if (activeProcurementSession) activeProcurementSession.items = items;
    }

    renderItems();
    card.appendChild(list);

    const promptBox = document.createElement('div');
    promptBox.className = 'ai-rfq-permission-box';
    const promptText = document.createElement('div');
    promptText.className = 'ai-rfq-prompt-text';
    promptText.textContent = t.rfqPrompt(rfqPayload.department);
    const acts = document.createElement('div');
    acts.className = 'ai-rfq-prompt-actions';
    const accept = document.createElement('button');
    accept.type = 'button'; accept.className = 'ai-rfq-btn-accept'; accept.textContent = t.rfqAccept;
    const decline = document.createElement('button');
    decline.type = 'button'; decline.className = 'ai-rfq-btn-decline'; decline.textContent = t.rfqDecline;
    acts.append(accept, decline);
    promptBox.append(promptText, acts);

    accept.addEventListener('click', () => {
      addProcurementItems({ ...rfqPayload, items });
      if (activeProcurementSession) {
        activeProcurementSession.items = items;
        activeProcurementSession.stage = 'populated_form';
        activeProcurementSession.pendingPermissionPrompt = false;
      }
      promptBox.innerHTML = '';
      const ok = document.createElement('div');
      ok.className = 'ai-rfq-success-msg';
      ok.textContent = '✓ ' + t.rfqAdded(items.length);
      promptBox.appendChild(ok);
      renderInquiryCard();
    });

    decline.addEventListener('click', () => {
      promptBox.innerHTML = '';
      const note = document.createElement('div');
      note.className = 'ai-rfq-muted-note';
      note.textContent = t.rfqDeclined;
      promptBox.appendChild(note);
    });

    card.appendChild(promptBox);
    messagesEl.appendChild(card);
    scrollDown();
  }

  function addProcurementItems(rfq) {
    if (!rfq || !Array.isArray(rfq.items)) return;
    rfq.items.forEach((it) => addToInquiry({ name: it.name, category: rfq.department, qty: it.qty || 1 }, 'recommended'));
    if (rfq.department) {
      state.project = rfq.department;
      saveState();
    }
    syncProductButtons();
  }

  // ── API Communication ──────────────────────────────────────────────────
  async function sendToAI(message) {
    if (message) {
      addMessage(message, 'user');
      conversationHistory.push({ role: 'user', content: message });
      if (conversationHistory.length > 12) conversationHistory.shift();
    }

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: {
            lang: state.lang,
            history: conversationHistory,
            procurementSession: activeProcurementSession,
            products: recentProducts,
            allRequestedProducts: state.inquiry.map((it) => it.name),
            consultation: consultationContext,
            inquiryCount: state.inquiry.length + state.notes.length
          }
        })
      });

      removeTyping();
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();

      if (data.lang && data.lang !== state.lang) {
        state.lang = data.lang;
        saveState();
        applyLanguage();
      }
      if (data.whatsapp) {
        state.whatsapp = String(data.whatsapp).replace(/[^0-9]/g, '') || WHATSAPP_DEFAULT;
        saveState();
      }
      if (data.procurementSession) activeProcurementSession = data.procurementSession;
      if (data.reply) {
        conversationHistory.push({ role: 'bot', content: data.reply });
        if (conversationHistory.length > 12) conversationHistory.shift();
      }
      if (data.consultation) {
        consultationContext = { ...consultationContext, ...data.consultation };
        if (consultationContext.specialty && !state.project) {
          state.project = String(consultationContext.specialty);
          saveState();
        }
      }
      if (data.inquiryNote) addNote(data.inquiryNote);

      addMessage(data.reply || L().fallback, 'bot');

      if (data.action === 'compile_inquiry') {
        (data.addToInquiry || []).forEach((p) => addToInquiry(p, 'asked'));
        if (state.inquiry.length || state.notes.length) renderInquiryCard();
      } else if (data.action === 'fill_form' && data.rfqPayload) {
        // The client agreed to the recommended department list: merge it into
        // the inquiry so everything is sent together.
        addProcurementItems(data.rfqPayload);
        renderInquiryCard();
      } else if (data.rfqPayload) {
        renderProcurementCard(data.rfqPayload);
        recentProducts = data.rfqPayload.items.map((p) => p.name).filter(Boolean);
      } else if (Array.isArray(data.products) && data.products.length) {
        // Recommended products are added automatically; others via "Add to inquiry"
        data.products.filter((p) => p.isRecommended).forEach((p) => addToInquiry(p, 'recommended'));
        renderProducts(data.products);
        recentProducts = data.products.map((p) => p.name).filter(Boolean);
      }

      if (Array.isArray(data.actions) && data.actions.length) renderActions(data.actions);
      if (Array.isArray(data.suggestions) && data.suggestions.length) renderSuggestions(data.suggestions);
    } catch (err) {
      removeTyping();
      addMessage(L().error, 'bot');
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    sendToAI(msg);
  });
})();
