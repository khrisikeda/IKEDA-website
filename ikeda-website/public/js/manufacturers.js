document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('manufacturer-grid');
  if (!grid) return;

  try {
    const manufacturers = await fetchJSON('/api/manufacturers');
    grid.innerHTML = manufacturers.map(renderCard).join('');
  } catch (err) {
    grid.innerHTML = '<p>Manufacturer list could not be loaded right now.</p>';
    console.error(err);
  }
});

function renderCard(m) {
  const tags = (m.categories || [])
    .map((c) => `<span class="tag">${c}</span>`)
    .join('');
  const link = m.website
    ? `<p><a href="${m.website}" target="_blank" rel="noopener">Visit site &rarr;</a></p>`
    : '';
  return `
    <article class="manufacturer-card">
      <div class="logo-slot">${m.logo ? `<img src="${m.logo}" alt="${m.name} logo">` : 'Logo'}</div>
      <h3>${m.name}</h3>
      <div class="tags">${tags}</div>
      ${link}
    </article>
  `;
}
