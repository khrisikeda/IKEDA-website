// IKEDA assistant — decides how to answer each message.
//
// Order of checks:
//   welcome → small talk → "prepare my inquiry" → medical-advice refusal →
//   active quotation builder → competitors → prices → delivery →
//   company facts → specialised legacy engine (clinic setup, comparisons,
//   definitions) → site-wide search (products, articles, pages) →
//   legacy engine → closest matches → fallback.
//
// Every reply passes through finalize(), which applies the business rules
// one last time and adds language/inquiry metadata for the chat widget.

const procurementAssistant = require('../procurementAssistant');
const { normalize, detectLanguage, frenchToEnglish } = require('./text');
const { getKnowledge, search, bestSentences } = require('./knowledge');
const I = require('./intents');
const glossary = require('./glossary');

const MAX_PRODUCTS = 4;

function cleanFeature(f) {
  return String(f || '').replace(/^[►•\-\s]+/, '').trim();
}

function productCard(p, lang, isTop, qty = 1) {
  const feats = (p.features || []).map(cleanFeature).filter((f) => f.length > 3).slice(0, 3);
  const reason = feats.length
    ? (isTop ? I.t(lang, 'Best match for your request. ', 'Meilleure correspondance avec votre demande. ') : '') + feats.join(' · ')
    : (isTop ? I.t(lang, 'Best match for your request in our catalog.', 'Meilleure correspondance dans notre catalogue.') : '');
  return {
    name: p.name,
    category: p.category,
    subtitle: p.subtitle,
    image: p.image,
    specification: p.specification,
    features: p.features,
    slug: p.slug,
    itemIdx: p.itemIdx,
    qty,
    isRecommended: isTop,
    recommendationBadge: isTop ? I.t(lang, '⭐ Best match', '⭐ Meilleur choix') : '',
    recommendationReason: reason
  };
}

// Words that describe the buyer's situation rather than the product itself
const CONTEXT_WORDS = /\b(recommend\w*|suggest\w*|advise|best|good|better|ideal|suitable|right|need\w*|looking|search\w*|want\w*|interested|buy\w*|purchas\w*|order\w*|get|rural|urban|remote|small|big|large|busy|clinic\w*|hospital\w*|facility|facilities|cent(er|re)s?|health|district|referral|private|public|budget|affordable|low cost|quality|top|new|used|our|my|a|an|the|for|in|of|do|you|have|sell|stock|carry|any|there|is|are|which|what|one|ones|option\w*|model\w*|type\w*|kind)\b/g;

function productQuery(text) {
  const stripped = text
    .replace(CONTEXT_WORDS, ' ')
    .replace(/(^|\s)\d{1,3}(\s*x)?(?=\s|$)/g, ' ') // quantities like "2" or "3 x"
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || text;
}

// "2 suction units and an autoclave" → [{ product, qty }, …] (one best match per part)
function requestedProducts(text) {
  const parts = text
    .split(/\s*(?:,|;|\+|&|\band\b|\bplus\b|\balso\b)\s*/)
    .map((p) => p.trim())
    .filter((p) => productQuery(p).length > 1);
  const found = [];
  parts.forEach((part) => {
    const match = productMatches(part, { minTitleCoverage: 0.6 })[0];
    if (!match || found.some((f) => f.product.name === match.name)) return;
    const qtyMatch = part.match(/(?:^|\s)(\d{1,3})(?:\s*x)?\s+\D/);
    found.push({ product: match, qty: qtyMatch ? Math.max(1, Math.min(999, parseInt(qtyMatch[1], 10))) : 1 });
  });
  return found;
}

// Strong product matches for a query (names that contain most of the query terms)
function productMatches(query, { minTitleCoverage = 0.6 } = {}) {
  const { results } = search(productQuery(query), { types: ['product'], limit: 12 });
  if (!results.length) return [];
  const top = results[0];
  if (top.titleCoverage < minTitleCoverage) return [];
  return results
    .filter((r) => r.titleCoverage >= minTitleCoverage && r.score >= top.score * 0.55)
    .slice(0, MAX_PRODUCTS)
    .map((r) => r.doc.ref);
}

function productAnswer(products, lang, intro) {
  const cards = products.map((p, i) => productCard(p, lang, i === 0));
  const lines = products.map((p) => `• **${p.name}** — ${[p.category, p.subtitle].filter(Boolean).join(' · ')}`).join('\n');
  const reply = (intro ? intro + '\n\n' : I.t(lang,
    products.length === 1 ? 'Yes — we have this in our catalog:' : `I found **${products.length} matching products** in our catalog:`,
    products.length === 1 ? 'Oui — nous avons ce produit dans notre catalogue :' : `J'ai trouvé **${products.length} produits correspondants** dans notre catalogue :`) + '\n\n') +
    lines + '\n\n' +
    I.t(lang,
      'Open a card to see the full specifications. Use **＋ Add to inquiry** on any product you want quoted — the best match is added for you.',
      'Ouvrez une fiche pour voir toutes les caractéristiques. Utilisez **＋ Ajouter à la demande** pour chaque produit à chiffrer — le meilleur choix est ajouté automatiquement.');
  const slug = products[0] && products[0].slug;
  return {
    reply,
    products: cards,
    actions: [
      { label: I.t(lang, 'See in catalog', 'Voir dans le catalogue'), url: slug ? `/products?cat=${encodeURIComponent(slug)}` : '/products' }
    ]
  };
}

function contentAnswer(hit, query, lang) {
  const d = hit.doc;
  const text = d.ref.text || d.body;
  const sentences = bestSentences(text, query, 3);
  const source = d.type === 'article'
    ? I.t(lang, `From our article **${d.ref.article.title}**:`, `Extrait de notre article **${d.ref.article.title}** (en anglais) :`)
    : I.t(lang, `From our **${d.ref.page}** page — *${d.ref.heading}*:`, `Extrait de notre page **${d.ref.page}** — *${d.ref.heading}* (en anglais) :`);
  return {
    reply: `${source}\n\n> ${sentences.join(' ')}`,
    actions: [{ label: d.type === 'article' ? I.t(lang, 'Read the article', "Lire l'article") : I.t(lang, 'Open the page', 'Ouvrir la page'), url: d.url }]
  };
}

// Questions the old engine already answers well
function legacyPreferred(en) {
  return /\b(open|opening|start|starting|setup|set up|setting up|build|building|equip|equipping|establish|establishing|new|turnkey)\b.*\b(clinic|theatre|theater|operating room|hospital|surgical cent(er|re)|suite|facility|department|ward|unit|icu|maternity)\b/.test(en) ||
    /\b(compare|comparison|difference|versus|vs)\b/.test(en) ||
    /\bwhat (is|are) (a |an |the )?(laparoscop|endoscop|vats|thoracoscop|incubator|ventilat|respirat|autoclave|steriliz|c-arm|c arm|fluoroscop|keyhole)/.test(en) ||
    /\b(which|what) department\b|\bwhere does .* belong\b/.test(en) ||
    /\b(what|which) (equipment|products|items|instruments)\b.*\b(for|in|need|needed|required)\b/.test(en) ||
    /\bwhat (do|does) (i|we|a|an|my|our) .*\bneed\b/.test(en);
}

function isLegacyFallback(res) {
  return !res || !res.reply || /^I understand your inquiry regarding/.test(res.reply);
}

function isLegacyLooseSearch(res) {
  return res && /^I found \*\*\d+ matching options?\*\*/.test(res.reply || '');
}

// Final safety net: business rules applied to every reply
const PROMISE_PATTERNS = [
  /[^\n.]*\bwithin\s+\**\s*\d+\s*[–-]\s*\d+\s*\**\s*(business\s+)?(hours|days|weeks)\**[^\n.]*[.]?/gi,
  /[^\n.]*\bguaranteed\s+(door-to-door\s+)?delivery[^\n.]*[.]?/gi
];
const FR_LABELS = {
  'Request Official Quotation': 'Demander un devis officiel', 'Request Quotation': 'Demander un devis', 'Request Formal Quotation': 'Demander un devis',
  'Browse Product Catalog': 'Voir le catalogue', 'Browse Full Catalog': 'Voir tout le catalogue', 'Explore Products': 'Voir les produits',
  'WhatsApp Direct': 'WhatsApp', 'Contact Us': 'Nous contacter', 'Call Us Now': 'Appeler', 'Contact Clinical Team': "Contacter l'équipe",
  'Send Inquiry for Quotation': 'Envoyer la demande de devis', 'Instant WhatsApp Quotation': 'Devis par WhatsApp',
  'Submit Online Quote Request': 'Demande de devis en ligne', 'Fill Contact & Quote Form': 'Formulaire de devis'
};

function finalize(res, lang, meta = {}) {
  const out = { ...res };
  let reply = String(out.reply || '');
  PROMISE_PATTERNS.forEach((re) => { reply = reply.replace(re, ''); });
  reply = reply.replace(/\n{3,}/g, '\n\n').trim();
  if (meta.source === 'legacy' && lang === 'fr') {
    reply = "*Réponse détaillée ci-dessous (en anglais). N'hésitez pas à continuer en français.*\n\n" + reply;
    if (Array.isArray(out.actions)) out.actions = out.actions.map((a) => ({ ...a, label: FR_LABELS[a.label] || a.label }));
  }
  out.reply = reply;
  out.lang = lang;
  out.intent = meta.intent || 'answer';
  // Questions worth carrying into the client's quotation request
  // (skip one-word replies such as "yes", "oui", "ok")
  // Product requests are already in the product list, so they are not repeated as questions.
  const productOnly = ['product', 'multi_product', 'product_loose'].includes(meta.intent);
  const note = productOnly ? '' : String(meta.note || '').trim();
  out.inquiryNote = note.length >= 12 && note.split(/\s+/).length >= 3 ? note.slice(0, 200) : null;
  return out;
}

function multiProductAnswer(found, lang) {
  const cards = found.map((f) => productCard(f.product, lang, true, f.qty));
  const lines = found.map((f) => `• **${f.product.name}** — ${I.t(lang, 'qty', 'qté')} ${f.qty}`).join('\n');
  return {
    reply: I.t(lang,
      `Here's what I found for each item you asked for:\n\n${lines}\n\nI've added them to your inquiry list. Ask about any item to see other options, or say **"prepare my inquiry"** when you're ready.`,
      `Voici ce que j'ai trouvé pour chaque article demandé :\n\n${lines}\n\nJe les ai ajoutés à votre demande. Posez-moi une question sur un article pour voir d'autres options, ou dites **« préparer ma demande »** quand vous êtes prêt.`),
    products: cards,
    actions: []
  };
}

function respond(message, context = {}, legacy = {}) {
  const kb = getKnowledge();
  const raw = String(message || '').slice(0, 500);
  const lang = detectLanguage(raw, context.lang);
  const n = normalize(raw);
  const en = lang === 'fr' ? frenchToEnglish(raw) : n;
  const c = I.companyInfo(kb.company);
  const note = raw.trim();

  // 1. Widget opened
  if (!n) return finalize(I.welcome(lang), lang, { intent: 'welcome' });

  // 2. Greetings, thanks, goodbye, "who are you"
  const talk = I.smallTalk(n, lang, c);
  if (talk) return finalize(talk, lang, { intent: 'smalltalk' });

  // 3. Compile everything into an inquiry (WhatsApp / form)
  if (I.isInquiryRequest(n)) {
    const leftover = en.replace(/\b(prepare|compile|send|make|write|draft|create|show|put|inquiry|enquiry|letter|quote|quotation|request|whatsapp|list|everything|all|it|this|them|to|on|via|by|me|the|my|for|please|i|want|get|ask|a)\b/g, ' ').trim();
    const extra = leftover ? requestedProducts(leftover) : [];
    const count = Number(context.inquiryCount) || 0;
    const empty = count === 0 && extra.length === 0;
    return finalize({
      reply: empty
        ? I.t(lang,
          "Your quotation request is empty so far. Tell me which products you need — or describe the department or clinic you're equipping and I'll recommend what you need. You can also write your request directly on WhatsApp or in our inquiry form.",
          "Votre demande de devis est encore vide. Dites-moi de quels produits vous avez besoin — ou décrivez le service ou la clinique que vous équipez et je vous recommanderai le nécessaire. Vous pouvez aussi écrire directement votre demande sur WhatsApp ou dans notre formulaire.")
        : I.t(lang,
          "Here is your quotation request, with everything you asked about and everything I recommended. Adjust the quantities or remove items, then send it on **WhatsApp** or through our **inquiry form**.",
          "Voici votre demande de devis, avec tout ce que vous avez demandé et tout ce que je vous ai recommandé. Ajustez les quantités ou retirez des articles, puis envoyez-la sur **WhatsApp** ou via notre **formulaire**."),
      actions: empty ? I.contactActions(lang, c, I.t(lang, 'Hello IKEDA, I would like to request a quotation for: ', 'Bonjour IKEDA, je souhaite un devis pour : ')) : [],
      action: 'compile_inquiry',
      addToInquiry: extra.map((f) => productCard(f.product, lang, false, f.qty)),
      whatsapp: c.phoneDigits
    }, lang, { intent: 'inquiry' });
  }

  // 4. Never give medical advice
  if (I.isMedicalAdvice(n)) return finalize(I.medicalReply(lang, c), lang, { intent: 'medical_refusal' });

  // 5. Continue an active department quotation (yes / no / add / remove)
  const session = context.procurementSession;
  if (session && (session.pendingPermissionPrompt || (Array.isArray(session.items) && session.items.length))) {
    const r = procurementAssistant.handleProcurementQuery(en, context, kb.categories);
    if (r) return finalize(r, lang, { intent: 'procurement', source: 'legacy' });
  }

  // 6. Competitors: never name or compare them; show our equivalent
  const competitor = I.findCompetitor(n);
  if (competitor) {
    const q = en.split(competitor).join(' ');
    const products = productMatches(q, { minTitleCoverage: 0.5 });
    const res = products.length
      ? productAnswer(products, lang, I.competitorReply(lang, true))
      : { reply: I.competitorReply(lang, false), actions: [{ label: I.t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }] };
    return finalize(res, lang, { intent: 'competitor', note });
  }

  // 7. Prices: never quoted in chat
  if (I.isPriceQuestion(n)) {
    const q = en.replace(/\b(price|prices|pricing|cost|costs|how much|is|the|of|for|a|an|what|cheap|cheapest|expensive)\b/g, ' ');
    const products = productMatches(q, { minTitleCoverage: 0.5 });
    const res = products.length ? productAnswer(products, lang, I.priceReply(lang)) : { reply: I.priceReply(lang), actions: [{ label: I.t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }] };
    return finalize(res, lang, { intent: 'price', note });
  }

  // 8. Delivery: never promise dates
  if (I.isDeliveryQuestion(n)) return finalize(I.deliveryReply(lang, c), lang, { intent: 'delivery', note });

  // 9. Company facts (hours, location, contact, manufacturers, services…)
  const fact = I.siteFact(n, lang, kb) || (lang === 'fr' ? I.siteFact(en, lang, kb) : null);
  if (fact) return finalize(fact, lang, { intent: 'site_fact', note: fact.noteworthy ? note : null });

  // 10a. "What is …?" — short neutral explanation + related products
  const term = glossary.lookup(en);
  if (term) {
    const related = productMatches(term.search, { minTitleCoverage: 0.5 }).slice(0, 3);
    const res = related.length
      ? productAnswer(related, lang, term[lang] + '\n\n' + I.t(lang, 'Related products in our catalog:', 'Produits associés dans notre catalogue :'))
      : { reply: term[lang], actions: [{ label: I.t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }] };
    return finalize(res, lang, { intent: 'definition', note });
  }

  // 10b. Clinic setup, comparisons, department questions → specialised engine
  if (legacyPreferred(en) && legacy.generate) {
    const r = legacy.generate(en, context);
    if (!isLegacyFallback(r) && !isLegacyLooseSearch(r)) return finalize(r, lang, { intent: 'consultation', source: 'legacy', note });
  }

  // 11. Several products in one message ("2 suction units and an autoclave")
  const multi = requestedProducts(en);
  if (multi.length >= 2) return finalize(multiProductAnswer(multi, lang), lang, { intent: 'multi_product', note });

  // 11b. Site-wide search
  const { results } = search(en, { limit: 10 });
  const top = results[0];
  const products = productMatches(en);
  const bestProduct = search(en, { types: ['product'], limit: 1 }).results[0];
  const productScore = bestProduct ? bestProduct.score : 0;
  // An article/page wins only if it covers the question and clearly beats the best product
  const contentWins = top && (top.doc.type === 'article' || top.doc.type === 'page') &&
    top.coverage >= 0.6 && top.score >= 6 && top.score > productScore * 1.6;
  if (contentWins) return finalize(contentAnswer(top, en, lang), lang, { intent: 'content', note });
  if (products.length) return finalize(productAnswer(products, lang), lang, { intent: 'product', note });

  // 12. Specialised engine for everything else (departments, specialties…)
  if (legacy.generate) {
    const r = legacy.generate(en, context);
    if (!isLegacyFallback(r) && !(isLegacyLooseSearch(r) && results.length)) {
      return finalize(r, lang, { intent: 'legacy', source: 'legacy', note });
    }
  }

  // 13. Closest matches
  const looseProducts = productMatches(en, { minTitleCoverage: 0.34 });
  if (looseProducts.length) {
    return finalize(productAnswer(looseProducts, lang, I.t(lang,
      "I'm not completely sure what you need, but these products in our catalog are the closest match:",
      'Je ne suis pas certain de bien comprendre votre besoin, mais voici les produits les plus proches dans notre catalogue :')), lang, { intent: 'product_loose', note });
  }
  if (top && top.score >= 4 && (top.doc.type === 'article' || top.doc.type === 'page')) {
    return finalize(contentAnswer(top, en, lang), lang, { intent: 'content_loose', note });
  }
  if (top && top.doc.type === 'department') {
    const cat = top.doc.ref;
    return finalize({
      reply: I.t(lang,
        `This sounds related to our **${cat.name}** range — ${cat.tagline || ''}.\n\n${cat.description || ''}\n\nTell me the specific equipment you need, or ask me to recommend a setup for this department.`,
        `Cela semble concerner notre gamme **${cat.name}** — ${cat.tagline || ''}.\n\nIndiquez-moi l'équipement précis dont vous avez besoin, ou demandez-moi de recommander un équipement complet pour ce service.`),
      actions: [{ label: I.t(lang, `View ${cat.name}`, `Voir ${cat.name}`), url: top.doc.url }]
    }, lang, { intent: 'department', note });
  }

  // 14. Honest fallback
  return finalize({
    reply: I.t(lang,
      "I'm sorry, I couldn't find that on our website. You can try:\n• a product name (e.g. *patient monitor*, *suction unit*, *dental chair*)\n• a department (e.g. *ICU*, *maternity*, *operating theatre*)\n• *\"I want to open a clinic\"* for a full recommendation\n\nOr ask our team directly — they'll be happy to help.",
      "Désolé, je n'ai pas trouvé cette information sur notre site. Vous pouvez essayer :\n• un nom de produit (ex. *moniteur patient*, *aspirateur chirurgical*, *fauteuil dentaire*)\n• un service (ex. *réanimation*, *maternité*, *bloc opératoire*)\n• *« Je veux ouvrir une clinique »* pour une recommandation complète\n\nOu posez directement la question à notre équipe, elle se fera un plaisir de vous aider."),
    actions: [{ label: I.t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }, ...I.contactActions(lang, c, I.t(lang, `Hello IKEDA, I have a question: ${raw}`, `Bonjour IKEDA, j'ai une question : ${raw}`))]
  }, lang, { intent: 'fallback', note });
}

module.exports = { respond };
