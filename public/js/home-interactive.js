/**
 * IKEDA ENDOSCOPY AFRICA Ltd — Cutting-Edge Homepage Interactive Engine
 * Features:
 * 1. Interactive Optical Laser / Particle Canvas (Hero)
 * 2. Animated Telemetry & Stat Counters
 * 3. Equipment Showcase (five products per department)
 * 4. Optical Clarity Visualizer (4K UHD vs Standard HD)
 * 5. Scroll-Triggered Reveal Animations
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initTelemetryCounters();
  initProductShowcase();
  initClarityVisualizer();
  initScrollAnimations();
});

/* ==========================================================================
   1. Interactive Optical Laser / Particle Canvas Engine
   ========================================================================== */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    canvas.style.display = 'none';
  }
}

/* ==========================================================================
   2. Animated Telemetry & Stat Counters
   ========================================================================== */
function initTelemetryCounters() {
  const statElements = document.querySelectorAll('[data-counter-target]');
  if (!statElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  statElements.forEach(el => observer.observe(el));

  function animateCounter(el) {
    const target = parseFloat(el.getAttribute('data-counter-target'));
    const prefix = el.getAttribute('data-counter-prefix') || '';
    const suffix = el.getAttribute('data-counter-suffix') || '';
    const duration = 1800;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * target);

      el.textContent = `${prefix}${current}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = `${prefix}${target}${suffix}`;
      }
    }

    requestAnimationFrame(update);
  }
}

/* ==========================================================================
   3. Equipment Showcase — five products from each department
   ========================================================================== */
const SHOWCASE_PER_DEPARTMENT = 5;

function showcaseEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// Pick varied items: spread across the whole department list, avoid near-duplicates
// (three models of the same table) and products already shown in another department
function pickShowcaseItems(items, count, shownElsewhere) {
  const words = (name) => name.toLowerCase().replace(/[^a-z ]+/g, ' ').trim().split(/\s+/).filter((w) => w.length > 2);
  const key = (name) => name.trim().toLowerCase();
  // Visit evenly spaced positions first so a long list contributes from every sub-range
  const order = [];
  for (let i = 0; i < count; i++) order.push(Math.floor((i * items.length) / count));
  items.forEach((_, idx) => { if (!order.includes(idx)) order.push(idx); });

  const picked = [];
  const usedWords = new Set();
  const usedImages = new Set();
  const take = (idx) => {
    const item = items[idx];
    picked.push({ item, idx });
    words(item.name).slice(0, 2).forEach((w) => usedWords.add(w));
    usedImages.add(item.image);
  };
  const isPicked = (idx) => picked.some((p) => p.idx === idx);
  const passes = [
    (item) => !shownElsewhere.has(key(item.name)) && !usedImages.has(item.image) && !words(item.name).slice(0, 2).some((w) => usedWords.has(w)),
    (item) => !shownElsewhere.has(key(item.name)) && !usedImages.has(item.image),
    (item) => !usedImages.has(item.image),
    () => true
  ];
  passes.forEach((ok) => {
    order.forEach((idx) => {
      if (picked.length < count && !isPicked(idx) && ok(items[idx])) take(idx);
    });
  });
  picked.forEach((p) => shownElsewhere.add(key(p.item.name)));
  return picked;
}

async function initProductShowcase() {
  const container = document.getElementById('home-showcase-rows');
  if (!container) return;

  let departments = [];
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    departments = await res.json();
  } catch (err) {
    container.innerHTML = '<p class="home-showcase-status"><a href="/products">Browse the full product catalog →</a></p>';
    return;
  }

  const shownSets = new Set();
  const shownProducts = new Set();
  const rows = departments.map((dept) => {
    const items = (dept.equipmentHighlights || []).filter((it) => it && it.name && it.image);
    if (!items.length) return '';
    // Skip a department that lists exactly the same products as one already shown
    const signature = items.map((it) => it.name.trim().toLowerCase()).sort().join('|');
    if (shownSets.has(signature)) return '';
    shownSets.add(signature);

    const cards = pickShowcaseItems(items, SHOWCASE_PER_DEPARTMENT, shownProducts).map(({ item, idx }) => {
      const url = '/products?product=' + encodeURIComponent(item.name.trim()) +
        '&cat=' + encodeURIComponent(dept.slug) + '&idx=' + idx;
      return `
        <a class="showcase-card" href="${url}">
          <span class="showcase-card-media">
            <img src="${showcaseEscape(item.image)}" alt="${showcaseEscape(item.name.trim())}" loading="lazy" decoding="async" />
          </span>
          <span class="showcase-card-name" translate="no">${showcaseEscape(item.name.trim())}</span>
        </a>`;
    }).join('');

    return `
      <div class="showcase-row">
        <div class="showcase-row-head">
          <h3 class="showcase-row-title">${showcaseEscape(dept.name)}</h3>
          <a class="showcase-row-link" href="/products#${encodeURIComponent(dept.slug)}">View all →</a>
        </div>
        <div class="showcase-track">${cards}</div>
      </div>`;
  }).join('');

  container.innerHTML = rows || '<p class="home-showcase-status"><a href="/products">Browse the full product catalog →</a></p>';
}

/* ==========================================================================
   4. Optical Clarity Visualizer (4K UHD vs HD Simulator)
   ========================================================================== */
function initClarityVisualizer() {
  const container = document.getElementById('clarity-compare-container');
  const handle = document.getElementById('clarity-slider-handle');
  const overlay4K = document.getElementById('clarity-overlay-4k');
  const toggleBtns = document.querySelectorAll('.clarity-mode-btn');

  if (!container || !handle || !overlay4K) return;

  let isDragging = false;

  function updateSlider(percent) {
    const clamped = Math.max(5, Math.min(95, percent));
    handle.style.left = `${clamped}%`;
    overlay4K.style.clipPath = `polygon(0 0, ${clamped}% 0, ${clamped}% 100%, 0 100%)`;
  }

  function onMove(clientX) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    updateSlider((x / rect.width) * 100);
  }

  handle.addEventListener('mousedown', () => { isDragging = true; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  container.addEventListener('mousemove', (e) => {
    if (isDragging) onMove(e.clientX);
  });

  handle.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
  container.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches[0]) onMove(e.touches[0].clientX);
  }, { passive: true });

  container.addEventListener('click', (e) => {
    if (e.target !== handle && !handle.contains(e.target)) {
      onMove(e.clientX);
    }
  });

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      if (mode === '4k') updateSlider(90);
      else if (mode === 'split') updateSlider(50);
      else updateSlider(10);
    });
  });

  updateSlider(50);
}

/* ==========================================================================
   5. Scroll-Triggered Reveal Animations Engine (Smooth Sequential Cascade)
   ========================================================================== */
function initScrollAnimations() {
  const heroSection = document.querySelector('.hero');
  const towerSection = document.querySelector('#home-showcase');

  // 1. Trigger hero elements on load and smoothly cascade into the equipment showcase
  if (heroSection) {
    const triggerHeroAndSequence = () => {
      heroSection.classList.add('in-view');
      const heroStaggers = heroSection.querySelectorAll('.pork-stagger-parent, .pork-fade-up, .word-mask-inner');
      heroStaggers.forEach((el) => el.classList.add('in-view'));

      // Seamlessly cascade into the equipment showcase without waiting for scroll
      if (towerSection) {
        setTimeout(() => {
          towerSection.classList.add('in-view');
          const towerItems = towerSection.querySelectorAll('.pork-fade-up, .word-mask-inner');
          towerItems.forEach((el, index) => {
            if (!el.classList.contains('in-view')) {
              el.style.transitionDelay = `${index * 0.14}s`;
              el.classList.add('in-view');
            }
          });
        }, 550);
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(triggerHeroAndSequence, 50);
    } else {
      window.addEventListener('load', () => setTimeout(triggerHeroAndSequence, 50));
    }
  }

  // 2. IntersectionObserver for other scroll-triggered sections (instant smooth trigger)
  const targets = document.querySelectorAll(
    '.pork-fade-up, .pork-stagger-parent, .cards-stagger-parent, .reveal-on-scroll'
  );
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add('in-view');
        el.classList.add('revealed');

        // Trigger any nested children that have pork-fade-up or word-mask-inner
        const childStaggers = el.querySelectorAll('.pork-fade-up, .word-mask-inner');
        childStaggers.forEach((c, idx) => {
          if (!c.classList.contains('in-view')) {
            c.style.transitionDelay = `${idx * 0.08}s`;
            c.classList.add('in-view');
          }
        });

        observer.unobserve(el);
      }
    });
  }, {
    threshold: 0.02,
    rootMargin: '0px 0px 80px 0px'
  });

  targets.forEach((el) => observer.observe(el));
}
