// Main shared application logic
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      nav.classList.toggle('open');
      const isOpen = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu when pressing Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu when clicking a regular link or dropdown item inside
    nav.querySelectorAll('a:not(.dropdown-trigger)').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Mobile dropdown toggle on small screens
    const dropdownItem = nav.querySelector('.nav-item-dropdown');
    const dropdownTrigger = nav.querySelector('.dropdown-trigger');
    if (dropdownItem && dropdownTrigger) {
      dropdownTrigger.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          // If on mobile and dropdown is not yet open, expand it instead of navigating immediately
          if (!dropdownItem.classList.contains('mobile-open')) {
            e.preventDefault();
            dropdownItem.classList.add('mobile-open');
            dropdownTrigger.setAttribute('aria-expanded', 'true');
          }
        }
      });
    }
  }

  // Auto copyright year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Highlight current navigation link if not explicitly set (top-level only)
  const currentPath = window.location.pathname.replace('.html', '');
  document.querySelectorAll('.main-nav > li > a').forEach((link) => {
    const rawHref = link.getAttribute('href') || '';
    const linkPath = rawHref.split('?')[0].replace('.html', '');
    if (linkPath === currentPath || (currentPath === '' && linkPath === '/')) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Initialize shared Pork House scroll animations & hero triggers
  initSharedPageAnimations();
});

// Global JSON fetch utility
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
  return res.json();
}

/* ==========================================================================
   Shared Scroll-Triggered Reveal Animations Engine (Pork House Motion Signature)
   ========================================================================== */
function initSharedPageAnimations() {
  // 1. Immediately trigger any hero on page load with cascade to next section
  const heroSection = document.querySelector('.hero');
  const towerSection = document.querySelector('#tower-explorer');

  if (heroSection) {
    const triggerHeroAndSequence = () => {
      heroSection.classList.add('in-view');
      const staggers = heroSection.querySelectorAll('.pork-stagger-parent, .pork-fade-up, .word-mask-inner');
      staggers.forEach((el) => el.classList.add('in-view'));

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

  // 2. IntersectionObserver for scroll-triggered sections and cards
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

// Global helper to trigger staggered cascade on dynamically rendered tiles/cards
window.triggerGridAnimations = function (container) {
  if (!container) return;
  container.classList.add('in-view');
  const cards = container.querySelectorAll('.category-card, .manufacturer-card, .pork-fade-up');
  cards.forEach((card, index) => {
    card.classList.add('pork-fade-up');
    card.style.transitionDelay = `${Math.min(index * 0.08, 1.2)}s`;
    requestAnimationFrame(() => {
      setTimeout(() => card.classList.add('in-view'), 30);
    });
  });
};
