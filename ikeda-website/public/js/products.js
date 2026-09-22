document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('category-grid');
  if (!grid) return;

  try {
    const categories = await fetchJSON('/api/products');
    grid.innerHTML = categories.map(renderCard).join('');
  } catch (err) {
    grid.innerHTML = '<p>Product categories could not be loaded right now.</p>';
    console.error(err);
  }
});

function renderCard(cat) {
  const specialtyClass = cat.featured ? ' is-specialty' : '';
  const badge = cat.featured
    ? `<span class="badge">${cat.tagline || 'Specialty'}</span>`
    : '';
  return `
    <article class="category-card${specialtyClass}">
      ${badge}
      <h3>${cat.name}</h3>
      <p>${cat.description}</p>
    </article>
  `;
}
