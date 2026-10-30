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
    <button id="ai-fab" aria-label="Open IKEDA AI Assistant" aria-expanded="false" aria-controls="ai-panel" title="Ask IKEDA for product help">
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

    <div id="ai-panel" class="ai-panel-hidden" role="dialog" aria-label="IKEDA AI Clinical Assistant" aria-modal="false" aria-hidden="true">
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
  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');

  let isOpen = false;
  let isFirstOpen = true;
  let recentProducts = [];
  let allRequestedProducts = [];
  let conversationHistory = [];
  let activeProcurementSession = null;
  let consultationContext = {
    active: false,
    facilityType: '',
    specialty: '',
    tier: '',
    items: []
  };

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
      sendToAI('');  // trigger welcome message
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

  function formatInline(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
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
        const cells = line.trim().split('|').slice(1, -1).map(c => c.trim());
        if (cells.every(c => /^:?-+:?$/.test(c))) {
          continue;
        }
        const isHeader = !html.includes('<tbody>') && (i === 0 || !lines[i-1].trim().startsWith('|') || /^:?-+:?$/.test((lines[i+1] || '').trim().split('|').slice(1, -1)[0]));
        html += '<tr>';
        cells.forEach(cell => {
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
      if (/^---|\*\*\*|___$/.test(line.trim())) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<hr class="ai-hr" />';
        continue;
      }

      // Bullet Lists
      if (/^[•\-\*]\s+/.test(line.trim())) {
        if (!inList) {
          html += '<ul class="ai-list">';
          inList = true;
        }
        const itemContent = line.trim().replace(/^[•\-\*]\s+/, '');
        html += `<li>${formatInline(itemContent)}</li>`;
        continue;
      } else if (inList && line.trim() === '') {
        html += '</ul>';
        inList = false;
      }

      // Normal text paragraphs
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

    actions.forEach(action => {
      const btn = document.createElement('a');
      btn.className = 'ai-action-btn';
      btn.textContent = action.label;
      const url = new URL(action.url, window.location.origin);
      if (!['http:', 'https:', 'tel:'].includes(url.protocol)) return;
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

  function renderProducts(products) {
    if (!Array.isArray(products) || !products.length) return;

    products.forEach(product => {
      const card = document.createElement('article');
      card.className = product.isRecommended ? 'ai-product-card ai-product-card-recommended' : 'ai-product-card';

      // Recommendation badge for top pick
      if (product.isRecommended) {
        const badge = document.createElement('div');
        badge.className = 'ai-product-badge-recommended';
        badge.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          <span>${product.recommendationBadge || 'Top Recommendation'}</span>
        `;
        card.appendChild(badge);
      }

      if (product.image) {
        const imageUrl = new URL(product.image, window.location.origin);
        if (imageUrl.origin === window.location.origin) {
          const image = document.createElement('img');
          image.className = 'ai-product-image';
          image.src = imageUrl.href;
          image.alt = product.name || 'Catalog product';
          image.loading = 'lazy';
          image.addEventListener('error', () => image.remove());
          card.appendChild(image);
        }
      }

      const details = document.createElement('div');
      details.className = 'ai-product-details';
      const title = document.createElement('strong');
      title.className = 'ai-product-title';
      title.textContent = product.name || 'Catalog product';
      details.appendChild(title);

      const categoryLabel = [product.category, product.subtitle].filter(Boolean).join(' · ');
      if (categoryLabel) {
        const category = document.createElement('span');
        category.className = 'ai-product-category';
        category.textContent = categoryLabel;
        details.appendChild(category);
      }

      // Recommendation rationale callout
      if (product.recommendationReason) {
        const reasonBox = document.createElement('div');
        reasonBox.className = product.isRecommended ? 'ai-product-reason ai-product-reason-recommended' : 'ai-product-reason';
        const reasonLabel = document.createElement('strong');
        reasonLabel.textContent = product.isRecommended ? '⭐ Clinical Choice: ' : 'Comparison: ';
        reasonBox.appendChild(reasonLabel);
        reasonBox.appendChild(document.createTextNode(product.recommendationReason));
        details.appendChild(reasonBox);
      }

      const specification = document.createElement('details');
      specification.className = 'ai-product-specs';
      const summary = document.createElement('summary');
      summary.textContent = 'View specifications';
      specification.appendChild(summary);

      const specificationText = product.specification || (Array.isArray(product.features) ? product.features.join('\n') : '');
      if (specificationText) {
        const specText = document.createElement('p');
        specText.textContent = specificationText;
        specification.appendChild(specText);
      }
      if (Array.isArray(product.features) && product.features.length) {
        const featureList = document.createElement('ul');
        product.features.forEach(feature => {
          const featureItem = document.createElement('li');
          featureItem.textContent = feature;
          featureList.appendChild(featureItem);
        });
        specification.appendChild(featureList);
      }
      details.appendChild(specification);

      // Build deep-link parameters for exact product targeting in catalog
      const catalogParams = new URLSearchParams();
      if (product.name) catalogParams.set('product', product.name);
      if (product.slug) catalogParams.set('cat', product.slug);
      if (typeof product.itemIdx === 'number') catalogParams.set('idx', product.itemIdx);
      if (product.name) catalogParams.set('search', product.name);
      const targetCatalogHref = `/products?${catalogParams.toString()}`;

      function navigateToCatalogProduct(e) {
        const isProductsPage = window.location.pathname.replace(/\.html$/, '').endsWith('/products');
        if (isProductsPage && typeof window.openCatalogProduct === 'function') {
          if (e) e.preventDefault();
          closePanel();
          window.openCatalogProduct({
            name: product.name,
            catSlug: product.slug,
            itemIdx: product.itemIdx
          });
          return true;
        }
        return false;
      }

      title.style.cursor = 'pointer';
      title.title = 'View in catalog';
      title.addEventListener('click', (e) => {
        if (!navigateToCatalogProduct(e)) {
          window.location.href = targetCatalogHref;
        }
      });

      const catalogLink = document.createElement('a');
      catalogLink.className = 'ai-product-link';
      catalogLink.href = targetCatalogHref;
      catalogLink.textContent = 'Open in catalog';
      catalogLink.setAttribute('aria-label', `Open ${product.name || 'product'} in catalog`);
      catalogLink.addEventListener('click', (e) => {
        navigateToCatalogProduct(e);
      });
      details.appendChild(catalogLink);
      card.appendChild(details);
      messagesEl.appendChild(card);
    });

    scrollDown();
  }

  // ── Render Intelligent Procurement Quotation Card ──────────────────────
  function renderProcurementCard(rfqPayload, permissionPrompt) {
    if (!rfqPayload || !Array.isArray(rfqPayload.items)) return;

    const card = document.createElement('div');
    card.className = 'ai-rfq-card';

    // State for interactive items and quantity adjustments
    const items = rfqPayload.items.map(it => ({ ...it, qty: it.qty || 1 }));
    let completeness = { ...rfqPayload.completeness };

    function buildFormattedMessage() {
      let msg = `Hello IKEDA Team,\n\nI would like to request an official proforma quotation, technical specification datasheets, and delivery terms for our ${rfqPayload.department}.\n\n`;
      msg += `📋 REQUESTED DEPARTMENT EQUIPMENT LIST:\n\n`;

      const cats = {
        equipment: items.filter(i => i.category === 'equipment'),
        instruments: items.filter(i => i.category === 'instruments'),
        accessories: items.filter(i => i.category === 'accessories'),
        consumables: items.filter(i => i.category === 'consumables')
      };

      if (cats.equipment.length) {
        msg += `🏥 CAPITAL MEDICAL EQUIPMENT:\n`;
        cats.equipment.forEach((it, idx) => {
          msg += `${idx + 1}. ${it.name} (${it.manufacturer || 'OEM'}) — Qty: ${it.qty} unit(s) [${(it.importance || 'Essential').toUpperCase()}]\n   • Specs: ${it.specs || 'Standard OEM specifications'}\n`;
        });
        msg += `\n`;
      }
      if (cats.instruments.length) {
        msg += `✂️ SURGICAL & CLINICAL INSTRUMENTS:\n`;
        cats.instruments.forEach((it, idx) => {
          msg += `${idx + 1}. ${it.name} (${it.manufacturer || 'OEM'}) — Qty: ${it.qty} set(s) [${(it.importance || 'Essential').toUpperCase()}]\n`;
        });
        msg += `\n`;
      }
      if (cats.accessories.length) {
        msg += `🔌 ACCESSORIES & INFRASTRUCTURE:\n`;
        cats.accessories.forEach((it, idx) => {
          msg += `${idx + 1}. ${it.name} — Qty: ${it.qty} unit(s) [${(it.importance || 'Recommended').toUpperCase()}]\n`;
        });
        msg += `\n`;
      }
      if (cats.consumables.length) {
        msg += `📦 STERILIZATION & CONSUMABLE PACKAGES:\n`;
        cats.consumables.forEach((it, idx) => {
          msg += `${idx + 1}. ${it.name} — Qty: ${it.qty} unit(s) [${(it.importance || 'Essential').toUpperCase()}]\n`;
        });
        msg += `\n`;
      }

      msg += `Please include formal quotation pricing, CE/ISO certificates, transport and delivery lead times to Kigali, and on-site biomedical engineering installation terms.\n\nFacility Name:\nContact Person:`;
      return msg;
    }

    // Header with department & completeness badge
    const header = document.createElement('div');
    header.className = 'ai-rfq-header';
    header.innerHTML = `
      <div class="ai-rfq-title-wrap">
        <span class="ai-rfq-dept-badge">Procurement Blueprint</span>
        <strong class="ai-rfq-title">${rfqPayload.department}</strong>
      </div>
      <div class="ai-rfq-badge" id="rfq-score-badge">
        <span class="ai-rfq-score-num">${completeness.score}%</span> Readiness
      </div>
    `;
    card.appendChild(header);

    // Collapsible Completeness Audit & Domain Coverage
    if (completeness.coveredDomains && completeness.coveredDomains.length) {
      const auditDetails = document.createElement('details');
      auditDetails.className = 'ai-rfq-details';
      const auditSummary = document.createElement('summary');
      auditSummary.innerHTML = `<span>📊 Department Completeness Audit (${completeness.status || 'Foundational Core'})</span>`;
      auditDetails.appendChild(auditSummary);

      const auditContent = document.createElement('div');
      auditContent.className = 'ai-rfq-audit-body';
      let auditHtml = `<div class="ai-rfq-audit-sec"><strong>Covered Clinical Domains:</strong><ul>`;
      completeness.coveredDomains.forEach(d => {
        auditHtml += `<li>✓ ${d}</li>`;
      });
      auditHtml += `</ul></div>`;

      if (completeness.gaps && completeness.gaps.length) {
        auditHtml += `<div class="ai-rfq-audit-sec ai-rfq-gaps-sec"><strong>Essential Gaps &amp; Clinical Considerations:</strong><ul>`;
        completeness.gaps.forEach(g => {
          auditHtml += `<li>⚠️ <strong>${g.item}</strong> (${g.domain}): ${g.clinicalNecessity}</li>`;
        });
        auditHtml += `</ul></div>`;
      }
      auditContent.innerHTML = auditHtml;
      auditDetails.appendChild(auditContent);
      card.appendChild(auditDetails);
    }

    // Items list container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'ai-rfq-items-list';

    function renderItems() {
      itemsContainer.innerHTML = '';

      const categories = [
        { key: 'equipment', title: '🏥 Capital Medical Equipment', items: items.filter(i => i.category === 'equipment') },
        { key: 'instruments', title: '✂️ Surgical & Clinical Instruments', items: items.filter(i => i.category === 'instruments') },
        { key: 'accessories', title: '🔌 Accessories & Infrastructure', items: items.filter(i => i.category === 'accessories') },
        { key: 'consumables', title: '📦 Consumables & Reprocessing Packages', items: items.filter(i => i.category === 'consumables') }
      ];

      categories.forEach(cat => {
        if (!cat.items.length) return;

        const catBlock = document.createElement('div');
        catBlock.className = 'ai-rfq-category-block';
        catBlock.innerHTML = `<div class="ai-rfq-category-title">${cat.title} (${cat.items.length})</div>`;

        cat.items.forEach(it => {
          const row = document.createElement('div');
          row.className = 'ai-rfq-item-row';

          const importanceTag = (it.importance || 'essential').toLowerCase();
          const info = document.createElement('div');
          info.className = 'ai-rfq-item-info';
          info.innerHTML = `
            <div class="ai-rfq-item-top">
              <span class="ai-rfq-item-name">${it.name}</span>
              <span class="ai-rfq-mfg-tag">${it.manufacturer || 'OEM'}</span>
              <span class="ai-rfq-item-tag ai-rfq-tag-${importanceTag}">${importanceTag.toUpperCase()}</span>
            </div>
            ${it.specs ? `<div class="ai-rfq-item-specs">${it.specs.slice(0, 110)}${it.specs.length > 110 ? '...' : ''}</div>` : ''}
          `;

          const controls = document.createElement('div');
          controls.className = 'ai-rfq-qty-stepper';

          const minusBtn = document.createElement('button');
          minusBtn.type = 'button';
          minusBtn.className = 'ai-rfq-qty-btn';
          minusBtn.textContent = '−';
          minusBtn.title = 'Decrease quantity';
          minusBtn.addEventListener('click', () => {
            if (it.qty > 1) {
              it.qty -= 1;
              qtyVal.textContent = it.qty;
              if (activeProcurementSession) activeProcurementSession.items = items;
            }
          });

          const qtyVal = document.createElement('span');
          qtyVal.className = 'ai-rfq-qty-val';
          qtyVal.textContent = it.qty;

          const plusBtn = document.createElement('button');
          plusBtn.type = 'button';
          plusBtn.className = 'ai-rfq-qty-btn';
          plusBtn.textContent = '+';
          plusBtn.title = 'Increase quantity';
          plusBtn.addEventListener('click', () => {
            it.qty += 1;
            qtyVal.textContent = it.qty;
            if (activeProcurementSession) activeProcurementSession.items = items;
          });

          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'ai-rfq-remove-btn';
          removeBtn.innerHTML = '&times;';
          removeBtn.title = 'Remove item from quote';
          removeBtn.addEventListener('click', () => {
            const idx = items.indexOf(it);
            if (idx > -1) {
              items.splice(idx, 1);
              if (activeProcurementSession) activeProcurementSession.items = items;
              renderItems();
            }
          });

          controls.appendChild(minusBtn);
          controls.appendChild(qtyVal);
          controls.appendChild(plusBtn);
          controls.appendChild(removeBtn);

          row.appendChild(info);
          row.appendChild(controls);
          catBlock.appendChild(row);
        });

        itemsContainer.appendChild(catBlock);
      });
    }

    renderItems();
    card.appendChild(itemsContainer);

    // Permission Prompt Box (Step 1)
    const promptBox = document.createElement('div');
    promptBox.className = 'ai-rfq-permission-box';

    const promptText = (permissionPrompt && permissionPrompt.text)
      ? permissionPrompt.text
      : `I have prepared a recommended equipment and consumables list for your ${rfqPayload.department}. Would you like me to automatically populate your Quotation Inquiry form with these products, quantities, and available details?`;

    promptBox.innerHTML = `
      <div class="ai-rfq-prompt-text">${promptText}</div>
      <div class="ai-rfq-prompt-actions">
        <button type="button" class="ai-rfq-btn-accept" id="rfq-accept-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Yes, fill in my quotation inquiry
        </button>
        <button type="button" class="ai-rfq-btn-decline" id="rfq-decline-btn">
          No, I would like to do it myself
        </button>
      </div>
    `;

    const acceptBtn = promptBox.querySelector('#rfq-accept-btn');
    const declineBtn = promptBox.querySelector('#rfq-decline-btn');

    acceptBtn.addEventListener('click', () => {
      const finalMsg = buildFormattedMessage();
      const payloadToSave = {
        department: rfqPayload.department,
        departmentKey: rfqPayload.departmentKey,
        completeness: completeness,
        items: items,
        formattedMessage: finalMsg
      };

      if (activeProcurementSession) {
        activeProcurementSession.items = items;
        activeProcurementSession.stage = 'populated_form';
        activeProcurementSession.pendingPermissionPrompt = false;
      }

      promptBox.innerHTML = `
        <div class="ai-rfq-success-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span><strong>Quotation Loaded:</strong> Your inquiry form has been pre-filled with ${items.length} items. Please review and approve before final submission.</span>
        </div>
      `;

      // Check if on /contact page
      if (typeof window.populateContactFormWithRfq === 'function') {
        window.populateContactFormWithRfq(payloadToSave);
        closePanel();
      } else {
        sessionStorage.setItem('ikeda_rfq_payload', JSON.stringify(payloadToSave));
        window.location.href = `/contact?dept=${encodeURIComponent(rfqPayload.department)}&rfq=ai`;
      }
    });

    declineBtn.addEventListener('click', () => {
      promptBox.innerHTML = `
        <div class="ai-rfq-muted-note">
          Understood! You can review the equipment list above or configure your quotation inquiry manually anytime.
        </div>
      `;
    });

    card.appendChild(promptBox);
    messagesEl.appendChild(card);
    scrollDown();
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

    const typing = showTyping();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          context: {
            history: conversationHistory,
            procurementSession: activeProcurementSession,
            products: recentProducts,
            allRequestedProducts: allRequestedProducts,
            consultation: consultationContext
          }
        })
      });

      // Simulate a slight human delay (300-800ms)
      await new Promise(r => setTimeout(r, 350 + Math.random() * 450));

      removeTyping();

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();

      if (data.procurementSession) {
        activeProcurementSession = data.procurementSession;
      }

      if (data.reply) {
        conversationHistory.push({ role: 'bot', content: data.reply });
        if (conversationHistory.length > 12) conversationHistory.shift();
      }

      if (data.consultation) {
        consultationContext = { ...consultationContext, ...data.consultation };
        if (Array.isArray(data.consultation.items)) {
          data.consultation.items.forEach(name => {
            if (typeof name === 'string' && !allRequestedProducts.includes(name)) {
              allRequestedProducts.push(name);
            }
          });
        }
      }

      addMessage(data.reply || 'I apologize, I was unable to process that. Please try again.', 'bot');

      // Check if user requested form population or bot triggered action === 'fill_form'
      if (data.action === 'fill_form' && data.rfqPayload) {
        const payloadToSave = data.rfqPayload;
        sessionStorage.setItem('ikeda_rfq_payload', JSON.stringify(payloadToSave));
        if (typeof window.populateContactFormWithRfq === 'function') {
          window.populateContactFormWithRfq(payloadToSave);
          closePanel();
        } else {
          setTimeout(() => {
            window.location.href = `/contact?dept=${encodeURIComponent(payloadToSave.department || '')}&rfq=ai`;
          }, 1000);
        }
      } else if (data.rfqPayload) {
        renderProcurementCard(data.rfqPayload, data.permissionPrompt);
        if (Array.isArray(data.rfqPayload.items)) {
          recentProducts = data.rfqPayload.items.map(p => p.name).filter(Boolean);
          recentProducts.forEach(name => {
            if (!allRequestedProducts.includes(name)) {
              allRequestedProducts.push(name);
            }
          });
        }
      } else if (data.products && data.products.length) {
        renderProducts(data.products);
        recentProducts = data.products.map(product => product.name).filter(Boolean);
        recentProducts.forEach(name => {
          if (!allRequestedProducts.includes(name)) {
            allRequestedProducts.push(name);
          }
        });
      }

      if (data.actions && data.actions.length) {
        renderActions(data.actions);
      }
    } catch (err) {
      removeTyping();
      addMessage('I apologize for the interruption. Please try again or contact us directly at +250 795 360 359.', 'bot');
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
