/**
 * IKEDA Endoscopy Africa - Clinical Articles & Blog Modal Reader
 */
(function () {
  let articlesCache = null;

  async function getArticles() {
    if (articlesCache) return articlesCache;
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        articlesCache = await res.json();
        return articlesCache;
      }
    } catch (e) {
      console.warn('Could not fetch articles dynamically, using embedded data:', e);
    }
    return [];
  }

  function createModal() {
    let backdrop = document.getElementById('article-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'article-modal-backdrop';
      backdrop.className = 'article-modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.innerHTML = `
        <div class="article-modal-container" id="article-modal-container">
          <button class="article-modal-close-btn" id="article-modal-close-btn" aria-label="Close article modal">&times;</button>
          <div class="article-modal-hero" id="article-modal-hero">
            <img src="" alt="" id="article-modal-img" />
          </div>
          <div class="article-modal-content">
            <span class="article-modal-category" id="article-modal-category"></span>
            <h2 class="article-modal-title" id="article-modal-title"></h2>
            <div class="article-modal-meta-row">
              <span id="article-modal-author"></span>
              <span>&bull;</span>
              <span id="article-modal-date"></span>
              <span>&bull;</span>
              <span id="article-modal-time"></span>
            </div>
            <div class="article-modal-body" id="article-modal-body"></div>
            <div class="article-modal-tags" id="article-modal-tags"></div>
            <div class="article-modal-cta">
              <h4>Consult with Our Biomedical Team</h4>
              <p>Planning an operating theatre upgrade or requiring technical specifications for surgical endoscopy systems?</p>
              <div style="margin-top:0.4rem;">
                <a href="/contact" class="btn btn-cyan" style="display:inline-block; font-size:0.88rem; padding:0.6rem 1.4rem;">Request Technical Consultation &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      // Close handlers
      const closeBtn = document.getElementById('article-modal-close-btn');
      closeBtn.addEventListener('click', closeModal);

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop.classList.contains('active')) {
          closeModal();
        }
      });
    }
    return backdrop;
  }

  function closeModal() {
    const backdrop = document.getElementById('article-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  async function openArticle(articleId) {
    const articles = await getArticles();
    const article = articles.find(a => a.id === articleId || a.slug === articleId);
    if (!article) return;

    createModal();
    const backdrop = document.getElementById('article-modal-backdrop');
    const img = document.getElementById('article-modal-img');
    const cat = document.getElementById('article-modal-category');
    const title = document.getElementById('article-modal-title');
    const author = document.getElementById('article-modal-author');
    const date = document.getElementById('article-modal-date');
    const time = document.getElementById('article-modal-time');
    const body = document.getElementById('article-modal-body');
    const tags = document.getElementById('article-modal-tags');

    img.src = article.image || '';
    img.alt = article.title;
    cat.textContent = article.category || 'Clinical Insight';
    title.textContent = article.title;
    author.innerHTML = `<strong>${article.author || 'IKEDA Clinical Board'}</strong>`;
    date.textContent = article.date || '';
    time.textContent = article.readTime || '5 min read';
    body.innerHTML = article.content || `<p>${article.excerpt}</p>`;

    tags.innerHTML = (article.tags || []).map(t => `<span class="article-tag-pill"># ${t}</span>`).join('');

    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    const container = document.getElementById('article-modal-container');
    if (container) container.scrollTop = 0;
  }

  // Attach click listeners to all article triggers
  document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
      const card = e.target.closest('[data-article-id]');
      if (card) {
        e.preventDefault();
        const articleId = card.getAttribute('data-article-id');
        openArticle(articleId);
      }
    });

    // Check URL parameters for direct link e.g. ?article=slug
    const urlParams = new URLSearchParams(window.location.search);
    const articleParam = urlParams.get('article');
    if (articleParam) {
      openArticle(articleParam);
    }
  });

  window.openArticleModal = openArticle;
})();
