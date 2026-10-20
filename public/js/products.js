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

  // Set up filter buttons (toggle on click)
  filterBtns.forEach((btn) => {
    if (activeGroup !== 'All' && btn.dataset.group.toLowerCase() === activeGroup.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      const isAlreadyActive = btn.classList.contains('active');
      filterBtns.forEach((b) => b.classList.remove('active'));
      if (isAlreadyActive) {
        activeGroup = 'All';
      } else {
        btn.classList.add('active');
        activeGroup = btn.dataset.group;
      }
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

  // Set up instant search & search button interaction
  const searchBtn = document.getElementById('product-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderFilteredProducts();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchQuery = searchInput.value.trim().toLowerCase();
        renderFilteredProducts();
        if (searchQuery && grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (searchInput) {
        searchQuery = searchInput.value.trim().toLowerCase();
      }
      renderFilteredProducts();
      if (searchQuery && grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Load products from API
  try {
    allProducts = await fetchJSON('/api/products');
    renderFilteredProducts();

    // Check if an anchor hash exists (e.g. #laparoscopy, #urology)
    if (window.location.hash) {
      const rawHash = window.location.hash.substring(1).toLowerCase();
      setTimeout(() => {
        let targetEl = document.getElementById(rawHash);
        if (!targetEl) {
          if (rawHash === 'ortopedy') targetEl = document.getElementById('orthopedics');
          if (rawHash === 'gastro') targetEl = document.getElementById('gastroenterology');
        }
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetEl.classList.add('is-specialty-highlight');
        }
      }, 350);
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

function getSubsectionId(title) {
  if (!title) return '';
  const t = title.toLowerCase();
  if (t.includes('laparoscopy')) return 'laparoscopy';
  if (t.includes('urology')) return 'urology';
  if (t.includes('thoracoscopic') || t.includes('vats')) return 'vats';
  if (t.includes('orthopedic')) return 'orthopedics';
  if (t.includes('gastro')) return 'gastroenterology';
  if (t.includes('gynecology')) return 'gynecology';
  if (t.includes('general')) return 'general-operating-theatre';
  return t.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderThumbItem(item, cat, globalIdx) {
  const name = typeof item === 'object' && item !== null ? item.name : item;
  const imgUrl = typeof item === 'object' && item !== null ? item.image : null;
  const idxToUse = typeof globalIdx === 'number' && globalIdx >= 0 ? globalIdx : 0;

  return `
    <button type="button" 
            class="category-card-thumb-item equipment-row-btn" 
            data-cat-slug="${cat.slug}" 
            data-item-idx="${idxToUse}"
            aria-haspopup="dialog"
            aria-label="View specifications for ${escapeHtml(name)}">
      <div class="thumb-img-box">
        ${imgUrl ? `
          <img src="${escapeHtml(imgUrl)}" 
               alt="${escapeHtml(name)}" 
               loading="lazy" 
               class="cat-preview-img"
               onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
          <div class="thumb-img-placeholder" style="display:none;" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </div>
        ` : `
          <div class="thumb-img-placeholder" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </div>
        `}
      </div>
      <span class="thumb-item-name">${escapeHtml(name)}</span>
    </button>
  `;
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
          const spec = typeof item === 'object' && item !== null ? (item.specification || '') : '';
          const subtitle = typeof item === 'object' && item !== null ? (item.subtitle || '') : '';
          return str.toLowerCase().includes(searchQuery) || spec.toLowerCase().includes(searchQuery) || subtitle.toLowerCase().includes(searchQuery);
        })) ||
      (product.subsections &&
        product.subsections.some((sub) => {
          const subTitle = (sub.title || '').toLowerCase();
          const subDesc = (sub.description || '').toLowerCase();
          const groupMatch = sub.groups && sub.groups.some(g => (g.title || '').toLowerCase().includes(searchQuery));
          return subTitle.includes(searchQuery) || subDesc.includes(searchQuery) || groupMatch;
        }));

    return matchesGroup && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
        <h3>No matching departments found</h3>
        <p>Try refining your search keyword or clearing the filter.</p>
        <button class="btn btn-outline" onclick="resetFilters()">View All Products</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(renderCard).join('');
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
    b.classList.remove('active');
  });
  renderFilteredProducts();
};

function renderCard(cat) {
  const specialtyClass = cat.featured ? ' is-specialty' : '';
  const badge = cat.featured
    ? `<span class="badge badge-specialty">${cat.tagline || 'Flagship Specialty'}</span>`
    : `<span class="badge">${cat.tagline || cat.departmentGroup || 'Department'}</span>`;

  const hasSubsections = Array.isArray(cat.subsections) && cat.subsections.length > 0;
  const items = cat.equipmentHighlights || [];
  const totalProducts = items.length;

  let contentHtml = '';

  if (hasSubsections) {
    let subsectionsToRender = cat.subsections;

    if (searchQuery) {
      subsectionsToRender = cat.subsections
        .map((sub) => {
          const subTitleMatches = sub.title && sub.title.toLowerCase().includes(searchQuery);
          const subDescMatches = sub.description && sub.description.toLowerCase().includes(searchQuery);
          if (subTitleMatches || subDescMatches) {
            return sub;
          }
          const matchingItems = sub.items.filter((item) => {
            const name = typeof item === 'object' && item !== null ? (item.name || '') : String(item);
            const spec = typeof item === 'object' && item !== null ? (item.specification || '') : '';
            return name.toLowerCase().includes(searchQuery) || spec.toLowerCase().includes(searchQuery);
          });
          if (matchingItems.length > 0) {
            return { ...sub, items: matchingItems };
          }
          return null;
        })
        .filter(Boolean);

      if (subsectionsToRender.length === 0) {
        subsectionsToRender = cat.subsections;
      }
    }

    const navPillsHtml = `
      <div class="category-subsections-nav" aria-label="Surgical Subtitles Quick Jump">
        <span class="sub-nav-label">Surgical Disciplines:</span>
        <div class="sub-nav-pills-scroll">
          ${cat.subsections.map((sub) => {
            const subId = getSubsectionId(sub.title);
            const shortTitle = sub.title
              .replace(' & Minimally Invasive Surgery', '')
              .replace(' & Endourology', '')
              .replace('Video-Assisted Thoracoscopic Surgery (VATS)', 'VATS')
              .replace(' & Traumatology', '')
              .replace(' & GI Endoscopy', '')
              .replace(" & Women's Health", '')
              .replace('General Operating Theatre Equipment', 'General OT');
            return `
              <a href="#${subId}" class="sub-nav-pill" onclick="event.preventDefault(); document.getElementById('${subId}')?.scrollIntoView({ behavior: 'smooth', block: 'start' });">
                <span class="sub-nav-pill-dot"></span>
                <span>${escapeHtml(shortTitle)}</span>
                <span class="sub-nav-pill-count">${sub.items.length}</span>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const subsectionsHtml = subsectionsToRender.map((sub) => {
      const subId = getSubsectionId(sub.title);
      const hasGroups = Array.isArray(sub.groups) && sub.groups.length > 0;

      let bodyHtml = '';
      if (hasGroups) {
        bodyHtml = sub.groups.map((grp) => {
          let grpItems = grp.items || [];
          if (searchQuery) {
            const grpTitleMatches = grp.title && grp.title.toLowerCase().includes(searchQuery);
            if (!grpTitleMatches) {
              grpItems = grpItems.filter((item) => {
                const name = typeof item === 'object' && item !== null ? (item.name || '') : String(item);
                const spec = typeof item === 'object' && item !== null ? (item.specification || '') : '';
                return name.toLowerCase().includes(searchQuery) || spec.toLowerCase().includes(searchQuery);
              });
            }
          }
          if (grpItems.length === 0) return '';

          return `
            <div class="category-nested-group">
              <div class="category-nested-group-header">
                <span class="nested-group-badge">${escapeHtml(grp.title)}</span>
                <span class="nested-group-count">${grpItems.length} System${grpItems.length === 1 ? '' : 's'}</span>
              </div>
              <div class="category-card-thumbs-grid" aria-label="${escapeHtml(grp.title)} Products">
                ${grpItems.map((item) => {
                  const name = typeof item === 'object' && item !== null ? item.name : item;
                  const globalIdx = cat.equipmentHighlights.findIndex((h) => {
                    const hName = typeof h === 'object' && h !== null ? h.name : h;
                    return hName === name;
                  });
                  return renderThumbItem(item, cat, globalIdx >= 0 ? globalIdx : 0);
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      } else {
        bodyHtml = `
          <div class="category-card-thumbs-grid" aria-label="${escapeHtml(sub.title)} Products">
            ${sub.items.map((item) => {
              const name = typeof item === 'object' && item !== null ? item.name : item;
              const globalIdx = cat.equipmentHighlights.findIndex((h) => {
                const hName = typeof h === 'object' && h !== null ? h.name : h;
                return hName === name;
              });
              return renderThumbItem(item, cat, globalIdx >= 0 ? globalIdx : 0);
            }).join('')}
          </div>
        `;
      }

      return `
        <section class="category-subsection-block" id="${subId}" aria-labelledby="heading-${subId}">
          <div class="category-subsection-header">
            <div class="category-subsection-title-wrap">
              <span class="category-subsection-dot" aria-hidden="true"></span>
              <h4 class="category-subsection-title" id="heading-${subId}">${escapeHtml(sub.title)}</h4>
              <span class="category-subsection-count">${sub.items.length} System${sub.items.length === 1 ? '' : 's'}</span>
            </div>
            ${sub.description ? `<p class="category-subsection-desc">${escapeHtml(sub.description)}</p>` : ''}
          </div>
          ${bodyHtml}
        </section>
      `;
    }).join('');

    contentHtml = `
      ${navPillsHtml}
      <div class="category-subsections-container">
        ${subsectionsHtml}
      </div>
    `;
  } else {
    let displayItems = items;
    if (searchQuery) {
      const matching = items.filter((item) => {
        const name = typeof item === 'object' && item !== null ? (item.name || '') : String(item);
        const spec = typeof item === 'object' && item !== null ? (item.specification || '') : '';
        return name.toLowerCase().includes(searchQuery) || spec.toLowerCase().includes(searchQuery);
      });
      if (matching.length > 0) displayItems = matching;
    }

    contentHtml = `
      <div class="category-card-thumbs-grid" 
           id="grid-${cat.slug}" 
           aria-label="Products in ${escapeHtml(cat.name)}">
        ${displayItems.map((item, idx) => {
          const globalIdx = items.indexOf(item);
          return renderThumbItem(item, cat, globalIdx >= 0 ? globalIdx : idx);
        }).join('')}
      </div>
    `;
  }

  return `
    <article class="category-card pork-fade-up${specialtyClass}" id="${cat.slug}">
      <div class="category-card-header">
        <div class="category-card-header-left">
          <span class="category-dept-group">${cat.departmentGroup || 'Hospital Care'}</span>
          <h3 class="category-card-title">${escapeHtml(cat.name)}</h3>
        </div>
        <div class="category-card-header-right">
          ${badge}
          <span class="category-header-count">${totalProducts} System${totalProducts === 1 ? '' : 's'}</span>
        </div>
      </div>

      <p class="category-card-desc">${escapeHtml(cat.description)}</p>

      ${contentHtml}

      <div class="category-card-footer">
        <span class="category-card-count">
          <span class="count-badge">${totalProducts}</span> Product${totalProducts === 1 ? '' : 's'}
        </span>
        <a href="/contact?dept=${encodeURIComponent(cat.name)}" class="btn-smart-moth btn-smart-moth-sm" aria-label="Send Quotation Request">
          <div class="svg-wrapper-1">
            <div class="svg-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="17" height="17">
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path>
              </svg>
            </div>
          </div>
          <span class="btn-text">Send Quotation Request</span>
        </a>
      </div>
    </article>
  `;
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

/* ==========================================================================
   Product Details Modal & Zoom Lightbox System (Made-in-China Format)
   ========================================================================== */

function initProductModal() {
  if (document.getElementById('product-modal-backdrop')) return;

  const modalHtml = `
    <div class="product-modal-backdrop" id="product-modal-backdrop" aria-hidden="true">
      <div class="product-modal-card mic-modal-card" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" tabindex="-1">
        
        <!-- Modal Close Button -->
        <button type="button" class="product-modal-close-btn" id="product-modal-close" aria-label="Close product details">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Top Breadcrumb Bar (Made-in-China format) -->
        <nav class="mic-breadcrumb" aria-label="Product breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li class="separator">/</li>
            <li><a href="/products">Products</a></li>
            <li class="separator">/</li>
            <li><span id="mic-crumb-dept">Department</span></li>
            <li class="separator">/</li>
            <li class="current" id="mic-crumb-product">Product</li>
          </ol>
        </nav>

        <!-- Main Hero: 2 Columns (Image Gallery on Left, Product Overview & Attributes on Right) -->
        <div class="mic-product-hero">
          
          <!-- Left Column: Media Gallery -->
          <div class="mic-hero-gallery">
            <div class="mic-main-image-wrap" id="product-modal-image-wrap"></div>

            <div class="mic-gallery-actions">
              <button type="button" class="mic-zoom-action-btn" id="product-magnifier-btn" title="Enlarge image">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>Enlarge Image (HD Zoom)</span>
              </button>
            </div>

            <div class="mic-gallery-thumbnails" id="mic-gallery-thumbnails"></div>
          </div>

          <!-- Right Column: Title, Trust Badges, Price/MOQ, Highlights, Attributes, Action Buttons -->
          <div class="mic-hero-info">
            
            <!-- Product Title -->
            <h1 class="mic-product-title" id="product-modal-title"></h1>

            <!-- Supplier & Verification Trust Bar -->
            <div class="mic-trust-bar">
              <div class="mic-supplier-brand">
                <span class="mic-supplier-name">IKEDA Endoscopy Africa</span>
                <span class="mic-badge-verified" title="Audited &amp; Authorized Direct Manufacturer Partner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Verified Partner
                </span>
                <span class="mic-badge-cert">CE &amp; ISO 13485</span>
              </div>
              <div class="mic-rating">
                <span class="mic-stars">★★★★★</span>
                <span class="mic-rating-score">5.0</span>
                <span class="mic-rating-count">(Hospital Referral Tier)</span>
              </div>
            </div>

            <!-- Pricing & Procurement Tier -->
            <div class="mic-pricing-box">
              <div class="mic-price-main">
                <span class="mic-price-label">Institutional Pricing:</span>
                <span class="mic-price-val">Institutional RFQ / Negotiable</span>
              </div>
              <div class="mic-moq-badge">
                <span>MOQ: 1 System (Turnkey Installation Included)</span>
              </div>
            </div>

            <!-- Product Highlights Box (Made-in-China format) -->
            <div class="mic-highlights-card">
              <div class="mic-highlights-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-primary, #0284c7)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <h3 class="mic-section-title">Product Highlights</h3>
              </div>
              <ul class="mic-highlights-list" id="product-modal-features-list"></ul>
            </div>

            <!-- Product Attributes Table (Made-in-China format) -->
            <div class="mic-attributes-card">
              <h3 class="mic-section-title">Product Attributes</h3>
              <dl class="mic-attrs-grid" id="mic-attrs-grid"></dl>
            </div>

            <!-- Actions / Contact Buttons (Made-in-China format) -->
            <div class="mic-action-group">
              <a href="/contact" class="btn-smart-moth mic-btn-inquiry" id="product-modal-quote-btn" aria-label="Send Quotation Request">
                <div class="svg-wrapper-1">
                  <div class="svg-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
                      <path fill="none" d="M0 0h24v24H0z"></path>
                      <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path>
                    </svg>
                  </div>
                </div>
                <span class="btn-text">Send Quotation Request</span>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" class="mic-btn-chat" id="product-modal-wa-btn">
                <img src="/images/whatsapp-icon.svg" alt="" width="20" height="20" aria-hidden="true" />
                <span>Chat via WhatsApp</span>
              </a>
            </div>

          </div>
        </div>

        <!-- Unified Technical Specifications & Clinical Parameters (Full View, No Tabs) -->
        <section class="mic-specs-section" aria-labelledby="mic-specs-title">
          <div class="mic-specs-header">
            <h2 class="mic-specs-title" id="mic-specs-title">Technical Specifications &amp; Parameters</h2>
            <p class="mic-specs-subtitle">Verified hospital engineering parameters &amp; international standard specifications (CE &amp; ISO 13485)</p>
          </div>

          <!-- System Overview Note -->
          <div class="mic-notice-intro" id="mic-notice-intro"></div>

          <!-- Full 2-Column Technical Specifications Table -->
          <div class="mic-table-responsive">
            <table class="mic-spec-table" id="mic-spec-table">
              <thead>
                <tr>
                  <th style="width: 35%;">Parameter / Function</th>
                  <th style="width: 65%;">Specification / Details</th>
                </tr>
              </thead>
              <tbody id="mic-spec-table-body"></tbody>
            </table>
          </div>

          <!-- Biomedical Assurance Guarantee Footer -->
          <div class="mic-assurance-footer">
            <div class="mic-assurance-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>Direct Manufacturer Certified (CE &amp; ISO 13485)</span>
            </div>
            <div class="mic-assurance-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Turnkey Rwanda Installation &amp; Training</span>
            </div>
            <div class="mic-assurance-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>12–24 Months Warranty &amp; Spare Parts Support</span>
            </div>
          </div>
        </section>

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
  let specification = '';
  let category = cat.name;
  let subtitle = '';
  let section = '';

  if (typeof rawItem === 'object' && rawItem !== null) {
    name = rawItem.name || '';
    image = rawItem.image || null;
    specification = rawItem.specification || '';
    subtitle = rawItem.subtitle || '';
    section = rawItem.section || '';
    if (Array.isArray(rawItem.features) && rawItem.features.length > 0) {
      features = rawItem.features;
    } else if (rawItem.specification && rawItem.specification.trim()) {
      features = rawItem.specification.split('\n').map((l) => l.trim()).filter(Boolean);
    } else if (cat.keySpecs && cat.keySpecs.length > 0) {
      features = cat.keySpecs;
    } else {
      features = [
        'Technical specifications available upon request.',
        'Please contact our clinical engineering team for configuration details and quotation.',
      ];
    }
    category = rawItem.category || cat.name;
  } else {
    name = String(rawItem);
    image = cat.image || null;
    features =
      cat.keySpecs && cat.keySpecs.length > 0
        ? cat.keySpecs
        : [
            'Technical specifications available upon request.',
            'Please contact our clinical engineering team for configuration details and quotation.',
          ];
    category = cat.name;
  }

  return { name, image, features, specification, category, subtitle, section, catSlug, departmentGroup: cat.departmentGroup };
}

function formatNoticeLines(specText, features) {
  let text = specText || '';
  if (!text && Array.isArray(features)) {
    text = features.join('\n');
  }
  if (!text.trim()) {
    return [];
  }

  const rawLines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const formattedItems = [];
  let buffer = '';

  for (const line of rawLines) {
    if (line === '•' || line === '►' || line === '-' || line === '*') {
      if (buffer) {
        formattedItems.push(buffer);
        buffer = '';
      }
      continue;
    }

    const isNewItem =
      /^[•●⚫\-\*►]/.test(line) ||
      /^[0-9]+[\.\)]/.test(line) ||
      /^([A-Z0-9][a-zA-Z0-9\s\/\(\)\-]{1,30}[:：])/.test(line) ||
      /^P[0-9]+[：:]/.test(line);

    if (isNewItem) {
      if (buffer) {
        formattedItems.push(buffer);
      }
      buffer = line.replace(/^[•●⚫\-\*►]\s*/, '').trim();
    } else {
      if (buffer) {
        buffer += ' ' + line;
      } else {
        buffer = line;
      }
    }
  }

  if (buffer) {
    formattedItems.push(buffer);
  }

  return formattedItems;
}

function parseSpecsToTable(items, data) {
  const rows = [];

  // Core equipment identification & regulatory parameters
  rows.push({ key: 'Model / System Name', val: data.name });
  rows.push({ key: 'Clinical Category', val: data.category || 'Medical Equipment' });
  rows.push({ key: 'Clinical Division', val: data.departmentGroup || 'Hospital Care' });
  rows.push({ key: 'Regulatory Compliance', val: 'CE Mark, ISO 13485 Certified' });
  rows.push({ key: 'Warranty & Support', val: '12–24 Months Direct Biomedical Support (Rwanda)' });
  rows.push({ key: 'Customization', val: 'Available (OEM / ODM Supported)' });

  items.forEach((item) => {
    if (!item || !item.trim()) return;
    const colonMatch = item.match(/^([^:：–—]{2,35})[:：–—]\s*(.+)$/s);
    if (colonMatch) {
      rows.push({ key: colonMatch[1].trim(), val: colonMatch[2].trim() });
    } else {
      let key = 'Technical Parameter';
      const lower = item.toLowerCase();
      if (lower.includes('resolution') || lower.includes('pixel') || lower.includes('camera') || lower.includes('video')) key = 'Video & Optics';
      else if (lower.includes('fiber') || lower.includes('light') || lower.includes('lens') || lower.includes('storz')) key = 'Optical Illumination';
      else if (lower.includes('smoke') || lower.includes('suction') || lower.includes('insufflat')) key = 'Fluidics & Evacuation';
      else if (lower.includes('stainless') || lower.includes('construction') || lower.includes('grade')) key = 'Build & Materials';
      else if (lower.includes('display') || lower.includes('screen') || lower.includes('touch') || lower.includes('lcd') || lower.includes('tft')) key = 'Display Interface';
      else if (lower.includes('power') || lower.includes('battery') || lower.includes('volt') || lower.includes('hz')) key = 'Power & Electrical';
      else if (lower.includes('temperature') || lower.includes('servo') || lower.includes('sensor')) key = 'Thermal Control';
      else if (lower.includes('gas') || lower.includes('o2') || lower.includes('air') || lower.includes('flow')) key = 'Gas & Flow Control';
      else if (lower.includes('alarm') || lower.includes('safety')) key = 'Safety & Alarms';
      else if (lower.includes('mode') || lower.includes('ventilat')) key = 'Operating Modes';
      else if (lower.includes('standard') || lower.includes('iso') || lower.includes('ats')) key = 'Clinical Standards';

      rows.push({ key: key, val: item.trim() });
    }
  });

  return rows;
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
  if (!backdrop) return;

  const card = backdrop.querySelector('.product-modal-card');
  if (card) {
    card.scrollTop = 0;
  }

  // Breadcrumbs
  const crumbDept = document.getElementById('mic-crumb-dept');
  const crumbProd = document.getElementById('mic-crumb-product');
  if (crumbDept) {
    if (data.section) {
      crumbDept.textContent = `${data.subtitle || data.category} / ${data.section}`;
    } else if (data.subtitle && data.subtitle !== data.category) {
      crumbDept.textContent = `${data.category} / ${data.subtitle}`;
    } else {
      crumbDept.textContent = data.departmentGroup || data.category;
    }
  }
  if (crumbProd) crumbProd.textContent = data.name;

  // Title
  const titleEl = document.getElementById('product-modal-title');
  if (titleEl) titleEl.textContent = data.name;

  // Format notice lines
  const noticeItems = formatNoticeLines(data.specification, data.features);
  const displayItems =
    noticeItems.length > 0
      ? noticeItems
      : data.features || [
          'Technical specifications available upon request.',
          'Please contact our clinical engineering team for configuration details and quotation.',
        ];

  // Product Highlights (top 4-6 items)
  const highlightsEl = document.getElementById('product-modal-features-list');
  if (highlightsEl) {
    const topHighlights = displayItems.slice(0, 6);
    highlightsEl.innerHTML = topHighlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  // Product Attributes Grid (Made-in-China format)
  const attrsGrid = document.getElementById('mic-attrs-grid');
  if (attrsGrid) {
    attrsGrid.innerHTML = `
      <div class="mic-attr-row">
        <dt>Customization</dt>
        <dd>Available (OEM / ODM)</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Specialty / Subtitle</dt>
        <dd>${escapeHtml(data.section ? `${data.subtitle} (${data.section})` : (data.subtitle || data.category))}</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Department</dt>
        <dd>${escapeHtml(data.category || data.departmentGroup || 'Operating Theatre')}</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Model / Name</dt>
        <dd>${escapeHtml(data.name)}</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Certification</dt>
        <dd>CE, ISO 13485</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Clinical Group</dt>
        <dd>Adult, Pediatric &amp; Surgical</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Installation &amp; Warranty</dt>
        <dd>Local Rwandan Biomedical Support</dd>
      </div>
      <div class="mic-attr-row">
        <dt>Origin &amp; Supply</dt>
        <dd>Direct Manufacturer Supply</dd>
      </div>
    `;
  }

  // System Overview Note
  const noticeIntroEl = document.getElementById('mic-notice-intro');
  if (noticeIntroEl) {
    noticeIntroEl.innerHTML = `
      <p><strong>Clinical &amp; System Overview:</strong> ${escapeHtml(data.name)} is an authentic medical and surgical system supplied and supported directly by IKEDA Endoscopy Africa for referral hospitals, operating theatres, and clinical facilities across Rwanda and East Africa.</p>
    `;
  }

  // Full Technical Specifications Table (Direct Unified View, No Tabs)
  const tableBody = document.getElementById('mic-spec-table-body');
  if (tableBody) {
    const tableRows = parseSpecsToTable(displayItems, data);
    tableBody.innerHTML = tableRows
      .map(
        (row) => `
        <tr>
          <td><strong>${escapeHtml(row.key)}</strong></td>
          <td>${escapeHtml(row.val)}</td>
        </tr>
      `
      )
      .join('');
  }


  // Action links
  const quoteBtn = document.getElementById('product-modal-quote-btn');
  const waBtn = document.getElementById('product-modal-wa-btn');

  const deptParam = encodeURIComponent(data.departmentGroup || data.category || '');
  const productParam = encodeURIComponent(data.name || '');

  if (quoteBtn) {
    quoteBtn.href = `/contact?dept=${deptParam}&product=${productParam}`;
  }

  if (waBtn) {
    const waText = encodeURIComponent(
      `Hello IKEDA ENDOSCOPY AFRICA Ltd, I would like to request an official quote and technical specification for ${data.name} (${data.category}).`
    );
    waBtn.href = `https://wa.me/250795360359?text=${waText}`;
  }

  // Left Column Image
  const imageWrap = document.getElementById('product-modal-image-wrap');
  if (imageWrap) {
    imageWrap.innerHTML = renderProductImageHTML(data.image, data.name);
  }

  // Thumbnail Strip
  const thumbStrip = document.getElementById('mic-gallery-thumbnails');
  if (thumbStrip) {
    if (data.image) {
      thumbStrip.innerHTML = `
        <div class="mic-thumb-box active" title="${escapeHtml(data.name)}">
          <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.name)}" class="mic-thumb-img" />
        </div>
      `;
    } else {
      thumbStrip.innerHTML = '';
    }
  }

  // Zoom magnifier handlers
  const zoomBtn = document.getElementById('product-magnifier-btn');
  const handleZoom = () => {
    const currentImg = document.getElementById('product-detail-img-element');
    if (currentImg && currentImg.style.display !== 'none' && currentImg.src) {
      openZoomLightbox(currentImg.src, data.name);
    }
  };

  if (zoomBtn) {
    zoomBtn.onclick = handleZoom;
  }
  if (imageWrap) {
    imageWrap.onclick = handleZoom;
  }

  // Open modal
  backdrop.classList.add('is-open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

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
