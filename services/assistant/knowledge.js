// Builds a searchable index of everything on the website — products,
// departments, page sections, manufacturers — and ranks results
// with BM25 plus typo tolerance. Rebuilt automatically when files change.

const fs = require('fs');
const path = require('path');
const { tokenize, stripHtml, editDistance } = require('./text');

const ROOT = path.join(__dirname, '..', '..');
const FILES = {
  products: path.join(ROOT, 'data', 'products.json'),
  manufacturers: path.join(ROOT, 'data', 'manufacturers.json'),
  company: path.join(ROOT, 'data', 'company.json')
};
const PAGES = [
  { file: 'about.html', url: '/about', label: 'About us' },
  { file: 'index.html', url: '/', label: 'Home' },
  { file: 'manufacturers.html', url: '/manufacturers', label: 'Manufacturers' },
  { file: 'contact.html', url: '/contact', label: 'Contact' }
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function mtimeKey() {
  const files = [...Object.values(FILES), ...PAGES.map((p) => path.join(ROOT, 'public', p.file))];
  return files
    .map((f) => {
      try {
        return fs.statSync(f).mtimeMs;
      } catch (e) {
        return 0;
      }
    })
    .join('|');
}

// Flatten the catalog into unique products (same shape the chat widget renders)
function collectProducts(categories) {
  const items = [];
  const seen = new Set();
  categories.forEach((category) => {
    const highlights = Array.isArray(category.equipmentHighlights) ? category.equipmentHighlights : [];
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      if (typeof value.name === 'string' && (value.image || value.specification || value.features)) {
        const key = value.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!seen.has(key)) {
          seen.add(key);
          const hlIdx = highlights.findIndex((h) => h && h.name && h.name.trim().toLowerCase() === value.name.trim().toLowerCase());
          items.push({
            name: value.name.trim(),
            category: value.category || category.name,
            subtitle: value.subtitle || '',
            image: value.image || '',
            specification: value.specification || '',
            features: Array.isArray(value.features) ? value.features : [],
            slug: category.slug,
            itemIdx: hlIdx >= 0 ? hlIdx : 0,
            departmentGroup: category.departmentGroup
          });
        }
      }
      Object.values(value).forEach(visit);
    };
    visit(category.equipmentHighlights);
    visit(category.subsections);
  });
  return items;
}

function splitHtmlSections(html) {
  const body = html.replace(/<(script|style|svg|nav|footer|head|form|select)[\s\S]*?<\/\1>/gi, ' ');
  return body
    .split(/<h[1-4][^>]*>/i)
    .slice(1)
    .map((chunk) => {
      const [titleHtml, ...rest] = chunk.split(/<\/h[1-4]>/i);
      return { title: stripHtml(titleHtml).replace(/\s+/g, ' '), text: stripHtml(rest.join(' ')).replace(/\s+/g, ' ') };
    })
    .filter((s) => s.title && s.text.length > 40);
}

function buildDocs() {
  const categories = readJson(FILES.products, []);
  const manufacturers = readJson(FILES.manufacturers, []);
  const company = readJson(FILES.company, {});
  const products = collectProducts(categories);
  const docs = [];

  products.forEach((p) => {
    docs.push({
      type: 'product',
      title: p.name,
      body: `${p.category} ${p.subtitle} ${p.features.join(' ')}`,
      url: `/products?cat=${encodeURIComponent(p.slug)}&product=${encodeURIComponent(p.name)}`,
      ref: p
    });
  });

  categories.forEach((c) => {
    docs.push({
      type: 'department',
      title: c.name,
      body: `${c.departmentGroup} ${c.tagline || ''} ${c.description || ''} ${(c.keySpecs || []).join(' ')}`,
      url: `/products?cat=${encodeURIComponent(c.slug)}`,
      ref: c
    });
  });

  PAGES.forEach((page) => {
    let html = '';
    try {
      html = fs.readFileSync(path.join(ROOT, 'public', page.file), 'utf-8');
    } catch (e) {
      return;
    }
    splitHtmlSections(html).forEach((s) => {
      docs.push({ type: 'page', title: s.title, body: s.text, url: page.url, ref: { page: page.label, heading: s.title, text: s.text } });
    });
  });

  manufacturers.forEach((m) => {
    docs.push({
      type: 'manufacturer',
      title: m.name,
      body: `${m.fullName || ''} ${m.specialty || ''} manufacturer brand partner`,
      url: '/manufacturers',
      ref: m
    });
  });

  return { docs, products, categories, manufacturers, company };
}

function indexDocs(docs) {
  const df = new Map();
  let totalLen = 0;
  docs.forEach((d) => {
    const tf = new Map();
    const titleTokens = tokenize(d.title);
    const bodyTokens = tokenize(d.body);
    titleTokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 3));
    bodyTokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    d.tf = tf;
    d.titleSet = new Set(titleTokens);
    d.len = titleTokens.length * 3 + bodyTokens.length;
    totalLen += d.len;
    tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
  });
  return { df, avgLen: totalLen / Math.max(docs.length, 1), vocab: [...df.keys()] };
}

let cache = null;

function getKnowledge() {
  const key = mtimeKey();
  if (!cache || cache.key !== key) {
    const built = buildDocs();
    const stats = indexDocs(built.docs);
    cache = { key, ...built, ...stats };
  }
  return cache;
}

// Map each query token to itself and, if unknown, to close vocabulary words (typos)
function expandQuery(tokens, kb) {
  const expanded = [];
  const seen = new Set();
  tokens.forEach((t) => {
    if (seen.has(t)) return;
    seen.add(t);
    if (kb.df.has(t)) {
      expanded.push({ term: t, weight: 1, source: t });
      return;
    }
    if (t.length < 4) return;
    const maxDist = t.length >= 7 ? 2 : 1;
    let found = 0;
    for (const v of kb.vocab) {
      if (found >= 3) break;
      if (Math.abs(v.length - t.length) > maxDist) {
        if (!(v.startsWith(t) && t.length >= 5)) continue;
      }
      if ((v.startsWith(t) && t.length >= 5) || editDistance(t, v, maxDist) <= maxDist) {
        expanded.push({ term: v, weight: 0.75, source: t });
        found++;
      }
    }
  });
  return expanded;
}

const K1 = 1.2;
const B = 0.6;

function search(query, { types = null, limit = 8 } = {}) {
  const kb = getKnowledge();
  const tokens = tokenize(query);
  if (!tokens.length) return { results: [], tokens };
  const terms = expandQuery(tokens, kb);
  const sources = new Set(terms.map((t) => t.source));
  const N = kb.docs.length;

  const results = [];
  kb.docs.forEach((d) => {
    if (types && !types.includes(d.type)) return;
    let score = 0;
    const matchedSources = new Set();
    const titleSources = new Set();
    terms.forEach(({ term, weight, source }) => {
      const f = d.tf.get(term);
      if (!f) return;
      const n = kb.df.get(term) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += weight * idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / kb.avgLen)));
      matchedSources.add(source);
      if (d.titleSet.has(term)) titleSources.add(source);
    });
    if (score > 0) {
      const coverage = matchedSources.size / sources.size;
      const titleCoverage = titleSources.size / sources.size;
      results.push({ doc: d, score: score * (0.5 + coverage), coverage, titleCoverage });
    }
  });
  results.sort((a, b) => b.score - a.score);
  return { results: results.slice(0, limit), tokens: [...sources] };
}

// Choose the 1–3 sentences of a text most related to the query
function bestSentences(text, query, max = 3) {
  const qTokens = new Set(tokenize(query));
  const sentences = String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
  const scored = sentences.map((s, i) => {
    const toks = tokenize(s);
    const hits = toks.filter((t) => qTokens.has(t)).length;
    return { s, i, hits };
  });
  const top = scored
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.i - b.i)
    .slice(0, max)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
  return top.length ? top : sentences.slice(0, Math.min(2, max));
}

module.exports = { getKnowledge, search, bestSentences };
