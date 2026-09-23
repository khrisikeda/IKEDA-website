/**
 * IKEDA ENDOSCOPY AFRICA Ltd — Cutting-Edge Homepage Interactive Engine
 * Features:
 * 1. Interactive Optical Laser / Particle Canvas (Hero)
 * 2. Animated Telemetry & Stat Counters
 * 3. Interactive 4K Laparoscopic Endoscopy Tower Explorer
 * 4. Optical Clarity Visualizer (4K UHD vs Standard HD)
 * 5. Scroll-Triggered Reveal Animations
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initTelemetryCounters();
  initTowerExplorer();
  initClarityVisualizer();
  initScrollAnimations();
});

/* ==========================================================================
   1. Interactive Optical Laser / Particle Canvas Engine
   ========================================================================== */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const particleCount = 45;
  const connectionDistance = 140;

  const mouse = {
    x: null,
    y: null,
    radius: 170
  };

  function resize() {
    const parent = canvas.parentElement;
    width = canvas.width = parent.offsetWidth;
    height = canvas.height = parent.offsetHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 2 + 1;
      this.color = Math.random() > 0.4 ? 'rgba(0, 229, 255, ' : 'rgba(56, 189, 248, ';
      this.alpha = Math.random() * 0.5 + 0.2;
      this.baseAlpha = this.alpha;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;

      // Mouse interaction
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 1.5;
          this.x -= (dx / dist) * force;
          this.y -= (dy / dist) * force;
          this.alpha = Math.min(1, this.baseAlpha + 0.4);
        } else {
          this.alpha = this.baseAlpha;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.alpha + ')';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  canvas.parentElement.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.parentElement.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Connecting laser lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          const lineAlpha = (1 - dist / connectionDistance) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
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
   3. Interactive 4K Endoscopy Tower Explorer
   ========================================================================== */
const TOWER_COMPONENTS = {
  monitor: {
    title: '32" 4K UHD Surgical Medical Monitor',
    dept: 'Operating Theatre & Endoscopy Suites',
    badge: '3840 × 2160 Resolution',
    lead: 'Ultra-high definition clinical display engineered for precision minimally invasive surgery with optical anti-glare bonding.',
    specs: [
      { label: 'Color Gamut', val: 'BT.2020 / DCI-P3 98%' },
      { label: 'Luminance', val: '1000 cd/m² Surgical Daylight' },
      { label: 'Latency', val: '< 5ms Real-Time Response' },
      { label: 'Inputs', val: '12G-SDI, HDMI 2.0, DP' }
    ],
    features: [
      'Optical anti-reflective glass eliminates operating theatre glare',
      'Split-screen PIP/PBP mode for simultaneous ultrasound or fluoroscopy feed',
      'Sterilizable flat surface designed for sterile wiping protocols'
    ],
    highlightY: '12%'
  },
  camera: {
    title: '4K Ultra HD Endoscopic Camera Unit & Sensor Head',
    dept: 'Multi-Specialty Laparoscopy',
    badge: 'Sony 4K CMOS Array',
    lead: 'Quadruple Full-HD resolution providing unprecedented microvascular delineation and natural tissue texture depth.',
    specs: [
      { label: 'Sensor', val: '1/1.8" Progressive Scan CMOS' },
      { label: 'Frame Rate', val: '60 FPS Ultra-Fluid' },
      { label: 'Enhancement', val: 'Dual-Wavelength Spectral Edge' },
      { label: 'Controls', val: '4 Ergonomic Programmable Buttons' }
    ],
    features: [
      'Automated white balance and intelligent smoke/mist reduction filter',
      'Micro-capillary enhancement mode for clear lesion margin distinction',
      'IPX8 waterproof rated camera head withstands full autoclave & soaking'
    ],
    highlightY: '38%'
  },
  light: {
    title: 'Medical Grade LED Cold Light Source (80W / 100W)',
    dept: 'Optical Illumination Pipeline',
    badge: '5,700K Daylight Spectrum',
    lead: 'High-intensity cool illumination preserving natural tissue colors without thermal injury risk at scope tips.',
    specs: [
      { label: 'Lamp Life', val: '≥ 20,000 Hours Continuous' },
      { label: 'CRI Index', val: '≥ 92 Natural Color Rendition' },
      { label: 'Cable Coupler', val: 'Universal Storz / Wolf / Olympus' },
      { label: 'Cooling', val: 'Ultra-Quiet Dynamic Fan (<25dB)' }
    ],
    features: [
      'Zero heat radiation at distal tip prevents internal tissue drying',
      'Instantaneous standby/ready with no warmup downtime required',
      'Optical fiber detection automatically dims output when disconnected'
    ],
    highlightY: '56%'
  },
  insufflator: {
    title: 'Smart High-Flow CO2 Laparoscopic Insufflator (30–45 L/min)',
    dept: 'Abdominal & Pelvic Laparoscopy',
    badge: 'Microprocessor Controlled',
    lead: 'Maintains stable, comfortable pneumoperitoneum cavity pressure during active suction and electrocautery evacuation.',
    specs: [
      { label: 'Gas Flow', val: 'Adjustable 1 – 45 L/min' },
      { label: 'Pressure Range', val: '3 – 30 mmHg Precision' },
      { label: 'Heating', val: 'Internal 37°C Body Temp Preheater' },
      { label: 'Safety Relief', val: 'Dual Acoustic & Visual Overpressure' }
    ],
    features: [
      'Intelligent gas pre-heating eliminates scope lens fogging during entry',
      'High-speed auto-compensation ensures stable cavity during smoke evacuation',
      'Dedicated pediatric and bariatric operating cavity modes'
    ],
    highlightY: '72%'
  },
  telescope: {
    title: 'Sapphire Crystal Rigid Endoscopes (0° / 30°)',
    dept: 'Optical Laparoscopy & Urology',
    badge: 'German Optical Glass',
    lead: 'Precision German rod-lens optical system encased in laser-welded stainless steel with sapphire scratchproof distal windows.',
    specs: [
      { label: 'Diameters', val: '10mm / 5.5mm / 4mm' },
      { label: 'Direction', val: '0° Direct / 30° Oblique Vision' },
      { label: 'Durability', val: '134°C / 273°F Autoclave Safe' },
      { label: 'Window', val: 'Sapphire Crystal Scratch-Proof' }
    ],
    features: [
      'Edge-to-edge optical sharpness with zero peripheral image distortion',
      'Integrated high-transmission optical fiber bundle maximizes light delivery',
      'Hermetically sealed laser welding for hundreds of autoclave cycles'
    ],
    highlightY: '88%'
  }
};

function initTowerExplorer() {
  const tabs = document.querySelectorAll('.tower-tab-btn');
  const hotspots = document.querySelectorAll('.schematic-box');
  const displayTitle = document.getElementById('tower-component-title');
  const displayDept = document.getElementById('tower-component-dept');
  const displayBadge = document.getElementById('tower-component-badge');
  const displayLead = document.getElementById('tower-component-lead');
  const displaySpecs = document.getElementById('tower-component-specs');
  const displayFeatures = document.getElementById('tower-component-features');

  if (!tabs.length || !displayTitle) return;

  function selectComponent(key) {
    const data = TOWER_COMPONENTS[key];
    if (!data) return;

    tabs.forEach(tab => {
      const isMatch = tab.getAttribute('data-component') === key;
      tab.classList.toggle('active', isMatch);
      tab.setAttribute('aria-selected', isMatch);
    });

    hotspots.forEach(spot => {
      const isMatch = spot.getAttribute('data-component') === key;
      spot.classList.toggle('active', isMatch);
    });

    const panel = document.getElementById('tower-spec-panel');
    if (panel) {
      panel.style.opacity = '0.3';
      panel.style.transform = 'translateY(6px)';
    }

    setTimeout(() => {
      displayTitle.textContent = data.title;
      displayDept.textContent = data.dept;
      displayBadge.textContent = data.badge;
      displayLead.textContent = data.lead;

      displaySpecs.innerHTML = data.specs.map(s => `
        <div class="tower-spec-metric">
          <div class="tower-spec-label">${s.label}</div>
          <div class="tower-spec-val">${s.val}</div>
        </div>
      `).join('');

      displayFeatures.innerHTML = data.features.map(f => `
        <li>
          <span class="tower-check">✓</span>
          <span>${f}</span>
        </li>
      `).join('');

      if (panel) {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      }
    }, 150);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selectComponent(tab.getAttribute('data-component'));
    });
  });

  hotspots.forEach(spot => {
    spot.addEventListener('click', () => {
      selectComponent(spot.getAttribute('data-component'));
    });
  });

  selectComponent('camera');
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
   5. Scroll-Triggered Reveal Animations Engine
   ========================================================================== */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}
