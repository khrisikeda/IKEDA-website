document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('manufacturer-grid');
  if (!grid) return;

  try {
    const manufacturers = await fetchJSON('/api/manufacturers');
    grid.innerHTML = manufacturers.map(renderCard).join('');
  } catch (err) {
    grid.innerHTML = '<p class="err-msg">Manufacturer directory could not be loaded at this time.</p>';
    console.error(err);
  }
});

function renderCard(m) {
  const tags = (m.categories || [])
    .map((c) => `<span class="tag">${c}</span>`)
    .join('');

  const featuredClass = m.featured ? ' is-featured' : '';
  const tierBadge = m.tier
    ? `<div class="manufacturer-badge">${m.tier}</div>`
    : '';

  const countryBadge = m.country
    ? `<span style="font-size:0.8rem; color:var(--ink-muted);">${m.country}</span>`
    : '';

  const link = m.website
    ? `<p style="margin-top:1.2rem; margin-bottom:0;"><a href="${m.website}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-size:0.84rem; padding:0.45rem 1rem;">Official Website &rarr;</a></p>`
    : '';

  return `
    <article class="manufacturer-card${featuredClass}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        ${tierBadge}
        ${countryBadge}
      </div>
      <h3>${m.name}</h3>
      <p>${m.description || 'Authorized partner supplying medical-grade systems across hospitals in Africa.'}</p>
      <div class="manufacturer-tags">${tags}</div>
      ${link}
    </article>
  `;
}
