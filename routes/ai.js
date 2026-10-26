const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const COMPANY_FILE = path.join(__dirname, '..', 'data', 'company.json');

function loadData() {
  let products = [];
  let company = {};
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
    }
    if (fs.existsSync(COMPANY_FILE)) {
      company = JSON.parse(fs.readFileSync(COMPANY_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading AI data:', e);
  }
  return { products, company };
}

function normalizeWords(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).map(term => {
    const aliases = {
      baby: 'infant', babies: 'infant', newborn: 'infant', neonate: 'infant', neonatal: 'infant',
      cot: 'bed', theatre: 'operating', surgery: 'surgical',
      picture: 'image', pictures: 'image', photo: 'image', photos: 'image', cost: 'price'
    };
    return aliases[term] || term;
  });
}

function getCatalogItems(products) {
  const catalogItems = [];
  const seen = new Set();

  products.forEach(category => {
    const highlights = Array.isArray(category.equipmentHighlights) ? category.equipmentHighlights : [];
    const visit = value => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (!value || typeof value !== 'object') return;

      if (typeof value.name === 'string' && (value.image || value.specification || value.features)) {
        const hlIdx = highlights.findIndex(h => {
          const hName = typeof h === 'object' && h !== null ? h.name : h;
          return hName && hName.trim().toLowerCase() === value.name.trim().toLowerCase();
        });
        const item = {
          name: value.name,
          category: value.category || category.name,
          subtitle: value.subtitle || '',
          image: value.image || '',
          specification: value.specification || '',
          features: Array.isArray(value.features) ? value.features : [],
          slug: category.slug,
          itemIdx: hlIdx >= 0 ? hlIdx : 0
        };
        const key = item.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!seen.has(key)) {
          seen.add(key);
          catalogItems.push(item);
        }
      }

      Object.values(value).forEach(visit);
    };

    visit(category.equipmentHighlights);
    visit(category.subsections);
  });

  return catalogItems;
}

function detectQuestionType(query) {
  if (/\b(recommend|best|top pick|suggest|which one is best|which is better|which one should|what is the best)\b/i.test(query)) return 'recommend';
  if (/\b(compare|difference|versus|vs\.?|which one|better)\b/i.test(query)) return 'compare';
  if (/\b(price|pricing|cost|how much|quotation|quote|budget)\b/i.test(query)) return 'price';
  if (/\b(in stock|available|availability|deliver|delivery time|when can|how soon)\b/i.test(query)) return 'availability';
  if (/\b(image|photo|picture|see|look like|show me)\b/i.test(query)) return 'image';
  if (/\b(spec|specification|specs|dimension|size|weight|power|capacity|voltage|feature|features|what can|how does)\b/i.test(query)) return 'specification';
  return 'general';
}

function scoreProductQuality(item, query = '') {
  let score = 0;
  const name = (item.name || '').toLowerCase();
  const text = `${item.name} ${item.category} ${item.subtitle} ${item.specification} ${(item.features || []).join(' ')}`.toLowerCase();
  const q = (query || '').toLowerCase();

  // 1. Resolution / Imaging Technology
  if (name.includes('4k') || text.includes('3840') || text.includes('ultra hd')) score += 40;
  if (name.includes('icg') || text.includes('fluorescence')) score += 35;
  if (text.includes('sony cmos') || text.includes('cmos')) score += 15;
  if (name.includes('1080p') || text.includes('full hd')) score += 15;

  // 2. Motorization / Automation / Precision
  if (name.includes('motorized') || name.includes('electrical') || text.includes('electro-hydraulic')) score += 35;
  if (name.includes('servo') || text.includes('servo-controlled')) score += 30;
  if (text.includes('automated') || text.includes('automatic') || text.includes('programmable')) score += 15;
  if (name.includes('hydraulic')) score += 15;
  if (name.includes('manual')) score += 5;

  // 3. Clinical Scope (ICU, Multi-Parameter, Universal)
  if (name.includes('icu') || text.includes('intensive care')) score += 30;
  if (name.includes('multi-parameter') || text.includes('multi-specialty') || text.includes('universal')) score += 20;
  if (text.includes('dual-wall') || text.includes('dual wall') || text.includes('humidity')) score += 20;
  if (text.includes('continuous-flow') || text.includes('continuous flow')) score += 20;
  if (text.includes('pulse vacuum') || text.includes('plasma')) score += 25;

  // 4. Specification & Feature Completeness
  if (Array.isArray(item.features) && item.features.length >= 6) score += 15;
  else if (Array.isArray(item.features) && item.features.length >= 3) score += 8;
  if (item.specification && item.specification.length > 60) score += 10;
  if (item.image) score += 5;

  // 5. Query Specificity Adjustments
  if (/\b(compact|portable|foldable|mobile|transport)\b/i.test(q)) {
    if (text.includes('compact') || text.includes('portable') || text.includes('foldable') || text.includes('mobile')) {
      score += 50;
    }
  }
  if (/\b(budget|affordable|low cost|cheap|economic|manual)\b/i.test(q)) {
    if (name.includes('manual') || name.includes('hydraulic') || name.includes('1080p')) {
      score += 50;
    }
  }
  if (/\b(best|top|flagship|referral|advanced|highest)\b/i.test(q)) {
    if (name.includes('4k') || name.includes('motorized') || name.includes('icu') || name.includes('servo')) {
      score += 30;
    }
  }

  return score;
}

function generateProductRecommendation(item, isTopPick = true) {
  const name = (item.name || '').toLowerCase();
  const text = `${item.name} ${item.category} ${item.subtitle} ${item.specification} ${(item.features || []).join(' ')}`.toLowerCase();

  // Flagship Laparoscopy Towers
  if (name.includes('4k') && (name.includes('icg') || text.includes('fluorescence'))) {
    return isTopPick
      ? "Advanced 4K UHD visualization combined with real-time ICG infrared fluorescence imaging for lymphatic mapping and microvascular perfusion assessment during complex oncology and hepatobiliary surgery."
      : "High-end fluorescence-guided surgical platform for advanced specialty procedures.";
  }
  if (name.includes('4k') && (name.includes('tower') || name.includes('laparoscop'))) {
    return isTopPick
      ? "Flagship recommendation for referral hospitals: true 4K Ultra HD (3840×2160) resolution with Sony CMOS optics, delivering 4x the pixel density of standard HD for critical microvascular delineation and clear surgical margins."
      : "Top-tier 4K resolution system for advanced laparoscopic intervention.";
  }
  if (name.includes('1080p') || (name.includes('laparoscop') && text.includes('cmos') && !name.includes('4k'))) {
    return isTopPick
      ? "A reliable, cost-effective Full HD visualization tower with integrated LED cold light source, offering high color fidelity for routine theatre and community hospital procedures."
      : "A dependable Full HD alternative for routine general surgery where 4K resolution is not required, offering lower procurement overhead.";
  }
  if (name.includes('compact') || name.includes('foldable')) {
    return isTopPick
      ? "Engineered for maximum portability and rapid deployment: integrated deployable design ideal for mobile surgical teams and compact operating theatres."
      : "Best suited for mobile surgical outreach and space-constrained clinic suites.";
  }

  // Operating Tables
  if (name.includes('motorized') || name.includes('electrical') || text.includes('electro-hydraulic')) {
    return isTopPick
      ? "Our top recommendation for surgical positioning: features motorized multi-axis articulation, remote control adjustment, and longitudinal tabletop sliding for seamless C-arm intraoperative imaging."
      : "Advanced motorized surgical table offering ergonomic multi-axis patient positioning.";
  }
  if (name.includes('hydraulic') && !name.includes('electro-hydraulic')) {
    return isTopPick
      ? "A durable, low-maintenance hydraulic operating table with foot-pump elevation, engineered for high reliability in active emergency and general surgical theatres."
      : "Ideal for emergency rooms or facilities seeking power-independent mechanical reliability with zero risk of electrical downtime.";
  }
  if (name.includes('gynecology') || name.includes('delivery')) {
    return isTopPick
      ? "Specialized ergonomic engineering tailored for obstetric procedures, lithotomy positioning, and gynecological examinations with integrated waste drainage."
      : "Dedicated obstetric and gynecological examination configuration.";
  }

  // Ventilators & Critical Care
  if (name.includes('icu ventilator') || (name.includes('ventilator') && text.includes('icu'))) {
    return isTopPick
      ? "Comprehensive ICU-grade mechanical ventilation featuring lung-protective ventilation modes, high-flow nasal cannula (HFNC) therapy, and internal turbine backup for critically ill patients."
      : "Complete intensive care ventilator with full invasive and non-invasive support.";
  }
  if (name.includes('emergency') && name.includes('ventilator')) {
    return isTopPick
      ? "Rugged, portable emergency ventilator designed for rapid airway management, ambulance transport, and emergency resuscitation."
      : "Compact portable unit optimized for patient transport and emergency triage.";
  }
  if (name.includes('ventilator')) {
    return isTopPick
      ? "Versatile clinical ventilator platform supporting invasive and non-invasive ventilation across post-anesthesia recovery and intensive care units."
      : "Reliable mechanical ventilation system adaptable for intermediate care.";
  }

  // Neonatal & Maternal
  if (name.includes('incubator')) {
    return isTopPick
      ? "Servo-controlled microenvironment featuring dual-wall thermal insulation, precise skin-temperature regulation, and humidity management for premature neonate survival."
      : "Stable neonatal incubator providing reliable thermal protection.";
  }
  if (name.includes('warmer') || name.includes('radiant')) {
    return isTopPick
      ? "Instant overhead radiant warming with Apgar timer and open resuscitation access, essential for delivery suites and neonatal emergency stabilization."
      : "Best for delivery rooms and neonatal triage requiring open surgical access and rapid warming.";
  }

  // Patient Monitors
  if (name.includes('monitor') && (text.includes('multi-parameter') || text.includes('ecg') || text.includes('spo2'))) {
    return isTopPick
      ? "Multi-parameter hemodynamic monitoring delivering 12-lead ECG, SpO2, NIBP, temperature, and optional EtCO2 capnography with automated cardiac arrhythmia alarms."
      : "Comprehensive vital signs tracking for continuous clinical oversight.";
  }

  // Scopes & Optics
  if (name.includes('4k') && (name.includes('telescope') || name.includes('scope'))) {
    return isTopPick
      ? "Precision German optical rod lenses and scratch-resistant sapphire window tip engineered to resolve true 4K UHD sensor detail without chromatic aberration."
      : "High-resolution optical telescope built for 4K video processors.";
  }
  if (name.includes('hd') && (name.includes('telescope') || name.includes('scope'))) {
    return isTopPick
      ? "Standard Full HD rigid optical scope with sapphire objective window, autoclave-compatible for everyday laparoscopy."
      : "Cost-effective, durable optical rigid scope for standard HD towers.";
  }

  // Autoclaves & Sterilization
  if (name.includes('autoclave') || name.includes('steriliz')) {
    return isTopPick
      ? "Pulse vacuum cycle ensures thorough steam penetration through porous surgical packs and complex narrow-lumen laparoscopic instruments, backed by automated drying."
      : "Reliable thermal sterilization system for hospital instrument reprocessing.";
  }

  // Generic dynamic fallback
  if (item.features && item.features.length > 0) {
    const featureHighlights = item.features.slice(0, 2).map(f => f.replace(/^►\s*/, '').trim()).filter(Boolean).join('; ');
    if (featureHighlights) {
      return isTopPick
        ? `Top recommendation in ${item.category || 'this category'}: highlighted by ${featureHighlights}.`
        : `Alternative option: features ${featureHighlights}.`;
    }
  }

  return isTopPick
    ? `Top-rated clinical system in ${item.category || 'our catalog'} based on performance specifications, durability, and hospital adoption.`
    : `Alternative configuration in ${item.category || 'our catalog'} for secondary or specialized deployment.`;
}

function rankAndAnnotateRecommendations(products, query = '') {
  if (!Array.isArray(products) || !products.length) return [];

  // Score each product for clinical quality and query fit
  const scoredProducts = products.map(item => {
    const qualityScore = scoreProductQuality(item, query);
    return { ...item, qualityScore };
  });

  // Sort highest quality/recommendation score first
  scoredProducts.sort((a, b) => b.qualityScore - a.qualityScore);

  // Annotate top pick and alternatives
  return scoredProducts.map((item, index) => {
    const isRecommended = index === 0;
    const recommendationReason = generateProductRecommendation(item, isRecommended);
    const recommendationBadge = isRecommended
      ? (item.name.toLowerCase().includes('4k') ? '⭐ Top Pick • 4K Flagship'
         : item.name.toLowerCase().includes('motorized') ? '⭐ Top Pick • Motorized Precision'
         : item.name.toLowerCase().includes('icu') ? '⭐ Top Pick • ICU Grade'
         : item.name.toLowerCase().includes('servo') || item.name.toLowerCase().includes('incubator') ? '⭐ Top Pick • Neonatal Care'
         : '⭐ Top Recommendation')
      : 'Alternative Option';

    return {
      ...item,
      isRecommended,
      recommendationBadge,
      recommendationReason
    };
  });
}

function getCatalogItemByName(products, targetName) {
  const all = getCatalogItems(products);
  const target = targetName.toLowerCase().trim();
  return all.find(item => item.name.toLowerCase().trim() === target) ||
         all.find(item => item.name.toLowerCase().includes(target)) || null;
}

function buildQuotationInquiryUrl(items, department = 'Operating Theatre', facility = 'New Clinic / Operating Theatre') {
  const formattedList = (Array.isArray(items) ? items : [])
    .map((it, idx) => `${idx + 1}. ${typeof it === 'string' ? it : it.name + (it.role ? ` — ${it.role}` : '')}`)
    .join('\n');
  const message = `Hello IKEDA Team,\n\nI would like to request an official proforma quotation, technical specification sheets, and installation terms for our ${facility}:\n\nRequested Equipment List:\n${formattedList}\n\nPlease include formal quotation pricing, CE/ISO certificates, delivery lead times to Kigali, and on-site biomedical installation terms.\n\nFacility Name:\nContact Person:`;
  return `/contact?dept=${encodeURIComponent(department)}&items=${encodeURIComponent(formattedList)}&message=${encodeURIComponent(message)}`;
}

function buildWhatsAppQuotationUrl(items, facility = 'New Clinic / Operating Theatre') {
  const formattedList = (Array.isArray(items) ? items : [])
    .map((it, idx) => `• ${typeof it === 'string' ? it : it.name + (it.role ? ` (${it.role})` : '')}`)
    .join('\n');
  const text = `Hello IKEDA Africa, I would like to request an official quotation for our ${facility}:\n\n${formattedList}`;
  return `https://wa.me/250795360359?text=${encodeURIComponent(text)}`;
}

function findCatalogProducts(query, products, contextProductNames = []) {
  const ignoredTerms = new Set([
    'a', 'about', 'am', 'an', 'and', 'are', 'can', 'could', 'details', 'do', 'does',
    'for', 'give', 'have', 'hello', 'hey', 'hi', 'how', 'i', 'in', 'is', 'it', 'me',
    'of', 'on', 'please', 'product', 'products', 'show', 'some', 'tell', 'that', 'the',
    'there', 'this', 'to', 'want', 'what', 'which', 'with', 'would', 'you',
    'who', 'where', 'when', 'why', 'whose', 'whom', 'them', 'they', 'their', 'we', 'us', 'our',
    'thank', 'thanks', 'ok', 'okay', 'yes', 'no', 'bye', 'goodbye', 'help',
    'contact', 'reach', 'call', 'talk', 'speak', 'email', 'phone', 'number', 'address', 'location',
    'deliver', 'delivery', 'ship', 'shipping', 'buy', 'purchase', 'quote', 'cost', 'price',
    'think', 'logical', 'answer', 'simple', 'questions', 'question', 'assist', 'assistance'
  ]);
  const words = normalizeWords(query);
  const isFollowUp = /\b(it|that|those|them|they|this|these|its|their|same|one|more|another)\b/i.test(query);
  const contextNames = isFollowUp ? new Set(contextProductNames.map(name => name.toLowerCase())) : new Set();
  const intentTerms = new Set(['weight', 'mass', 'dimension', 'dimensions', 'size', 'length', 'width', 'height', 'voltage', 'power', 'wattage', 'frequency', 'capacity', 'load', 'price', 'pricing', 'cost', 'availability', 'available', 'stock', 'delivery', 'spec', 'specification', 'specs', 'feature', 'features', 'image', 'show', 'photo', 'picture', 'compare', 'comparison', 'difference', 'versus', 'vs', 'recommend', 'recommendation', 'best', 'suggest']);
  const terms = words.filter(term => term.length > 1 && !ignoredTerms.has(term) && !intentTerms.has(term));
  if (!terms.length && !contextNames.size) return [];

  const scored = getCatalogItems(products).map(item => {
    const searchable = normalizeWords([item.name, item.category, item.subtitle, item.specification, ...item.features].join(' '));
    const nameWords = normalizeWords(item.name);
    const matchedTerms = terms.filter(term => searchable.includes(term));
    const nameMatches = terms.filter(term => nameWords.includes(term));
    const contextMatch = contextNames.has(item.name.toLowerCase());
    const score = nameMatches.length * 10 + matchedTerms.length * 2 + (contextMatch ? 100 : 0);
    return { ...item, score, nameMatches: nameMatches.length, matchedTerms: matchedTerms.length, contextMatch };
  }).filter(item => item.matchedTerms > 0 || item.contextMatch);

  scored.sort((left, right) => right.score - left.score);
  if (isFollowUp && contextNames.size) {
    const contextual = scored.filter(item => item.contextMatch);
    if (contextual.length) {
      const items = contextual.slice(0, 3).map(({ score, nameMatches, matchedTerms, contextMatch, ...item }) => item);
      return rankAndAnnotateRecommendations(items, query);
    }
  }
  const best = scored[0];
  if (!best || best.nameMatches === 0) return [];
  // Include top candidates (same name match level or score within 60% of best)
  const results = scored.filter(item => item.nameMatches > 0 && item.score >= Math.max(best.score * 0.6, 12));
  const rawItems = results.slice(0, 3).map(({ score, nameMatches, matchedTerms, contextMatch, ...item }) => item);
  return rankAndAnnotateRecommendations(rawItems, query);
}

function buildCatalogReply(query, matches) {
  const type = detectQuestionType(query);

  // When more than one item is present, highlight the best product recommendation!
  if (matches.length > 1) {
    const recommended = matches[0];
    const alternatives = matches.slice(1);

    let reply = `I found **${matches.length} matching options** in our catalog.\n\n`;
    reply += `⭐ **Our Top Recommendation: ${recommended.name}**\n`;
    reply += `• **Why it's our top pick:** ${recommended.recommendationReason}\n\n`;

    if (alternatives.length > 0) {
      reply += `**Alternative options to consider:**\n`;
      alternatives.forEach(alt => {
        reply += `• **${alt.name}**: ${alt.recommendationReason || alt.subtitle || 'Available for secondary deployment'}\n`;
      });
      reply += `\n`;
    }

    if (type === 'price') {
      reply += `Published catalog prices depend on configuration, optional surgical tools, and shipping destination; request a formal quotation below for full pricing.\n\n`;
    } else if (type === 'availability') {
      reply += `Live stock and delivery availability depend on warehouse inventory in Kigali; contact our sales engineers for real-time lead times.\n\n`;
    } else if (type === 'compare') {
      reply += `You can compare their technical specifications side-by-side using the expandable cards below.\n\n`;
    }

    reply += `Review the technical specification cards below, or click **Open in catalog** on any item to view its complete product sheet.`;
    return reply;
  }

  // Single product matched
  const product = matches[0];
  if (type === 'price') {
    return `I couldn't find a published price for **${product.name}** in the catalog. Prices depend on configuration and delivery; use the quotation link below and our team can provide a current quote.`;
  }
  if (type === 'availability') {
    return `The online catalog doesn’t show live stock or delivery availability for **${product.name}**. Please contact the sales team for current availability and lead time.`;
  }
  if (type === 'image') {
    return `Here is the catalog image I found for **${product.name}**. Click **Open in catalog** to inspect high-resolution views.`;
  }
  if (type === 'specification') {
    const requestedDetail = /\b(weight|mass)\b/i.test(query) ? 'weight' :
      /\b(dimension|dimensions|size|length|width|height)\b/i.test(query) ? 'dimensions' :
        /\b(voltage|power|wattage|frequency)\b/i.test(query) ? 'electrical specifications' :
          /\b(capacity|load|payload)\b/i.test(query) ? 'capacity or load rating' : '';
    const hasSpec = product.specification || (product.features && product.features.length);
    if (!hasSpec) {
      return `I found **${product.name}**, but the catalog doesn’t list full technical specifications for it yet. Contact our engineering team for the complete technical datasheet.`;
    }
    return `Here are the specifications recorded for **${product.name}**:\n${product.recommendationReason ? `\n⭐ **Clinical Note:** ${product.recommendationReason}\n` : ''}\nExpand the specification card below to review the technical parameters.`;
  }

  let singleReply = `I found **${product.name}** in our catalog.\n`;
  if (product.recommendationReason) {
    singleReply += `\n⭐ **Clinical Note:** ${product.recommendationReason}\n`;
  }
  singleReply += `\nOpen the card below for the available specifications and product image, or click **Open in catalog** to view the full product sheet.`;
  return singleReply;
}

// ── OFFICIAL DEPARTMENT DIRECTORY & CLINICAL TAXONOMY ─────────
const DEPARTMENT_DIRECTORY = {
  'operating-theatre': {
    id: 'operating-theatre',
    aliases: ['operating theatre', 'theatre', 'theater', 'operating room', 'or', 'surgery', 'surgical suite', 'operating room suite'],
    name: 'Operating Theatre & Surgical Infrastructure',
    catalogCategory: 'Operating Theatre',
    slug: 'operating-theatre',
    group: 'Operating Theatre',
    subdivisions: [
      'Minimally Invasive Surgery & Laparoscopy (4K & Full HD)',
      'Urology & Endourology (Holmium/Thulium Lasers & PCNL)',
      'VATS & Advanced Energy Surgery (Harmonic Scalpels & LigaSure)',
      'Orthopedics & Traumatology (C-Arm Radiolucent Positioning)',
      'Gynecology & Women’s Surgical Health',
      'Anesthesia & Surgical Hemodynamic Life Support'
    ],
    overview: 'Sterile surgical suites designed for invasive, endoscopic, open, and minimally invasive procedures requiring surgical airflow, multi-axis patient positioning, shadowless LED illumination, and anesthesia workstations.',
    coreEquipment: [
      { name: 'Laparoscopy Tower 4K', role: 'Flagship 4K UHD endoscopic visualization system with Sony CMOS sensor' },
      { name: 'Motorized operating table', role: 'Electro-hydraulic multi-axis table with longitudinal C-arm slide' },
      { name: 'Surgical light', role: 'Dual-dome shadowless ceiling LED lamp (160,000 Lux)' },
      { name: 'Surgical pendants', role: 'Articulated ceiling medical gas and monitor carrier' },
      { name: 'Anesthesia machine', role: 'Integrated ventilation and volatile anesthetic delivery workstation' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Intraoperative hemodynamic and vital signs monitoring' },
      { name: 'Autoclave 23L- DENGGUAN', role: 'Pre-and-post pulsed vacuum steam autoclave for sterile scope reprocessing' }
    ],
    purchasingAdvice: 'When purchasing for an operating theatre, prioritize the visualization tower resolution (4K for tertiary/oncology surgery vs 1080p for routine general surgery), verify C-arm sliding on the operating table, and ensure a pulsed-vacuum autoclave is included for narrow-lumen instruments.'
  },
  'icu': {
    id: 'icu',
    aliases: ['icu', 'intensive care', 'intensive care unit', 'critical care', 'critical care unit', 'ccu', 'sicu', 'micu', 'hdu', 'high dependency'],
    name: 'Intensive Care Unit (ICU) & High Dependency Unit (HDU)',
    catalogCategory: 'Intensive Care Unit (ICU)',
    slug: 'intensive-care-unit-icu',
    group: 'Critical Care & Emergency',
    subdivisions: [
      'Medical Intensive Care (MICU)',
      'Surgical Intensive Care (SICU)',
      'Cardiac Care & Coronary Care (CCU)',
      'High Dependency Step-Down Unit (HDU)'
    ],
    overview: 'High-acuity clinical units dedicated to continuous invasive mechanical ventilation, hemodynamic stabilization, syringe infusion therapy, and vital signs monitoring for critically ill patients.',
    coreEquipment: [
      { name: 'ICU Ventilator', role: 'Turbine-driven invasive & non-invasive mechanical life support ventilator' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: '12.1" continuous multi-parameter telemetry with arrhythmia detection' },
      { name: 'Infusion pump', role: 'High-precision intravenous fluid and inotropic infusion' },
      { name: 'Syringe pump', role: 'Micro-dose targeted pharmacotherapy for vasoactive drugs' },
      { name: 'Defibrillator', role: 'Emergency biphasic defibrillation with external pacing' }
    ],
    purchasingAdvice: 'Choose turbine-driven ICU ventilators (like IKEDA’s ICU Ventilator) so ventilation operates independently of central hospital compressed air piping, and pair every bed with dedicated syringe pumps and a multi-parameter hemodynamic monitor.'
  },
  'emergency': {
    id: 'emergency',
    aliases: ['emergency', 'emergency room', 'er', 'casualty', 'casualty care', 'triage', 'trauma', 'trauma bay', 'accident and emergency', 'a&e'],
    name: 'Emergency & Casualty Care Department (ER / Trauma)',
    catalogCategory: 'Emergency & Casualty Care',
    slug: 'emergency-casualty-care',
    group: 'Critical Care & Emergency',
    subdivisions: ['Trauma Resuscitation Bay', 'Acute Observation Unit', 'Triage & Rapid Assessment', 'Emergency Ambulance Transport'],
    overview: 'First-line acute department for emergency trauma resuscitation, shock reversal, cardiopulmonary stabilization, acute airway management, and rapid casualty transfer.',
    coreEquipment: [
      { name: 'Emergency ventilator', role: 'Ruggedized, portable battery-powered emergency transport ventilator' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Rapid vital signs acquisition for acute triage' },
      { name: 'Defibrillator', role: 'Biphasic manual/AED defibrillator with pacing and ECG' },
      { name: 'Suction machine', role: 'High-vacuum emergency mobile airway suction unit' },
      { name: 'Patient stretcher trolley', role: 'Heavy-duty hydraulic mobile trauma transport trolley' }
    ],
    purchasingAdvice: 'Emergency equipment must be portable, battery-resilient, and shock-resistant. Ensure mobile suction and transport ventilators are stocked with backup batteries for rapid patient transit.'
  },
  'neonatal': {
    id: 'neonatal',
    aliases: ['neonatal', 'nicu', 'infant', 'newborn', 'premature', 'baby', 'scbu', 'special care baby unit', 'pediatric care', 'nursery'],
    name: 'Neonatal Intensive Care Unit (NICU) & Infant Care',
    catalogCategory: 'Neonatal & Pediatric Care',
    slug: 'neonatal-pediatric-care',
    group: 'Maternal & Infant',
    subdivisions: ['NICU Level III (Extremely Preterm <28 weeks)', 'Special Care Baby Unit (SCBU)', 'Neonatal Jaundice Phototherapy Bay'],
    overview: 'Specialized thermal-controlled pods providing servo-controlled temperature and humidity, HEPA air filtration, jaundice phototherapy, and gentle non-invasive support for vulnerable preterm infants.',
    coreEquipment: [
      { name: 'Baby incubator BB100', role: 'Dual-wall servo-controlled infant incubator with humidity chamber' },
      { name: 'BN-100 Radiant warmer', role: 'Overhead infant resuscitation warmer with APGAR timer' },
      { name: 'Infant phototherapy incubator', role: 'High-intensity blue LED phototherapy for hyperbilirubinemia' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Neonatal SpO2 micro-sensor and respiration monitoring' },
      { name: 'Baby scale', role: 'High-precision digital neonatal weight scale' }
    ],
    purchasingAdvice: 'For preterm infants needing long-term thermoregulation, purchase the Baby Incubator BB100; for immediate resuscitation right after birth, purchase the BN-100 Radiant Warmer.'
  },
  'maternity': {
    id: 'maternity',
    aliases: ['maternity', 'obstetric', 'obstetrics', 'labor', 'labour', 'delivery ward', 'labor and delivery', 'labor ward', 'postnatal', 'antenatal'],
    name: 'Maternity, Labor & Delivery Ward',
    catalogCategory: 'Maternity & Obstetrics',
    slug: 'maternity-obstetrics',
    group: 'Maternal & Infant',
    subdivisions: ['Labor & Delivery Suites', 'Obstetric Triage', 'Antenatal Assessment', 'Post-Partum Recovery Wards'],
    overview: 'Clinical suites designed for maternal labor, normal and instrumental deliveries, continuous fetal heart monitoring, obstetric examination, and immediate newborn reception.',
    coreEquipment: [
      { name: 'Gynecology surgical table', role: 'Ergonomic obstetric delivery table with leg crutches and waste basin' },
      { name: 'BN-100 Radiant warmer', role: 'Immediate delivery-side newborn resuscitation warmer' },
      { name: 'Fetal Doppler monitor', role: 'Fetal heart rate tracking during labor contractions' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Continuous maternal blood pressure and pulse oximetry' },
      { name: 'Surgical light', role: 'Shadowless illumination for delivery and perineal repair' }
    ],
    purchasingAdvice: 'Always pair an obstetric delivery table with an adjacent BN-100 Radiant Warmer so the newborn receives immediate thermal stabilization without delaying maternal post-partum care.'
  },
  'cssd': {
    id: 'cssd',
    aliases: ['cssd', 'sterilization', 'sterilising', 'autoclave room', 'infection control', 'decontamination', 'reprocessing', 'spd', 'central sterile'],
    name: 'Central Sterile Services Department (CSSD) & Infection Control',
    catalogCategory: 'Operating Theatre',
    slug: 'operating-theatre',
    group: 'Operating Theatre',
    subdivisions: ['Decontamination & Washing Bay', 'Inspection & Packaging Zone', 'Sterile Storage & Distribution'],
    overview: 'The infection-control backbone of the hospital responsible for receiving, cleaning, high-pressure steam autoclaving, biological validation, and sterile distribution of surgical sets.',
    coreEquipment: [
      { name: 'Autoclave 23L- DENGGUAN', role: 'Class B pre-and-post pulsed vacuum steam autoclave for hollow/lumen tools' },
      { name: 'CSSD Sterilization Drums & Baskets', role: 'Stainless steel instrument storage and transport containers' },
      { name: 'Ultrasonic cleaning bath', role: 'Enzymatic cavitation pre-cleaning of delicate microsurgical instruments' }
    ],
    purchasingAdvice: 'Only purchase Class B pulsed-vacuum steam autoclaves for surgical facilities. Simple gravity autoclaves cannot evacuate air from narrow-lumen laparoscopic or urological scopes, risking non-sterility.'
  },
  'radiology': {
    id: 'radiology',
    aliases: ['radiology', 'imaging', 'diagnostic imaging', 'x-ray', 'xray', 'c-arm', 'ultrasound', 'sonography', 'fluoroscopy'],
    name: 'Radiology & Diagnostic Imaging Department',
    catalogCategory: 'Radiology & Diagnostic Imaging',
    slug: 'radiology-diagnostic-imaging',
    group: 'Diagnostics & Specialty',
    subdivisions: ['Interventional Fluoroscopy & C-Arm Suite', 'Color Doppler Ultrasound Clinic', 'Digital Radiography (DR) X-Ray'],
    overview: 'Medical imaging suites providing real-time intraoperative fluoroscopic C-arm guidance, acoustic multi-frequency Doppler scanning, and digital radiographic diagnostics.',
    coreEquipment: [
      { name: 'C-Arm', role: 'Mobile surgical fluoroscopy system for intraoperative orthopedic and vascular guidance' },
      { name: '4D Color Doppler ultrasound machine', role: 'Abdominal, vascular, obstetric, and cardiac sonography platform' },
      { name: 'Digital Radiography (DR)', role: 'High-frequency digital chest, skeletal, and trauma X-ray system' },
      { name: 'Mobile X-ray unit', role: 'Bedside diagnostic imaging for ICU and non-ambulatory patients' }
    ],
    purchasingAdvice: 'When purchasing a C-arm, ensure the operating theatre has a radiolucent carbon-fiber table with longitudinal sliding (like the Motorized Operating Table) and lead radiation protection garments.'
  },
  'ophthalmology': {
    id: 'ophthalmology',
    aliases: ['ophthalmology', 'eye', 'eye clinic', 'eye care', 'ophthalmic', 'optometry', 'cataract clinic', 'glaucoma'],
    name: 'Ophthalmology & Eye Care Clinic / Theatre',
    catalogCategory: 'Ophthalmology & Eye Care',
    slug: 'ophthalmology-eye-care',
    group: 'Diagnostics & Specialty',
    subdivisions: ['Outpatient Diagnostic Lane', 'Cataract & Phaco Microsurgical Theatre', 'Refraction & Glaucoma Screening'],
    overview: 'Specialized eye clinic providing slit-lamp biomicroscopy, intraocular pressure measurement for glaucoma, objective keratometry refraction, and phacoemulsification cataract surgery.',
    coreEquipment: [
      { name: 'Slit lamp', role: 'High-luminance biomicroscope for anterior and posterior eye segment examination' },
      { name: 'Non-contact tonometer', role: 'Gentle air-puff intraocular pressure screening for glaucoma' },
      { name: 'Autorefractor keratometer', role: 'Automated corneal curvature and refractive error diagnostic system' },
      { name: 'Ophthalmic operating microscope', role: 'High-resolution coaxial illumination for cataract and corneal microsurgery' },
      { name: 'Phacoemulsifier', role: 'Ultrasonic cataract emulsification and aspiration workstation' }
    ],
    purchasingAdvice: 'A foundational eye diagnostic clinic requires a Slit Lamp, Autorefractor Keratometer, and Non-Contact Tonometer. For cataract surgery, pair a Phacoemulsifier with an Ophthalmic Operating Microscope.'
  },
  'dentistry': {
    id: 'dentistry',
    aliases: ['dentistry', 'dental', 'dental clinic', 'oral surgery', 'dentist', 'orthodontics', 'periodontics', 'teeth'],
    name: 'Dentistry & Maxillofacial Surgery Department',
    catalogCategory: 'Dentistry & Oral Surgery',
    slug: 'dentistry-oral-surgery',
    group: 'Diagnostics & Specialty',
    subdivisions: ['Operative Dental Suite', 'Pediatric Dentistry', 'Oral & Maxillofacial Surgery', 'Dental CSSD'],
    overview: 'Comprehensive oral healthcare facilities featuring ergonomic dental chairs, high/low-speed handpieces, intraoral radiography, ultrasonic scaling, and Class-B autoclave sterilizers.',
    coreEquipment: [
      { name: 'Dental treatment unit', role: 'Ergonomic patient chair with integrated LED lighting, suction, and delivery unit' },
      { name: 'Dental autoclave sterilizer', role: 'Rapid Class-B vacuum autoclave engineered for dental handpieces' },
      { name: 'Ultrasonic piezo scaler', role: 'Plaque and calculus removal without damaging tooth enamel' },
      { name: 'Intraoral camera', role: 'High-resolution chairside patient visual consultation wand' },
      { name: 'Dental X-ray unit', role: 'High-frequency intraoral periapical radiography generator' }
    ],
    purchasingAdvice: 'Ensure the dental treatment unit includes an oil-free medical air compressor and an automated suction separator. Dental handpieces require a dedicated Class-B autoclave for internal lumen sterilization.'
  },
  'ent': {
    id: 'ent',
    aliases: ['ent', 'ear nose throat', 'otorhinolaryngology', 'audiology', 'rhinology', 'laryngology', 'hearing'],
    name: 'ENT (Ear, Nose & Throat) / Otorhinolaryngology',
    catalogCategory: 'ENT (Ear, Nose & Throat)',
    slug: 'ent-ear-nose-throat',
    group: 'Diagnostics & Specialty',
    subdivisions: ['ENT Consultation Bay', 'Rigid Sinus Endoscopy Suite (FESS)', 'Audiology Hearing Assessment'],
    overview: 'Specialized head-and-neck department for endoscopic nasal/sinus/laryngeal examination, pneumatic tympanometry, pure-tone audiometry, and outpatient suction/irrigation.',
    coreEquipment: [
      { name: 'ENT treatment workstation', role: 'All-in-one console with medical suction, pre-heated sprays, and scope disinfection' },
      { name: 'Rigid ENT endoscope', role: '0°, 30°, and 70° rigid telescopes for sinus and vocal cord visualization' },
      { name: 'Audiometer', role: 'Diagnostic air and bone conduction hearing threshold evaluation' },
      { name: 'Tympanometer', role: 'Middle ear acoustic admittance and stapedial reflex testing' }
    ],
    purchasingAdvice: 'Purchase the ENT treatment workstation with pre-heated instrument drawers and integrated suction to streamline outpatient patient turnover.'
  },
  'physiotherapy': {
    id: 'physiotherapy',
    aliases: ['physiotherapy', 'rehab', 'rehabilitation', 'physical therapy', 'traction', 'electrotherapy', 'kinesiology'],
    name: 'Physiotherapy & Physical Rehabilitation Unit',
    catalogCategory: 'Physiotherapy & Rehabilitation',
    slug: 'physiotherapy-rehabilitation',
    group: 'Diagnostics & Specialty',
    subdivisions: ['Spinal Traction Suite', 'Electro-Physical Therapy Bay', 'Rehabilitation Gym & Ambulation'],
    overview: 'Rehabilitation suites for post-surgical orthopedic recovery, spinal decompression traction, neuromuscular electro-stimulation, and deep heat diathermy.',
    coreEquipment: [
      { name: 'Lumbar & cervical traction bed', role: 'Microcomputer motorized spinal decompression table' },
      { name: 'Shortwave diathermy', role: 'Deep thermal radiofrequency therapy for chronic joint pain' },
      { name: 'Therapeutic ultrasound', role: 'Acoustic deep tissue heating for tendonitis and muscle spasms' },
      { name: 'TENS electrotherapy stimulator', role: 'Neuromuscular electrical stimulation for pain management' }
    ],
    purchasingAdvice: 'Motorized lumbar and cervical traction beds are the highest-revenue rehabilitation asset, effective for herniated discs and sciatica.'
  },
  'wards': {
    id: 'wards',
    aliases: ['wards', 'ward', 'inpatient', 'general ward', 'hospital room', 'patient room', 'hospital bed', 'hospital furniture'],
    name: 'General Hospital Inpatient Wards & Infrastructure',
    catalogCategory: 'General Hospital Materials',
    slug: 'general-hospital-materials',
    group: 'General Hospital Materials',
    subdivisions: ['Medical & Surgical Inpatient Wards', 'Private VIP Suites', 'Step-Down Recovery Wards'],
    overview: 'Inpatient recovery wards providing patient nursing comfort, adjustable beds, hygienic bedside storage, and mobile nursing trolleys.',
    coreEquipment: [
      { name: 'Electric hospital bed', role: 'Multi-function electric bed with handset and nurse lock control' },
      { name: 'Manual 2-crank hospital bed', role: 'Reliable manual backrest and kneerest positioning bed' },
      { name: 'Bedside locker', role: 'Hygienic patient bedside cabinet with drawer and dining tray bracket' },
      { name: 'Overbed table', role: 'Height-adjustable patient dining and medication surface' },
      { name: 'Stainless steel dressing trolley', role: 'Mobile two-shelf nursing wound-care and medication trolley' },
      { name: 'IV infusion stand', role: 'Stainless steel 4-hook mobile drip stand with castors' }
    ],
    purchasingAdvice: 'For high-capacity general wards, manual 2-crank hospital beds provide robust long-term durability with zero electrical maintenance. For private/VIP rooms, electric beds significantly improve patient comfort.'
  }
};

// ── PRODUCT-TO-DEPARTMENT KNOWLEDGE REPOSITORY ───────────
const PRODUCT_DEPARTMENT_KNOWLEDGE = [
  {
    pattern: /\b(autoclave|steriliz\w*|cssd|decontaminat\w*)\b/i,
    displayName: 'Autoclave & Steam Sterilizer (CSSD Reprocessing Unit)',
    primaryDepartment: 'Central Sterile Services Department (CSSD) & Operating Theatre',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'High-pressure pulsed-vacuum saturated steam sterilization (121°C–134°C) engineered to penetrate deep into narrow-lumen laparoscopic, urological, and orthopedic instruments, eliminating all vegetative microorganisms, viruses, and resistant bacterial endospores.',
    secondaryDeployments: [
      'Dental Suites: Essential for Class-B rapid sterilization of hollow dental handpieces and burs.',
      'Maternity & Labor Wards: Reprocessing of episiotomy instruments and obstetric delivery trays.',
      'Outpatient Surgical Clinics: Fast turnaround instrument reprocessing for day procedures.'
    ],
    recommendedModel: 'Autoclave 23L- DENGGUAN',
    whyRecommended: 'Equipped with a Class B fractionated pre-and-post vacuum cycle, stainless steel pressure chamber, and automated vacuum dry cycle specifically compliant with narrow-lumen endoscopic scope requirements.',
    companionItems: [
      { name: 'Stainless steel CSSD sterilization drums', role: 'Instrument packaging and storage' },
      { name: 'Ultrasonic cleaning bath', role: 'Cavitation pre-cleaning of biological debris' }
    ],
    catalogNames: ['Autoclave 23L- DENGGUAN']
  },
  {
    pattern: /\b(incubator|isolette|baby\s*incubator|infant\s*incubator)\b/i,
    displayName: 'Neonatal Infant Incubator',
    primaryDepartment: 'Neonatal Intensive Care Unit (NICU) & Pediatrics',
    primarySlug: 'neonatal-pediatric-care',
    departmentGroup: 'Maternal & Infant',
    clinicalRole: 'Creates an enclosed, sterile, servo-controlled microclimatic environment with precise temperature regulation, regulated humidity, and HEPA air filtration to support premature (<37 weeks) and low-birth-weight neonates.',
    secondaryDeployments: [
      'Special Care Baby Unit (SCBU): Step-down care for growing preterm infants.',
      'Pediatric Recovery Suites: Post-operative thermoregulation for neonatal surgery.'
    ],
    recommendedModel: 'Baby incubator BB100',
    alternativeModel: 'BN-100 Radiant warmer',
    whyRecommended: 'Dual-wall design drastically reduces radiant convective heat loss; servo-controlled microcomputer temperature regulating with skin and air sensors, and integrated humidity chamber.',
    whyAlternative: 'For delivery rooms requiring immediate 360° open-bed resuscitation and APGAR scoring right after birth, choose the BN-100 Radiant Warmer instead.',
    companionItems: [
      { name: 'BN-100 Radiant warmer', role: 'Immediate delivery room resuscitation' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Neonatal vital signs tracking' },
      { name: 'Infant phototherapy incubator', role: 'Hyperbilirubinemia phototherapy' }
    ],
    catalogNames: ['Baby incubator BB100', 'BN-100 Radiant warmer']
  },
  {
    pattern: /\b(radiant\s*warmer|infant\s*warmer|baby\s*warmer|resuscitation\s*warmer)\b/i,
    displayName: 'Infant Radiant Warmer',
    primaryDepartment: 'Maternity, Labor & Delivery Ward',
    primarySlug: 'maternity-obstetrics',
    departmentGroup: 'Maternal & Infant',
    clinicalRole: 'Provides immediate overhead infrared radiant warming and unobstructed 360° physical access for neonatal resuscitation, airway suctioning, bag-mask ventilation, umbilical line catheterization, and APGAR assessment right after birth.',
    secondaryDeployments: [
      'Neonatal Intensive Care Unit (NICU): Acute infant admission and shock stabilization bay.',
      'Emergency Department (Pediatric Bay): Critical newborn hypothermia stabilization.'
    ],
    recommendedModel: 'BN-100 Radiant warmer',
    whyRecommended: 'Microcomputer servo-controlled heating, overhead examination light, built-in APGAR timer, skin temperature sensor, and tilting bassinet for drainage.',
    companionItems: [
      { name: 'Baby scale', role: 'Immediate birth weight documentation' },
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Neonatal SpO2 tracking' },
      { name: 'Gynecology surgical table', role: 'Delivery bed stationed adjacent to warmer' }
    ],
    catalogNames: ['BN-100 Radiant warmer', 'Baby incubator BB100']
  },
  {
    pattern: /\b(laparoscop\w*|tower|video\s*tower|endoscop\w*|camera\s*system|surgical\s*tower|cmos)\b/i,
    displayName: 'Minimally Invasive Laparoscopy Tower',
    primaryDepartment: 'Operating Theatre (Minimally Invasive Surgery Suite)',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'Delivers high-definition magnification, cold LED illumination, automated CO2 pneumoperitoneum insufflation, and intraoperative video recording for laparoscopic cholecystectomy, appendectomy, gynecological laparoscopy, and colorectal resection.',
    secondaryDeployments: [
      'Ambulatory Day-Surgery Theatres: Outpatient general and gynecological procedures.',
      'Urology Suites: Laparoscopic nephrectomy, pyeloplasty, and pelvic surgery.'
    ],
    recommendedModel: 'Laparoscopy Tower 4K',
    alternativeModel: 'Laparoscopy Tower 1080p with 1/2.8" CMOS',
    whyRecommended: 'True 4K Ultra HD (3840×2160) resolution powered by a Sony CMOS sensor provides 4x the pixel density of standard Full HD, resolving delicate microvascular structures and clear tissue planes with zero latency.',
    whyAlternative: 'For community and district hospitals performing routine general surgery, the 1080p Full HD tower delivers dependable clinical clarity at a significantly lower capital cost.',
    companionItems: [
      { name: 'Motorized operating table', role: 'Electro-hydraulic multi-axis table with Trendelenburg' },
      { name: 'Surgical light', role: 'Dual-dome shadowless ceiling LED lamp (160,000 Lux)' },
      { name: 'Autoclave 23L- DENGGUAN', role: 'Pulsed vacuum steam autoclave for scope reprocessing' },
      { name: 'Anesthesia machine', role: 'Operating theatre ventilation and gas workstation' }
    ],
    catalogNames: ['Laparoscopy Tower 4K', 'Laparoscopy Tower 1080p with 1/2.8" CMOS']
  },
  {
    pattern: /\b(operating\s*table|surgical\s*table|theatre\s*table|or\s*table)\b/i,
    displayName: 'Surgical Operating Table',
    primaryDepartment: 'Operating Theatre (OT)',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'Provides multi-axis ergonomic patient positioning for general, laparoscopic, orthopedic, urological, and gynecological surgery, supporting Trendelenburg, reverse Trendelenburg, lateral tilt, flex/reflex, and C-arm fluoroscopy.',
    secondaryDeployments: [
      'Emergency Trauma Theatres: Rapid damage-control surgical positioning.',
      'Day Surgery Centres: Ergonomic outpatient surgical procedures.'
    ],
    recommendedModel: 'Motorized operating table',
    alternativeModel: 'Hydraulic operating table (hydraulic for height adjustment)',
    whyRecommended: 'Electro-hydraulic motorized adjustment with wired remote control, multi-axis micro-positioning, memory settings, and longitudinal tabletop sliding (up to 400mm) for unobstructed C-Arm intraoperative fluoroscopy.',
    whyAlternative: 'For facilities in regions with unstable electrical power or emergency theatres seeking zero electrical downtime, the heavy-duty hydraulic foot-pump table provides unmatched mechanical reliability.',
    companionItems: [
      { name: 'Surgical light', role: 'Shadowless illumination over the table' },
      { name: 'Orthopedic traction', role: 'Optional fracture traction extension frame' }
    ],
    catalogNames: ['Motorized operating table', 'Hydraulic operating table (hydraulic for height adjustment)']
  },
  {
    pattern: /\b(anesthesia|anaesthesia|anesthesia\s*machine|vaporizer|gas\s*machine)\b/i,
    displayName: 'Anesthesia Workstation',
    primaryDepartment: 'Operating Theatre (OT)',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'Delivers precise mixtures of oxygen, nitrous oxide, and medical air alongside volatile liquid anesthetics (Isoflurane / Sevoflurane), providing continuous mechanical lung ventilation and scavenging of waste gases during general anesthesia.',
    secondaryDeployments: [
      'Interventional Radiology: Deep sedation for endovascular stenting and embolization.',
      'Endoscopy Suites: Monitored anesthesia care (MAC) for complex therapeutic colonoscopy and ERCP.'
    ],
    recommendedModel: 'Anesthesia machine',
    whyRecommended: 'Features an integrated 10.4" display, dual Selectatec vaporizer manifolds, multi-mode ventilation (VCV, PCV, SIMV, PSV), and integrated spirometry with turbine backup.',
    companionItems: [
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Continuous EtCO2, ECG, NIBP, and hemodynamic tracking' },
      { name: 'Anesthesia laryngoscope', role: 'Intubation airway management set' },
      { name: 'Surgical pendants', role: 'Ceiling gas supply drop for O2, N2O, Air, and Vacuum' }
    ],
    catalogNames: ['Anesthesia machine', 'Anesthesia laryngoscope']
  },
  {
    pattern: /\b(patient\s*monitor|vital\s*signs\s*monitor|hemodynamic\s*monitor|biolight|multiparameter\s*monitor)\b/i,
    displayName: 'Multi-Parameter Patient Monitor',
    primaryDepartment: 'Universal High-Acuity Deployment (Operating Theatre & ICU)',
    primarySlug: 'intensive-care-unit-icu',
    departmentGroup: 'Critical Care & Emergency',
    clinicalRole: 'Continuous real-time physiological tracking of ECG rhythm, heart rate, pulse oximetry (SpO2), Non-Invasive Blood Pressure (NIBP), dual temperature channels, and optional invasive blood pressure / EtCO2 capnography.',
    secondaryDeployments: [
      'Operating Theatre: Intraoperative hemodynamic monitoring.',
      'Intensive Care Unit (ICU / HDU): Bedside continuous telemetry.',
      'Emergency & Casualty Department: Triage and shock resuscitation monitoring.',
      'Post-Anesthesia Care Unit (PACU): Post-operative anesthetic recovery.'
    ],
    recommendedModel: 'Patient monitor BIOLIGHT M12 Standard option',
    whyRecommended: 'Large 12.1" color TFT display, robust anti-electrosurgical interference algorithms (essential for operating theatre electrosurgery), comprehensive ST-segment analysis, arrhythmia detection, and rechargeable lithium backup battery.',
    companionItems: [
      { name: 'ICU Ventilator', role: 'Paired for respiratory failure management in ICU' },
      { name: 'Anesthesia machine', role: 'Paired for intraoperative monitoring in theatre' }
    ],
    catalogNames: ['Patient monitor BIOLIGHT M12 Standard option']
  },
  {
    pattern: /\b(ventilator|icu\s*ventilator|mechanical\s*ventilator|respirator)\b/i,
    displayName: 'ICU Mechanical Ventilator',
    primaryDepartment: 'Intensive Care Unit (ICU)',
    primarySlug: 'intensive-care-unit-icu',
    departmentGroup: 'Critical Care & Emergency',
    clinicalRole: 'Provides invasive and non-invasive positive pressure life support ventilation for patients with acute respiratory failure, ARDS, septic shock, post-resuscitation, and severe neurological injury.',
    secondaryDeployments: [
      'Emergency Resuscitation Bay: Immediate stabilization of acute respiratory arrest.',
      'High Dependency Unit (HDU): Non-invasive bilevel ventilation (BiPAP/CPAP) and High-Flow Nasal Cannula (HFNC).'
    ],
    recommendedModel: 'ICU Ventilator',
    alternativeModel: 'Emergency ventilator',
    whyRecommended: 'Equipped with an internal ultra-quiet turbine allowing full operation independent of central compressed air pipelines, lung-protective ventilation modes (PRVC, SIMV, PSV), and comprehensive mechanics monitoring.',
    whyAlternative: 'For emergency ambulance transit and rapid casualty intake, choose the Emergency Ventilator with ruggedized shockproof casing and extended battery.',
    companionItems: [
      { name: 'Patient monitor BIOLIGHT M12 Standard option', role: 'Continuous vital signs tracking' },
      { name: 'Infusion pump', role: 'Continuous sedation and inotropic infusion' }
    ],
    catalogNames: ['ICU Ventilator', 'Ventilator', 'Emergency ventilator']
  },
  {
    pattern: /\b(c[-\s]*arm|fluoroscop\w*|mobile\s*x[-\s]*ray|surgical\s*imaging)\b/i,
    displayName: 'Mobile Surgical C-Arm System',
    primaryDepartment: 'Operating Theatre (Orthopedics, Spine, Trauma & Vascular) & Radiology',
    primarySlug: 'radiology-diagnostic-imaging',
    departmentGroup: 'Diagnostics & Specialty',
    clinicalRole: 'Generates real-time, high-resolution X-ray fluoroscopy video directly inside the operating theatre, allowing surgeons to verify orthopedic bone screw placement, spinal alignment, and vascular stent deployment without moving the patient.',
    secondaryDeployments: [
      'Interventional Radiology & Pain Management: Targeted fluoroscopic nerve blocks.',
      'Urology Operating Suites: Intraoperative guidance during PCNL kidney stone extraction.'
    ],
    recommendedModel: 'C-Arm Fluoroscopy Platform',
    whyRecommended: 'High-frequency generator with pulsed fluoroscopy for minimum radiation dose to surgical staff, dual monitor viewing console, and high-heat-capacity rotating anode tube.',
    companionItems: [
      { name: 'Motorized operating table', role: 'Radiolucent carbon-fiber table with longitudinal sliding' },
      { name: 'Orthopedic traction', role: 'Traction extension for fracture reduction' }
    ],
    catalogNames: ['Motorized operating table', 'Orthopedic traction']
  },
  {
    pattern: /\b(surgical\s*light|operating\s*light|shadowless\s*light|surgical\s*pendant|ceiling\s*pendant)\b/i,
    displayName: 'Shadowless LED Surgical Lights & Ceiling Pendants',
    primaryDepartment: 'Operating Theatre (OT)',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'Provides high-intensity shadowless surgical illumination (up to 160,000 Lux) with adjustable focal depth, while ceiling articulating pendants organize medical gases (O2, N2O, Air, Vac), power, and endoscopic monitors off the theatre floor.',
    secondaryDeployments: [
      'Labor & Delivery Suites: Shadowless illumination for obstetric deliveries.',
      'Emergency Trauma Bays: High-intensity surgical illumination for acute trauma wound exploration.'
    ],
    recommendedModel: 'Surgical light',
    alternativeModel: 'Portable surgical light (2012-5)',
    whyRecommended: 'Dual-dome ceiling-mounted configuration utilizing Osram LED diodes with 50,000+ hour service life, 160,000 Lux peak output, color temperature adjustment (3800K–5000K), and aerodynamic design for laminar airflow.',
    whyAlternative: 'For outpatient clinics, emergency rooms, or facilities without reinforced structural ceilings, the Portable Mobile Surgical Light (50,000 Lux) provides flexible, wheeled positioning.',
    companionItems: [
      { name: 'Surgical pendants', role: 'Ceiling gas and monitor arm carrier' },
      { name: 'Motorized operating table', role: 'Positioned directly beneath the dual domes' }
    ],
    catalogNames: ['Surgical light', 'Portable surgical light (2012-5)', 'Surgical pendants']
  },
  {
    pattern: /\b(dental|dentist|oral\s*surgery|dental\s*chair|dental\s*unit|scaler)\b/i,
    displayName: 'Dental Operatory & Oral Surgery Suite',
    primaryDepartment: 'Dentistry & Oral Surgery',
    primarySlug: 'dentistry-oral-surgery',
    departmentGroup: 'Diagnostics & Specialty',
    clinicalRole: 'Complete dental examination, restorative cavity preparation, ultrasonic periodontal scaling, oral maxillofacial surgery, and dental intraoral radiography.',
    recommendedModel: 'Dental treatment unit',
    whyRecommended: 'Ergonomic memory-position dental patient chair, integrated LED operating lamp with sensor switch, seamless assistant control console, multi-function foot control, and high/low-speed handpiece connections.',
    companionItems: [
      { name: 'Ultrasonic piezo scaler', role: 'Supragingival and subgingival calculus removal' },
      { name: 'Intraoral camera', role: 'High-magnification patient chairside visual consultation' }
    ],
    catalogNames: ['Dental treatment unit', 'Ultrasonic piezo scaler', 'Intraoral camera']
  },
  {
    pattern: /\b(ophthalmolog\w*|eye|slit\s*lamp|phaco\w*|cataract|tonometer|optometry)\b/i,
    displayName: 'Ophthalmic Diagnostic & Microsurgical Systems',
    primaryDepartment: 'Ophthalmology & Eye Care',
    primarySlug: 'ophthalmology-eye-care',
    departmentGroup: 'Diagnostics & Specialty',
    clinicalRole: 'Comprehensive ocular diagnostics, slit-lamp anterior segment evaluation, non-contact intraocular pressure screening for glaucoma, and phacoemulsification cataract microsurgery.',
    recommendedModel: 'Slit lamp',
    alternativeModel: 'Non-contact tonometer',
    whyRecommended: 'Galilean optical system with 5-step magnification, high-luminance LED illumination, wide field of view, and yellow filter for corneal fluorescein assessment.',
    companionItems: [
      { name: 'Non-contact tonometer', role: 'Rapid gentle intraocular pressure measurement' },
      { name: 'Autorefractor keratometer', role: 'Automated objective refraction and corneal curvature' }
    ],
    catalogNames: ['Slit lamp', 'Non-contact tonometer', 'Autorefractor keratometer']
  },
  {
    pattern: /\b(ent|ear|nose|throat|audiometer|tympanometer|sinuscope|otolaryngolog\w*)\b/i,
    displayName: 'ENT Treatment Workstation & Diagnostic Suite',
    primaryDepartment: 'ENT (Ear, Nose & Throat) / Otorhinolaryngology',
    primarySlug: 'ent-ear-nose-throat',
    departmentGroup: 'Diagnostics & Specialty',
    clinicalRole: 'Outpatient head-and-neck diagnostics, pneumatic ear suction, pre-heated irrigation, rigid sinus endoscopy (0°/30°/70°), and pure-tone audiometric hearing assessment.',
    recommendedModel: 'ENT treatment workstation',
    whyRecommended: 'Integrated all-in-one console featuring quiet medical vacuum suction, spray pumps with heated medication bottles, pre-warming instrument drawers, and rigid endoscope disinfection holders.',
    companionItems: [
      { name: 'Rigid ENT endoscope', role: '0° & 30° sinus and laryngeal visualization' },
      { name: 'Audiometer', role: 'Air and bone conduction hearing evaluation' }
    ],
    catalogNames: ['ENT treatment workstation', 'Rigid ENT endoscope', 'Audiometer']
  },
  {
    pattern: /\b(hospital\s*bed|ward\s*bed|electric\s*bed|manual\s*bed|patient\s*bed|bedside\s*locker|iv\s*stand|stretcher|trolley)\b/i,
    displayName: 'Hospital Ward Inpatient Furniture',
    primaryDepartment: 'General Hospital Materials & Inpatient Wards',
    primarySlug: 'general-hospital-materials',
    departmentGroup: 'General Hospital Materials',
    clinicalRole: 'Provides safe patient resting, backrest and kneerest positioning, nurse height adjustment, and bedside medical storage across inpatient medical, surgical, and recovery wards.',
    recommendedModel: 'Electric hospital bed',
    alternativeModel: 'Manual 2-crank hospital bed',
    whyRecommended: 'Electric multi-function adjustment with handset and attendant control panel, CPR quick release, trendelenburg tilt, and integrated backup battery.',
    whyAlternative: 'For high-capacity general wards seeking cost-effective durability with zero electrical maintenance, the manual 2-crank or 3-crank hospital bed is the gold standard.',
    companionItems: [
      { name: 'Bedside locker', role: 'Hygienic patient bedside cabinet with drawer and dining tray bracket' },
      { name: 'Overbed table', role: 'Height-adjustable patient dining and medication surface' },
      { name: 'IV infusion stand', role: 'Stainless steel mobile 4-hook drip stand' }
    ],
    catalogNames: ['Electric hospital bed', 'Manual 2-crank hospital bed', 'Bedside locker']
  },
  {
    pattern: /\b(urolog\w*|holmium|thulium|ureteroscop\w*|pcnl|cystoscop\w*|resectoscop\w*|lithotrip\w*)\b/i,
    displayName: 'Urology & Endourology Surgical Suite',
    primaryDepartment: 'Operating Theatre (Urology & Endourology Division)',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'Transurethral and percutaneous minimally invasive surgical treatment of kidney, ureteral, and bladder stones, benign prostatic hyperplasia (BPH) resection, and urinary tract strictures.',
    recommendedModel: 'Holmium Laser & PCNL Surgical Set',
    whyRecommended: 'Provides high-energy pulse lithotripsy to pulverize all urinary stone compositions into fine dust, paired with continuous irrigation resectoscopes and rigid ureteroscopes for clear intraoperative visualization.',
    companionItems: [
      { name: 'Laparoscopy Tower 4K', role: 'High-definition endoscopic visualization camera' },
      { name: 'Motorized operating table', role: 'With lithotomy leg stirrups and C-arm fluoroscopy access' },
      { name: 'Autoclave 23L- DENGGUAN', role: 'Pulsed vacuum steam sterilization for narrow-lumen urological tools' }
    ],
    catalogNames: ['Laparoscopy Tower 4K', 'Motorized operating table', 'Autoclave 23L- DENGGUAN']
  },
  {
    pattern: /\b(vats|thorac\w*|harmonic|ligasure|ultrasonic\s*scalpel|vessel\s*seal\w*|electrosurg\w*)\b/i,
    displayName: 'Advanced Energy & VATS Division',
    primaryDepartment: 'Operating Theatre (VATS & Advanced Energy Division)',
    primarySlug: 'operating-theatre',
    departmentGroup: 'Operating Theatre',
    clinicalRole: 'Simultaneous ultrasonic cutting and vessel coagulation up to 5mm diameter with minimal lateral thermal spread (<1mm), safeguarding vital adjacent nerves, ureters, and major vessels during thoracic and abdominal surgery.',
    recommendedModel: 'Harmonic surgical procedure',
    whyRecommended: 'Minimizes blood loss and operating time compared to traditional electrosurgery, eliminates electrical current passage through the patient’s body, and reduces post-operative tissue inflammation.',
    companionItems: [
      { name: 'Laparoscopy Tower 4K', role: 'Endoscopic visualization platform' },
      { name: 'Motorized operating table', role: 'Surgical positioning table' },
      { name: 'Surgical pendants', role: 'Ceiling mounting for energy generator' }
    ],
    catalogNames: ['Harmonic surgical procedure', 'Laparoscopy Tower 4K']
  }
];

function resolveDepartmentDeciderQuery(query, products) {
  const q = query.toLowerCase().trim();

  // 1. REVERSE QUERY: "What products belong in [Department]?" / "What equipment belongs in the ICU?"
  for (const deptKey of Object.keys(DEPARTMENT_DIRECTORY)) {
    const dept = DEPARTMENT_DIRECTORY[deptKey];
    const isDeptMatched = dept.aliases.some(alias => {
      const aliasPattern = new RegExp(`\\b${alias.replace(/\s+/g, '\\s*')}\\b`, 'i');
      return aliasPattern.test(q);
    });

    if (isDeptMatched) {
      const isAskingWhatBelongs =
        /\b(what\s*(products?|equipment|items?|machines?)\s*(belong|are|needed|used|in)|which\s*(products?|equipment|items?)\s*belong|what\s*belongs?\s*in|list\s*(products?|equipment)|show\s*(products?|equipment)|products?\s*for|equipment\s*for)\b/i.test(q) ||
        /\b(belong\s*in|belongs\s*in)\b/i.test(q);

      if (isAskingWhatBelongs) {
        const coreEquipmentList = dept.coreEquipment
          .map((item, idx) => `**${idx + 1}. ${item.name}**\n   • *Clinical Role*: ${item.role}`)
          .join('\n\n');

        const subdivisionsList = dept.subdivisions.map(sub => `• ${sub}`).join('\n');

        const rawMatches = dept.coreEquipment.map(item => getCatalogItemByName(products, item.name)).filter(Boolean);
        const annotatedProducts = rankAndAnnotateRecommendations(rawMatches, q);

        const reply = `Here is the official clinical breakdown of equipment that belongs in the **${dept.name}**:\n\n` +
          `🏥 **Department Clinical Purpose:**\n${dept.overview}\n\n` +
          `📋 **Core Equipment Systems in this Department:**\n\n` +
          `${coreEquipmentList}\n\n` +
          `🏢 **Clinical Sub-Divisions & Specialized Suites:**\n${subdivisionsList}\n\n` +
          `💡 **Clinical Purchasing Advice:**\n${dept.purchasingAdvice}\n\n` +
          `You can review matching systems below, or click **Send Inquiry for Quotation** to submit this complete department equipment list for an official proforma quote.`;

        return {
          reply,
          products: annotatedProducts,
          actions: [
            {
              label: `Send Inquiry for Quotation (${dept.name.split('&')[0].trim()})`,
              url: buildQuotationInquiryUrl(dept.coreEquipment, dept.name, dept.name)
            },
            {
              label: `WhatsApp Quotation List`,
              url: buildWhatsAppQuotationUrl(dept.coreEquipment, dept.name)
            },
            {
              label: `Browse ${dept.name.split('&')[0].trim()} Catalog`,
              url: `/products?category=${encodeURIComponent(dept.catalogCategory)}`
            }
          ]
        };
      }
    }
  }

  // 2. FORWARD QUERY: "Which department does [Product] belong in / to?" / "Where does the autoclave belong?"
  for (const knowledge of PRODUCT_DEPARTMENT_KNOWLEDGE) {
    if (knowledge.pattern.test(q)) {
      const isAskingWhereItBelongs =
        /\b(which\s*department|what\s*department|where\s*(does|do|is|should)\b.*\b(belong|used|located|go|placed)|department\s*(does|do|is)\b.*\bbelong|belong\s*(to|in)\s*(which|what)?\s*department)\b/i.test(q) ||
        /\b(which\s*ward|what\s*ward|which\s*unit|what\s*unit|where\s*does\s*it\s*go)\b/i.test(q) ||
        /\b(belong\s*in|belongs\s*in|belong\s*to|belongs\s*to)\b/i.test(q);

      if (isAskingWhereItBelongs) {
        const secondaryText = knowledge.secondaryDeployments && knowledge.secondaryDeployments.length
          ? `\n\n🔄 **Cross-Department & Dual Deployments:**\n` + knowledge.secondaryDeployments.map(s => `• ${s}`).join('\n')
          : '';

        const companionText = knowledge.companionItems && knowledge.companionItems.length
          ? `\n\n📦 **Essential Companion Items Used in this Department:**\n` + knowledge.companionItems.map(c => `• **${c.name}**: ${c.role}`).join('\n')
          : '';

        const reply = `**${knowledge.displayName}** belongs primarily in the following hospital department:\n\n` +
          `🏥 **Primary Department:** **${knowledge.primaryDepartment}**\n` +
          `📁 **Catalog Section:** [${knowledge.departmentGroup}] (/products?category=${encodeURIComponent(knowledge.primarySlug)})\n\n` +
          `🩺 **Clinical Role in this Department:**\n${knowledge.clinicalRole}${secondaryText}${companionText}\n\n` +
          `⭐ **Recommended Purchasing Choice:**\n**${knowledge.recommendedModel}** — ${knowledge.whyRecommended}` +
          (knowledge.alternativeModel ? `\n\n*Alternative option:* **${knowledge.alternativeModel}** — ${knowledge.whyAlternative}` : '');

        const rawMatches = (knowledge.catalogNames || [knowledge.recommendedModel])
          .map(name => getCatalogItemByName(products, name))
          .filter(Boolean);
        const annotatedProducts = rankAndAnnotateRecommendations(rawMatches, q);

        const itemsForQuote = [
          { name: knowledge.recommendedModel, role: knowledge.clinicalRole.slice(0, 75) + '...' },
          ...(knowledge.companionItems || [])
        ];

        return {
          reply,
          products: annotatedProducts,
          actions: [
            {
              label: `Send Inquiry for Quotation (${knowledge.recommendedModel})`,
              url: buildQuotationInquiryUrl(itemsForQuote, knowledge.primaryDepartment, knowledge.recommendedModel)
            },
            {
              label: `WhatsApp Direct Inquiry`,
              url: buildWhatsAppQuotationUrl(itemsForQuote, knowledge.recommendedModel)
            },
            {
              label: `Browse ${knowledge.departmentGroup} Catalog`,
              url: `/products?group=${encodeURIComponent(knowledge.departmentGroup)}`
            }
          ]
        };
      }
    }
  }

  return null;
}

function resolvePurchasingAdviceQuery(query, products, context = {}) {
  const q = query.toLowerCase().trim();

  // Detect explicit purchasing question
  const isAskingWhatToPurchase =
    /\b(which|what|help\s*me\s*decide\s*what|recommend\s*(an?|which)?|guide\s*me\s*on\s*what)\b.*\b(purchase|buy)\b/i.test(q) ||
    /\b(which\s*item\s*to\s*(purchase|buy)|what\s*item\s*to\s*(purchase|buy)|which\s*one\s*to\s*(purchase|buy)|what\s*to\s*(purchase|buy))\b/i.test(q) ||
    /\b(which\s*(item|product|equipment|model|machine|system|tower|table|ventilator|incubator|autoclave|c[-\s]*arm|chair|bed)\s*(should|to|do|can)\s*(i|we|people|clients|surgeons|hospitals)?\s*(purchase|buy|choose|pick|invest))\b/i.test(q);

  if (!isAskingWhatToPurchase) return null;

  // 1. Check if asking about a specific equipment family
  for (const knowledge of PRODUCT_DEPARTMENT_KNOWLEDGE) {
    if (knowledge.pattern.test(q)) {
      const companionFormatted = knowledge.companionItems && knowledge.companionItems.length
        ? knowledge.companionItems.map((c, i) => `${i + 1}. **${c.name}** — ${c.role}`).join('\n')
        : '• Relevant consumables and surgical instrument sets.';

      const reply = `Here is our clinical equipment purchasing guidance for **${knowledge.displayName}**:\n\n` +
        `⭐ **Top Recommended Item to Purchase: ${knowledge.recommendedModel}**\n` +
        `• **Clinical Rationale**: ${knowledge.whyRecommended}\n` +
        `• **Primary Department**: ${knowledge.primaryDepartment}\n\n` +
        (knowledge.alternativeModel ? `🔄 **Alternative Option by Constraint:**\n• **${knowledge.alternativeModel}**: ${knowledge.whyAlternative}\n\n` : '') +
        `📦 **Mandatory Companion Items to Purchase Together:**\n` +
        `To ensure complete operational readiness upon delivery in Rwanda, you should purchase the following paired items alongside the core system:\n` +
        `${companionFormatted}\n\n` +
        `📋 **Quotation Pre-Filled**: I have compiled this recommended purchasing package into our quotation system. Click **Send Inquiry for Quotation** below to submit this complete equipment list for an official proforma quote.`;

      const rawMatches = (knowledge.catalogNames || [knowledge.recommendedModel])
        .map(name => getCatalogItemByName(products, name))
        .filter(Boolean);
      const annotatedProducts = rankAndAnnotateRecommendations(rawMatches, q);

      const itemsForQuote = [
        { name: knowledge.recommendedModel, role: `Core System — ${knowledge.displayName}` },
        ...(knowledge.companionItems || [])
      ];

      return {
        reply,
        products: annotatedProducts,
        actions: [
          {
            label: `Send Inquiry for Quotation (${knowledge.recommendedModel})`,
            url: buildQuotationInquiryUrl(itemsForQuote, knowledge.primaryDepartment, knowledge.recommendedModel)
          },
          {
            label: `WhatsApp Quotation List`,
            url: buildWhatsAppQuotationUrl(itemsForQuote, knowledge.recommendedModel)
          },
          {
            label: `Browse ${knowledge.departmentGroup} Catalog`,
            url: `/products?group=${encodeURIComponent(knowledge.departmentGroup)}`
          }
        ],
        consultation: {
          active: true,
          packageName: knowledge.displayName,
          items: itemsForQuote.map(it => it.name)
        }
      };
    }
  }

  // 2. Check if asking what to purchase for a specific department
  for (const deptKey of Object.keys(DEPARTMENT_DIRECTORY)) {
    const dept = DEPARTMENT_DIRECTORY[deptKey];
    const isDeptMatched = dept.aliases.some(alias => {
      const aliasPattern = new RegExp(`\\b${alias.replace(/\s+/g, '\\s*')}\\b`, 'i');
      return aliasPattern.test(q);
    });

    if (isDeptMatched) {
      const coreEquipmentList = dept.coreEquipment
        .map((item, idx) => `**${idx + 1}. ${item.name}**\n   • *Role*: ${item.role}`)
        .join('\n\n');

      const reply = `Here is our clinical equipment purchasing guidance for the **${dept.name}**:\n\n` +
        `⭐ **Essential Systems to Purchase:**\n` +
        `${coreEquipmentList}\n\n` +
        `💡 **Procurement Advice:**\n${dept.purchasingAdvice}\n\n` +
        `📋 **Quotation Pre-Filled**: Click **Send Inquiry for Quotation** below to submit this complete department equipment list for an official proforma quote.`;

      const rawMatches = dept.coreEquipment.map(item => getCatalogItemByName(products, item.name)).filter(Boolean);
      const annotatedProducts = rankAndAnnotateRecommendations(rawMatches, q);

      return {
        reply,
        products: annotatedProducts,
        actions: [
          {
            label: `Send Inquiry for Quotation (${dept.name.split('&')[0].trim()})`,
            url: buildQuotationInquiryUrl(dept.coreEquipment, dept.name, dept.name)
          },
          {
            label: `WhatsApp Quotation List`,
            url: buildWhatsAppQuotationUrl(dept.coreEquipment, dept.name)
          },
          {
            label: `Browse ${dept.name.split('&')[0].trim()} Catalog`,
            url: `/products?category=${encodeURIComponent(dept.catalogCategory)}`
          }
        ],
        consultation: {
          active: true,
          packageName: dept.name,
          items: dept.coreEquipment.map(it => it.name)
        }
      };
    }
  }

  // 3. General fallback
  return {
    reply: "To give you the most accurate clinical recommendation on **which item to purchase**, tell me about your facility:\n\n" +
      "1. 🏥 **Which hospital department are you equipping?**\n" +
      "   *(e.g., Operating Theatre, ICU, Maternity, Emergency, Ophthalmology, Dental, or CSSD?)*\n" +
      "2. 🔬 **What surgical or clinical procedures will be performed?**\n" +
      "   *(e.g., General Laparoscopy, Endourology, Orthopedic Trauma, or Neonatal Intensive Care?)*\n" +
      "3. ⚡ **What are your infrastructure and volume needs?**\n" +
      "   *(e.g., Flagship 4K resolution vs cost-effective Full HD; Motorized vs power-independent hydraulic?)*\n\n" +
      "Or mention any specific equipment (such as *laparoscopy tower, ventilator, autoclave, operating table, incubator*), and I will provide an immediate purchasing blueprint with paired accessories and official proforma quote pricing.",
    actions: [
      { label: "Operating Theatre Consultation", url: "/products?group=Operating+Theatre" },
      { label: "Request General Hospital Quote", url: "/contact#quote-form" },
      { label: "WhatsApp Clinical Desk", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20need%20advice%20on%20which%20medical%20equipment%20to%20purchase" }
    ]
  };
}

// Comprehensive clinical knowledge search & logical response generator
function generateAIResponse(userQuery, context = {}) {
  const q = (userQuery || '').toLowerCase().trim();
  const { products, company } = loadData();

  // 1. EMPTY QUERY / INITIAL WIDGET OPEN
  if (!q) {
    return {
      reply: "Hello! I am IKEDA's Clinical AI Assistant. How can I assist your surgical team or hospital facility today? You can ask me about our 4K Laparoscopic Towers, Urology & Lasers, VATS instruments, ICU equipment, quotations, or our Kigali facility.",
      actions: [
        { label: "Browse Product Catalog", url: "/products" },
        { label: "Request Official Quotation", url: "/contact#quote-form" },
        { label: "WhatsApp Direct", url: "https://wa.me/250795360359?text=Hello%20IKEDA%20Africa,%20I%20would%20like%20to%20inquire%20about%20your%20medical%20equipment" }
      ]
    };
  }

  // 2. GREETINGS & SALUTATIONS
  if (/^(hi|hello|hey|good\s+(morning|afternoon|evening|day)|greetings)(\s+(there|ikeda|team|doctor|dr))?[!. ]*$/i.test(q)) {
    return {
      reply: "Hello! Welcome to **IKEDA ENDOSCOPY AFRICA**. I am your Clinical Equipment Advisor.\n\nHow can I help you today? You can ask me to compare surgical systems (such as 4K vs 1080p), look up equipment specifications, explain clinical procedures, or prepare a formal quotation for your hospital.",
      actions: [
        { label: "Browse Product Catalog", url: "/products" },
        { label: "Request Quotation", url: "/contact#quote-form" }
      ]
    };
  }

  // 3. GRATITUDE, COURTESIES & ACKNOWLEDGMENTS
  if (/^(thank\s*you|thanks|thank\s*u|thx|many\s*thanks|appreciate(\s*it)?|great|awesome|perfect|excellent|good\s*job|helpful|very\s*helpful|ok\s*thanks?|okay\s*thanks?)[!. ]*$/i.test(q) ||
      /\b(thank\s*you|thanks\s*a\s*lot|thank\s*you\s*very\s*much)\b/i.test(q)) {
    return {
      reply: "You're very welcome! It's my pleasure to assist.\n\nIf you need technical datasheets, clinical comparisons, or an official proforma quotation for your hospital or surgical department, feel free to ask anytime or reach our Kigali engineering team directly.",
      actions: [
        { label: "Request Formal Quotation", url: "/contact#quote-form" },
        { label: "WhatsApp Direct", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20thank%20you%20for%20the%20information.%20I%20would%20like%20to%20connect%20with%20your%20team" }
      ]
    };
  }

  // 4. FAREWELLS
  if (/^(bye|goodbye|see\s*you|have\s*a\s*good\s*(day|evening)|talk\s*later|cya)[!. ]*$/i.test(q)) {
    return {
      reply: "Goodbye! Thank you for consulting **IKEDA ENDOSCOPY AFRICA**. Wishing you and your surgical team success. We look forward to supporting your healthcare facility whenever you're ready.",
      actions: [
        { label: "Contact Us", url: "/contact" }
      ]
    };
  }

  // 4B. HOSPITAL DEPARTMENT DECIDER & CLINICAL PLACEMENT ENGINE
  const deptDeciderRes = resolveDepartmentDeciderQuery(q, products);
  if (deptDeciderRes) return deptDeciderRes;

  // 4C. INFORMED CLINICAL PURCHASING ADVISOR ("WHICH ITEM TO PURCHASE")
  const purchasingAdviceRes = resolvePurchasingAdviceQuery(q, products, context);
  if (purchasingAdviceRes) return purchasingAdviceRes;

  // ── 5. CLINIC SETUP & OPERATING THEATRE CONSULTATION ENGINE ──
  const isExplicitListRequest =
    /\b(put\s*everything\s*(they|we|i|you)?\s*requested\s*(as\s*a\s*list\s*)?in\s*(send\s*)?inquiry|quotation\s*list|inquiry\s*list|list\s*(all\s*)?(for\s*)?quotation|list\s*in\s*send\s*inquiry|send\s*inquiry\s*for\s*quotation|inquiry\s*for\s*quotation)\b/i.test(q);

  const isClinicInquiry =
    /\b(open|opening|start|starting|setup|set\s*up|setting\s*up|build|building|equip|equipping|furnish|furnishing|establish|establishing|new)\b.*\b(clinic|theatre|theater|operating\s*room|hospital|surgical\s*cent(er|re)|suite|facility)\b/i.test(q) ||
    /\b(what\s*(is|do\s*we)?\s*(needed|required|necessary)|what\s*equipment|recommend\s*equipment|tailor\s*equipment)\b.*\b(operating\s*theatre|operating\s*room|theatre|theater|clinic|hospital|suite)\b/i.test(q) ||
    /\b(clinic\s*package|theatre\s*package|hospital\s*package|turnkey\s*(setup|clinic|theatre))\b/i.test(q) ||
    /\b(help\s*(me|us)?\s*(choose|select|pick)\s*(products|equipment)\s*(for|to)\s*(a|an|my|our)?\s*(clinic|theatre|hospital))\b/i.test(q) ||
    /\b(tailor\s*(equipment|products)\s*(to\s*)?(our|my)?\s*needs)\b/i.test(q) ||
    isExplicitListRequest;

  const consultationCtx = (context && context.consultation) || {};
  const isConsultationFollowUp = consultationCtx.active &&
    (/\b(laparoscop|gynecolog|obstetric|uro|urolog|orthoped|general\s*surgery|day\s*surgery|maternity|icu|4k|1080p|hd|motorized|hydraulic|budget|affordable|advanced|both|all|room)\b/i.test(q));

  if (isClinicInquiry || isConsultationFollowUp) {
    const hasSpecialty = /\b(laparoscop|gynecolog|obstetric|uro|urolog|orthoped|general\s*surgery|day\s*surgery|maternity|icu)\b/i.test(q) || consultationCtx.specialty;
    const hasTier = /\b(4k|1080p|hd|compact|budget|affordable|advanced)\b/i.test(q) || consultationCtx.tier;
    const hasTable = /\b(motorized|hydraulic)\b/i.test(q) || consultationCtx.table;

    // A. TAILORED CONSULTATION (When client answered diagnostic questions or specified clinic needs)
    if (isConsultationFollowUp || (isClinicInquiry && (hasSpecialty || hasTier || hasTable)) || isExplicitListRequest) {
      const isUrology = /\b(uro|urolog|pcnl|litho|stone)\b/i.test(q) || (consultationCtx.specialty && consultationCtx.specialty.includes('urology'));
      const isMaternity = /\b(matern|obstetric|infant|baby|delivery)\b/i.test(q) || (consultationCtx.specialty && consultationCtx.specialty.includes('maternity'));
      const isDaySurgery = /\b(day\s*surgery|ambulatory|budget|affordable|low\s*cost|compact)\b/i.test(q) || (consultationCtx.specialty && consultationCtx.specialty.includes('day'));
      const prefers4K = /\b(4k|advanced|oncology|top|flagship)\b/i.test(q) || (!isDaySurgery && (consultationCtx.tier === '4K' || !consultationCtx.tier));
      const prefersHydraulic = /\b(hydraulic|manual|unstable|power\s*outage)\b/i.test(q) || consultationCtx.table === 'hydraulic';

      let packageName = "General & Laparoscopy Operating Theatre Suite";
      let tailoredItems = [];
      let rawProductMatches = [];

      if (isMaternity) {
        packageName = "Maternal, Obstetrics & Neonatal Clinic Suite";
        tailoredItems = [
          { name: "Gynecology surgical table", role: "Ergonomic obstetric delivery & examination table with leg stirrups" },
          { name: "Baby incubator BB100", role: "Dual-wall servo-controlled infant thermal incubator" },
          { name: "BN-100 Radiant warmer", role: "Overhead infant resuscitation warmer with APGAR timer" },
          { name: "Patient monitor BIOLIGHT M12 Standard option", role: "Maternal vital signs & hemodynamic monitoring" },
          { name: "Surgical light", role: "Ceiling-mounted shadowless LED illumination" },
          { name: "Autoclave 23L- DENGGUAN", role: "CSSD instrument sterilization unit" }
        ];
        rawProductMatches = [
          getCatalogItemByName(products, 'Gynecology surgical table'),
          getCatalogItemByName(products, 'Baby incubator BB100'),
          getCatalogItemByName(products, 'BN-100 Radiant warmer'),
          getCatalogItemByName(products, 'Patient monitor BIOLIGHT M12 Standard option'),
          getCatalogItemByName(products, 'Surgical light'),
          getCatalogItemByName(products, 'Autoclave 23L- DENGGUAN')
        ].filter(Boolean);
      } else if (isUrology) {
        packageName = "Urology & Endourology Operating Suite";
        tailoredItems = [
          { name: prefers4K ? "Laparoscopy Tower 4K" : "Laparoscopy Tower 1080p with 1/2.8\" CMOS", role: "High-definition endoscopic visualization tower" },
          { name: "Motorized operating table", role: "Radiolucent electro-hydraulic table with longitudinal C-Arm slide" },
          { name: "Surgical light", role: "Dual-dome shadowless LED lamp (160,000 Lux)" },
          { name: "Surgical pendants", role: "Ceiling articulating medical gas & monitor system" },
          { name: "Anesthesia machine", role: "Multi-mode ventilation workstation with Selectatec vaporizers" },
          { name: "Patient monitor BIOLIGHT M12 Standard option", role: "Continuous vital signs & arrhythmia monitoring" },
          { name: "Autoclave 23L- DENGGUAN", role: "Pulsed vacuum steam autoclave for narrow-lumen urological instruments" }
        ];
        rawProductMatches = [
          getCatalogItemByName(products, prefers4K ? 'Laparoscopy Tower 4K' : 'Laparoscopy Tower 1080p with 1/2.8" CMOS'),
          getCatalogItemByName(products, 'Motorized operating table'),
          getCatalogItemByName(products, 'Surgical light'),
          getCatalogItemByName(products, 'Surgical pendants'),
          getCatalogItemByName(products, 'Anesthesia machine'),
          getCatalogItemByName(products, 'Patient monitor BIOLIGHT M12 Standard option'),
          getCatalogItemByName(products, 'Autoclave 23L- DENGGUAN')
        ].filter(Boolean);
      } else if (isDaySurgery) {
        packageName = "Outpatient Day-Surgery & Community Theatre Suite";
        tailoredItems = [
          { name: "Laparoscopy Tower 1080p with 1/2.8\" CMOS", role: "Cost-effective Full HD tower for routine general procedures" },
          { name: "Hydraulic operating table (hydraulic for height adjustment)", role: "Power-independent hydraulic positioning table (zero electrical downtime)" },
          { name: "Portable surgical light (2012-5)", role: "Mobile LED surgical illumination (50,000 Lux)" },
          { name: "Anesthesia machine", role: "Compact multi-mode anesthesia workstation" },
          { name: "Patient monitor BIOLIGHT M12 Standard option", role: "Comprehensive 5-lead ECG, SpO2, and NIBP monitoring" },
          { name: "Autoclave 23L- DENGGUAN", role: "Rapid benchtop autoclave instrument sterilizer" }
        ];
        rawProductMatches = [
          getCatalogItemByName(products, 'Laparoscopy Tower 1080p with 1/2.8" CMOS'),
          getCatalogItemByName(products, 'Hydraulic operating table (hydraulic for height adjustment)'),
          getCatalogItemByName(products, 'Portable surgical light (2012-5)'),
          getCatalogItemByName(products, 'Anesthesia machine'),
          getCatalogItemByName(products, 'Patient monitor BIOLIGHT M12 Standard option'),
          getCatalogItemByName(products, 'Autoclave 23L- DENGGUAN')
        ].filter(Boolean);
      } else {
        // Flagship General & Gynecological Laparoscopy Operating Theatre
        packageName = "Advanced General & Gynecological Operating Theatre Suite";
        tailoredItems = [
          { name: prefers4K ? "Laparoscopy Tower 4K" : "Laparoscopy Tower 1080p with 1/2.8\" CMOS", role: "Flagship 4K Ultra HD visualization tower with Sony CMOS sensor & sapphire scopes" },
          { name: prefersHydraulic ? "Hydraulic operating table (hydraulic for height adjustment)" : "Motorized operating table", role: prefersHydraulic ? "Mechanical-hydraulic operating table with Trendelenburg" : "Electro-hydraulic motorized surgical table with remote control & C-Arm longitudinal slide" },
          { name: "Surgical light", role: "Dual-dome ceiling-mounted shadowless LED surgical lamp (160,000 Lux, Osram diodes)" },
          { name: "Surgical pendants", role: "Articulated ceiling pendant with O2, N2O, Air, Vac terminals and monitor shelf" },
          { name: "Anesthesia machine", role: "Integrated 10.4\" display anesthesia workstation with dual Selectatec vaporizers" },
          { name: "Patient monitor BIOLIGHT M12 Standard option", role: "Multi-parameter hemodynamic monitor with ECG, SpO2, NIBP, and temperature" },
          { name: "Autoclave 23L- DENGGUAN", role: "CSSD pulsed vacuum steam sterilizer engineered for narrow-lumen laparoscopic tools" }
        ];
        rawProductMatches = [
          getCatalogItemByName(products, prefers4K ? 'Laparoscopy Tower 4K' : 'Laparoscopy Tower 1080p with 1/2.8" CMOS'),
          getCatalogItemByName(products, prefersHydraulic ? 'Hydraulic operating table (hydraulic for height adjustment)' : 'Motorized operating table'),
          getCatalogItemByName(products, 'Surgical light'),
          getCatalogItemByName(products, 'Surgical pendants'),
          getCatalogItemByName(products, 'Anesthesia machine'),
          getCatalogItemByName(products, 'Patient monitor BIOLIGHT M12 Standard option'),
          getCatalogItemByName(products, 'Autoclave 23L- DENGGUAN')
        ].filter(Boolean);
      }

      const formattedItemList = tailoredItems.map((it, idx) => `**${idx + 1}. ${it.name}**\n   • *Role*: ${it.role}`).join('\n\n');

      let replyPrefix = isExplicitListRequest
        ? `Here is the complete itemized equipment list for your **${packageName}**, compiled ready for your official quotation:\n\n`
        : `Based on our clinical consultation for your facility, here is your **Tailored ${packageName}**:\n\nThis equipment package coordinates all 6 critical operating theatre pillars — visualization, positioning, illumination, life support, monitoring, and sterilization:\n\n`;

      let reply = replyPrefix +
        `${formattedItemList}\n\n` +
        `📋 **Quotation Pre-Filled**: I have compiled this entire equipment list into our quotation system. Click **Send Inquiry for Quotation** below to submit this complete list for an official proforma quote, or send it directly via WhatsApp.`;

      const tailoredProducts = rankAndAnnotateRecommendations(rawProductMatches, q);

      return {
        reply,
        products: tailoredProducts,
        actions: [
          {
            label: "Send Inquiry for Quotation",
            url: buildQuotationInquiryUrl(tailoredItems, 'Operating Theatre', packageName)
          },
          {
            label: "WhatsApp Quotation List",
            url: buildWhatsAppQuotationUrl(tailoredItems, packageName)
          },
          {
            label: "Book Showroom Demonstration",
            url: "/contact#quote-form"
          }
        ],
        consultation: {
          active: true,
          packageName: packageName,
          specialty: isMaternity ? 'maternity' : isUrology ? 'urology' : isDaySurgery ? 'day_surgery' : 'laparoscopy_gynecology',
          tier: prefers4K ? '4K' : '1080p',
          table: prefersHydraulic ? 'hydraulic' : 'motorized',
          items: tailoredItems.map(it => it.name)
        }
      };
    }

    // B. INITIAL CONSULTATION INQUIRY (Reasoning with client & asking diagnostic questions)
    const coreTheatreItems = [
      { name: "Laparoscopy Tower 4K", role: "Flagship 4K UHD visualization tower with Sony CMOS sensor" },
      { name: "Motorized operating table", role: "Electro-hydraulic multi-axis surgical table with C-Arm sliding" },
      { name: "Surgical light", role: "Dual-dome shadowless LED lamp (160,000 Lux, Osram diodes)" },
      { name: "Surgical pendants", role: "Ceiling articulating medical gas and monitor carrier" },
      { name: "Anesthesia machine", role: "Multi-mode ventilation workstation with dual Selectatec vaporizers" },
      { name: "Patient monitor BIOLIGHT M12 Standard option", role: "Hemodynamic vital signs monitoring (ECG, SpO2, NIBP, Temp)" },
      { name: "Autoclave 23L- DENGGUAN", role: "Pulsed vacuum steam autoclave for laparoscopic instrument sterility" }
    ];

    const rawMatches = [
      getCatalogItemByName(products, 'Laparoscopy Tower 4K'),
      getCatalogItemByName(products, 'Motorized operating table'),
      getCatalogItemByName(products, 'Surgical light'),
      getCatalogItemByName(products, 'Surgical pendants'),
      getCatalogItemByName(products, 'Anesthesia machine'),
      getCatalogItemByName(products, 'Patient monitor BIOLIGHT M12 Standard option'),
      getCatalogItemByName(products, 'Autoclave 23L- DENGGUAN')
    ].filter(Boolean);

    const theatreProducts = rankAndAnnotateRecommendations(rawMatches, q);

    let reply = `Congratulations on planning your new medical facility! Equipping a modern, compliant operating theatre or surgical clinic requires coordinating visualization, surgical ergonomics, shadowless illumination, life support, and sterile reprocessing.\n\n` +
      `Here are the **6 Essential Equipment Pillars** required for a fully equipped operating theatre:\n\n` +
      `1. 🔬 **Minimally Invasive Visualization Tower**: Video processor, cold LED light source, camera head, and sapphire-tip rigid scopes (0° & 30°).\n` +
      `2. 🛏️ **Operating Table & Patient Ergonomics**: Multi-axis table with Trendelenburg, lateral tilt, and radiolucent surface for C-Arm intraoperative imaging.\n` +
      `3. 💡 **Shadowless Surgical Lighting & Ceiling Pendants**: Dual-dome ceiling LED lamp (up to 160,000 Lux) and articulated medical gas/equipment pendants.\n` +
      `4. 🫁 **Anesthesia Workstation & Life Support**: Continuous ventilation with Selectatec vaporizers, scavenging, and turbine backup.\n` +
      `5. 📈 **Hemodynamic Patient Monitoring**: Real-time 5/12-lead ECG, SpO2, NIBP, temperature, and EtCO2 capnography.\n` +
      `6. 🧼 **Sterilization & CSSD Reprocessing**: Pre-and-post pulsed vacuum steam autoclave to ensure surgical instrument sterility.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**To help me tailor the exact models, configurations, and quotation for your clinic:**\n` +
      `1. **What primary surgical specialties will your clinic perform?**\n` +
      `   *(e.g., General Laparoscopy, Gynecology & Obstetrics, Urology / PCNL, Orthopedics, or Outpatient Day Surgery?)*\n` +
      `2. **What imaging standard do you need?**\n` +
      `   *(Flagship 4K Ultra HD for oncology/microvascular surgery, or cost-effective Full HD for routine procedures?)*\n` +
      `3. **What is your operating table preference?**\n` +
      `   *(Motorized multi-axis with C-Arm sliding, or power-independent mechanical-hydraulic?)*\n\n` +
      `You can review our recommended foundational operating theatre systems below, or click **Send Inquiry for Quotation** to submit this complete equipment list immediately.`;

    return {
      reply,
      products: theatreProducts,
      actions: [
        {
          label: "Send Inquiry for Quotation",
          url: buildQuotationInquiryUrl(coreTheatreItems, 'Operating Theatre', 'New Clinic / Operating Theatre Setup')
        },
        {
          label: "WhatsApp Quotation List",
          url: buildWhatsAppQuotationUrl(coreTheatreItems, 'New Clinic / Operating Theatre Setup')
        },
        {
          label: "Browse Operating Theatre Catalog",
          url: "/products?group=Operating+Theatre"
        }
      ],
      consultation: {
        active: true,
        facilityType: 'Operating Theatre / Clinic',
        items: coreTheatreItems.map(it => it.name)
      }
    };
  }

  // 6. IDENTITY, ROLE & CAPABILITIES ("Who are you? What can you do?")
  if (/\b(who\s*(are|r)\s*you|what\s*(is|'s)\s*your\s*name|what\s*(can|do)\s*you\s*do|what\s*are\s*you|tell\s*me\s*about\s*yourself|help\s*me|how\s*can\s*you\s*help|who\s*made\s*you)\b/i.test(q)) {
    return {
      reply: "I am the **IKEDA Clinical AI Assistant**, the dedicated digital advisor for **IKEDA ENDOSCOPY AFRICA Ltd** based in Kigali, Rwanda.\n\n" +
        "**Here is how I can assist you:**\n" +
        "• **Equipment Consultation**: Provide technical parameters, clinical features, and optics details across our 16 hospital divisions.\n" +
        "• **Smart Recommendations & Comparisons**: Guide you between configurations (such as 4K UHD vs Full HD towers, or motorized vs hydraulic tables) based on your hospital's procedure volume.\n" +
        "• **Official Quotations & Procurement**: Explain tender support, pricing procedures, and connect you with sales engineers for proforma invoices.\n" +
        "• **Biomedical & Showroom Access**: Guide you to our Masaka showroom (opposite IRCAD Africa), explain warranties, and arrange hands-on demonstrations.",
      actions: [
        { label: "Explore Products", url: "/products" },
        { label: "Request Quotation", url: "/contact#quote-form" },
        { label: "Contact Sales Desk", url: "tel:+250795360359" }
      ]
    };
  }

  // 6. DIRECT CONTACT, PHONE, WHATSAPP, EMAIL & COMMUNICATION
  if (/\b(contact|reach|phone|telephone|call|mobile|number|email|e-mail|whatsapp|chat|speak|talk|representative|agent|sales\s*rep|talk\s*to\s*someone|get\s*in\s*touch)\b/i.test(q) &&
      !/\b(non[-\s]*contact|tonometer)\b/i.test(q)) {
    return {
      reply: "You can reach **IKEDA ENDOSCOPY AFRICA** directly through our official channels in Kigali, Rwanda:\n\n" +
        "📞 **Telephone & WhatsApp**: **+250 795 360 359**\n" +
        "✉️ **Official Email**: **ikedasurgery@gmail.com**\n" +
        "📍 **Physical Facility**: Kigali, Kicukiro, Masaka (directly opposite IRCAD Africa), Cyimo, Kabeza — Rwanda\n" +
        "🕒 **Business Hours**: Monday – Friday: 8:00 AM – 5:30 PM (24/7 emergency & surgical on-call support)\n\n" +
        "Our biomedical engineers and sales specialists are on standby to discuss equipment configurations, issue formal proforma quotes, or arrange a showroom trial.",
      actions: [
        { label: "WhatsApp Direct: +250 795 360 359", url: "https://wa.me/250795360359?text=Hello%20IKEDA%20Africa,%20I%20would%20like%20to%20speak%20with%20a%20sales%20representative" },
        { label: "Call Us Now", url: "tel:+250795360359" },
        { label: "Fill Contact & Quote Form", url: "/contact#quote-form" }
      ]
    };
  }

  // 7. CATALOG SCOPE & OFFERINGS ("What do you sell / supply / offer?")
  if (/\b(what\s*(do\s*you|does\s*ikeda)\s*(sell|supply|offer|have|provide)|what\s*are\s*your\s*products|product\s*list|all\s*products|what\s*equipment|catalog\s*overview|which\s*products)\b/i.test(q) ||
      /^(products|equipment|catalog|offerings)$/i.test(q)) {
    return {
      reply: "**IKEDA ENDOSCOPY AFRICA** manufactures and distributes medical technologies across **16 comprehensive hospital divisions**:\n\n" +
        "1. **Minimally Invasive Surgery**: 4K UHD & 1080p Full HD Laparoscopy Towers, 4K ICG Fluorescence, Compact Foldable Systems, and Sapphire-lens Telescopes (0°/30°).\n" +
        "2. **Urology & Endourology**: Holmium & Thulium surgical lasers, rigid & flexible ureteroscopes, nephroscopes, PCNL sets, lithotripters, and double-J stents.\n" +
        "3. **VATS & Advanced Energy**: Video-assisted thoracic surgery, Harmonic ultrasonic scalpels, LigaSure bipolar vessel sealers, and plasma surgical ablation.\n" +
        "4. **Critical Care & ICU**: ICU turbine ventilators, multi-parameter vital signs monitors (ECG/SpO2/EtCO2), infusion/syringe pumps, and defibrillators.\n" +
        "5. **Maternal & Neonatal**: Dual-wall servo infant incubators, radiant warmers, jaundice phototherapy, and obstetric delivery beds.\n" +
        "6. **Operating Theatre**: Motorized & hydraulic surgical tables, shadowless LED surgical lamps, medical gas ceiling pendants, and electrosurgical generators.\n" +
        "7. **Radiology & Diagnostics**: High-frequency mobile surgical C-Arms, 4D Color Doppler ultrasound platforms, and digital radiography (DR).\n" +
        "8. **Sterilization & CSSD**: Pulsed vacuum steam autoclaves, low-temperature hydrogen peroxide plasma sterilizers, and washer-disinfectors.\n\n" +
        "Tell me the clinical specialty or department you are equipping, and I will recommend matching configurations!",
      actions: [
        { label: "Browse Full Catalog", url: "/products" },
        { label: "Request Comprehensive Catalog PDF / Quotation", url: "/contact#quote-form" }
      ]
    };
  }

  // 8. DELIVERY, SHIPPING, LOGISTICS & REGIONAL REACH
  if (/\b(deliver|delivery|shipping|ship|lead\s*time|dispatch|transit|transport|how\s*long\s*(to\s*get|does\s*it\s*take|to\s*arrive)|deliver\s*to)\b/i.test(q)) {
    return {
      reply: "Yes, **IKEDA ENDOSCOPY AFRICA** provides guaranteed door-to-door delivery and clinical deployment across Rwanda and East Africa:\n\n" +
        "🚚 **Kigali Deliveries**: In-stock equipment is delivered within **24–48 hours** directly to your facility.\n" +
        "🏥 **Upcountry Rwanda**: Direct bonded transport to district, provincial, and teaching hospitals across Northern, Southern, Eastern, and Western Provinces.\n" +
        "🌍 **Regional East Africa**: Active export corridors to **Burundi, DR Congo (Goma, Bukavu, Kinshasa), Uganda, Tanzania, and Kenya**, managing customs documentation, freight logistics, and transit insurance.\n" +
        "🔧 **Full Turnkey Installation**: Major clinical equipment is delivered with on-site biomedical engineers who perform installation, electrical safety validation, and clinical handling training for theatre staff.",
      actions: [
        { label: "Inquire About Delivery / Lead Times", url: "/contact?subject=Delivery+and+Lead+Time+Inquiry" },
        { label: "WhatsApp Logistics Desk", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20would%20like%20to%20inquire%20about%20delivery%20to%20my%20hospital" }
      ]
    };
  }

  // 9. TECHNICAL COMPARISONS & CLINICAL REASONING (4K vs 1080p, Motorized vs Hydraulic)
  if (/\b(difference\s*between\s*4k|4k\s*vs\s*(1080p|hd)|compare\s*4k|why\s*(4k|choose\s*4k)|difference\s*between\s*4k\s*and\s*(1080p|hd))\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'Laparoscopy Tower 4K'),
      getCatalogItemByName(products, '4K ICG Enhanced Fluorescence Guided Laparoscopy Tower'),
      getCatalogItemByName(products, 'Laparoscopy Tower 1080p with 1/2.8" CMOS')
    ].filter(Boolean);
    const towerProducts = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "Here is a clear clinical comparison between **4K UHD** and **1080p Full HD** endoscopic systems:\n\n" +
        "1. **Resolution & Spatial Detail**:\n" +
        "   • **4K UHD (3840×2160)**: Over 8.2 million pixels — **4x the resolution** of standard Full HD. Surgeons can resolve fine microvascular capillaries, delicate lymphatic channels, and subtle retroperitoneal tissue planes with zero pixelation.\n" +
        "   • **1080p Full HD (1920×1080)**: 2.1 million pixels. Provides crisp, dependable visualization suitable for standard laparoscopic anatomy.\n\n" +
        "2. **Color Gamut & Perfusion**:\n" +
        "   • **4K Towers**: Support BT.2020 wide color gamut, reproducing delicate shades of red and yellow for superior vascular differentiation. Optional ICG infrared fluorescence allows real-time perfusion assessment.\n" +
        "   • **1080p Towers**: Standard sRGB/Rec.709 color space, adequate for routine tissue identification.\n\n" +
        "3. **Clinical Recommendation**:\n" +
        "   • Choose **4K UHD** for referral hospitals, university teaching centers, complex oncology, bariatric, hepatobiliary, and advanced urological surgeries.\n" +
        "   • Choose **1080p Full HD** for community district hospitals, ambulatory day-surgery centers, and high-volume routine procedures (laparoscopic cholecystectomy, appendectomy, diagnostic laparoscopy) looking to optimize procurement capital.",
      products: towerProducts,
      actions: [
        { label: "Request 4K Tower Quotation", url: "/contact?subject=4K+Laparoscopy+Tower+Quote" },
        { label: "WhatsApp Clinical Specialist", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20can%20you%20advise%20on%204K%20vs%20HD%20systems%20for%20our%20hospital" }
      ]
    };
  }

  if (/\b(difference\s*between.*(motorized|hydraulic)|motorized\s*vs\s*hydraulic)\b/i.test(q)) {
    return {
      reply: "Here is the comparison between **Motorized (Electro-Hydraulic)** and **Manual-Hydraulic** operating tables:\n\n" +
        "• **Motorized / Electro-Hydraulic Tables**:\n" +
        "  - Feature hand-held remote control and motorized articulation across Trendelenburg, lateral tilt, back plate, and longitudinal table sliding.\n" +
        "  - Best for multi-specialty operating suites requiring intraoperative C-Arm imaging and swift ergonomic adjustments without physical exertion.\n\n" +
        "• **Hydraulic (Mechanical) Tables**:\n" +
        "  - Utilize a robust foot-pedal pump for elevation and mechanical gear levers for positioning.\n" +
        "  - 100% immune to electrical grid instability or power outages, offering maximum durability for emergency surgical units and remote health facilities.\n\n" +
        "⭐ **Our Recommendation**: For general referral theatres, motorized sliding tables provide highest surgical flexibility; for emergency outreach or backup theatres, mechanical hydraulic tables offer zero electrical downtime.",
      actions: [
        { label: "View Operating Tables in Catalog", url: "/products?group=Operating+Theatre" },
        { label: "Request Table Quotation", url: "/contact?subject=Operating+Table+Inquiry" }
      ]
    };
  }

  // 10. CLINICAL DEFINITIONS ("What is laparoscopy?", "What is endoscopy?", "What is VATS?", etc.)
  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?(laparoscop\w*|keyhole\s*surgery)\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'Laparoscopy Tower 4K'),
      getCatalogItemByName(products, '4K ICG Enhanced Fluorescence Guided Laparoscopy Tower')
    ].filter(Boolean);
    const matched = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "**Laparoscopy** (often called minimally invasive surgery or keyhole surgery) is a specialized surgical technique where operations in the abdomen or pelvis are performed through small incisions (typically 5–12 mm), rather than the large incisions needed in traditional open surgery.\n\n" +
        "**How it Works:**\n" +
        "1. A high-resolution rigid telescope (**laparoscope**) connected to a video tower transmits magnified intra-abdominal footage to a surgical monitor.\n" +
        "2. The abdomen is insufflated with medical CO2 gas to create a safe working space.\n" +
        "3. Long, slender instruments (graspers, scissors, energy scalpels) are introduced through trocars to perform the procedure.\n\n" +
        "**Clinical Benefits**: Minimal post-operative pain, drastically reduced blood loss, shorter hospital stays (often same-day or 24-hour discharge), and minimal surgical scarring.\n\n" +
        "IKEDA specializes in complete turnkey laparoscopy solutions — including our flagship **4K UHD Sony CMOS Laparoscopy Towers** and precision optical scopes shown below.",
      products: matched,
      actions: [
        { label: "Explore Laparoscopy Systems", url: "/products?group=Operating+Theatre" },
        { label: "Request 4K Tower Quotation", url: "/contact?subject=Laparoscopy+Tower+Inquiry" }
      ]
    };
  }

  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?endoscop\w*\b/i.test(q)) {
    return {
      reply: "**Endoscopy** is a medical procedure that allows clinicians to visually examine the interior of organs, body cavities, or luminal tracts without making large incisions. A specialized illuminated instrument called an **endoscope** (rigid or flexible) carries light into the body and relays high-definition video back to an external display.\n\n" +
        "**Specialty Applications:**\n" +
        "• **Laparoscopy**: Visualizing the peritoneal cavity for abdominal and gynecological surgeries.\n" +
        "• **Endourology**: Cystoscopy, ureteroscopy, and nephroscopy for urinary tract stones and bladder pathologies.\n" +
        "• **Thoracoscopy (VATS)**: Inspecting the pleural space, lungs, and mediastinum.\n" +
        "• **Arthroscopy**: Examining knee, shoulder, and hip joint spaces.\n" +
        "• **Hysteroscopy**: Diagnostic and operative visualization of the uterine cavity.\n\n" +
        "**IKEDA ENDOSCOPY AFRICA** equips East African hospitals with comprehensive endoscopy towers, video processors, LED cold light sources, and German optical telescopes.",
      actions: [
        { label: "View All Endoscopy Equipment", url: "/products" },
        { label: "Request Official Quotation", url: "/contact#quote-form" }
      ]
    };
  }

  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?(vats|thoracoscop\w*)\b/i.test(q)) {
    return {
      reply: "**VATS (Video-Assisted Thoracoscopic Surgery)** is a minimally invasive surgical technique used to diagnose and treat diseases inside the chest (thorax), such as lung nodules, pleural effusions, pneumothorax, and esophageal conditions.\n\n" +
        "Instead of a large, painful thoracotomy with rib spreading, VATS is performed through 1 to 3 small incisions using a thoracoscopic camera and specialized curved thoracic instruments.\n\n" +
        "**IKEDA's VATS Solutions**: We supply dedicated 4K and Full HD thoracic telescopes (0° and 30°), Harmonic ultrasonic energy dissectors, LigaSure vessel sealers, endoscopic lung graspers, and surgical suction-irrigation systems.",
      actions: [
        { label: "Explore VATS Equipment", url: "/products?group=Operating+Theatre" },
        { label: "Contact Clinical Team", url: "/contact" }
      ]
    };
  }

  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?((infant|baby|neonatal)\s+)?incubator\w*\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'Infant incubator'),
      getCatalogItemByName(products, 'Infant radiant warmer')
    ].filter(Boolean);
    const matched = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "An **Infant Incubator** is an enclosed medical microenvironment designed to provide life-sustaining thermal support, humidity regulation, and airborne isolation for premature, low-birth-weight, or critically ill neonates.\n\n" +
        "**Key Clinical Functions:**\n" +
        "• **Servo-Controlled Thermoregulation**: Skin-temperature probes continuously monitor the infant and adjust chamber heating to prevent hypothermia.\n" +
        "• **Humidity Management**: Reduces transepidermal water loss and maintains skin barrier integrity in premature infants.\n" +
        "• **Infection Protection & Filtration**: High-efficiency particulate air filtration protects fragile immune systems.\n\n" +
        "Our flagship **IKEDA Infant Incubator** features dual-wall thermal acrylic walls, servo temperature/humidity control, and internal neonatal weighing scales.",
      products: matched,
      actions: [
        { label: "View Maternal & Infant Care", url: "/products?group=Maternal+%26+Infant" },
        { label: "Request Incubator Quotation", url: "/contact?subject=Neonatal+Incubator+Quote" }
      ]
    };
  }

  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?(mechanical\s+)?(ventilat\w*|respirat\w*)\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'ICU Ventilator'),
      getCatalogItemByName(products, 'Ventilator')
    ].filter(Boolean);
    const matched = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "A **Mechanical Ventilator** is a critical life-support machine that moves breathable air into and out of the lungs of patients who are unable to breathe sufficiently on their own due to severe trauma, respiratory failure, or general anesthesia.\n\n" +
        "**Key Capabilities of IKEDA ICU Ventilators:**\n" +
        "• Supports both **Invasive** (endotracheal tube / tracheostomy) and **Non-Invasive (NIV)** ventilation.\n" +
        "• Comprehensive modes: VCV, PCV, SIMV, PSV, PRVC, and High-Flow Nasal Cannula (HFNC) oxygen therapy.\n" +
        "• Integrated turbine backup ensures continued operation independent of hospital central compressed air pipelines.\n" +
        "• Lung-protective ventilation algorithms to prevent barotrauma and volutrauma.",
      products: matched,
      actions: [
        { label: "View ICU & Critical Care", url: "/products?group=Critical+Care+%26+Emergency" },
        { label: "Request ICU Ventilator Quote", url: "/contact?subject=ICU+Ventilator+Quote" }
      ]
    };
  }

  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?(autoclave\w*|steriliz\w*)\b/i.test(q)) {
    return {
      reply: "An **Autoclave** is a clinical sterilization device that utilizes high-pressure saturated steam at elevated temperatures (typically 121°C to 134°C) to eliminate all forms of microbial life — including bacteria, viruses, fungi, and highly resistant bacterial endospores.\n\n" +
        "**IKEDA Autoclaves**: We equip Central Sterile Services Departments (CSSD) with pre-and-post pulsed vacuum steam sterilizers that ensure steam penetrates deep into narrow-lumen laparoscopic instruments, porous textile packs, and hollow surgical tools, followed by complete vacuum drying.",
      actions: [
        { label: "View Sterilization Systems", url: "/products?group=Sterilization+%26+Infection+Control" },
        { label: "Request Autoclave Quote", url: "/contact?subject=Autoclave+Inquiry" }
      ]
    };
  }

  if (/\bwhat\s*(is|are)\s*(an?\s+|the\s+)?(c[-\s]*arm|fluoroscop\w*)\b/i.test(q)) {
    return {
      reply: "A **Surgical C-Arm** is an advanced mobile medical imaging system based on X-ray fluoroscopy technology. Its semi-circular 'C' shaped gantry connects an X-ray generator to an image intensifier or flat-panel detector (FPD), allowing flexible 3D rotation around the operating table.\n\n" +
        "**Clinical Applications**: Real-time intraoperative visualization during orthopedic fracture fixation, spinal surgery, interventional cardiology, pacemaker placement, and vascular bypass procedures without moving the patient out of theatre.",
      actions: [
        { label: "View Radiology & C-Arm", url: "/products?group=Diagnostics+%26+Specialty" },
        { label: "Request C-Arm Quotation", url: "/contact?subject=C-Arm+Inquiry" }
      ]
    };
  }

  // 11. LOCATION, ADDRESS, SHOWROOM & PHYSICAL VISITS
  if (/\b(location|address|where|kigali|rwanda|masaka|office|visit|showroom|directions|ircad)\b/i.test(q)) {
    return {
      reply: "IKEDA ENDOSCOPY AFRICA Ltd is based in **Kigali, Rwanda**:\n\n" +
        "📍 **Physical Address**: Kigali, Kicukiro, Masaka (directly opposite IRCAD Africa), Cyimo, Kabeza — Rwanda\n" +
        "🕒 **Operating Hours**: Monday – Friday: 8:00 AM – 5:30 PM (24/7 Field & Emergency Support)\n" +
        "📞 **Telephone & WhatsApp**: +250 795 360 359\n" +
        "✉️ **Email**: ikedasurgery@gmail.com\n\n" +
        "We welcome hospital directors, surgeons, and procurement committees to visit our local showroom and biomedical center to test 4K towers, scopes, and energy instruments firsthand.",
      actions: [
        { label: "Open in Google Maps", url: "https://www.google.com/maps/place/IKEDA+ENDOSCOPY+AFRICA+LTD/@-1.9934717,30.2071428,17z/data=!3m1!4b1!4m6!3m5!1s0x19db57b36c338e7f:0x6b2dbb8c705a81fb!8m2!3d-1.9934771!4d30.2097177!16s%2Fg%2F11zh8jxs2d" },
        { label: "Schedule Showroom Visit", url: "/contact#quote-form" },
        { label: "Call Us: +250 795 360 359", url: "tel:+250795360359" }
      ]
    };
  }

  // 12. PRICE, QUOTATION, TENDER & PURCHASING
  if (/\b(price|quote|cost|quotation|buy|purchase|tender|proforma|invoice|how\s*much|discount|payment)\b/i.test(q)) {
    const candidateItems = (consultationCtx && consultationCtx.items && consultationCtx.items.length)
      ? consultationCtx.items
      : ((context && context.allRequestedProducts && context.allRequestedProducts.length)
        ? context.allRequestedProducts
        : ((context && context.products && context.products.length) ? context.products : []));

    if (candidateItems.length > 0) {
      const formattedItems = candidateItems.map((it, idx) => `${idx + 1}. ${typeof it === 'string' ? it : it.name}`).join('\n');
      return {
        reply: `We provide **formal proforma quotations** within 12–24 business hours across Rwanda and East Africa.\n\n` +
          `📋 **Requested Equipment for Quotation:**\n${formattedItems}\n\n` +
          `All official quotations include technical datasheets, CE/ISO certificates, transport, biomedical installation, and manufacturer warranty.\n\n` +
          `Click **Send Inquiry for Quotation** below to submit this complete equipment list immediately for an official proforma quote.`,
        actions: [
          {
            label: "Send Inquiry for Quotation",
            url: buildQuotationInquiryUrl(candidateItems, 'General Hospital Materials', 'Requested Medical Equipment')
          },
          {
            label: "Instant WhatsApp Quotation",
            url: buildWhatsAppQuotationUrl(candidateItems, 'Requested Medical Equipment')
          },
          { label: "Call Sales: +250 795 360 359", url: "tel:+250795360359" }
        ]
      };
    }

    return {
      reply: "We provide **formal proforma quotations, tender bidding support, and flexible hospital supply contracts** across Rwanda and East Africa.\n\n" +
        "• **Turnaround Time**: Formal quotations issued within 12–24 business hours.\n" +
        "• **What is Included**: Equipment specifications, CE/FDA/ISO certifications, freight to facility, on-site installation, clinical training, and manufacturer warranty.\n" +
        "• **Fast-Track WhatsApp**: You can also receive an instant proforma quote via WhatsApp by sending your equipment list directly to our sales desk.",
      actions: [
        { label: "Submit Online Quote Request", url: "/contact#quote-form" },
        { label: "Instant WhatsApp Quotation", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20would%20like%20to%20request%20an%20official%20quotation" },
        { label: "Call Sales: +250 795 360 359", url: "tel:+250795360359" }
      ]
    };
  }

  // 13. BIOMEDICAL ENGINEERING, WARRANTY & SERVICE
  if (/\b(warranty|service|maintenance|repair|biomedical|engineer|training|spare\s*part|parts)\b/i.test(q)) {
    return {
      reply: "Unlike overseas importers, IKEDA maintains an **in-country Biomedical Engineering Center** in Kigali:\n\n" +
        "• **Manufacturer Warranty**: Comprehensive warranty on all video processors, light sources, sensors, and scopes.\n" +
        "• **Spare Parts Inventory**: Critical replacement optics, bulbs, cables, and boards stocked directly in Kigali for zero theatre downtime.\n" +
        "• **Preventive Maintenance**: Regular optical calibration, leakage testing, electrical safety checks, and autoclave compatibility audits.\n" +
        "• **Surgeon & Nursing Training**: Dedicated on-site clinical handling training for OR nurses and surgical fellows.",
      actions: [
        { label: "Request Technical Support", url: "/contact?subject=Biomedical+Engineering+Support" },
        { label: "WhatsApp Biomedical Desk", url: "https://wa.me/250795360359?text=Hello%20IKEDA%20Biomedical,%20I%20need%20maintenance%20or%20technical%20support" }
      ]
    };
  }

  // 14. CERTIFICATIONS (ISO, CE, FDA)
  if (/\b(iso|ce|fda|certif|quality|standard)\b/i.test(q)) {
    return {
      reply: "All medical technologies distributed by IKEDA ENDOSCOPY AFRICA Ltd meet the highest international clinical standards:\n\n" +
        "• **ISO 9001:2015 & ISO 13485**: Certified Quality Management Systems for Medical Devices.\n" +
        "• **CE Mark (Conformité Européenne)**: Strict compliance with European Medical Device Directives.\n" +
        "• **FDA Listed & Compliant**: Validated safety protocols for endoscopy, electrosurgery, and life-support electronics.",
      actions: [
        { label: "View Manufacturers & Certifications", url: "/manufacturers" },
        { label: "Request Tender Dossier", url: "/contact?subject=Regulatory+Compliance+Inquiry" }
      ]
    };
  }

  // 15. SPECIFIC CLINICAL SPECIALTY DIRECT MATCHES
  // A. Laparoscopy / Towers
  if (/\b(laparoscop|tower|4k|icg|cmos|optical\s*telescope)\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'Laparoscopy Tower 4K'),
      getCatalogItemByName(products, '4K ICG Enhanced Fluorescence Guided Laparoscopy Tower'),
      getCatalogItemByName(products, 'Laparoscopy Tower 1080p with 1/2.8" CMOS')
    ].filter(Boolean);
    const towerProducts = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "IKEDA ENDOSCOPY AFRICA provides world-class minimally invasive visualization systems:\n\n" +
        "⭐ **Our Top Recommendation:** **Laparoscopy Tower 4K** — True 4K Ultra HD (3840×2160) resolution with Sony CMOS optics, delivering 4x higher detail than Full HD for critical microvascular delineation and clear surgical margins.\n\n" +
        "**Other Options Across Our Catalog:**\n" +
        "• **4K ICG Enhanced Fluorescence Guided Unit**: Real-time indocyanine green lymphatic & biliary perfusion mapping.\n" +
        "• **Laparoscopy Tower 1080p**: Cost-effective Full HD with integrated LED cold light source for routine general surgery.\n" +
        "• **Compact Foldable Units**: 15\" and 19\" deployable systems engineered for mobile surgical teams and rapid theatre deployment.\n" +
        "• **Optical Telescopes**: HD & 4K rigid scopes (0° & 30°) with scratch-resistant sapphire lenses.",
      products: towerProducts,
      actions: [
        { label: "View Operating Theatre", url: "/products?group=Operating+Theatre" },
        { label: "Request Tower Quotation", url: "/contact?subject=4K+Laparoscopy+Tower+Inquiry" },
        { label: "WhatsApp Direct", url: "https://wa.me/250795360359?text=Hello%20IKEDA%20Africa,%20I%20am%20inquiring%20about%20your%20Laparoscopy%20Towers" }
      ]
    };
  }

  // B. Urology & Endourology
  if (/\b(uro|cysto|resecto|uretero|pcnl|holmium|thulium|litho|stent|stone|diathermy)\b/i.test(q)) {
    return {
      reply: "Our **Urology & Endourology Division** provides a comprehensive surgical armamentarium:\n\n" +
        "• **Endoscopic Scopes**: Rigid & Flexible Ureteroscopes, High-Definition Cystoscopes, Resectoscopes (compatible with Diathermy, Coblation, and Laser).\n" +
        "• **Surgical Lasers**: Advanced Holmium Laser & Thulium Laser platforms for lithotripsy and soft tissue resection.\n" +
        "• **Interventional Disposables**: Nitinol Stone Baskets, Ureteral Access Sheaths, Double-J Stents, Hydrophilic Guide Wires, and High-Pressure Dilation Balloons.\n" +
        "• **Surgical Sets**: Complete PCNL Sets (Percutaneous Nephrolithotomy), Lithotripsy Punches, Optical Forceps, and Sachse Urethrotomes.\n" +
        "• **Theatre Fluidics & Electronics**: Digital Uroflowmeters, Laparoscopic Irrigation & Suction Systems, and Bipolar Irrigation Ligation Forceps.",
      actions: [
        { label: "Explore Urology Catalog", url: "/products?group=Operating+Theatre" },
        { label: "Request Urology Quotation", url: "/contact?subject=Urology+Equipment+Inquiry" },
        { label: "WhatsApp Specialist", url: "https://wa.me/250795360359?text=Hello,%20I%20need%20specifications%20for%20Urology%20instruments" }
      ]
    };
  }

  // C. VATS & Advanced Energy
  if (/\b(vat|thorac|energy|harmonic|ligasure|bipolar|monopolar|plasma|shaver|arthro|ent|hystero)\b/i.test(q)) {
    return {
      reply: "Our **VATS (Video-Assisted Thoracoscopic Surgery) & Advanced Energy Division** features:\n\n" +
        "• **Telescopes**: HD & 4K Laparoscopes (0° & 30°), Transurethral Cystoscopes, Hysteroscopes, TURP Saline Scopes, Arthroscopes, and ENT Telescopes.\n" +
        "• **Advanced Energy Platforms**: Harmonic Ultrasonic Surgical Procedures, LigaSure (Advanced Bipolar Vessel Sealing), and HF Bipolar & Monopolar Electrosurgical Generators.\n" +
        "• **Energy Section**: High-Speed Surgical Shavers and Controlled Plasma Surgical Ablation Systems.\n" +
        "• **Surgical Instruments**: Trocar Access Systems, Ergonomic Graspers & Dissectors, Endoscopic Suturing Instruments, HF Instruments, Ligation Clip Appliers, Liquid Tubing Devices, and Sterilization Reprocessing Containers.",
      actions: [
        { label: "View VATS & Energy", url: "/products?group=Operating+Theatre" },
        { label: "Request Quote", url: "/contact?subject=VATS+and+Energy+Equipment" },
        { label: "Chat on WhatsApp", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20am%20interested%20in%20VATS%20and%20Energy%20systems" }
      ]
    };
  }

  // D. ICU, Ventilators & Critical Care
  if (/\b(icu|ventilator|monitor|defibrill|infusion|critical|resuscitat)\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'ICU Ventilator'),
      getCatalogItemByName(products, 'Ventilator'),
      getCatalogItemByName(products, 'Emergency ventilator')
    ].filter(Boolean);
    const icuProducts = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "Our **Intensive Care Unit (ICU) & Emergency Division** equips clinical spaces for critical resuscitation:\n\n" +
        "⭐ **Our Top Recommendation:** **ICU Ventilator** — Comprehensive ICU-grade mechanical ventilation equipped with lung-protective ventilation modes, high-flow oxygen therapy, and internal turbine backup for critically ill patients.\n\n" +
        "**Other Critical Systems:**\n" +
        "• **Multi-Parameter Patient Monitors**: Real-time 5-lead / 12-lead ECG, SpO2, NIBP, IBP, EtCO2 capnography, and temperature tracking.\n" +
        "• **Emergency Transport Ventilators**: Compact portable units optimized for ambulance transfer and emergency triage.\n" +
        "• **Infusion & Syringe Pumps**: Precision micro-dosing with dose error reduction systems.\n" +
        "• **Defibrillators & Emergency Crash Equipment**: Biphasic AED and manual defibrillators with pacing capabilities.",
      products: icuProducts,
      actions: [
        { label: "View ICU Equipment", url: "/products?group=Critical+Care+%26+Emergency" },
        { label: "Request ICU Quotation", url: "/contact?subject=ICU+Equipment+Inquiry" }
      ]
    };
  }

  // E. Maternal, Neonatal & Incubators
  if (/\b(neonat|incubator|matern|infant|warmer|phototherapy|pediatric|baby)\b/i.test(q)) {
    const rawMatches = [
      getCatalogItemByName(products, 'Infant incubator'),
      getCatalogItemByName(products, 'Infant radiant warmer')
    ].filter(Boolean);
    const neoProducts = rankAndAnnotateRecommendations(rawMatches, q);

    return {
      reply: "Our **Maternal, Neonatal & Pediatric Care Division** ensures highest safety for newborns and mothers:\n\n" +
        "⭐ **Our Top Recommendation:** **Infant Incubator** — Servo-controlled microenvironment featuring dual-wall thermal insulation, precise skin-temperature regulation, and humidity management for premature neonate survival.\n\n" +
        "**Other Neonatal Technologies:**\n" +
        "• **Infant Radiant Warmers**: Built-in APGAR timers, motorized tilting mattresses, and open resuscitation access.\n" +
        "• **LED Phototherapy Units**: High-intensity blue LED treatment for neonatal jaundice with low heat emission.\n" +
        "• **Maternity Suites**: Hydraulic and electric obstetric delivery beds, fetal Doppler monitors, and neonatal resuscitation tables.",
      products: neoProducts,
      actions: [
        { label: "View Maternal & Infant Care", url: "/products?group=Maternal+%26+Infant" },
        { label: "Request Maternal Equipment Quote", url: "/contact?subject=Neonatal+Equipment+Inquiry" }
      ]
    };
  }

  // F. Radiology, X-Ray & C-Arm
  if (/\b(radio|x-ray|xray|c-arm|c\s*arm|ultrasound|imaging|fluoroscop)\b/i.test(q)) {
    return {
      reply: "Our **Radiology & Diagnostic Imaging Division** delivers high-resolution hospital imaging:\n\n" +
        "• **Mobile Surgical C-Arm Systems**: High-frequency fluoroscopy generators with digital flat-panel detectors (FPD) for real-time orthopedic and vascular guidance.\n" +
        "• **Digital Diagnostic Ultrasound**: 4D Color Doppler platforms with cardiac, convex, linear, and transvaginal multi-frequency probes.\n" +
        "• **Digital Radiography (DR)**: Mobile and stationary ceiling-suspended hospital X-ray systems.",
      actions: [
        { label: "View Diagnostics & Imaging", url: "/products?group=Diagnostics+%26+Specialty" },
        { label: "Request Imaging Quotation", url: "/contact?subject=Radiology+C-Arm+Inquiry" }
      ]
    };
  }

  // 16. CATALOG PRODUCTS SEARCH (Intelligent clinical product match)
  const catalogProducts = findCatalogProducts(q, products, context.products || []);
  if (catalogProducts.length) {
    return {
      reply: buildCatalogReply(userQuery, catalogProducts),
      products: catalogProducts,
      actions: [
        { label: 'Browse Product Catalog', url: `/products?search=${encodeURIComponent(userQuery)}` },
        { label: 'Request a Quotation', url: `/contact?subject=${encodeURIComponent(`Product inquiry: ${userQuery}`)}` }
      ]
    };
  }

  // 17. BROADER CATALOG SEARCH ACROSS CATEGORIES & SUBSECTIONS
  const matchingCategories = [];
  const matchingItems = [];

  products.forEach(p => {
    const pName = (p.name || '').toLowerCase();
    const pDesc = (p.description || '').toLowerCase();
    const pTagline = (p.tagline || '').toLowerCase();

    if (pName.includes(q) || pDesc.includes(q) || pTagline.includes(q)) {
      matchingCategories.push(p);
    }

    if (p.subsections && Array.isArray(p.subsections)) {
      p.subsections.forEach(sub => {
        if (sub.items && Array.isArray(sub.items)) {
          sub.items.forEach(item => {
            const iName = (typeof item === 'string' ? item : item.name || '').toLowerCase();
            const iDesc = (typeof item === 'object' && item.desc ? item.desc : '').toLowerCase();
            if (iName.includes(q) || iDesc.includes(q)) {
              matchingItems.push({ item: typeof item === 'string' ? { name: item } : item, category: p.name, slug: p.slug });
            }
          });
        }
      });
    }
  });

  if (matchingCategories.length > 0 || matchingItems.length > 0) {
    let resultText = `I found equipment matching **"${userQuery}"** in our hospital catalog:\n\n`;

    if (matchingCategories.length > 0) {
      resultText += `📁 **Department Categories**:\n`;
      matchingCategories.slice(0, 3).forEach(c => {
        resultText += `• **${c.name}**: ${c.tagline || c.description.slice(0, 110)}...\n`;
      });
      resultText += `\n`;
    }

    if (matchingItems.length > 0) {
      resultText += `⚙️ **Specific Equipment Systems**:\n`;
      matchingItems.slice(0, 5).forEach(m => {
        resultText += `• **${m.item.name}** (${m.category})\n`;
      });
    }

    return {
      reply: resultText,
      actions: [
        { label: "Browse Products", url: `/products?search=${encodeURIComponent(userQuery)}` },
        { label: "Request Quotation", url: `/contact?subject=${encodeURIComponent('Inquiry regarding: ' + userQuery)}` }
      ]
    };
  }

  // 18. CONTEXTUAL FOLLOW-UP
  if (/\b(more|another|other options|that one|which one|it)\b/i.test(q)) {
    return {
      reply: 'Which product or department are you referring to? Tell me the surgical specialty or equipment type, and I will pull up the exact specifications and top recommendations.',
      actions: [{ label: 'Browse All Products', url: '/products' }]
    };
  }

  // 19. INTELLIGENT CLINICAL FALLBACK (No awkward robotic repetition)
  return {
    reply: `I understand your inquiry regarding **"${userQuery}"**.\n\n` +
      `**IKEDA ENDOSCOPY AFRICA** specializes in medical technologies across 16 hospital divisions — notably **4K & HD Laparoscopic Towers, Endourology, VATS, ICU Ventilators, Infant Incubators, Surgical Tables, and C-Arm Radiology**.\n\n` +
      `Could you specify the clinical department, procedure, or equipment parameters you need? Alternatively, you can explore our complete catalog or connect directly with our Kigali engineering desk.`,
    actions: [
      { label: "Browse Product Catalog", url: "/products" },
      { label: "WhatsApp Direct", url: `https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20am%20inquiring%20about:%20${encodeURIComponent(userQuery)}` },
      { label: "Request Official Quotation", url: "/contact#quote-form" }
    ]
  };
}

// POST /api/ai/chat
router.post('/chat', (req, res) => {
  const { message, context } = req.body || {};
  const response = generateAIResponse(message, context);
  res.json(response);
});

// GET /api/ai/suggestions - Quick default starters
router.get('/suggestions', (req, res) => {
  res.json({
    suggestions: [
      "4K Laparoscopy Towers",
      "Urology & Endourology",
      "VATS & Energy Instruments",
      "ICU & Neonatal Incubators",
      "Request Official Quotation",
      "Kigali Office Location"
    ]
  });
});

module.exports = router;
