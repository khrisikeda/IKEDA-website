document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('manufacturer-grid');
  if (!grid) return;

  try {
    const manufacturers = await fetchJSON('/api/manufacturers');
    grid.innerHTML = manufacturers.map(renderManufacturerCard).join('');
    if (typeof triggerGridAnimations === 'function') {
      triggerGridAnimations(grid);
    }
  } catch (err) {
    grid.innerHTML = '<p class="err-msg">Manufacturer directory could not be loaded at this time.</p>';
    console.error(err);
  }
});

function renderManufacturerCard(m) {
  return `
    <article class="manufacturer-logo-card pork-fade-up">
      <div class="manufacturer-logo-box">
        <img src="${m.logo}" alt="${m.name} Logo" class="manufacturer-logo-img" loading="lazy" />
      </div>
      <div class="manufacturer-info">
        <h3 class="manufacturer-brand-name">${m.name}</h3>
        <span class="manufacturer-specialty-label">${m.specialty || ''}</span>
      </div>
    </article>
  `;
}
