// Bilingual (EN/FR) intents: small talk, business rules (no prices,
// no medical advice, no delivery promises, no competitors) and answers
// about the company drawn from the site's own data.

const { normalize } = require('./text');

const t = (lang, en, fr) => (lang === 'fr' ? fr : en);

function waLink(phoneDigits, text) {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}

function companyInfo(company) {
  const phone = company.phone || '+250 795 360 359';
  return {
    name: company.name || 'IKEDA ENDOSCOPY AFRICA Ltd',
    phone,
    phoneDigits: phone.replace(/[^0-9]/g, ''),
    email: company.email || 'ikedasurgery@gmail.com',
    address: company.address || 'Kigali, Kicukiro, Masaka, Cyimo, Kabeza — Rwanda',
    hours: company.workingHours || 'Mon – Fri: 8:00 AM – 5:30 PM',
    maps: company.googleMapsLinkUrl || '/contact',
    mission: company.mission || '',
    vision: company.vision || '',
    about: company.about || ''
  };
}

function contactActions(lang, c, waText) {
  return [
    { label: t(lang, 'WhatsApp us', 'Écrire sur WhatsApp'), url: waLink(c.phoneDigits, waText || t(lang, 'Hello IKEDA, I would like some information.', "Bonjour IKEDA, j'aimerais avoir des informations.")) },
    { label: t(lang, 'Contact form', 'Formulaire de contact'), url: '/contact#quote-form' }
  ];
}

// ── Small talk ───────────────────────────────────────────────────────
function smallTalk(n, lang, c) {
  const s = n.replace(/[!?.,]+/g, ' ').trim();
  if (/^(hi|hello|hey|good (morning|afternoon|evening|day)|greetings|bonjour|bonsoir|salut|coucou|allo|hello there)( (there|ikeda|team|doctor|dr|a vous|a tous|l'equipe))?$/.test(s)) {
    return {
      reply: t(lang,
        `Hello! 👋 I'm the **IKEDA assistant**. I can help you find equipment in our catalog, recommend products for a department or a new clinic, answer questions about IKEDA, and prepare your quotation request for WhatsApp or our inquiry form.\n\nWhat are you looking for today?`,
        `Bonjour ! 👋 Je suis l'**assistant IKEDA**. Je peux vous aider à trouver des équipements dans notre catalogue, recommander des produits pour un service ou une nouvelle clinique, répondre à vos questions sur IKEDA et préparer votre demande de devis pour WhatsApp ou notre formulaire.\n\nQue recherchez-vous aujourd'hui ?`),
      actions: [
        { label: t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' },
        { label: t(lang, 'Request a quote', 'Demander un devis'), url: '/contact#quote-form' }
      ]
    };
  }
  if (/^(ok |okay )?(thank you|thanks|thank u|thx|many thanks|merci|merci beaucoup|merci bien|great thanks|super merci|parfait merci|perfect|great|awesome|parfait|super|genial)( (very much|a lot|beaucoup|bien))?$/.test(s)) {
    return {
      reply: t(lang,
        "You're welcome! If you'd like, I can put everything we discussed into a quotation request for you — just say **\"prepare my inquiry\"**.",
        'Avec plaisir ! Si vous le souhaitez, je peux regrouper tout ce dont nous avons parlé dans une demande de devis — dites simplement **« préparer ma demande »**.'),
      actions: []
    };
  }
  if (/^(bye|goodbye|see you|see ya|cya|talk later|au revoir|a bientot|bonne journee|bonne soiree|a plus)$/.test(s)) {
    return {
      reply: t(lang, 'Goodbye, and thank you for visiting IKEDA ENDOSCOPY AFRICA! Our team is available whenever you need us.',
        "Au revoir et merci de votre visite chez IKEDA ENDOSCOPY AFRICA ! Notre équipe reste à votre disposition."),
      actions: contactActions(lang, c)
    };
  }
  if (/\b(who are you|what are you|what can you do|how can you help|are you (a )?(bot|robot|human|ai)|qui es[- ]tu|qui etes[- ]vous|que (peux|pouvez)[- ](tu|vous) faire|tu es (un )?robot|vous etes (un )?robot)\b/.test(s)) {
    return {
      reply: t(lang,
        "I'm IKEDA's virtual assistant (automated, not a person). I can:\n• find products and specifications in our catalog\n• recommend equipment for a department or a new clinic\n• answer questions about IKEDA (location, services, manufacturers…)\n• compile everything you need into a quotation request for WhatsApp or our inquiry form\n\nI don't give prices, medical advice or delivery dates — our team handles those in your official quotation.",
        "Je suis l'assistant virtuel d'IKEDA (automatique, pas une personne). Je peux :\n• trouver des produits et leurs caractéristiques dans notre catalogue\n• recommander des équipements pour un service ou une nouvelle clinique\n• répondre à vos questions sur IKEDA (adresse, services, fabricants…)\n• regrouper vos besoins dans une demande de devis pour WhatsApp ou notre formulaire\n\nJe ne donne ni prix, ni conseils médicaux, ni délais de livraison — notre équipe s'en charge dans votre devis officiel."),
      actions: [{ label: t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }]
    };
  }
  return null;
}

// ── Business rules ───────────────────────────────────────────────────
const COMPETITORS = [
  'olympus', 'karl storz', 'storz', 'stryker', 'richard wolf', 'pentax', 'fujifilm', 'fuji', 'mindray', 'philips',
  'ge healthcare', 'siemens', 'medtronic', 'ethicon', 'johnson & johnson', 'aesculap', 'b braun', 'b. braun', 'draeger',
  'drager', 'hamilton medical', 'smith & nephew', 'smith and nephew', 'conmed', 'arthrex', 'zeiss', 'topcon', 'nidek',
  'sirona', 'dentsply', 'planmeca', 'a-dec', 'hillrom', 'hill-rom', 'getinge', 'maquet', 'steris', 'tuttnauer',
  'nihon kohden', 'edan', 'comen', 'schiller', 'zoll', 'welch allyn', 'heine', 'canon medical', 'samsung medison',
  'esaote', 'shimadzu', 'carestream', 'agfa', 'baxter', 'fresenius', 'becton', 'bd medical', 'cardinal health'
];

function findCompetitor(n) {
  return COMPETITORS.find((name) => new RegExp(`(^|[^a-z])${name.replace(/[.&]/g, (m) => '\\' + m)}([^a-z]|$)`).test(n)) || null;
}

const PATIENT_EQUIPMENT = '(monitor\\w*|bed\\w*|trolley\\w*|stretcher\\w*|transfer|moniteur\\w*|lit\\w*|chariot\\w*|brancard\\w*|warmer\\w*|lift\\w*|scale\\w*|cart\\w*|positioning|table\\w*|chair\\w*|fauteuil\\w*|simulator\\w*)';

function isMedicalAdvice(n) {
  if (/\b(dose|doses|dosage|dosing|posologie|mg\/kg|how many (mg|ml|tablets)|prescri\w*|medication\w*|medicine to take|which drug|what drug|medicament\w*|antibiotic\w*|antibiotique\w*|painkiller\w*|analgesi\w*)\b/.test(n)) return true;
  if (new RegExp(`\\b(my|our|this|mon|ma|notre|ce|cette)\\s+(patient|patiente|patients|child|baby|son|daughter|wife|husband|mother|father|enfant|bebe|fils|fille|femme|mari|mere|pere)\\s+(has|have|had|is|was|got|gets|suffers?|keeps|feels|a|est|souffre|presente|avait|fait)\\b(?!\\s*${PATIENT_EQUIPMENT})`).test(n)) return true;
  if (/\b(how (do|should|can|to) (i |we )?(treat|cure|manage)|what should i do (for|about|if)|treatment (for|of)|cure for|symptom\w*|diagnos(e|is) (my|a|this|of)|is it (safe|dangerous) (for|to) (me|my|a patient|take)|should (i|we|he|she) (have|get|undergo) (surgery|an operation)|comment (traiter|soigner|guerir)|que (dois|devons)[- ](je|nous) faire|traitement (de|du|des|pour|contre)|symptome\w*|guerir|soigner)\b/.test(n)) return true;
  return false;
}

const PRICE_RE = /\b(price|prices|pricing|priced|cost|costs|costing|how much|cheap|cheapest|expensive|rates?|tariff|prix|cout|couts|coute|combien|tarif|tarifs|cher)\b/;

function isPriceQuestion(n) {
  return PRICE_RE.test(n);
}

function isDeliveryQuestion(n) {
  if (/\b(delivery|deliver|livraison|livrer)\s+(bed|beds|room|rooms|table|tables|suite|ward|lit|lits|salle|table)\b/.test(n)) return false;
  if (/\b(delivery|accouchement)\b/.test(n) && /\b(maternity|obstetric|labou?r|baby|mother|maternite|bebe|mere|accouchement)\b/.test(n)) return false;
  return /\b(deliver|delivers|delivery|deliveries|shipping|ship|ships|shipment|lead time|how long (will|does|to)|how soon|when (can|will) (i|we) (get|receive)|arrive|dispatch|export|exports|livraison|livrer|livrez|delai|delais|expedi\w*|envoyez[- ]vous|exportez)\b/.test(n);
}

function priceReply(lang) {
  return t(lang,
    "We don't publish prices online. Every price is given in an **official quotation**, because it depends on the configuration, quantity, accessories and delivery destination.\n\nTell me which products you need (or I can recommend some), and I'll prepare your quotation request for WhatsApp or our inquiry form.",
    "Nous ne publions pas de prix en ligne. Chaque prix est communiqué dans un **devis officiel**, car il dépend de la configuration, de la quantité, des accessoires et de la destination de livraison.\n\nDites-moi de quels produits vous avez besoin (ou je peux vous en recommander), et je préparerai votre demande de devis pour WhatsApp ou notre formulaire.");
}

function deliveryReply(lang, c) {
  return {
    reply: t(lang,
      "We supply hospitals and clinics in **Rwanda, East Africa and across Africa**, and we can discuss other destinations.\n\nDelivery time depends on stock, destination and customs, so I can't promise a date here — our team will confirm the delivery terms (and installation, if needed) in your official quotation.",
      "Nous équipons des hôpitaux et cliniques au **Rwanda, en Afrique de l'Est et partout en Afrique**, et nous pouvons étudier d'autres destinations.\n\nLe délai de livraison dépend du stock, de la destination et des formalités douanières : je ne peux donc pas promettre de date ici. Notre équipe confirmera les conditions de livraison (et d'installation si nécessaire) dans votre devis officiel."),
    actions: contactActions(lang, c, t(lang, 'Hello IKEDA, I would like to ask about delivery to my country/city: ', 'Bonjour IKEDA, je souhaite me renseigner sur la livraison vers mon pays/ma ville : '))
  };
}

function medicalReply(lang, c) {
  return {
    reply: t(lang,
      "I'm an equipment assistant, so I can't give medical, diagnostic, dosing or treatment advice — please consult a qualified clinician for that.\n\nWhat I *can* do is help you find the right **equipment** for the specialty involved, or connect you with our team.",
      "Je suis un assistant dédié aux équipements : je ne peux pas donner de conseils médicaux, de diagnostic, de posologie ou de traitement — veuillez consulter un professionnel de santé qualifié.\n\nEn revanche, je peux vous aider à trouver le bon **équipement** pour la spécialité concernée, ou vous mettre en relation avec notre équipe."),
    actions: [{ label: t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }, ...contactActions(lang, c)]
  };
}

function competitorReply(lang, withProducts) {
  const base = t(lang,
    "I can only speak about IKEDA and the manufacturers we represent, so I won't comment on other companies.",
    "Je ne peux parler que d'IKEDA et des fabricants que nous représentons, je ne commenterai donc pas d'autres entreprises.");
  return base + ' ' + (withProducts
    ? t(lang, "Here's what we offer for the same need:", 'Voici ce que nous proposons pour ce besoin :')
    : t(lang, "Tell me which equipment you need and I'll show you what we offer.", "Dites-moi de quel équipement vous avez besoin et je vous montrerai ce que nous proposons."));
}

// ── Site facts (high-precision triggers) ────────────────────────────
function siteFact(n, lang, kb) {
  const c = companyInfo(kb.company);
  const has = (re) => re.test(n);

  // Manufacturer wanting to partner / become a supplier
  if (has(/\b(i am|we are|i'm|we're|je suis|nous sommes)\b.*\b(manufacturer|factory|supplier|brand|oem|fabricant|usine|fournisseur|marque)\b/) ||
      has(/\b(partner with|partnership|become (a |your )?(partner|supplier|distributor)|distribute our|represent our|distributor for|partenariat|devenir (votre )?(partenaire|fournisseur|distributeur)|distribuer nos|representer nos|collaborer)\b/)) {
    return {
      reply: t(lang,
        `Thank you for your interest in working with **${c.name}**! We partner with certified manufacturers (CE / ISO 13485) to supply hospitals in Rwanda, East Africa and across Africa.\n\nPlease send us your company profile, product range and certifications — our management team will get back to you.\n\n✉️ **Email:** ${c.email}\n📞 **Phone / WhatsApp:** ${c.phone}`,
        `Merci de votre intérêt pour une collaboration avec **${c.name}** ! Nous travaillons avec des fabricants certifiés (CE / ISO 13485) pour équiper des hôpitaux au Rwanda, en Afrique de l'Est et partout en Afrique.\n\nEnvoyez-nous la présentation de votre entreprise, votre gamme de produits et vos certifications — notre direction vous répondra.\n\n✉️ **E-mail :** ${c.email}\n📞 **Téléphone / WhatsApp :** ${c.phone}`),
      actions: [
        { label: t(lang, 'Our current partners', 'Nos partenaires actuels'), url: '/manufacturers' },
        { label: t(lang, 'Contact management', 'Contacter la direction'), url: '/contact?subject=Manufacturer+Partnership' },
        { label: 'WhatsApp', url: waLink(c.phoneDigits, t(lang, 'Hello IKEDA, we are a manufacturer and would like to discuss a partnership.', 'Bonjour IKEDA, nous sommes un fabricant et souhaitons discuter d\'un partenariat.')) }
      ],
      noteworthy: true
    };
  }

  // Manufacturers / brands list
  if (has(/\b(manufacturers?|brands?|oem|partners?|fabricants?|marques?|partenaires?)\b/) && has(/\b(which|what|who|list|your|work with|do you (have|carry|represent)|quels?|quelles?|vos|liste|travaillez)\b/)) {
    const list = kb.manufacturers.map((m) => `• **${m.name}** — ${m.specialty || ''}`).join('\n');
    return {
      reply: t(lang,
        `We represent **${kb.manufacturers.length} manufacturers**, each certified to international standards:\n\n${list}`,
        `Nous représentons **${kb.manufacturers.length} fabricants**, tous certifiés selon les normes internationales :\n\n${list}`),
      actions: [{ label: t(lang, 'Manufacturers page', 'Page des fabricants'), url: '/manufacturers' }],
      noteworthy: true
    };
  }

  // People / ownership — not published on the site
  if (has(/\b(ceo|founder|owner|owns|director|managing director|manager|boss|staff|employees|team members|who runs|who works|pdg|fondateur|proprietaire|directeur|directrice|gerant|employes|personnel)\b/) &&
      !has(/\b(train\w*|formation|former|formez|install\w*)\b/)) {
    return {
      reply: t(lang,
        "Information about our management and staff isn't published on the website. Our team will be happy to introduce the right person — contact us below.",
        "Les informations sur notre direction et notre personnel ne sont pas publiées sur le site. Notre équipe vous mettra volontiers en relation avec la bonne personne — contactez-nous ci-dessous."),
      actions: contactActions(lang, c)
    };
  }

  // Opening hours
  if (has(/\b(hours|opening|open (on|today|tomorrow|saturday|sunday|weekend)|working (hours|days|time)|business hours|when are you open|are you open|horaires?|heures? d'ouverture|ouvert|ouverts|fermez|fermes?|samedi|dimanche|weekend)\b/) && !has(/\b(open|ouvrir) (a|an|my|our|une|ma|notre|un)\b/)) {
    return {
      reply: t(lang,
        `🕒 **Opening hours:** ${c.hours}\n📍 ${c.address}\n📞 ${c.phone} (phone & WhatsApp)`,
        `🕒 **Horaires :** du lundi au vendredi, de 8 h 00 à 17 h 30 — assistance technique d'urgence 24 h/24, 7 j/7\n📍 ${c.address}\n📞 ${c.phone} (téléphone et WhatsApp)`),
      actions: contactActions(lang, c)
    };
  }

  // Location
  if (has(/\b(where (are|is) (you|ikeda|your)|location|located|address|directions|find you|visit (you|your)|office|showroom|map|adresse|ou (etes|est|se trouve|trouver)|situes?|localisation|bureau|vous trouver|venir)\b/)) {
    return {
      reply: t(lang,
        `📍 **Address:** ${c.address} (in Masaka, opposite IRCAD Africa)\n🕒 ${c.hours}\n📞 ${c.phone} · ✉️ ${c.email}\n\nYou're welcome to visit — please call or message us first so the right person is available.`,
        `📍 **Adresse :** ${c.address} (à Masaka, en face d'IRCAD Africa)\n🕒 Du lundi au vendredi, de 8 h 00 à 17 h 30\n📞 ${c.phone} · ✉️ ${c.email}\n\nVous êtes les bienvenus — appelez-nous ou écrivez-nous avant votre visite pour que la bonne personne soit disponible.`),
      actions: [{ label: t(lang, 'Open in Google Maps', 'Ouvrir dans Google Maps'), url: c.maps }, ...contactActions(lang, c)]
    };
  }

  // Contact details
  if (has(/\b(phone|telephone|your number|phone number|whatsapp number|call you|email|e-mail|mail|whatsapp|contact (you|details|info)|reach you|talk to (someone|a person|a human|sales)|speak (to|with)|joindre|appeler|numero|courriel|coordonnees|parler a|vous contacter)\b/) && !has(/\b(send|envoy)\w*\b.*\b(list|inquiry|quote|devis|demande|liste)\b/)) {
    return {
      reply: t(lang,
        `You can reach our team directly:\n\n📞 **Phone & WhatsApp:** ${c.phone}\n✉️ **Email:** ${c.email}\n🕒 ${c.hours}`,
        `Vous pouvez joindre notre équipe directement :\n\n📞 **Téléphone et WhatsApp :** ${c.phone}\n✉️ **E-mail :** ${c.email}\n🕒 Du lundi au vendredi, de 8 h 00 à 17 h 30`),
      actions: [{ label: t(lang, 'Call us', 'Appeler'), url: `tel:+${c.phoneDigits}` }, ...contactActions(lang, c)]
    };
  }

  // Founding, mission, vision, about
  if (has(/\b(mission|vision|values|about (you|ikeda|the company|your company)|who (are|is) ikeda|history|founded|since when|how old|when (was|were) .*(founded|created|started)|a propos|qui etes|histoire|fonde|fondee|creee|depuis quand|entreprise|societe)\b/)) {
    return {
      reply: t(lang,
        `**${c.name}** was founded in **March 2025** and is based in Masaka (opposite IRCAD Africa), Kigali, Rwanda. We supply medical, diagnostic, therapeutic and surgical equipment — with endoscopy and laparoscopy at our core — backed by after-sales service, technical support and staff training.\n\n**Mission:** ${c.mission}\n\n**Vision:** ${c.vision}`,
        `**${c.name}** a été fondée en **mars 2025** et est basée à Masaka (en face d'IRCAD Africa), Kigali, Rwanda. Nous fournissons des équipements médicaux, diagnostiques, thérapeutiques et chirurgicaux — avec l'endoscopie et la laparoscopie au cœur de notre activité — accompagnés d'un service après-vente, d'un support technique et de la formation du personnel.\n\n**Mission :** équiper les établissements de santé au Rwanda et en Afrique avec des équipements fiables et de haute qualité, et une expertise technique réactive.\n\n**Vision :** être le partenaire de référence en endoscopie et en équipement hospitalier en Afrique de l'Est et centrale.`),
      actions: [{ label: t(lang, 'About us', 'À propos'), url: '/about' }],
      noteworthy: true
    };
  }

  // Warranty / after-sales / maintenance / spare parts / training / installation
  if (has(/\b(warrant\w*|guarantee|after[- ]sales?|maintenance|repair\w*|service (contract|engineer|support)|spare parts?|technical support|install\w*|training|train (our|my)|garantie|apres[- ]vente|reparation|pieces? (de rechange|detachees)|support technique|formation|former)\b/) &&
      !has(/\btraining (system|device|simulator|model|kit|equipment|table|bed)\b/)) {
    return {
      reply: t(lang,
        "IKEDA supports what we supply:\n• **Installation** on site by our biomedical engineers\n• **Staff training** — nurses, technicians and doctors on safe use, cleaning and sterilization\n• **After-sales service** — troubleshooting, calibration, routine servicing and genuine spare parts\n• **Warranty** — terms depend on the product and manufacturer and are stated in your official quotation\n\nTell me which equipment you're interested in and I'll include your service questions in your quotation request.",
        "IKEDA accompagne les équipements fournis :\n• **Installation** sur site par nos ingénieurs biomédicaux\n• **Formation du personnel** — infirmiers, techniciens et médecins, sur l'utilisation, le nettoyage et la stérilisation\n• **Service après-vente** — dépannage, étalonnage, entretien régulier et pièces d'origine\n• **Garantie** — les conditions dépendent du produit et du fabricant et figurent dans votre devis officiel\n\nIndiquez-moi les équipements qui vous intéressent et j'ajouterai vos questions à votre demande de devis."),
      actions: contactActions(lang, c),
      noteworthy: true
    };
  }

  // Certifications
  if (has(/\b(certif\w*|iso|ce mark|ce marked|fda|13485|quality standard|normes?|conformite)\b/)) {
    return {
      reply: t(lang,
        "We work with manufacturers certified to international standards, including **CE** marking and **ISO 13485** (medical device quality management). Certificates for specific products are provided with your official quotation.",
        "Nous travaillons avec des fabricants certifiés selon les normes internationales, notamment le marquage **CE** et la norme **ISO 13485** (management de la qualité des dispositifs médicaux). Les certificats des produits concernés sont fournis avec votre devis officiel."),
      actions: [{ label: t(lang, 'Our manufacturers', 'Nos fabricants'), url: '/manufacturers' }],
      noteworthy: true
    };
  }

  // Tenders / payment
  if (has(/\b(tender|tenders|bid|bidding|payment|pay|installments?|credit|appel d'offres?|soumission|paiement|payer|facilite)\b/)) {
    return {
      reply: t(lang,
        "We support hospitals and procurement teams with **tender documentation**, technical specifications and formal proforma quotations. Payment terms are agreed with our team and stated in your official quotation.",
        "Nous accompagnons les hôpitaux et services d'achat avec la **documentation d'appel d'offres**, les fiches techniques et des devis proforma officiels. Les conditions de paiement sont convenues avec notre équipe et précisées dans votre devis officiel."),
      actions: contactActions(lang, c, t(lang, 'Hello IKEDA, I need support for a tender / quotation: ', "Bonjour IKEDA, j'ai besoin d'un accompagnement pour un appel d'offres / devis : ")),
      noteworthy: true
    };
  }

  // Blog / articles / news — the site has none, so steer to what it does offer
  if (has(/\b(blog|blogs|news|newsletter|insights|publications?|actualites|nouvelles)\b/) ||
      (lang === 'en' && has(/\b(articles?|posts?)\b/) && !has(/\b(order|buy|quote|need|want)\b/))) {
    return {
      reply: t(lang,
        "We don't publish articles or a blog on this website. I can help you with our **products**, a **department setup** (theatre, ICU, dental, laboratory…), our **manufacturers**, or prepare a **quote request** for your team.",
        "Nous ne publions pas d'articles ni de blog sur ce site. Je peux vous aider avec nos **produits**, l'**équipement d'un service** (bloc opératoire, réanimation, dentaire, laboratoire…), nos **fabricants**, ou préparer une **demande de devis**."),
      actions: [
        { label: t(lang, 'Browse products', 'Voir les produits'), url: '/products' },
        { label: t(lang, 'Contact our team', 'Contacter notre équipe'), url: '/contact' }
      ]
    };
  }

  // Catalog overview
  if (has(/^(products|catalog|catalogue|produits)$|\b(what (do|does) (you|ikeda) (sell|supply|offer|provide)|what (kind of )?products (do|does)|product (list|range)|all (your )?products|your (full )?catalog(ue)?|all (your )?departments|which departments|que (vendez|proposez|fournissez)|vos produits|quels produits|votre gamme|votre catalogue)\b/)) {
    const list = kb.categories.map((cat) => `• **${cat.name}** — ${cat.tagline || ''}`).join('\n');
    return {
      reply: t(lang,
        `We equip every hospital department — **${kb.products.length} products** across:\n\n${list}\n\nTell me the department or the clinic you are equipping and I'll recommend what you need.`,
        `Nous équipons tous les services hospitaliers — **${kb.products.length} produits** répartis en :\n\n${list}\n\nIndiquez-moi le service ou la clinique que vous équipez et je vous recommanderai le nécessaire.`),
      actions: [{ label: t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' }]
    };
  }

  return null;
}

function welcome(lang) {
  return {
    reply: t(lang,
      "Hello! 👋 I'm the **IKEDA assistant**. Ask me about any equipment, a department you're equipping, or IKEDA itself. When you're ready, I'll put everything into a quotation request for WhatsApp or our inquiry form.\n\n*Vous pouvez aussi m'écrire en français.*",
      "Bonjour ! 👋 Je suis l'**assistant IKEDA**. Posez-moi vos questions sur un équipement, un service à équiper ou sur IKEDA. Quand vous serez prêt, je regrouperai tout dans une demande de devis pour WhatsApp ou notre formulaire.\n\n*You can also write to me in English.*"),
    actions: [
      { label: t(lang, 'Browse catalog', 'Voir le catalogue'), url: '/products' },
      { label: t(lang, 'Request a quote', 'Demander un devis'), url: '/contact#quote-form' }
    ],
    suggestions: lang === 'fr'
      ? ['Je veux ouvrir une clinique', 'Colonne de laparoscopie 4K', 'Avez-vous des couveuses ?', 'Où êtes-vous situés ?']
      : ['I want to open a new clinic', '4K laparoscopy tower', 'Do you have infant incubators?', 'Where are you located?']
  };
}

function isInquiryRequest(n) {
  return /\b(prepare|compile|make|write|draft|create|build|generate|send|show|summari[sz]e|put)\b.*\b(inquiry|enquiry|letter|quote|quotation|request|list|summary|everything|whatsapp|rfq)\b/.test(n) ||
    /\b(my (inquiry|enquiry|list|quote|quotation|request)|inquiry letter|enquiry letter|send (it|this|them|everything|all) (to|on|via|by) (whatsapp|email|the form)|request a quot\w*|get a quot\w*|ask for a quot\w*|i want a quot\w*|quote please)\b/.test(n) ||
    /\b(prepar\w*|redig\w*|faire|fais|envoy\w*|compil\w*|resum\w*|montr\w*|mettre)\b.*\b(demande|lettre|devis|liste|whatsapp|recapitulatif|resume)\b/.test(n) ||
    /\b(ma (demande|liste|lettre)|mon devis|demander un devis|demande de devis|je veux un devis|un devis svp)\b/.test(n);
}

module.exports = {
  t, waLink, companyInfo, contactActions, smallTalk, findCompetitor, isMedicalAdvice, isPriceQuestion, isDeliveryQuestion,
  priceReply, deliveryReply, medicalReply, competitorReply, siteFact, welcome, isInquiryRequest, normalize
};
