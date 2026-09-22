# Ikeda Endoscopy Africa — Website

A working starter site: static frontend + a small Express backend, ready to open in
Antigravity (or any IDE) and keep building.

## What's here

```
ikeda-website/
├── server.js              Express app entry point
├── package.json
├── routes/                 API routes
│   ├── products.js         GET /api/products, GET /api/products/:slug
│   ├── manufacturers.js     GET/POST/DELETE /api/manufacturers
│   ├── contact.js           POST /api/contact (saves to data/messages.json)
│   └── company.js           GET /api/company (mission, vision, phone, map links)
├── data/                    JSON "database" — edit these directly for now
│   ├── products.json        the 16 product categories, incl. the laparoscopy specialty
│   ├── manufacturers.json   placeholder manufacturer entries — replace with real ones
│   └── company.json         mission, vision, phone, address, Google Maps links
└── public/                  the frontend (plain HTML/CSS/JS, no build step)
    ├── index.html, about.html, products.html, manufacturers.html, contact.html
    ├── css/main.css
    └── js/                  main.js, products.js, manufacturers.js, contact.js
```

The frontend pages fetch their data from the API rather than hard-coding it, so
editing a JSON file in `data/` updates the site without touching HTML.

## Running it

```
npm install
npm start
```

Then open http://localhost:3000

For auto-restart on file changes during development: `npm run dev` (uses `nodemon`).

## Before it's ready to launch

1. **Add the Google Maps links.** In `data/company.json`, fill in:
   - `googleMapsEmbedUrl` — the `src` from Google Maps' "Embed a map" share option, so
     the map shows on the Contact page.
   - `googleMapsLinkUrl` — the normal shareable Google Maps link, used for the
     "Open in Google Maps" button.
   - `address` — shown on the Contact page.
2. **Replace the manufacturer placeholders** in `data/manufacturers.json` with your
   real brand names, categories, website links and logo image paths (drop logo
   files in `public/images/`).
3. **Add an email** to `data/company.json` if you want one shown on the site.

## Next steps for continued development (good tasks for Antigravity)

- **Wire up real email/WhatsApp notifications** for the contact form — right now
  `routes/contact.js` just saves messages to `data/messages.json`. Swap in an email
  service (e.g. Nodemailer + SMTP, or a transactional email API) or a WhatsApp
  Business API call.
- **Add authentication to the manufacturer write routes** — `POST` and `DELETE` on
  `/api/manufacturers` are currently open to anyone who can reach the API. Add a
  simple admin login (session or token-based) before using them from a real admin
  page.
- **Move from JSON files to a real database** once the catalog grows — the route
  files are already isolated per resource (`routes/products.js`,
  `routes/manufacturers.js`), so swapping the `fs.readFileSync` calls for database
  queries shouldn't touch the frontend at all.
- **Add product images** — `products.json` has no image field yet; add one and
  update `public/js/products.js` to render it.
- **Deploy** — this is a plain Node/Express app, so it runs on any standard Node
  host (Render, Railway, a VPS, etc.). Set the `PORT` environment variable if your
  host requires it.

## Design notes

Palette and type choices are in `public/css/main.css` as CSS custom properties
(`:root`) — deep teal + a warm gold accent, referencing the endoscope's optics and
light source. Change the `--teal-*` and `--gold*` variables there to retheme the
whole site at once.
