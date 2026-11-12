/* ==========================================================================
   IKEDA site language switcher (English / Français)

   - Loaded in <head> on every page. English is the source text in the HTML;
     French comes from /i18n/fr.json ({ "strings": {en: fr}, "patterns": [...] }).
   - Translates page text, key attributes, the page title/description and any
     content added later by scripts (products, manufacturers…).
   - Remembers the visitor's choice; French browsers start in French;
     ?lang=fr / ?lang=en in a link forces a language (good for sharing).
   - Content without a translation simply stays in English.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'ikeda_lang';
  var SUPPORTED = { en: 'EN', fr: 'FR' };
  // Small inline flags (emoji flags show as letters on Windows)
  var FLAGS = {
    en: '<svg viewBox="0 0 60 30" aria-hidden="true" focusable="false"><clipPath id="ikf-uk"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="ikf-uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><g clip-path="url(#ikf-uk)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#ikf-uk-t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
    fr: '<svg viewBox="0 0 3 2" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path fill="#002654" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#CE1126" d="M2 0h1v2H2z"/></svg>'
  };
  var SKIP_SELECTOR = 'script,style,noscript,svg,textarea,code,pre,#ikeda-ai-widget,[translate="no"],.no-i18n';
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function readStored() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function writeStored(value) {
    try { localStorage.setItem(STORE_KEY, value); } catch (e) { /* storage unavailable */ }
  }

  function initialLang() {
    var param = null;
    try { param = new URLSearchParams(window.location.search).get('lang'); } catch (e) { /* old browser */ }
    if (param && SUPPORTED[param]) { writeStored(param); return param; }
    var stored = readStored();
    if (stored && SUPPORTED[stored]) return stored;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return String(nav).toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  }

  var lang = initialLang();
  var root = document.documentElement;
  root.lang = lang;

  // Hide the page briefly while French loads, to avoid a flash of English
  if (lang !== 'en') {
    root.classList.add('i18n-pending');
    setTimeout(function () { root.classList.remove('i18n-pending'); }, 1500);
  }

  // ── Dictionary ──────────────────────────────────────────────────────
  var dict = null;      // { normalized English: French }
  var patterns = [];    // [{ re: RegExp, to: string }]
  var dictPromise = null;
  var missing = {};

  function loadDict() {
    if (!dictPromise) {
      dictPromise = fetch('/i18n/fr.json?v=3')
        .then(function (r) { return r.ok ? r.json() : { strings: {} }; })
        .catch(function () { return { strings: {} }; })
        .then(function (data) {
          dict = {};
          var s = data.strings || {};
          Object.keys(s).forEach(function (k) { dict[norm(k)] = s[k]; });
          patterns = (data.patterns || []).map(function (p) { return { re: new RegExp(p[0]), to: p[1] }; });
          return dict;
        });
    }
    return dictPromise;
  }
  if (lang !== 'en') loadDict();

  function norm(s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }

  function lookup(text) {
    var key = norm(text);
    if (!key || !/[A-Za-z]/.test(key) || !dict) return null;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    // Patterns: "$1" keeps a captured part as is, "{1}" translates it if possible
    for (var i = 0; i < patterns.length; i++) {
      var m = patterns[i].re.exec(key);
      if (m) {
        return patterns[i].to
          .replace(/\{(\d)\}/g, function (_, g) {
            var part = norm(m[g] || '');
            return Object.prototype.hasOwnProperty.call(dict, part) ? dict[part] : part;
          })
          .replace(/\$(\d)/g, function (_, g) { return m[g] || ''; });
      }
    }
    missing[key] = true;
    return null;
  }

  // ── DOM translation ────────────────────────────────────────────────
  var originalText = new WeakMap();   // Text node -> English text
  var originalAttrs = new WeakMap();  // Element -> { attr: English }
  var originalHtml = new WeakMap();   // word-animated heading -> English innerHTML

  function skipped(el) {
    return !el || (el.closest && el.closest(SKIP_SELECTOR));
  }

  var lastSetText = new WeakMap();    // Text node -> value we last wrote

  function targetFor(en) {
    if (lang === 'en') return en;
    var fr = lookup(en);
    if (fr == null) return en;
    return en.match(/^\s*/)[0] + fr + en.match(/\s*$/)[0];
  }

  function translateTextNode(node) {
    var parent = node.parentElement;
    if (skipped(parent) || (parent.closest && parent.closest('.i18n-words'))) return;
    var current = node.nodeValue;
    // First visit, or a page script replaced the text since we last wrote it:
    // the current text becomes the English source.
    var changedByPage = lastSetText.has(node) ? current !== lastSetText.get(node) : current !== originalText.get(node);
    if (!originalText.has(node) || changedByPage) originalText.set(node, current);
    var target = targetFor(originalText.get(node));
    if (current !== target) node.nodeValue = target;
    lastSetText.set(node, target);
  }

  function translateAttrs(el) {
    // Text inside a <textarea> is user input, but its placeholder should still translate
    if (el.tagName === 'TEXTAREA' ? skipped(el.parentElement) : skipped(el)) return;
    var store = originalAttrs.get(el);
    ATTRS.forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;
      if (!store) { store = {}; originalAttrs.set(el, store); }
      var current = el.getAttribute(attr);
      var rec = store[attr];
      if (!rec || current !== rec.set) rec = store[attr] = { en: current, set: current };
      var value = lang === 'en' ? rec.en : (lookup(rec.en) || rec.en);
      if (current !== value) el.setAttribute(attr, value);
      rec.set = value;
    });
  }

  // Headings animated word-by-word: translate the whole sentence, then rebuild
  // one span per word. In French text, *word* marks a highlighted word.
  function translateWordHeading(el) {
    if (!originalHtml.has(el)) originalHtml.set(el, el.innerHTML);
    el.classList.add('i18n-words');
    var englishHtml = originalHtml.get(el);
    if (lang === 'en') {
      if (el.innerHTML !== englishHtml) el.innerHTML = englishHtml;
      return;
    }
    var probe = document.createElement('div');
    probe.innerHTML = englishHtml;
    var fr = lookup(probe.textContent);
    if (fr == null) return;
    var sample = probe.querySelector('.word-mask-inner');
    var inView = el.querySelector('.word-mask-inner.in-view') ? ' in-view' : '';
    var html = fr.split(/\s+/).filter(Boolean).map(function (word, i) {
      var highlight = /^\*.*\*[.,!?;:]?$/.test(word);
      var clean = word.replace(/\*/g, '');
      var safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<span class="word-mask-wrap"><span class="word-mask-inner' + (highlight ? ' hero-highlight' : '') + inView +
        '" data-word-idx="' + (i + 1) + '">' + safe + '</span></span>';
    }).join('\n');
    if (!sample) return;
    el.innerHTML = html;
  }

  function translateTree(rootEl) {
    if (!rootEl || skipped(rootEl.nodeType === 1 ? rootEl : rootEl.parentElement)) return;
    if (rootEl.nodeType === 3) { translateTextNode(rootEl); return; }
    if (rootEl.nodeType !== 1) return;

    var headings = [];
    if (rootEl.querySelector('.word-mask-wrap') || rootEl.classList.contains('i18n-words')) {
      rootEl.querySelectorAll('.word-mask-wrap').forEach(function (w) {
        var h = w.parentElement;
        if (h && headings.indexOf(h) === -1) headings.push(h);
      });
      if (rootEl.classList.contains('i18n-words') && headings.indexOf(rootEl) === -1) headings.push(rootEl);
      headings.forEach(translateWordHeading);
    }

    translateAttrs(rootEl);
    rootEl.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(translateAttrs);

    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    var node;
    var nodes = [];
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(translateTextNode);
  }

  var originalTitle = document.title;
  var metaDesc = document.querySelector('meta[name="description"]');
  var originalDesc = metaDesc ? metaDesc.getAttribute('content') : '';

  function translateHead() {
    document.title = lang === 'en' ? originalTitle : (lookup(originalTitle) || originalTitle);
    if (metaDesc) metaDesc.setAttribute('content', lang === 'en' ? originalDesc : (lookup(originalDesc) || originalDesc));
  }

  // ── Watch content that scripts add later ─────────────────────────────
  var applying = false;
  var observer = new MutationObserver(function (mutations) {
    if (applying || lang === 'en' || !dict) return;
    applying = true;
    mutations.forEach(function (m) {
      if (m.type === 'characterData') translateTextNode(m.target);
      m.addedNodes && m.addedNodes.forEach(function (n) { translateTree(n); });
    });
    applying = false;
  });

  function apply() {
    applying = true;
    translateHead();
    if (document.body) translateTree(document.body);
    applying = false;
    root.classList.remove('i18n-pending');
    updateSwitch();
  }

  // ── Language switch in the header ────────────────────────────────────
  var switchEl = null;

  function buildSwitch() {
    var host = document.querySelector('.site-header .nav-actions') || document.querySelector('.site-header .wrap');
    if (!host || host.querySelector('.lang-switch')) return;
    switchEl = document.createElement('div');
    switchEl.className = 'lang-switch';
    switchEl.setAttribute('role', 'group');
    switchEl.setAttribute('translate', 'no');
    Object.keys(SUPPORTED).forEach(function (code) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-switch-btn';
      b.dataset.lang = code;
      b.innerHTML = '<span class="lang-flag">' + FLAGS[code] + '</span>';
      b.title = code === 'fr' ? 'Français' : 'English';
      b.setAttribute('lang', code);
      b.setAttribute('aria-label', code === 'fr' ? 'Français' : 'English');
      b.addEventListener('click', function () { setLang(code); });
      switchEl.appendChild(b);
    });
    host.insertBefore(switchEl, host.firstChild);
    updateSwitch();
  }

  function updateSwitch() {
    if (!switchEl) return;
    switchEl.setAttribute('aria-label', lang === 'fr' ? 'Langue' : 'Language');
    switchEl.querySelectorAll('.lang-switch-btn').forEach(function (b) {
      var active = b.dataset.lang === lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setLang(next) {
    if (!SUPPORTED[next] || next === lang) return;
    lang = next;
    root.lang = next;
    writeStored(next);
    var done = function () {
      apply();
      try { window.dispatchEvent(new CustomEvent('ikeda:langchange', { detail: { lang: next } })); } catch (e) { /* old browser */ }
    };
    if (next === 'en') done();
    else loadDict().then(done);
  }

  function start() {
    buildSwitch();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    if (lang === 'en') { updateSwitch(); return; }
    loadDict().then(apply);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.IKEDA_I18N = {
    get lang() { return lang; },
    setLang: setLang,
    t: function (en) { return lang === 'en' ? en : (lookup(en) || en); },
    // For maintenance: list English texts on the current page with no French yet
    missing: function () { return Object.keys(missing); }
  };
})();
