let allProducts = [];
let activeGroup = 'All';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('category-grid');
  const searchInput = document.getElementById('product-search');
  const filterBtns = document.querySelectorAll('.filter-btn');

  if (!grid) return;

  // Check URL query parameters for pre-selected group
  const urlParams = new URLSearchParams(window.location.search);
  const requestedGroup = urlParams.get('group');
  if (requestedGroup) {
    activeGroup = requestedGroup;
  }

  // Set up filter buttons
  filterBtns.forEach((btn) => {
    if (btn.dataset.group === activeGroup) {
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
    renderFilteredProducts();

    // Check if an anchor hash exists (e.g. #laparoscopy)
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('is-specialty');
        }
      }, 300);
    }
  } catch (err) {
    grid.innerHTML = '<p class="err-msg">Unable to load product catalog. Please refresh or contact our technical team.</p>';
    console.error(err);
  }
});

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
        product.equipmentHighlights.some((item) => item.toLowerCase().includes(searchQuery)));

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

  const highlights = (cat.equipmentHighlights || [])
    .slice(0, 4)
    .map((item) => `<li>${item}</li>`)
    .join('');

  return `
    <article class="category-card${specialtyClass}" id="${cat.slug}">
      <div class="category-card-header">
        <span class="category-dept-group">${cat.departmentGroup || 'Hospital Care'}</span>
        ${badge}
      </div>
      <h3>${cat.name}</h3>
      <p>${cat.description}</p>

      ${
        highlights
          ? `
        <div class="equipment-list">
          <div class="equipment-list-title">Key Equipment &amp; Scopes</div>
          <ul>${highlights}</ul>
        </div>
      `
          : ''
      }

      <div class="category-card-footer">
        <span class="tag">${(cat.equipmentHighlights || []).length} Systems Cataloged</span>
        <a href="/contact?dept=${encodeURIComponent(cat.name)}" class="quote-link">
          Request Quote &rarr;
        </a>
      </div>
    </article>
  `;
}
