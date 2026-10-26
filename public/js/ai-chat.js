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

  function addMessage(content, sender) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-msg ai-msg-' + sender;

    if (sender === 'bot') {
      const body = document.createElement('div');
      body.className = 'ai-msg-content';
      content.split(/(\*\*.+?\*\*|\n)/g).forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const strong = document.createElement('strong');
          strong.textContent = part.slice(2, -2);
          body.appendChild(strong);
        } else if (part === '\n') {
          body.appendChild(document.createElement('br'));
        } else if (part) {
          body.appendChild(document.createTextNode(part));
        }
      });
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

  // ── API Communication ──────────────────────────────────────────────────
  async function sendToAI(message) {
    if (message) {
      addMessage(message, 'user');
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

      if (data.products && data.products.length) {
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
