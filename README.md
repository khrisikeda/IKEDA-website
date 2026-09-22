# Ikeda Endoscopy Africa — Website & Medical Portal

A high-performance web platform and backend for **Ikeda Endoscopy Africa**, providing multi-specialty medical equipment, 4K endoscopic laparoscopy video towers, and clinical technical support across hospitals in Africa.

## Architecture & Overview

```
ikeda-endoscopy-africa-website/
├── server.js              Express application entry point & routing
├── package.json           Project configuration and scripts
├── .gitignore             Git exclusions (node_modules, logs, etc.)
├── .env.example           Sample environment configuration
├── routes/                API Route Controllers
│   ├── products.js        GET /api/products (with search and department filters), GET /api/products/:slug
│   ├── manufacturers.js   GET /api/manufacturers, POST, DELETE
│   ├── contact.js         POST /api/contact (saves to data/messages.json with ID), GET /api/contact
│   └── company.js         GET /api/company (mission, vision, location, phone, maps)
├── data/                  Persistent JSON storage
│   ├── products.json      The 16 medical department catalogs & equipment specifications
│   ├── manufacturers.json Certified global OEM medical device partners
│   ├── company.json       Corporate profile, working hours, headquarters & Google Maps
│   └── messages.json      Customer inquiries, RFQ requests, and department inquiries
└── public/                Frontend static assets & pages
    ├── index.html         Home page with 4K hero, stats, and specialty showcase
    ├── about.html         Company background, biomedical engineering pillars & values
    ├── products.html      Interactive catalog with real-time search and department tabs
    ├── manufacturers.html Global partner manufacturers and certifications
    ├── contact.html       Inquiry form with department picker, Google Maps, and WhatsApp
    ├── css/
    │   └── main.css       Optical clinical design system (Teal, Gold, Ivory, Glassmorphism)
    ├── js/
    │   ├── main.js        Mobile navigation toggle & active link state
    │   ├── products.js    Live filtering and dynamic equipment rendering
    │   ├── manufacturers.js Partner brand card rendering
    │   └── contact.js     Inquiry submission with async feedback & API binding
    └── images/            High-resolution medical photography & surgical assets
```

## Running the Live Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
Or with auto-restart on changes:
```bash
npm run dev
```

### 3. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

## API Endpoints

- **`GET /api/health`** — Service status and uptime check.
- **`GET /api/products`** — Full catalog (supports `?search=` and `?group=`).
- **`GET /api/products/:slug`** — Specific department details.
- **`GET /api/manufacturers`** — Authorized manufacturer list.
- **`POST /api/contact`** — Submit an RFQ or clinical equipment inquiry.
- **`GET /api/company`** — Corporate metadata, addresses, and telephone.
