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
  if (/\b(compare|difference|versus|vs\.?|which one|better)\b/i.test(query)) return 'compare';
  if (/\b(price|pricing|cost|how much|quotation|quote|budget)\b/i.test(query)) return 'price';
  if (/\b(in stock|available|availability|deliver|delivery time|when can|how soon)\b/i.test(query)) return 'availability';
  if (/\b(image|photo|picture|see|look like|show me)\b/i.test(query)) return 'image';
  if (/\b(spec|specification|specs|dimension|size|weight|power|capacity|voltage|feature|features|what can|how does)\b/i.test(query)) return 'specification';
  return 'general';
}

function findCatalogProducts(query, products, contextProductNames = []) {
  const ignoredTerms = new Set([
    'a', 'about', 'am', 'an', 'and', 'are', 'can', 'could', 'details', 'do', 'does',
    'for', 'give', 'have', 'hello', 'hey', 'hi', 'how', 'i', 'in', 'is', 'it', 'me',
    'of', 'on', 'please', 'product', 'products', 'show', 'some', 'tell', 'that', 'the',
    'there', 'this', 'to', 'want', 'what', 'which', 'with', 'would', 'you'
  ]);
  const words = normalizeWords(query);
  const isFollowUp = /\b(it|that|those|them|they|this|these|its|their|same|one|more|another)\b/i.test(query);
  const contextNames = isFollowUp ? new Set(contextProductNames.map(name => name.toLowerCase())) : new Set();
  const intentTerms = new Set(['weight', 'mass', 'dimension', 'dimensions', 'size', 'length', 'width', 'height', 'voltage', 'power', 'wattage', 'frequency', 'capacity', 'load', 'price', 'pricing', 'cost', 'availability', 'available', 'stock', 'delivery', 'spec', 'specification', 'specs', 'feature', 'features', 'image', 'show', 'photo', 'picture', 'compare', 'comparison', 'difference', 'versus', 'vs']);
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
      return contextual.slice(0, 3).map(({ score, nameMatches, matchedTerms, contextMatch, ...item }) => item);
    }
  }
  const best = scored[0];
  if (!best || best.nameMatches === 0) return [];
  const results = scored.filter(item => item.nameMatches === best.nameMatches && item.score === best.score);
  return results.slice(0, 3).map(({ score, nameMatches, matchedTerms, contextMatch, ...item }) => item);
}

function buildCatalogReply(query, matches) {
  const type = detectQuestionType(query);
  const names = matches.map(product => `**${product.name}**`).join(', ');

  if (type === 'price') {
    return `I couldn't find a published price for ${names} in the catalog. Prices depend on configuration and delivery; use the quotation link and our team can provide a current quote.`;
  }
  if (type === 'availability') {
    return `The online catalog doesn’t show live stock or delivery availability for ${names}. Please contact the sales team for current availability and lead time.`;
  }
  if (type === 'image') {
    return `Here ${matches.length === 1 ? 'is' : 'are'} the catalog ${matches.length === 1 ? 'image' : 'images'} I found for ${names}.`;
  }
  if (type === 'specification') {
    const available = matches.filter(product => product.specification || product.features.length);
    const unavailable = matches.filter(product => !product.specification && !product.features.length);
    const requestedDetail = /\b(weight|mass)\b/i.test(query) ? 'weight' :
      /\b(dimension|dimensions|size|length|width|height)\b/i.test(query) ? 'dimensions' :
        /\b(voltage|power|wattage|frequency)\b/i.test(query) ? 'electrical specifications' :
          /\b(capacity|load|payload)\b/i.test(query) ? 'capacity or load rating' : '';
    const requestedDetailAvailable = !requestedDetail || matches.some(product =>
      `${product.specification} ${product.features.join(' ')}`.toLowerCase().includes(requestedDetail === 'dimensions' ? 'size' : requestedDetail)
    );
    if (requestedDetail && !requestedDetailAvailable) {
      return `I couldn't find a ${requestedDetail} listed for ${names} in the catalog. I’ve included the other recorded specifications below.`;
    }
    let response = available.length
      ? `Here ${available.length === 1 ? 'are the details' : 'are the matching products and their details'} I found for ${available.map(product => `**${product.name}**`).join(', ')}. I’ve included the catalog specifications below.`
      : `I found ${names}, but the catalog doesn’t list technical specifications for ${matches.length === 1 ? 'it' : 'them'} yet.`;
    if (unavailable.length && available.length) {
      response += ` The catalog has no specifications listed for ${unavailable.map(product => `**${product.name}**`).join(', ')}.`;
    }
    return response;
  }
  if (type === 'compare') {
    return `I found these catalog options to compare: ${names}. Expand each specification card below to review the listed details side by side.`;
  }
  if (/\b(more|another|other options)\b/i.test(query)) {
    return `Here is what I found for ${names}. Would you like its specifications, image, or a quotation?`;
  }
  return `I found ${matches.length === 1 ? 'a catalog match' : 'catalog matches'} for your request: ${names}. Open a card for the available specifications and product image.`;
}

// Comprehensive clinical knowledge search & response generator
function generateAIResponse(userQuery, context = {}) {
  const q = (userQuery || '').toLowerCase().trim();
  const { products, company } = loadData();

  if (!q) {
    return {
      reply: "Hello! I am IKEDA's Clinical AI Assistant. How can I assist your hospital or surgical team today? You can ask me about our 4K Laparoscopic Towers, Urology tools, VATS equipment, ICU solutions, pricing, or our Kigali facility.",
      suggestions: [
        "4K Laparoscopy Towers",
        "Urology & Lasers",
        "VATS & Energy Instruments",
        "Request Quotation",
        "Kigali Office Location"
      ],
      actions: [
        { label: "Browse Catalog", url: "/products" },
        { label: "Request Quote", url: "/contact" }
      ]
    };
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)(\s+(there|ikeda|team))?[!. ]*$/i.test(q)) {
    return {
      reply: 'Hello! What equipment are you looking for? You can describe the department, product, or specification you need.',
      suggestions: ['Find an operating table', 'Show neonatal equipment', 'Ask about a ventilator', 'Request a quotation']
    };
  }

  const catalogProducts = findCatalogProducts(q, products, context.products || []);
  if (catalogProducts.length) {
    return {
      reply: buildCatalogReply(userQuery, catalogProducts),
      products: catalogProducts,
      suggestions: ['Request a quotation', 'Show more product options', 'Talk to a product specialist'],
      actions: [
        { label: 'Browse Product Catalog', url: `/products?search=${encodeURIComponent(userQuery)}` },
        { label: 'Request a Quotation', url: `/contact?subject=${encodeURIComponent(`Product inquiry: ${userQuery}`)}` }
      ]
    };
  }

  // 1. LAPAROSCOPY & VIDEO TOWERS
  if (q.includes('laparoscop') || q.includes('tower') || q.includes('4k') || q.includes('icg') || q.includes('cmos') || q.includes('compact') || q.includes('foldable') || q.includes('camera') || q.includes('endoscop')) {
    return {
      reply: "IKEDA ENDOSCOPY AFRICA provides world-class minimally invasive visualization systems:\n\n" +
        "• **4K Ultra HD Endoscopy Tower**: 3840×2160 resolution, ultra-wide surgical color gamut & Sony sensor technology.\n" +
        "• **4K ICG Enhanced Fluorescence Guided Unit**: Real-time indocyanine green lymphatic & biliary perfusion mapping.\n" +
        "• **Laparoscopy Premium HD**: 1/2.3-inch CMOS high-sensitivity sensor for deep cavitary illumination.\n" +
        "• **Laparoscopy Tower 1080p**: 1/2.8-inch CMOS with integrated LED cold light source and video processor.\n" +
        "• **Compact HD Visualisation Units**: Integrated all-in-one portable stations in 15\", 19\", 22\", 24\", 27\", and 32\" displays.\n" +
        "• **Compact Foldable Units**: 15\" and 19\" deployable foldable systems engineered for mobile surgical teams and rapid theatre deployment.\n" +
        "• **Optical Telescopes**: HD & 4K rigid scopes (0° & 30°) with scratch-resistant sapphire lenses.",
      suggestions: [
        "Request 4K Tower Quote",
        "Compact Foldable Specs",
        "Urology Instruments",
        "Chat with Biomedical Engineer"
      ],
      actions: [
        { label: "View Operating Theatre", url: "/products?group=Operating+Theatre" },
        { label: "Request Tower Quotation", url: "/contact?subject=4K+Laparoscopy+Tower+Inquiry" },
        { label: "WhatsApp Direct", url: "https://wa.me/250795360359?text=Hello%20IKEDA%20Africa,%20I%20am%20inquiring%20about%20your%20Laparoscopy%20Towers" }
      ]
    };
  }

  // 2. UROLOGY & ENDOUROLOGY
  if (q.includes('uro') || q.includes('cysto') || q.includes('resecto') || q.includes('uretero') || q.includes('pcnl') || q.includes('holmium') || q.includes('thulium') || q.includes('litho') || q.includes('stent') || q.includes('stone') || q.includes('diathermy')) {
    return {
      reply: "Our **Urology & Endourology Division** provides a comprehensive surgical armamentarium:\n\n" +
        "• **Endoscopic Scopes**: Rigid & Flexible Ureteroscopes, High-Definition Cystoscopes, Resectoscopes (compatible with Diathermy, Coblation, and Laser).\n" +
        "• **Surgical Lasers**: Advanced Holmium Laser & Thulium Laser platforms for lithotripsy and soft tissue resection.\n" +
        "• **Interventional Disposables**: Nitinol Stone Baskets, Ureteral Access Sheaths, Double-J Stents, Hydrophilic Guide Wires, and High-Pressure Dilation Balloons.\n" +
        "• **Surgical Sets**: Complete PCNL Sets (Percutaneous Nephrolithotomy), Lithotripsy Punches, Optical Forceps, and Sachse Urethrotomes.\n" +
        "• **Theatre Fluidics & Electronics**: Digital Uroflowmeters, Laparoscopic Irrigation & Suction Systems, and Bipolar Irrigation Ligation Forceps.",
      suggestions: [
        "Holmium Laser Specs",
        "Ureteroscope Options",
        "Request Urology Quote",
        "VATS & Energy Section"
      ],
      actions: [
        { label: "Explore Urology Catalog", url: "/products?group=Operating+Theatre" },
        { label: "Request Urology Quotation", url: "/contact?subject=Urology+Equipment+Inquiry" },
        { label: "WhatsApp Specialist", url: "https://wa.me/250795360359?text=Hello,%20I%20need%20specifications%20for%20Urology%20instruments" }
      ]
    };
  }

  // 3. VATS & ENERGY SECTION
  if (q.includes('vat') || q.includes('thorac') || q.includes('energy') || q.includes('harmonic') || q.includes('ligasure') || q.includes('bipolar') || q.includes('monopolar') || q.includes('plasma') || q.includes('shaver') || q.includes('telescope') || q.includes('arthro') || q.includes('ent') || q.includes('hystero')) {
    return {
      reply: "Our **VATS (Video-Assisted Thoracoscopic Surgery) & Advanced Energy Division** features:\n\n" +
        "• **Telescopes**: HD & 4K Laparoscopes (0° & 30°), Transurethral Cystoscopes, Hysteroscopes, TURP Saline Scopes, Arthroscopes, and ENT Telescopes.\n" +
        "• **Advanced Energy Platforms**: Harmonic Ultrasonic Surgical Procedures, LigaSure (Advanced Bipolar Vessel Sealing), and HF Bipolar & Monopolar Electrosurgical Generators.\n" +
        "• **Energy Section**: High-Speed Surgical Shavers and Controlled Plasma Surgical Ablation Systems.\n" +
        "• **Surgical Instruments**: Trocar Access Systems, Ergonomic Graspers & Dissectors, Endoscopic Suturing Instruments, HF Instruments, Ligation Clip Appliers, Liquid Tubing Devices, and Sterilization Reprocessing Containers.",
      suggestions: [
        "Harmonic & LigaSure Quote",
        "ENT & Arthroscopy Scopes",
        "Surgical Instruments",
        "Contact Biomedical Team"
      ],
      actions: [
        { label: "View VATS & Energy", url: "/products?group=Operating+Theatre" },
        { label: "Request Quote", url: "/contact?subject=VATS+and+Energy+Equipment" },
        { label: "Chat on WhatsApp", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20am%20interested%20in%20VATS%20and%20Energy%20systems" }
      ]
    };
  }

  // 4. ICU, VENTILATORS & CRITICAL CARE
  if (q.includes('icu') || q.includes('ventilator') || q.includes('monitor') || q.includes('defibrill') || q.includes('infusion') || q.includes('critical') || q.includes('emergency') || q.includes('resuscitat')) {
    return {
      reply: "Our **Intensive Care Unit (ICU) & Emergency Division** equips clinical spaces for critical resuscitation:\n\n" +
        "• **Invasive & Non-Invasive ICU Ventilators**: Advanced lung-protective modes, high-flow oxygen therapy, and internal turbine backup.\n" +
        "• **Multi-Parameter Patient Monitors**: Real-time 5-lead / 12-lead ECG, SpO2, NIBP, IBP, EtCO2 capnography, and temperature tracking.\n" +
        "• **Infusion & Syringe Pumps**: Precision micro-dosing with dose error reduction systems.\n" +
        "• **Defibrillators & Emergency Crash Equipment**: Biphasic AED and manual defibrillators with pacing capabilities.",
      suggestions: [
        "ICU Ventilator Quote",
        "Patient Monitor Models",
        "Neonatal Incubators",
        "Hospital Turnkey Setup"
      ],
      actions: [
        { label: "View ICU Equipment", url: "/products?group=Critical+Care+%26+Emergency" },
        { label: "Request ICU Quotation", url: "/contact?subject=ICU+Equipment+Inquiry" }
      ]
    };
  }

  // 5. MATERNAL, NEONATAL & INCUBATORS
  if (q.includes('neonat') || q.includes('incubator') || q.includes('matern') || q.includes('infant') || q.includes('warmer') || q.includes('phototherapy') || q.includes('delivery') || q.includes('pediatric') || q.includes('baby')) {
    return {
      reply: "Our **Maternal, Neonatal & Pediatric Care Division** ensures highest safety for newborns and mothers:\n\n" +
        "• **Neonatal Infant Incubators**: Microprocessor servo-controlled air and skin temperature, humidity management, and noise-dampened canopies.\n" +
        "• **Infant Radiant Warmers**: Built-in APGAR timers, motorized tilting mattresses, and integral phototherapy units.\n" +
        "• **LED Phototherapy Units**: High-intensity blue LED treatment for neonatal jaundice with low heat emission.\n" +
        "• **Maternity Suites**: Hydraulic and electric obstetric delivery beds, fetal Doppler monitors, and neonatal resuscitation tables.",
      suggestions: [
        "Infant Incubator Quote",
        "Radiant Warmer Specs",
        "Maternity Delivery Beds",
        "Contact Procurement Desk"
      ],
      actions: [
        { label: "View Maternal & Infant Care", url: "/products?group=Maternal+%26+Infant" },
        { label: "Request Maternal Equipment Quote", url: "/contact?subject=Neonatal+Equipment+Inquiry" }
      ]
    };
  }

  // 6. RADIOLOGY, X-RAY & C-ARM
  if (q.includes('radio') || q.includes('x-ray') || q.includes('xray') || q.includes('c-arm') || q.includes('c arm') || q.includes('ultrasound') || q.includes('imaging') || q.includes('fluoroscop')) {
    return {
      reply: "Our **Radiology & Diagnostic Imaging Division** delivers high-resolution hospital imaging:\n\n" +
        "• **Mobile Surgical C-Arm Systems**: High-frequency fluoroscopy generators with digital flat-panel detectors (FPD) for real-time orthopedic and vascular guidance.\n" +
        "• **Digital Diagnostic Ultrasound**: 4D Color Doppler platforms with cardiac, convex, linear, and transvaginal multi-frequency probes.\n" +
        "• **Digital Radiography (DR)**: Mobile and stationary ceiling-suspended hospital X-ray systems.",
      suggestions: [
        "C-Arm Fluoroscopy Quote",
        "Color Doppler Ultrasound",
        "Request Radiology Catalog",
        "Connect with Technical Team"
      ],
      actions: [
        { label: "View Diagnostics & Imaging", url: "/products?group=Diagnostics+%26+Specialty" },
        { label: "Request Imaging Quotation", url: "/contact?subject=Radiology+C-Arm+Inquiry" }
      ]
    };
  }

  // 7. PRICE, QUOTATION, TENDER & PURCHASING
  if (q.includes('price') || q.includes('quote') || q.includes('cost') || q.includes('quotation') || q.includes('buy') || q.includes('purchase') || q.includes('tender') || q.includes('proforma') || q.includes('invoice')) {
    return {
      reply: "We provide **formal proforma quotations, tender bidding support, and flexible hospital supply contracts** across Rwanda and East Africa.\n\n" +
        "• **Turnaround Time**: Formal quotations issued within 12–24 business hours.\n" +
        "• **What is Included**: Equipment specifications, CE/FDA/ISO certifications, freight to facility, on-site installation, clinical training, and manufacturer warranty.\n" +
        "• **Fast-Track WhatsApp**: You can also receive an instant proforma quote via WhatsApp by sending your equipment list directly to our sales desk.",
      suggestions: [
        "Fill Online Quote Form",
        "Chat with Sales on WhatsApp",
        "Call Kigali Office Directly",
        "Explore Product Catalog"
      ],
      actions: [
        { label: "Submit Online Quote Request", url: "/contact#quote-form" },
        { label: "Instant WhatsApp Quotation", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20would%20like%20to%20request%20an%20official%20quotation" },
        { label: "Call Sales: +250 795 360 359", url: "tel:+250795360359" }
      ]
    };
  }

  // 8. LOCATION, ADDRESS & SHOWROOM
  if (q.includes('location') || q.includes('address') || q.includes('where') || q.includes('kigali') || q.includes('rwanda') || q.includes('masaka') || q.includes('office') || q.includes('visit') || q.includes('ircad')) {
    return {
      reply: "IKEDA ENDOSCOPY AFRICA Ltd is based in **Kigali, Rwanda**:\n\n" +
        "📍 **Physical Address**: Kigali, Kicukiro, Masaka (opposite IRCAD Africa), Cyimo, Kabeza — Rwanda\n" +
        "🕒 **Operating Hours**: Monday – Friday: 8:00 AM – 5:30 PM (24/7 Field & Emergency Support)\n" +
        "📞 **Telephone**: +250 795 360 359\n" +
        "✉️ **Email**: ikedasurgery@gmail.com\n\n" +
        "We welcome hospital directors, surgeons, and procurement committees to visit our local showroom and biomedical center to test towers and optics firsthand.",
      suggestions: [
        "Open in Google Maps",
        "Schedule a Showroom Visit",
        "Request Quotation",
        "Chat on WhatsApp"
      ],
      actions: [
        { label: "Open in Google Maps", url: "https://www.google.com/maps/place/IKEDA+ENDOSCOPY+AFRICA+LTD/@-1.9934717,30.2071428,17z/data=!3m1!4b1!4m6!3m5!1s0x19db57b36c338e7f:0x6b2dbb8c705a81fb!8m2!3d-1.9934771!4d30.2097177!16s%2Fg%2F11zh8jxs2d" },
        { label: "Directions on Contact Page", url: "/contact" }
      ]
    };
  }

  // 9. BIOMEDICAL ENGINEERING, WARRANTY & SERVICE
  if (q.includes('warranty') || q.includes('service') || q.includes('maintenance') || q.includes('repair') || q.includes('biomedical') || q.includes('engineer') || q.includes('training') || q.includes('spare part')) {
    return {
      reply: "Unlike overseas importers, IKEDA maintains an **in-country Biomedical Engineering Center** in Kigali:\n\n" +
        "• **Manufacturer Warranty**: Comprehensive warranty on all video processors, light sources, sensors, and scopes.\n" +
        "• **Spare Parts Inventory**: Critical replacement optics, bulbs, cables, and boards stocked directly in Kigali for zero theatre downtime.\n" +
        "• **Preventive Maintenance**: Regular optical calibration, leakage testing, electrical safety checks, and autoclave compatibility audits.\n" +
        "• **Surgeon & Nursing Training**: Dedicated on-site clinical handling training for OR nurses and surgical fellows.",
      suggestions: [
        "Request Maintenance Support",
        "Schedule Biomedical Audit",
        "Contact Engineering Team",
        "View Products"
      ],
      actions: [
        { label: "Request Technical Support", url: "/contact?subject=Biomedical+Engineering+Support" },
        { label: "WhatsApp Biomedical Desk", url: "https://wa.me/250795360359?text=Hello%20IKEDA%20Biomedical,%20I%20need%20maintenance%20or%20technical%20support" }
      ]
    };
  }

  // 10. CERTIFICATIONS (ISO, CE, FDA)
  if (q.includes('iso') || q.includes('ce') || q.includes('fda') || q.includes('certif') || q.includes('quality') || q.includes('standard')) {
    return {
      reply: "All medical technologies distributed by IKEDA ENDOSCOPY AFRICA Ltd meet the highest international clinical standards:\n\n" +
        "• **ISO 9001:2015 & ISO 13485**: Certified Quality Management Systems for Medical Devices.\n" +
        "• **CE Mark (Conformité Européenne)**: Strict compliance with European Medical Device Directives.\n" +
        "• **FDA Listed & Compliant**: Validated safety protocols for endoscopy, electrosurgery, and life-support electronics.",
      suggestions: [
        "Request Compliance Certificates",
        "Explore Product Catalog",
        "Request Formal Quotation"
      ],
      actions: [
        { label: "View Manufacturers & Certifications", url: "/manufacturers" },
        { label: "Request Tender Dossier", url: "/contact?subject=Regulatory+Compliance+Inquiry" }
      ]
    };
  }

  // 11. GENERAL SEARCH IN PRODUCTS DATABASE
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
      suggestions: [
        "Request Quotation for These",
        "View in Products Catalog",
        "Check Operating Theatre",
        "Chat with Sales Team"
      ],
      actions: [
        { label: "Browse Products", url: `/products?search=${encodeURIComponent(userQuery)}` },
        { label: "Request Quotation", url: `/contact?subject=${encodeURIComponent('Inquiry regarding: ' + userQuery)}` }
      ]
    };
  }

  if (/\b(more|another|other options|that one|which one|it)\b/i.test(q)) {
    return {
      reply: 'Which product are you referring to? Tell me its name or department and I can look up the available specifications, images, and quotation options.',
      suggestions: ['Operating Theatre', 'Critical Care & Emergency', 'Maternal & Infant', 'Diagnostics & Specialty']
    };
  }

  if (/\b(looking for|need|want|search|find|recommend|suggest|looking to buy)\b/i.test(q)) {
    return {
      reply: `I couldn't find a close product match for **"${userQuery}"** in the catalog. What department or clinical use should I search for? I can check the equipment listings and share the details that are available.`,
      suggestions: ['Operating Theatre', 'Critical Care & Emergency', 'Maternal & Infant', 'Diagnostics & Specialty'],
      actions: [{ label: 'Browse All Products', url: '/products' }]
    };
  }

  // 12. HELPFUL GENERAL FALLBACK
  return {
    reply: `Thank you for asking about **"${userQuery}"**. \n\nIKEDA ENDOSCOPY AFRICA supplies multi-specialty clinical equipment across 16 hospital divisions — specializing in 4K & HD Laparoscopic Towers, Endourology, VATS, ICU Ventilators, Infant Incubators, C-Arm Radiology, and Surgical Instrumentation.\n\nWould you like me to connect you with our Kigali biomedical team or prepare an official quotation?`,
    suggestions: [
      "4K Laparoscopy Towers",
      "Urology & Endourology",
      "ICU & Neonatal Incubators",
      "Request Official Quotation",
      "Kigali Office & Contact"
    ],
    actions: [
      { label: "Browse All Products", url: "/products" },
      { label: "Chat on WhatsApp", url: `https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20am%20looking%20for%20information%20regarding%20${encodeURIComponent(userQuery)}` },
      { label: "Request Quotation", url: "/contact" }
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
