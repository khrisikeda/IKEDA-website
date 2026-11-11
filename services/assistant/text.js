// Text utilities for the assistant: normalisation, tokenising,
// language detection (English / French) and French → English
// vocabulary mapping so French questions can search the English catalog.

function stripAccents(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalize(str) {
  return stripAccents(str)
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  // English
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'be', 'do', 'does',
  'did', 'i', 'we', 'you', 'your', 'our', 'my', 'me', 'us', 'it', 'its', 'this', 'that', 'these', 'those', 'at',
  'by', 'from', 'as', 'can', 'could', 'would', 'should', 'will', 'please', 'have', 'has', 'any', 'some', 'about',
  'what', 'which', 'who', 'how', 'there', 'here', 'need', 'want', 'like', 'get', 'tell', 'show', 'give', 'know',
  'also', 'so', 'if', 'than', 'then', 'them', 'they', 'their', 'am', 'not', 'no', 'yes', 'hi', 'hello', 'kindly',
  'looking', 'look', 'find', 'sell', 'offer', 'available', 'much', 'many', 'all', 'more', 'most', 'very', 'just',
  // generic nouns that appear in many product names and add noise
  'machine', 'machines', 'unit', 'units', 'device', 'devices', 'equipment', 'product', 'products', 'item', 'items',
  // French
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'et', 'ou', 'en', 'au', 'aux', 'pour', 'avec', 'sur',
  'est', 'sont', 'je', 'j', 'nous', 'vous', 'votre', 'vos', 'notre', 'nos', 'mon', 'ma', 'mes', 'il', 'elle', 'ce',
  'cette', 'ces', 'qui', 'que', 'qu', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'comment', 'avez', 'avoir', 'ai',
  'suis', 'etre', 'svp', 'merci', 'bonjour', 'pas', 'ne', 'n', 'se', 's', 'y', 'a', 'cherche', 'besoin', 'veux',
  'voudrais', 'aimerais', 'pouvez', 'peux', 'faire', 'plus', 'tres', 'tout', 'tous', 'par', 'dans'
]);

function stem(token) {
  if (token.length > 4 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.length > 4 && /(ches|shes|xes|ses)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('us')) return token.slice(0, -1);
  return token;
}

// Common spellings that should be treated as the same term.
const SYNONYMS = {
  xray: ['x', 'ray'], 'x-ray': ['x', 'ray'], radiography: ['x', 'ray'],
  theater: ['theatre'], ot: ['operating', 'theatre'],
  aspirator: ['suction'], aspiration: ['suction'],
  sonography: ['ultrasound'], echography: ['ultrasound'], sonoscape: ['ultrasound', 'sonoscape'],
  capnography: ['etco2'], co2: ['co2', 'etco2'],
  ekg: ['ecg'], bp: ['blood', 'pressure'],
  sterilizer: ['sterilizer', 'autoclave'], steriliser: ['sterilizer', 'autoclave'], autoclave: ['autoclave', 'sterilizer'],
  sterilisation: ['sterilization'], cssd: ['sterilization', 'autoclave'],
  baby: ['infant'], babies: ['infant'], newborn: ['infant', 'neonatal'], neonate: ['infant', 'neonatal'],
  respirator: ['ventilator'], scope: ['endoscope', 'scope'], lap: ['laparoscopy'], laparoscopic: ['laparoscopy'],
  electric: ['motorized', 'electric'], motorised: ['motorized'], electrical: ['motorized', 'electric'],
  lamp: ['light', 'lamp'], ent: ['ent', 'ear', 'nose', 'throat'], dental: ['dental', 'dentistry'],
  eye: ['eye', 'ophthalmology'], physio: ['physiotherapy'], icu: ['icu', 'intensive', 'care'],
  diathermy: ['electrosurgical', 'diathermy'], cautery: ['electrosurgical', 'cautery'],
  oxygen: ['oxygen'], concentrator: ['concentrator'], wheelchair: ['wheelchair', 'wheel', 'chair']
};

function tokenize(text, { keepStopwords = false } = {}) {
  const raw = normalize(text).replace(/x-ray/g, 'xray').match(/[a-z0-9]+/g) || [];
  const out = [];
  for (const t of raw) {
    if (!keepStopwords && STOPWORDS.has(t)) continue;
    const syn = SYNONYMS[t];
    if (syn) syn.forEach((s) => out.push(stem(s)));
    else out.push(stem(t));
  }
  return out;
}

// ── Language detection ──────────────────────────────────────────────
// Markers are matched on accent-stripped text (JS \b does not handle accented letters).
const FR_MARKERS = /\b(je|vous|nous|avez|quel|quelle|quels|quelles|ou|bonjour|bonsoir|salut|merci|svp|combien|revoir|bientot|journee|soiree|oui|non|aussi|encore|ajouter|ajoute|enlever|retirer|prix|devis|clinique|hopital|ouvrir|voudrais|aimerais|pouvez|cherche|besoin|livraison|horaires|adresse|fabricant|fabricants|materiel|equipement|equipements|appareil|salle|bloc|pour|avec|des|les|une|est|sont|du|et|dans|reanimation|echographe|couveuse|chirurgie|qui|quoi|comment|faire|lettre|envoyer)\b/g;
const FR_ELISION = /\b(j|qu|c|d|l|n)'/g;
const EN_MARKERS = /\b(the|is|are|you|your|do|does|what|which|where|when|how|have|has|need|want|with|for|my|our|hello|hi|thanks|thank|please|price|quote|clinic|hospital|open|equipment|machine|bed|i'm|i|can|and|in|of)\b/g;

function detectLanguage(text, previous) {
  const raw = String(text || '');
  if (!raw.trim()) return previous === 'fr' ? 'fr' : 'en';
  const t = normalize(raw);
  const accentBonus = /[éèêàùçôîâûë]/i.test(raw) ? 2 : 0;
  const fr = (t.match(FR_MARKERS) || []).length + (t.match(FR_ELISION) || []).length + accentBonus;
  const en = (t.match(EN_MARKERS) || []).length;
  if (fr > en) return 'fr';
  if (en > fr) return 'en';
  return previous === 'fr' ? 'fr' : 'en';
}

// ── French → English vocabulary (applied to accent-stripped lowercase) ──
// Multi-word phrases first, then single words.
const FR_PHRASES = [
  ["table d'operation", 'operating table'], ['table operatoire', 'operating table'], ['table de chirurgie', 'operating table'],
  ['salle d\'operation', 'operating theatre'], ['bloc operatoire', 'operating theatre'], ['salle d\'accouchement', 'delivery room maternity'],
  ['soins intensifs', 'intensive care icu'], ['moniteur patient', 'patient monitor'], ['moniteur multiparametrique', 'patient monitor'],
  ['moniteur de signes vitaux', 'patient monitor'], ['pousse-seringue', 'syringe pump'], ['pousse seringue', 'syringe pump'],
  ['pompe a perfusion', 'infusion pump'], ['pompe a seringue', 'syringe pump'], ['concentrateur d\'oxygene', 'oxygen concentrator'],
  ['concentrateur oxygene', 'oxygen concentrator'], ['lampe a fente', 'slit lamp'], ['lampe operatoire', 'surgical light'],
  ['lampe scialytique', 'surgical light'], ['bistouri electrique', 'electrosurgical unit'], ['fauteuil dentaire', 'dental chair'],
  ['fauteuil roulant', 'wheelchair'], ['table chauffante', 'radiant warmer'], ['rechauffeur radiant', 'radiant warmer'],
  ['table de reanimation', 'radiant warmer'], ['lit d\'hopital', 'hospital bed'], ['lit medical', 'hospital bed'],
  ['lit electrique', 'motorized hospital bed'], ['lit d\'accouchement', 'delivery bed'], ['table d\'accouchement', 'delivery bed'],
  ['table d\'examen', 'examination table'], ['rayons x', 'x-ray'], ['appareil de radiographie', 'x-ray machine'],
  ['colonne de coelioscopie', 'laparoscopy tower'], ['colonne de laparoscopie', 'laparoscopy tower'], ['colonne 4k', '4k laparoscopy tower'],
  ['colonne video', 'laparoscopy tower'], ['colonne d\'endoscopie', 'endoscopy tower'], ['aspirateur chirurgical', 'suction unit'],
  ['aspirateur de mucosites', 'suction unit'], ['aspirateur', 'suction'], ['appareil d\'anesthesie', 'anesthesia machine'],
  ['machine d\'anesthesie', 'anesthesia machine'], ['tensiometre', 'blood pressure monitor'], ['pieces de rechange', 'spare parts'],
  ['pieces detachees', 'spare parts'], ['service apres-vente', 'after-sales service maintenance'], ['apres-vente', 'after-sales service'],
  ['heures d\'ouverture', 'opening hours'], ['horaires d\'ouverture', 'opening hours'], ['qu\'est-ce que', 'what is'],
  ['qu\'est ce que', 'what is'], ['c\'est quoi', 'what is'], ['a quoi sert', 'what is'], ['a quoi servent', 'what are'],
  ['est-ce que vous avez', 'do you have'], ['est-ce que', ''], ['avez-vous', 'do you have'], ['vendez-vous', 'do you sell'],
  ['je veux', 'i want'], ['je voudrais', 'i would like'], ['j\'ai besoin', 'i need'], ['nous avons besoin', 'we need'], ['quelle est la difference', 'difference between'],
  ['difference entre', 'difference between'], ['nouveau-ne', 'newborn'], ['nouveau ne', 'newborn'], ['salle de reveil', 'recovery room'],
  ['chirurgie generale', 'general surgery'], ['chirurgie de jour', 'day surgery'], ['sterilisateur a vapeur', 'steam sterilizer autoclave']
];

const FR_WORDS = {
  bonjour: 'hello', bonsoir: 'hello', salut: 'hi', merci: 'thanks', 'au revoir': 'bye',
  clinique: 'clinic', hopital: 'hospital', centre: 'center', ouvrir: 'open', ouvre: 'open', equiper: 'equip',
  installer: 'setup', creer: 'build', nouvelle: 'new', nouveau: 'new', petite: 'small', petit: 'small',
  coelioscopie: 'laparoscopy', laparoscopie: 'laparoscopy', endoscopie: 'endoscopy', arthroscopie: 'arthroscopy',
  hysteroscopie: 'hysteroscopy', cystoscopie: 'cystoscopy', ureteroscope: 'ureteroscope', urologie: 'urology',
  gynecologie: 'gynecology', gyneco: 'gynecology', obstetrique: 'obstetric', maternite: 'maternity',
  accouchement: 'delivery', neonatal: 'neonatal', neonatologie: 'neonatal', pediatrie: 'pediatrics',
  bebe: 'infant', couveuse: 'incubator', couveuses: 'incubator', incubateur: 'incubator', incubateurs: 'incubator',
  phototherapie: 'phototherapy', reanimation: 'icu intensive care', urgence: 'emergency', urgences: 'emergency',
  respirateur: 'ventilator', ventilateur: 'ventilator', defibrillateur: 'defibrillator', moniteur: 'monitor',
  echographe: 'ultrasound', echographie: 'ultrasound', radiographie: 'x-ray', radiologie: 'radiology',
  scanner: 'ct scanner', autoclave: 'autoclave', sterilisateur: 'sterilizer', sterilisation: 'sterilization',
  scialytique: 'surgical light', eclairage: 'light', lampe: 'lamp', lit: 'bed', lits: 'bed', table: 'table',
  brancard: 'stretcher', chariot: 'trolley', fauteuil: 'chair', dentaire: 'dental', dentiste: 'dental',
  ophtalmologie: 'ophthalmology', yeux: 'eye', oeil: 'eye', orl: 'ent', audiometre: 'audiometer',
  kinesitherapie: 'physiotherapy', kine: 'physiotherapy', reeducation: 'rehabilitation physiotherapy',
  electrique: 'motorized', motorise: 'motorized', motorisee: 'motorized', hydraulique: 'hydraulic', manuel: 'manual',
  nebuliseur: 'nebulizer', oxygene: 'oxygen', perfusion: 'infusion', seringue: 'syringe', pompe: 'pump',
  appareil: 'machine', machine: 'machine', equipement: 'equipment', equipements: 'equipment', materiel: 'equipment',
  instruments: 'instruments', instrument: 'instrument', microscope: 'microscope', laser: 'laser', pince: 'forceps',
  prix: 'price', cout: 'cost', tarif: 'price', tarifs: 'price', combien: 'how much', devis: 'quotation',
  facture: 'proforma invoice', proforma: 'proforma', livraison: 'delivery', livrer: 'deliver', delai: 'lead time',
  delais: 'lead time', garantie: 'warranty', formation: 'training', maintenance: 'maintenance', reparation: 'repair',
  fabricant: 'manufacturer', fabricants: 'manufacturers', marque: 'brand', marques: 'brands', partenaire: 'partner',
  partenaires: 'partners', partenariat: 'partnership', distributeur: 'distributor', horaires: 'hours', adresse: 'address',
  situe: 'located', situes: 'located', localisation: 'location', telephone: 'phone', courriel: 'email',
  difference: 'difference', comparer: 'compare', comparaison: 'compare', meilleur: 'best', meilleure: 'best',
  recommander: 'recommend', recommandez: 'recommend', conseiller: 'recommend', conseillez: 'recommend',
  quel: 'which', quelle: 'which', quels: 'which', quelles: 'which', avez: 'do you have', vendez: 'do you sell',
  service: 'department', departement: 'department', chirurgie: 'surgery', chirurgical: 'surgical',
  operation: 'operating', operatoire: 'operating', salle: 'room', bloc: 'theatre', anesthesie: 'anesthesia',
  aspiration: 'suction', patient: 'patient', patients: 'patients', medical: 'medical', medicaux: 'medical',
  rural: 'rural', budget: 'budget', abordable: 'affordable', certificat: 'certificate', certifications: 'certifications',
  article: 'article', articles: 'articles', mission: 'mission', vision: 'vision', entreprise: 'company', societe: 'company',
  qui: 'who', fondateur: 'founder', directeur: 'director', liste: 'list', tout: 'everything', envoyer: 'send',
  lettre: 'letter', demande: 'inquiry', cotation: 'quotation',
  // function words, so the English rule engine can read translated sentences
  pour: 'for', une: 'a', un: 'a', de: 'of', du: 'of', des: 'some', la: 'the', le: 'the', les: 'the', et: 'and',
  avec: 'with', dans: 'in', sur: 'on', mon: 'my', ma: 'my', mes: 'my', notre: 'our', nos: 'our', votre: 'your',
  vos: 'your', je: 'i', nous: 'we', vous: 'you', est: 'is', sont: 'are', veux: 'want', voudrais: 'would like',
  besoin: 'need', aussi: 'also', ajouter: 'add', ajoute: 'add', ajoutez: 'add', enlever: 'remove', retirer: 'remove',
  supprimer: 'remove', oui: 'yes', non: 'no', quoi: 'what', comment: 'how'
};

function frenchToEnglish(text) {
  let s = ' ' + normalize(text).replace(/[?!.,;:]/g, ' ') + ' ';
  for (const [fr, en] of FR_PHRASES) {
    s = s.split(' ' + fr + ' ').join(' ' + en + ' ');
    s = s.split(fr).join(en);
  }
  s = s.replace(/\b(l|d|j|qu|c|n|s)'/g, '');
  s = s
    .split(/\s+/)
    .map((w) => (Object.prototype.hasOwnProperty.call(FR_WORDS, w) ? FR_WORDS[w] : w))
    .join(' ');
  return s.replace(/\s+/g, ' ').trim();
}

// Levenshtein distance with early exit (for typo tolerance)
function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = i;
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
      if (prev[j] < rowMin) rowMin = prev[j];
    }
    if (rowMin > max) return max + 1;
  }
  return prev[b.length];
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim();
}

module.exports = { normalize, stripAccents, tokenize, stem, detectLanguage, frenchToEnglish, editDistance, stripHtml, STOPWORDS };
