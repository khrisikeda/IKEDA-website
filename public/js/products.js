let allProducts = [];
let activeGroup = 'All';
let searchQuery = '';
let lastFocusedElement = null;

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('category-grid');
  const searchInput = document.getElementById('product-search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  if (!grid) return;

  // Initialize Product Details Modal DOM and event listeners once
  initProductModal();

  // Helper to normalize department names
  function normalizeGroupName(raw) {
    if (!raw) return 'All';
    const lower = raw.trim().toLowerCase();
    if (lower.includes('endoscopy') || lower.includes('theatre') || lower.includes('operating')) {
      return 'Operating Theatre';
    }
    if (lower.includes('critical') || lower.includes('emergency')) {
      return 'Critical Care & Emergency';
    }
    if (lower.includes('maternal') || lower.includes('infant') || lower.includes('neonat')) {
      return 'Maternal & Infant';
    }
    if (lower.includes('diagnostic')) {
      return 'Diagnostics & Specialty';
    }
    if (lower.includes('lab')) {
      return 'Laboratory';
    }
    if (lower.includes('general') || lower.includes('material')) {
      return 'General Hospital Materials';
    }
    return raw;
  }

  // Check URL query parameters for pre-selected group
  const urlParams = new URLSearchParams(window.location.search);
  const requestedGroup = urlParams.get('group');
  if (requestedGroup) {
    activeGroup = normalizeGroupName(requestedGroup);
  }

  // Set up filter buttons
  filterBtns.forEach((btn) => {
    if (btn.dataset.group.toLowerCase() === activeGroup.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeGroup = btn.dataset.group;
      renderFilteredProducts();
    });
  });

  // Handle dropdown department clicks while already on products page
  document.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      if (href && href.includes('group=')) {
        const params = new URLSearchParams(href.split('?')[1]);
        const grp = params.get('group');
        if (grp) {
          e.preventDefault();
          history.pushState(null, '', href);
          activeGroup = normalizeGroupName(grp);
          filterBtns.forEach((b) => {
            b.classList.toggle('active', b.dataset.group.toLowerCase() === activeGroup.toLowerCase());
          });
          renderFilteredProducts();
          const filterBar = document.querySelector('.filter-bar');
          if (filterBar) {
            filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    activeGroup = normalizeGroupName(params.get('group') || 'All');
    filterBtns.forEach((b) => {
      b.classList.toggle('active', b.dataset.group.toLowerCase() === activeGroup.toLowerCase());
    });
    renderFilteredProducts();
  });

  // Set up instant search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderFilteredProducts();
    });
  }

  // Load products from API
  try {
    allProducts = await fetchJSON('/api/products');
    const allBtn = document.querySelector('.filter-btn[data-group="All"]');
    if (allBtn && allProducts.length) {
      allBtn.textContent = `All Departments (${allProducts.length})`;
    }
    renderFilteredProducts();

    // Check if an anchor hash exists (e.g. #laparoscopy)
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('is-specialty');
          const titleBtn = targetEl.querySelector('.category-title-btn');
          if (titleBtn && !titleBtn.classList.contains('is-open')) {
            titleBtn.click();
          }
        }
      }, 300);
    }
  } catch (err) {
    grid.innerHTML = '<p class="err-msg">Unable to load product catalog. Please refresh or contact our technical team.</p>';
    console.error(err);
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFilteredProducts() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;

  const filtered = allProducts.filter((product) => {
    const matchesGroup =
      activeGroup === 'All' ||
      (product.departmentGroup && product.departmentGroup.toLowerCase() === activeGroup.toLowerCase());

    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery) ||
      product.description.toLowerCase().includes(searchQuery) ||
      (product.equipmentHighlights &&
        product.equipmentHighlights.some((item) => {
          const str = typeof item === 'object' && item !== null ? (item.name || '') : String(item);
          return str.toLowerCase().includes(searchQuery);
        }));

    return matchesGroup && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
        <h3>No matching departments found</h3>
        <p>Try refining your search keyword or clearing the filter.</p>
        <button class="btn btn-outline" onclick="resetFilters()">View All Departments</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(renderCard).join('');
  initSubsectionInteractions();
  initProductRowInteractions();

  if (typeof triggerGridAnimations === 'function') {
    triggerGridAnimations(grid);
  }
}

window.resetFilters = function () {
  activeGroup = 'All';
  searchQuery = '';
  const searchInput = document.getElementById('product-search');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.filter-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.group === 'All');
  });
  renderFilteredProducts();
};

function renderCard(cat) {
  const specialtyClass = cat.featured ? ' is-specialty' : '';
  const badge = cat.featured
    ? `<span class="badge badge-specialty">${cat.tagline || 'Flagship Specialty'}</span>`
    : `<span class="badge">${cat.tagline || cat.departmentGroup || 'Department'}</span>`;

  const totalProducts = (cat.equipmentHighlights || []).length;

  return `
    <article class="category-card pork-fade-up${specialtyClass}" id="${cat.slug}">
      <div class="category-card-header">
        <span class="category-dept-group">${cat.departmentGroup || 'Hospital Care'}</span>
        ${badge}
      </div>

      <!-- Clickable Title: Reveals/Hides Products Subsection -->
      <h3 class="category-title-wrap">
        <button type="button" 
                class="category-title-btn" 
                id="btn-title-${cat.slug}"
                aria-expanded="false" 
                aria-controls="subsection-${cat.slug}"
                data-target="subsection-${cat.slug}"
                title="Click to view all products in ${cat.name}">
          <span class="category-title-text">${cat.name}</span>
          <span class="category-title-chevron" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
        </button>
      </h3>

      <p>${cat.description}</p>

      <!-- Expandable Products Subsection -->
      <div class="products-subsection" id="subsection-${cat.slug}" aria-hidden="true">
        <div class="products-subsection-inner">
          <div class="subsection-header">
            <span class="subsection-kicker">Cataloged Products &amp; Equipment (${totalProducts})</span>
            <span class="subsection-badge">Full Specification</span>
          </div>

          <ul class="subsection-products-list">
            ${(cat.equipmentHighlights || []).map((item, idx) => {
              const name = typeof item === 'object' && item !== null ? item.name : item;
              return `
                <li class="subsection-product-item">
                  <button type="button" 
                          class="subsection-product-btn equipment-row-btn" 
                          data-cat-slug="${cat.slug}" 
                          data-item-idx="${idx}"
                          aria-haspopup="dialog">
                    <span class="product-item-bullet" aria-hidden="true"></span>
                    <span class="product-item-name">${escapeHtml(name)}</span>
                    <span class="equipment-row-arrow" aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </span>
                  </button>
                </li>
              `;
            }).join('')}
          </ul>

          ${(cat.keySpecs && cat.keySpecs.length > 0) ? `
            <div class="subsection-specs-wrap">
              <div class="subsection-specs-title">Technical Highlights &amp; Standards</div>
              <ul class="subsection-specs-list">
                ${cat.keySpecs.map(spec => `<li>${escapeHtml(spec)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="subsection-footer-cta">
            <a href="/contact?dept=${encodeURIComponent(cat.name)}" class="btn btn-cyan btn-sm" style="width:100%; text-align:center; justify-content:center;">
              Request Quote &rarr;
            </a>
          </div>
        </div>
      </div>

      <!-- Clickable Equipment Rows (Replaces old grey box, heading & bullet list) -->
      ${(cat.equipmentHighlights && cat.equipmentHighlights.length > 0) ? `
        <div class="equipment-clickable-group" id="preview-list-${cat.slug}">
          ${cat.equipmentHighlights.map((item, idx) => {
            const name = typeof item === 'object' && item !== null ? item.name : item;
            return `
              <button type="button" 
                      class="equipment-row-btn" 
                      data-cat-slug="${cat.slug}" 
                      data-item-idx="${idx}"
                      aria-haspopup="dialog"
                      aria-label="View details for ${escapeHtml(name)}">
                <span class="equipment-row-name">${escapeHtml(name)}</span>
                <span class="equipment-row-arrow" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}

      <div class="category-card-footer">
        <button type="button" class="tag-btn" data-target="subsection-${cat.slug}" aria-controls="subsection-${cat.slug}" title="Toggle products view">
          <span class="tag-count">${totalProducts} Systems Cataloged</span>
          <span class="tag-action">▾</span>
        </button>
        <a href="/contact?dept=${encodeURIComponent(cat.name)}" class="quote-link">
          Request Quote &rarr;
        </a>
      </div>
    </article>
  `;
}

function initSubsectionInteractions() {
  const toggleSubsection = (targetId) => {
    const subsection = document.getElementById(targetId);
    if (!subsection) return;

    const isOpen = subsection.classList.contains('is-open');
    const slug = targetId.replace('subsection-', '');
    const titleBtn = document.getElementById(`btn-title-${slug}`);
    const tagBtns = document.querySelectorAll(`[data-target="${targetId}"]`);
    const previewList = document.getElementById(`preview-list-${slug}`);

    if (isOpen) {
      subsection.classList.remove('is-open');
      subsection.setAttribute('aria-hidden', 'true');
      if (titleBtn) {
        titleBtn.classList.remove('is-open');
        titleBtn.setAttribute('aria-expanded', 'false');
      }
      tagBtns.forEach((b) => {
        const action = b.querySelector('.tag-action');
        if (action) action.textContent = '▾';
      });
      // Keep equipment rows visible
    } else {
      subsection.classList.add('is-open');
      subsection.setAttribute('aria-hidden', 'false');
      if (titleBtn) {
        titleBtn.classList.add('is-open');
        titleBtn.setAttribute('aria-expanded', 'true');
      }
      tagBtns.forEach((b) => {
        const action = b.querySelector('.tag-action');
        if (action) action.textContent = '▴';
      });
      // Keep equipment rows visible
    }
  };

  document.querySelectorAll('.category-title-btn, .tag-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.target;
      if (targetId) toggleSubsection(targetId);
    });
  });
}

function initProductRowInteractions() {
  document.querySelectorAll('.equipment-row-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const catSlug = btn.dataset.catSlug;
      const itemIdx = parseInt(btn.dataset.itemIdx, 10);
      if (catSlug !== undefined && !isNaN(itemIdx)) {
        openProductModal(catSlug, itemIdx);
      }
    });
  });
}

/* ==========================================================================
   Product Details Modal & Zoom Lightbox System
   ========================================================================== */

function initProductModal() {
  if (document.getElementById('product-modal-backdrop')) return;

  const modalHtml = `
    <div class="product-modal-backdrop" id="product-modal-backdrop" aria-hidden="true">
      <div class="product-modal-card" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" tabindex="-1">
        <button type="button" class="product-modal-close-btn" id="product-modal-close" aria-label="Close product details">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="product-modal-grid">
          <!-- Left Column: Image with Top-Right Magnifier Icon -->
          <div class="product-modal-visual">
            <button type="button" class="product-magnifier-btn" id="product-magnifier-btn" title="Enlarge image" aria-label="Enlarge image">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <div class="product-modal-image-wrap" id="product-modal-image-wrap"></div>
          </div>

          <!-- Right Column: Title, Features, Category & Quote Actions -->
          <div class="product-modal-content">
            <h2 class="product-modal-title" id="product-modal-title"></h2>
            <ul class="product-modal-features-list" id="product-modal-features-list"></ul>
            <div class="product-modal-category-wrap">
              <span class="product-modal-category-label">Category:</span>
              <button type="button" class="product-modal-category-link" id="product-modal-category-link" title="Filter catalog by this category"></button>
            </div>

            <!-- Request Quote Action Area -->
            <div class="product-modal-actions">
              <a href="/contact" class="product-modal-quote-btn" id="product-modal-quote-btn">
                Request Quote &rarr;
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" class="product-modal-wa-btn" id="product-modal-wa-btn">
                <img src="/images/whatsapp-icon.svg" alt="" class="wa-btn-icon" width="22" height="22" aria-hidden="true" />
                <span>WhatsApp Quote</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Zoom Lightbox Viewer -->
    <div class="product-zoom-lightbox" id="product-zoom-lightbox" aria-hidden="true" role="dialog" aria-label="Enlarged product image">
      <button type="button" class="product-zoom-close" id="product-zoom-close" aria-label="Close enlarged image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <img src="" alt="" id="product-zoom-img" class="product-zoom-img" />
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const backdrop = document.getElementById('product-modal-backdrop');
  const closeBtn = document.getElementById('product-modal-close');
  const lightbox = document.getElementById('product-zoom-lightbox');
  const lightboxClose = document.getElementById('product-zoom-close');

  // Close modal on X button click
  if (closeBtn) {
    closeBtn.addEventListener('click', closeProductModal);
  }

  // Close modal on outside click (click backdrop background)
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeProductModal();
      }
    });
  }

  // Lightbox close handlers
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeZoomLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxClose) {
        closeZoomLightbox();
      }
    });
  }

  // Global keydown: Escape & Focus trapping
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightbox && lightbox.classList.contains('is-open')) {
        closeZoomLightbox();
        e.stopPropagation();
        return;
      }
      if (backdrop && backdrop.classList.contains('is-open')) {
        closeProductModal();
      }
    }

    // Modal focus trap
    if (backdrop && backdrop.classList.contains('is-open') && e.key === 'Tab') {
      const focusables = backdrop.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
}

function getProductData(catSlug, itemIdx) {
  const cat = allProducts.find((c) => c.slug === catSlug);
  if (!cat || !cat.equipmentHighlights || !cat.equipmentHighlights[itemIdx]) return null;

  const rawItem = cat.equipmentHighlights[itemIdx];
  let name = '';
  let image = null;
  let features = [];
  let category = cat.name;

  if (typeof rawItem === 'object' && rawItem !== null) {
    name = rawItem.name || '';
    image = rawItem.image || null;
    features = Array.isArray(rawItem.features) && rawItem.features.length > 0
      ? rawItem.features
      : (cat.keySpecs && cat.keySpecs.length > 0 ? cat.keySpecs : []);
    category = rawItem.category || cat.name;
  } else {
    name = String(rawItem);
    image = cat.image || null;
    features = cat.keySpecs && cat.keySpecs.length > 0
      ? cat.keySpecs
      : [
        'Wired Connection & Signal Synchronization',
        'High-Definition Visual Display & Waveform Output',
        'Precision Clinical Parameter Monitoring',
        'Hospital-Grade Durable Build & Ergonomic Design'
      ];
    category = cat.name;
  }

  return { name, image, features, category, catSlug, departmentGroup: cat.departmentGroup };
}

function getNeutralPlaceholderSVG() {
  return `
    <svg class="product-placeholder-svg" width="100" height="100" viewBox="0 0 80 80" fill="none" stroke="currentColor">
      <rect x="10" y="14" width="60" height="42" rx="6" stroke="#94a3b8" stroke-width="2.4" fill="#f8fafc" />
      <rect x="18" y="22" width="44" height="24" rx="3" stroke="#cbd5e1" stroke-width="1.8" fill="#ffffff" />
      <line x1="24" y1="34" x2="36" y2="34" stroke="#0284c7" stroke-width="2" stroke-linecap="round" />
      <line x1="40" y1="34" x2="56" y2="34" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" />
      <circle cx="28" cy="50" r="2.5" fill="#0284c7" />
      <circle cx="36" cy="50" r="2.5" fill="#94a3b8" />
      <circle cx="44" cy="50" r="2.5" fill="#94a3b8" />
      <path d="M26 56v10M54 56v10M18 66h44" stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round" />
    </svg>
    <span class="placeholder-caption">Medical System Specification</span>
  `;
}

function renderProductImageHTML(imageSrc, productName) {
  if (imageSrc) {
    return `
      <img src="${escapeHtml(imageSrc)}" 
           alt="${escapeHtml(productName)}" 
           class="product-detail-img" 
           id="product-detail-img-element"
           onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
      <div class="product-neutral-placeholder" style="display:none;" aria-label="Neutral placeholder for ${escapeHtml(productName)}">
        ${getNeutralPlaceholderSVG()}
      </div>
    `;
  }
  return `
    <div class="product-neutral-placeholder" aria-label="Neutral placeholder for ${escapeHtml(productName)}">
      ${getNeutralPlaceholderSVG()}
    </div>
  `;
}

function openProductModal(catSlug, itemIdx) {
  const data = getProductData(catSlug, itemIdx);
  if (!data) return;

  lastFocusedElement = document.activeElement;

  const backdrop = document.getElementById('product-modal-backdrop');
  const titleEl = document.getElementById('product-modal-title');
  const featuresListEl = document.getElementById('product-modal-features-list');
  const catLinkEl = document.getElementById('product-modal-category-link');
  const imageWrap = document.getElementById('product-modal-image-wrap');
  const zoomBtn = document.getElementById('product-magnifier-btn');

  if (!backdrop || !titleEl || !featuresListEl || !catLinkEl || !imageWrap) return;

  // Title
  titleEl.textContent = data.name;

  // Bulleted features
  featuresListEl.innerHTML = (data.features || []).map((feat) => `
    <li>${escapeHtml(feat)}</li>
  `).join('');

  // Category Link
  catLinkEl.textContent = data.category;
  catLinkEl.onclick = (e) => {
    e.preventDefault();
    filterByProductCategory(data.category, data.departmentGroup);
  };

  // Request Quote Action Links
  const quoteBtn = document.getElementById('product-modal-quote-btn');
  const waBtn = document.getElementById('product-modal-wa-btn');

  const deptParam = encodeURIComponent(data.departmentGroup || data.category || '');
  const productParam = encodeURIComponent(data.name || '');

  if (quoteBtn) {
    quoteBtn.href = `/contact?dept=${deptParam}&product=${productParam}`;
    quoteBtn.textContent = 'Request Quote →';
  }

  if (waBtn) {
    const waText = encodeURIComponent(`Hello IKEDA ENDOSCOPY AFRICA Ltd, I would like to request an official quote for ${data.name} (${data.category}).`);
    waBtn.href = `https://wa.me/250795360359?text=${waText}`;
  }

  // Image Media
  imageWrap.innerHTML = renderProductImageHTML(data.image, data.name);

  // Zoom magnifier handlers
  const handleZoom = () => {
    const currentImg = document.getElementById('product-detail-img-element');
    if (currentImg && currentImg.style.display !== 'none' && currentImg.src) {
      openZoomLightbox(currentImg.src, data.name);
    }
  };

  if (zoomBtn) {
    zoomBtn.onclick = handleZoom;
  }
  imageWrap.onclick = handleZoom;

  // Show Modal (Only one product is open at a time)
  backdrop.classList.add('is-open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Move focus into details view
  const closeBtn = document.getElementById('product-modal-close');
  if (closeBtn) {
    closeBtn.focus();
  }
}

function closeProductModal() {
  const backdrop = document.getElementById('product-modal-backdrop');
  if (!backdrop || !backdrop.classList.contains('is-open')) return;

  closeZoomLightbox();
  backdrop.classList.remove('is-open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function openZoomLightbox(src, alt) {
  const lightbox = document.getElementById('product-zoom-lightbox');
  const zoomImg = document.getElementById('product-zoom-img');
  if (!lightbox || !zoomImg) return;

  zoomImg.src = src;
  zoomImg.alt = alt;
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeZoomLightbox() {
  const lightbox = document.getElementById('product-zoom-lightbox');
  if (lightbox && lightbox.classList.contains('is-open')) {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }
}

function filterByProductCategory(categoryName, departmentGroup) {
  closeProductModal();

  const searchInput = document.getElementById('product-search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Check if category name matches a department filter pill
  let matchedBtn = null;
  filterBtns.forEach((btn) => {
    const groupName = btn.dataset.group || '';
    if (
      groupName.toLowerCase() === (departmentGroup || '').toLowerCase() ||
      groupName.toLowerCase() === categoryName.toLowerCase()
    ) {
      matchedBtn = btn;
    }
  });

  if (matchedBtn) {
    filterBtns.forEach((b) => b.classList.remove('active'));
    matchedBtn.classList.add('active');
    activeGroup = matchedBtn.dataset.group;
    if (searchInput) searchInput.value = '';
    searchQuery = '';
  } else {
    // Filter by search query
    filterBtns.forEach((b) => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[data-group="All"]');
    if (allBtn) allBtn.classList.add('active');
    activeGroup = 'All';
    if (searchInput) {
      searchInput.value = categoryName;
    }
    searchQuery = categoryName.toLowerCase();
  }

  renderFilteredProducts();

  const grid = document.getElementById('category-grid');
  if (grid) {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
