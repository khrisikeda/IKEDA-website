/**
 * services/procurementAssistant.js
 * 
 * Intelligent AI Medical Equipment & Consumables Procurement Assistant.
 * Provides deep catalogue analysis, department-based procurement, manufacturer comparison,
 * department completeness assessment, and structured quotation generation.
 * Integrates directly with the website's existing Quotation Inquiry form.
 */

const fs = require('fs');
const path = require('path');

// ── 1. KNOWN MANUFACTURERS DIRECTORY ──────────────────────────
const KNOWN_MANUFACTURERS = [
  { name: 'IKEDA', aliases: ['ikeda', 'ikeda medical'], origin: 'Japan / Global OEM', focus: '4K Laparoscopic Endoscopy Towers & Telescopes' },
  { name: 'Siger', aliases: ['siger', 'siger medical'], origin: 'International', focus: 'Dental Treatment Units, Chairs, Dental Autoclaves & X-Rays' },
  { name: 'Eighteeth', aliases: ['eighteeth', 'eight teeth'], origin: 'International', focus: 'Portable DC Dental X-Ray & NanoPix CMOS Digital Sensors' },
  { name: 'COXO', aliases: ['coxo'], origin: 'International', focus: 'Dental Rotary Handpieces, Motors & Piezo Scalers' },
  { name: 'Biolight', aliases: ['biolight', 'biolight meditech'], origin: 'International', focus: 'Multi-Parameter Patient Monitors & Hemodynamic Telemetry' },
  { name: 'SonoScape', aliases: ['sonoscape'], origin: 'International', focus: 'Color Doppler Diagnostic Ultrasound Platforms (S12, E2)' },
  { name: 'Dengguan', aliases: ['dengguan', 'dengguan medical'], origin: 'International', focus: 'Medical Steam Sterilizers & Class-B Pulse Autoclaves' },
  { name: 'Jumper', aliases: ['jumper', 'jumper medical'], origin: 'International', focus: 'Fetal CTG Monitoring, Dopplers & Maternal Healthcare' },
  { name: 'Saikang', aliases: ['saikang', 'saikang medical'], origin: 'International', focus: 'Electric ICU Beds & Hospital Ward Furniture' },
  { name: 'Yongfa', aliases: ['yongfa'], origin: 'International', focus: 'Hydraulic & Manual Operating Tables' },
  { name: 'Tianrun', aliases: ['tianrun'], origin: 'International', focus: 'Sterilization Packaging, Pouches & CSSD Reels' },
  { name: 'Bojin', aliases: ['bojin'], origin: 'International', focus: 'Orthopedic Surgical Power Tools & Saws' },
  { name: 'Seesheen', aliases: ['seesheen'], origin: 'International', focus: 'Flexible Endoscopes & Video Bronchoscopes' },
  { name: '66 Vision', aliases: ['66 vision', 'suzhou 66'], origin: 'International', focus: 'Ophthalmic Slit Lamps, Microscopes & Retinoscopes' },
  { name: 'Kanghua', aliases: ['kanghua'], origin: 'International', focus: 'Slit Lamp Biomicroscopes' },
  { name: 'Yuwell', aliases: ['yuwell'], origin: 'International', focus: 'Digital Blood Pressure Monitors & Home Healthcare' },
  { name: 'Folee', aliases: ['folee'], origin: 'International', focus: 'Clinical Blood Pressure & Diagnostic Devices' }
];

// Helper to detect manufacturer from product name or specs
function detectManufacturer(productName, specText = '') {
  const combined = `${productName} ${specText}`.toLowerCase();
  for (const m of KNOWN_MANUFACTURERS) {
    for (const a of m.aliases) {
      const regex = new RegExp(`\\b${a}\\b`, 'i');
      if (regex.test(combined)) {
        return m.name;
      }
    }
  }
  if (/\b(4k|tower|laparoscop|trocar|endobag|telescope|endoscop)\b/i.test(productName)) {
    return 'IKEDA Medical';
  }
  return 'IKEDA Certified OEM';
}

// ── 2. DEPARTMENT BLUEPRINTS & CLINICAL PROCUREMENT SPECIFICATIONS ────────
const DEPARTMENT_BLUEPRINTS = {
  'dental': {
    id: 'dental',
    name: 'Dental Department & Oral Surgery Clinic',
    categoryKey: 'Dentistry & Oral Surgery',
    slug: 'dentistry',
    aliases: [
      'dental', 'dentistry', 'dental clinic', 'oral surgery', 'dentist',
      'teeth', 'orthodontic', 'orthodontics', 'periodontic', 'dental operatory'
    ],
    overview: 'Complete turnkey dental operatory clinic equipped with ergonomic patient treatment delivery units, oil-free medical air compression, digital low-radiation intraoral radiography, and Class-B vacuum sterilization for hollow handpieces.',
    requiredDomains: [
      { id: 'patient_delivery', label: 'Patient Treatment & Delivery Unit' },
      { id: 'compressed_air', label: 'Oil-Free Medical Compressed Air' },
      { id: 'imaging', label: 'Intraoral Digital Radiography & CMOS Sensor' },
      { id: 'sterilization', label: 'Class-B Vacuum Autoclave & Ultrasonic Cleaning' },
      { id: 'microscopy_optics', label: 'Dental Surgical Microscope & Diagnostic Optics' }
    ],
    clarifyingQuestions: [
      "How many dental treatment operatory chairs (e.g. 1, 2, or multiple suites) are planned?",
      "Will the department provide endodontic micro-surgery requiring a dedicated Dental Surgical Microscope?",
      "Do you prefer a flagship digital touch-screen unit (Siger V6000) or a standard workhorse operatory unit (Siger U100)?"
    ],
    comparisons: [
      {
        title: "Dental Chair Comparison: Siger V6000 (Flagship) vs Siger U100 (Standard)",
        modelA: "Dental chair Siger V6000",
        modelB: "Dental chair Siger U100",
        criteria: [
          { aspect: "Control Architecture", a: "SigerSmart™ 7-inch IPS capacitive touch screen with customized dentist memory presets", b: "Micro-switch push button membrane control panel" },
          { aspect: "Spittoon & Hygiene", a: "Motorized 180° swiveling detachable ceramic spittoon with automatic disinfection cycle", b: "Manual detachable ceramic spittoon with auto cup filler" },
          { aspect: "Ergonomics & Safety", a: "Italian synchronized compensating backrest movement with dual-safety anti-collision sensors", b: "Standard articulated backrest" },
          { aspect: "Clinical Recommendation", a: "Recommended for private clinics, cosmetic dentistry, and high-volume referral centres", b: "Recommended for community health centres and high-throughput routine dental operatories" }
        ]
      },
      {
        title: "Dental Autoclave Comparison: Siger 23L vs Dengguan 23L",
        modelA: "Autoclave 23L- SIGER",
        modelB: "Autoclave 23L- DENGGUAN",
        criteria: [
          { aspect: "Display & Telemetry", a: "Full color 320×480px LCD screen with real-time temperature/pressure curve telemetry", b: "Digital LED segment display with cycle status indicators" },
          { aspect: "Vacuum System", a: "Triple fractional pre-and-post vacuum with automated biological vacuum leak testing", b: "Fractionated pre-vacuum with automated vacuum drying cycle" },
          { aspect: "Handpiece Reprocessing", a: "Dedicated B-class fast cycle for hollow dental handpieces and contra-angles", b: "Universal Class-B hollow instrument cycle" },
          { aspect: "Clinical Recommendation", a: "Optimized specifically for fast turnaround between dental patient bookings", b: "Heavy-duty general hospital and surgical autoclave" }
        ]
      }
    ],
    items: [
      // Medical Equipment (Capital)
      {
        name: "Dental chair Siger V6000",
        manufacturer: "Siger",
        model: "V6000 Flagship",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "SigerSmart™ 7\" touch OS, motorized swiveling ceramic spittoon, 4-hole turbine tubing, LED sensor surgical light, dual safety cut-off.",
        why: "Central patient delivery unit providing ergonomic positioning and comprehensive doctor/assistant instrumentation."
      },
      {
        name: "Air compressor SA 075",
        manufacturer: "Siger",
        model: "SA 075 (750VA / 32L)",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "750VA power, 80L/min at 0.4MPa, 32L stainless air tank, oil-free medical grade, automatic internal moisture drainage.",
        why: "Powers dental high-speed turbines with ultra-clean, dry, oil-free medical air, preventing handpiece damage and contamination."
      },
      {
        name: "Dental Xray Machine - Eighteeth",
        manufacturer: "Eighteeth",
        model: "HyperLight Handheld DC",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "1.8kg handheld ergonomic unit, 65kV / 2.5mA, 0.4mm focal spot, 2500mAh internal battery, internal double-lead radiation shielding.",
        why: "Enables immediate chairside dental radiography without transporting patients to a separate radiology room."
      },
      {
        name: "X ray sensor NanoPix 1.5 Brand: Eight teeth",
        manufacturer: "Eighteeth",
        model: "NanoPix 1.5",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "APS CMOS sensor, CsI scintillator, 1200×1650 pixel matrix (25 lp/mm resolution), ultra-thin 4.4mm profile with IP68 waterproof casing.",
        why: "Instant high-definition intraoral radiographic acquisition directly to digital computer screens within 3 seconds."
      },
      {
        name: "Autoclave 23L- SIGER",
        manufacturer: "Siger",
        model: "23L Class-B",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Full-color LCD display, Class-B European Standard EN13060, fractionated vacuum, Bowie-Dick and biological cycle compliant.",
        why: "Mandatory for sterilization of narrow-lumen dental handpieces, burs, and surgical extraction forceps."
      },
      {
        name: "Dental Surgical Microscope",
        manufacturer: "IKEDA OEM",
        model: "5-Step Optical Zoom",
        category: "equipment",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Manual 5-step magnification, coaxial LED illumination, binocular 45° ergonomic incline head with fine-focus objective.",
        why: "Provides critical optical magnification for complex root canal endodontics, crown margin preparations, and apicoectomies."
      },

      // Instruments
      {
        name: "Ultrasonic cleaner",
        manufacturer: "IKEDA OEM",
        model: "SUS304 2500ml",
        category: "instruments",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "42,000 Hz cavitation frequency, SUS304 stainless tank (2500ml), digital timer and temperature heating.",
        why: "Removes blood, saliva, and particulate matter from dental instruments prior to autoclaving."
      },

      // Accessories & Consumables
      {
        name: "Sterilizing sealer Automatic",
        manufacturer: "IKEDA OEM",
        model: "Automated Heat Sealer",
        category: "accessories",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Adjustable sealing margin 0–35mm, sealing speed 10 m/min, automated temperature regulator.",
        why: "Hermetically seals sterilized dental handpieces and instruments inside medical-grade pouches for prolonged sterile shelf life."
      }
    ],
    missingGaps: [
      {
        item: "Rotary Handpieces (High & Low Speed Contra-Angles)",
        domain: "Handpiece Dynamics",
        clinicalNecessity: "The dental operatory chair requires handpieces to perform enamel cutting, caries excavation, and polishing."
      },
      {
        item: "Air Compressor Moisture Filtration Unit",
        domain: "Compressed Air Quality",
        clinicalNecessity: "An automated moisture separator ensures zero condensation enters handpiece turbines, preventing premature bearing failure."
      }
    ]
  },

  'laboratory': {
    id: 'laboratory',
    name: 'Clinical Laboratory & Pathology Department',
    categoryKey: 'General Hospital Materials',
    slug: 'laboratory',
    aliases: [
      'laboratory', 'lab', 'clinical lab', 'pathology', 'hematology',
      'biochemistry', 'microbiology', 'blood bank', 'histopathology', 'lab department'
    ],
    overview: 'Clinical diagnostic and pathology department configured for hematological analysis, parasitological cytology, biochemical blood separation, cold-chain reagent preservation, and biological media sterilization.',
    requiredDomains: [
      { id: 'microscopy', label: 'High-Resolution Clinical Microscopy' },
      { id: 'centrifugation', label: 'Centrifugation & Blood Separation' },
      { id: 'cold_chain', label: 'Laboratory Cold-Chain Refrigeration' },
      { id: 'sterilization', label: 'Media & Biohazard Decontamination Sterilization' },
      { id: 'sealing', label: 'Sample & Instrument Sterilization Packaging' }
    ],
    clarifyingQuestions: [
      "What laboratory tier are you outfitting (e.g. Basic Outpatient Clinic Lab vs Referral Hospital Laboratory)?",
      "Will your facility be conducting microbiology culture media preparation requiring high-capacity autoclaving?",
      "What is your daily patient specimen processing volume?"
    ],
    comparisons: [
      {
        title: "Clinical Microscope Comparison: EX 33-B (Advanced) vs EX 21-B (Standard)",
        modelA: "Biological Microscope- EX 33-B",
        modelB: "Biological Microscope- EX 21-B",
        criteria: [
          { aspect: "Optical System", a: "Color-corrected infinity optical system (CCIS) with plan achromatic objectives (4x, 10x, 40x, 100x Oil)", b: "Finite achromatic optical system with standard high-contrast objectives" },
          { aspect: "Illumination", a: "Kohler illumination with high-power 3W warm LED, continuously variable intensity", b: "Standard 3W LED sub-stage illumination" },
          { aspect: "Viewing Head", a: "Gemel binocular 30° inclined, 360° rotatable with interpupillary distance 48–75mm", b: "Standard binocular 30° inclined head" },
          { aspect: "Clinical Recommendation", a: "Recommended for referral pathology, complex histology, and blood parasitology (malaria, microfilaria)", b: "Recommended for routine clinic urinalysis, stool examination, and standard hematology" }
        ]
      }
    ],
    items: [
      {
        name: "Biological Microscope- EX 33-B",
        manufacturer: "IKEDA OEM",
        model: "EX 33-B Infinity Plan",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Infinity optical system, 30° gemel binocular 360° rotatable, 4X/10X/40X/100X(Oil) plan achromatic objectives, coaxial coarse/fine focus (0.002mm division).",
        why: "Foundational diagnostic instrument for blood smear examinations, parasitology, cytology, and urine sediment analysis."
      },
      {
        name: "Biological Microscope- EX 21-B",
        manufacturer: "IKEDA OEM",
        model: "EX 21-B Standard",
        category: "equipment",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Infinity color-corrected optics, 30° inclined gemel binocular, double-layer mechanical stage (140×135mm, travel 75×50mm).",
        why: "Dedicated secondary workstation for routine outpatient specimen screenings and rapid triage."
      },
      {
        name: "Centrifuge",
        manufacturer: "IKEDA OEM",
        model: "Clinical Benchtop 4000 RPM",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Max speed 4000 r/min, Max RCF 1980×g, capacity 15ml×6 tubes, speed accuracy ±30 r/min, digital timer 1–99 min.",
        why: "Essential for blood serum/plasma separation, hematocrit testing, and urine specimen sedimentation."
      },
      {
        name: "Laboratory refrigerator",
        manufacturer: "IKEDA OEM",
        model: "2°C–8°C Controlled Cold Chain",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "High-precision microcomputer temperature regulation (2°C–8°C), forced air circulation, digital temperature display with audible alarms.",
        why: "Preserves diagnostic reagents, control serums, test kits, and clinical blood samples from thermal degradation."
      },
      {
        name: "100L Steam sterilizer DGL-100B",
        manufacturer: "Dengguan",
        model: "DGL-100B (100 Litres)",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "4.5kW power, 100L chamber, design pressure 0.25 MPa, design temperature 139°C, automated pressure safety interlocks.",
        why: "High-capacity sterilization of microbiological culture media and safe biohazard waste decontamination."
      },
      {
        name: "Sterilizing sealer Automatic",
        manufacturer: "IKEDA OEM",
        model: "Automatic Sealer",
        category: "accessories",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Continuous automatic feeding and sealing (10 m/min), adjustable margin 0–35mm.",
        why: "Seals clean laboratory glassware and specimen collection kits into sterile pouches."
      }
    ],
    missingGaps: [
      {
        item: "Automated Hematology Analyzer (3-Part / 5-Part CBC)",
        domain: "Automated Blood Counts",
        clinicalNecessity: "Provides rapid full blood count (FBC/CBC), hemoglobin, and platelet counts within 60 seconds."
      },
      {
        item: "Clinical Biochemistry Analyzer",
        domain: "Biochemical Testing",
        clinicalNecessity: "Performs liver function tests (LFT), renal function tests (RFT), and blood glucose assays."
      }
    ]
  },

  'radiology': {
    id: 'radiology',
    name: 'Radiology & Diagnostic Imaging Department',
    categoryKey: 'Radiology & Diagnostic Imaging',
    slug: 'radiology',
    aliases: [
      'radiology', 'imaging', 'diagnostic imaging', 'x-ray', 'xray',
      'c-arm', 'ultrasound', 'sonography', 'fluoroscopy', 'radiological'
    ],
    overview: 'Complete medical diagnostic imaging department providing intraoperative fluoroscopy for orthopedics and vascular surgery, multi-frequency Color Doppler ultrasound, and digital intraoral radiography.',
    requiredDomains: [
      { id: 'fluoroscopy', label: 'Intraoperative C-Arm Fluoroscopy' },
      { id: 'ultrasound', label: 'Multi-Probe Color Doppler Ultrasound' },
      { id: 'intraoral_xray', label: 'High-Frequency Dental & Skeletal X-Ray' },
      { id: 'sensor_receptors', label: 'Digital Radiography Image Detectors (CMOS)' }
    ],
    clarifyingQuestions: [
      "Will the C-Arm be stationed primarily in the surgical theatre for orthopedics, or in interventional radiology?",
      "Which ultrasound probes are required (e.g. Abdominal Convex, Vascular Linear, or Obstetric Transvaginal)?",
      "Do you require lead radiation personal protective equipment (aprons, thyroid shields) alongside the X-ray units?"
    ],
    comparisons: [
      {
        title: "Diagnostic Ultrasound Comparison: SonoScape S12 vs SonoScape E2",
        modelA: "Ultrasound machine S12 SONOSCAPE",
        modelB: "Ultrasound machine E2 SONOSCAPE",
        criteria: [
          { aspect: "Form Factor", a: "Ergonomic full-height mobile console workstation with articulated monitor arm", b: "Compact, highly portable laptop design for bedside triage and mobile clinics" },
          { aspect: "Display", a: "15-inch high-definition medical LED screen with 4 active transducer ports", b: "15.6-inch anti-glare monitor with 2 transducer ports" },
          { aspect: "Clinical Applications", a: "Comprehensive Shared-Service: Cardiology (CW Doppler), Advanced Vascular, OB/GYN, Musculoskeletal", b: "General abdominal, obstetric, emergency FAST exam, and superficial small parts" },
          { aspect: "Clinical Recommendation", a: "Recommended for referral hospital radiology suites and dedicated imaging centers", b: "Recommended for emergency departments, outpatient ultrasound clinics, and mobile medical teams" }
        ]
      }
    ],
    items: [
      {
        name: "c arm x ray machine",
        manufacturer: "IKEDA OEM",
        model: "Mobile Surgical Fluoroscopy C-Arm",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "High-frequency generator, rotating anode X-ray tube, dual high-resolution viewing displays, pulsed fluoroscopy for low patient dose.",
        why: "Enables real-time dynamic X-ray visualization during orthopedic fracture fixation, spinal surgery, and pacemaker insertion."
      },
      {
        name: "Ultrasound machine S12 SONOSCAPE",
        manufacturer: "SonoScape",
        model: "S12 Shared-Service Console",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Full console architecture, high-density multi-frequency transducers, Color Doppler, Pulsed Wave (PW), Spatial Compound Imaging.",
        why: "Flagship diagnostic sonography system for abdominal, cardiac, vascular, and obstetric evaluations."
      },
      {
        name: "Ultrasound machine E2 SONOSCAPE",
        manufacturer: "SonoScape",
        model: "E2 Portable with 3 Probes",
        category: "equipment",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Equipped with 3 transducers: Linear probe (vascular/small parts), Convex probe (abdominal/OB), and Transvaginal probe (pelvic/early pregnancy).",
        why: "Versatile point-of-care ultrasound platform for outpatient consultation, emergency triage, and bed-side imaging."
      },
      {
        name: "Dental Xray Machine - Siger",
        manufacturer: "Siger",
        model: "High Frequency Constant Voltage DC",
        category: "equipment",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "DC high frequency generator, low patient radiation dose, micro-focus spot, motorized scissor arm mount.",
        why: "Specialized high-resolution skull, jaw, and periapical osseous imaging."
      },
      {
        name: "X ray sensor NanoPix 1.5 Brand: Eight teeth",
        manufacturer: "Eighteeth",
        model: "NanoPix 1.5",
        category: "accessories",
        importance: "recommended",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "APS CMOS sensor, CsI scintillator, 1200×1650 matrix, direct USB plug-and-play to imaging workstations.",
        why: "Eliminates chemical film processing, generating immediate digital radiographic DICOM images."
      }
    ],
    missingGaps: [
      {
        item: "Stationary / Ceiling-Suspended Digital Radiography (DR) System",
        domain: "High-Volume General Radiography",
        clinicalNecessity: "Required for high-throughput standing chest X-rays, spine series, and pelvic radiography in full-scale hospitals."
      },
      {
        item: "Radiation Protection Lead Apparel (0.5mm Pb Aprons & Thyroid Collars)",
        domain: "Radiation Safety",
        clinicalNecessity: "Mandatory regulatory safety gear protecting surgeons, radiographers, and nursing personnel from secondary scatter radiation."
      }
    ]
  },

  'operating-theatre': {
    id: 'operating-theatre',
    name: 'Operating Theatre & Surgical Infrastructure',
    categoryKey: 'Operating Theatre',
    slug: 'operating-theatre',
    aliases: [
      'operating theatre', 'theatre', 'theater', 'operating room', 'or',
      'surgical suite', 'surgery department', 'surgical theatre', 'laparoscopy suite'
    ],
    overview: 'State-of-the-art sterile surgical suite configured for minimally invasive 4K laparoscopic surgery, electro-hydraulic patient positioning, shadowless illumination, anesthesia workstation life support, and sterile reprocessing.',
    requiredDomains: [
      { id: 'visualization', label: 'Endoscopic Optical Visualization & Insufflation' },
      { id: 'positioning', label: 'Electro-Hydraulic Surgical Positioning Table' },
      { id: 'illumination', label: 'Shadowless Surgical LED Illumination' },
      { id: 'anesthesia_life_support', label: 'Anesthesia Workstation & Hemodynamic Telemetry' },
      { id: 'infrastructure_gas', label: 'Ceiling Articulating Medical Gas & Monitor Pendants' },
      { id: 'sterilization_cssd', label: 'Class-B Pulsed Vacuum Autoclave for Scope Reprocessing' },
      { id: 'consumables_access', label: 'Trocars, Endobags, Tubing & Surgical Consumables' }
    ],
    clarifyingQuestions: [
      "Is this a turnkey installation for a new hospital or an upgrade to an existing theatre suite?",
      "Will procedures be general laparoscopy, or also include specialties like Endourology, VATS, or Orthopedic trauma?",
      "What is your target visualization standard: Flagship 4K UHD or cost-effective Full HD?"
    ],
    comparisons: [
      {
        title: "Endoscopy Tower Comparison: Laparoscopy Tower 4K vs 1080p CMOS",
        modelA: "Laparoscopy Tower 4K",
        modelB: "Laparoscopy Tower 1080p with 1/2.8\" CMOS",
        criteria: [
          { aspect: "Sensor Resolution", a: "True 4K UHD (3840×2160 pixels, 8.3 Megapixels) powered by Sony CMOS", b: "Full HD (1920×1080 pixels, 2.1 Megapixels) with 1/2.8\" CMOS" },
          { aspect: "Optical Delineation", a: "4x standard HD resolution for critical identification of micro-vessels, nerve bundles, and lymphatic margins", b: "Reliable, clear standard color fidelity for routine surgical interventions" },
          { aspect: "Light Source Integration", a: "Integrated high-lumen cold LED source (80W, 5700K sunlight spectrum) with smart standby", b: "Integrated cold LED light source with manual/automatic illumination regulation" },
          { aspect: "Clinical Recommendation", a: "Standard of care for referral hospitals, oncological resections, and complex bariatric/urological surgery", b: "Cost-effective, dependable workhorse for district hospitals and ambulatory surgery centers" }
        ]
      },
      {
        title: "Surgical Table Comparison: Motorized Operating Table vs Hydraulic Table",
        modelA: "Motorized operating table",
        modelB: "Hydraulic operating table (hydraulic for height adjustment)",
        criteria: [
          { aspect: "Drive Mechanism", a: "Electro-hydraulic multi-axis motorized system with handheld wired remote control", b: "Heavy-duty hydraulic foot-pump elevation with mechanical gas spring articulation" },
          { aspect: "C-Arm Fluoroscopy Sliding", a: "Longitudinal tabletop sliding up to 400mm for unobstructed 360° C-Arm intraoperative imaging", b: "Stationary column without longitudinal sliding" },
          { aspect: "Power Requirement", a: "220V electrical connection with internal rechargeable backup battery", b: "100% mechanical/hydraulic operation — completely power-independent" },
          { aspect: "Clinical Recommendation", a: "Essential for advanced laparoscopic, cardiovascular, and C-Arm guided orthopedic surgery", b: "Ideal for emergency suites or facilities seeking zero risk of electrical downtime" }
        ]
      }
    ],
    items: [
      // Medical Equipment (Capital)
      {
        name: "Laparoscopy Tower 4K",
        manufacturer: "IKEDA Medical",
        model: "4K UHD Flagship",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "3840×2160 UHD video processor, Sony CMOS optics, integrated LED cold light source, 4K medical surgical monitor, high-flow CO2 insufflator.",
        why: "Core surgical visualization platform delivering razor-sharp optical clarity for minimally invasive procedures."
      },
      {
        name: "Motorized operating table",
        manufacturer: "Yongfa / IKEDA",
        model: "Electro-Hydraulic Sliding",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "2080×520×(745-995)mm, Trendelenburg ±25°, lateral tilt 15°, kidney bridge 80mm, 400mm longitudinal tabletop sliding for C-Arm.",
        why: "Multi-axis motorized patient positioning supporting Trendelenburg, lateral tilt, and C-arm fluoroscopy."
      },
      {
        name: "Surgical light",
        manufacturer: "IKEDA OEM",
        model: "Dual-Dome Ceiling LED",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Dual-dome shadowless illumination (160,000 Lux / 140,000 Lux), color temp 4500K±500K, 50,000+ hour LED diode lifespan.",
        why: "Provides deep shadowless illumination across the surgical cavity with zero thermal tissue drying."
      },
      {
        name: "Surgical pendants",
        manufacturer: "IKEDA OEM",
        model: "Articulating Ceiling Console",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Dual articulated arms, 340° rotation, pneumatic braking, integrated gas outlets (O2, N2O, Air, Vac) and multi-channel electrical sockets.",
        why: "Elevates gas tubes, electrical cables, and surgical monitors off the floor, maximizing sterile theatre workflow."
      },
      {
        name: "Anesthesia machine",
        manufacturer: "IKEDA OEM",
        model: "Workstation with Dual Vaporizers",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "10.4\" TFT color screen, VCV/PCV/SIMV/PSV modes, dual Selectatec vaporizer manifolds, integrated spirometry and backup turbine.",
        why: "Delivers continuous mechanical lung ventilation and precise volatile anesthetic delivery during general anesthesia."
      },
      {
        name: "Patient monitor BIOLIGHT M12 Standard option",
        manufacturer: "Biolight",
        model: "M12 (12.1\" TFT)",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "12.1\" color display, 5-lead ECG, SpO2, NIBP, dual temp, anti-electrosurgical interference algorithms, rechargeable lithium battery.",
        why: "Continuous intraoperative hemodynamic monitoring with electrosurgical artifact filtering."
      },
      {
        name: "Autoclave 23L- DENGGUAN",
        manufacturer: "Dengguan",
        model: "23L Class-B Pulsed Vacuum",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "23L SUS304 chamber, 220V/50Hz, fractionated pre-and-post vacuum cycle (134°C/121°C), automatic dry cycle.",
        why: "Mandatory for sterilizing narrow-lumen laparoscopic, urological, and orthopedic telescopes."
      },

      // Instruments
      {
        name: "4K Laparoscope Telescope 30° & 0°",
        manufacturer: "IKEDA Medical",
        model: "German Optical Rod Lens (10mm)",
        category: "instruments",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "High-resolution German rod lenses, scratch-resistant sapphire window tip, autoclave-compatible stainless casing.",
        why: "Resolves true 4K UHD sensor detail without optical distortion or chromatic aberration."
      },
      {
        name: "Anesthesia laryngoscope",
        manufacturer: "IKEDA OEM",
        model: "Macintosh Blade Set (3 Blades)",
        category: "instruments",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Fiber-optic illumination, stainless steel Macintosh blades (sizes 92mm, 114mm, 134mm), rugged battery handle.",
        why: "Essential airway management instrument for endotracheal intubation prior to surgery."
      },
      {
        name: "Access instruments",
        manufacturer: "IKEDA Medical",
        model: "Complete Laparoscopy Hand Instrument Set",
        category: "instruments",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Babcock graspers, Maryland dissectors, curved scissors, needle holders, suction/irrigation cannulas.",
        why: "Core surgical hand instruments for endoscopic tissue dissection, grasping, and suturing."
      },

      // Consumables
      {
        name: "plastic trocars",
        manufacturer: "IKEDA OEM",
        model: "5mm / 10mm / 12mm Disposable Access Set",
        category: "consumables",
        importance: "essential",
        defaultQty: 10,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Bladeless optical dilating tip, dual-seal silicone gas retention valve, universal stability sleeve.",
        why: "Sterile abdominal port access devices maintaining pneumoperitoneum throughout laparoscopy."
      },
      {
        name: "endobags",
        manufacturer: "IKEDA OEM",
        model: "Specimen Retrieval Pouch Set",
        category: "consumables",
        importance: "essential",
        defaultQty: 10,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "High-strength TPU rip-stop specimen bag with memory wire deployment ring and draw-string closure.",
        why: "Prevents surgical specimen contamination and tumor seeding during organ extraction."
      },
      {
        name: "surgical mesh",
        manufacturer: "IKEDA OEM",
        model: "Polypropylene Hernia Mesh (15×15cm)",
        category: "consumables",
        importance: "recommended",
        defaultQty: 10,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Monofilament knitted polypropylene mesh, high burst strength, optimal tissue pore size for rapid fibroblastic incorporation.",
        why: "Reinforces tissue repair in open and laparoscopic inguinal and ventral hernia repairs."
      },
      {
        name: "liquid tubing devices",
        manufacturer: "IKEDA OEM",
        model: "Laparoscopic Irrigation & Suction Tubing",
        category: "consumables",
        importance: "essential",
        defaultQty: 10,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Medical grade PVC dual-line tubing with universal spike connectors for physiological saline bags.",
        why: "Connects suction and irrigation units to ensure clean surgical margins and clot evacuation."
      }
    ],
    missingGaps: [
      {
        item: "Electrosurgical Generator Unit (ESU / Diathermy with Bipolar & Monopolar)",
        domain: "Surgical Hemostasis & Cutting",
        clinicalNecessity: "Necessary for rapid surgical tissue dissection and precise vessel coagulation to prevent intraoperative hemorrhaging."
      },
      {
        item: "High-Flow CO2 Gas Cylinders & Medical Gas Supply Regulator",
        domain: "Pneumoperitoneum Gas Infrastructure",
        clinicalNecessity: "Medical CO2 gas is mandatory to fuel the electronic insufflator for maintaining abdominal working space."
      }
    ]
  },

  'icu': {
    id: 'icu',
    name: 'Intensive Care Unit (ICU) & High Dependency Unit',
    categoryKey: 'Intensive Care Unit (ICU)',
    slug: 'intensive-care',
    aliases: [
      'icu', 'intensive care', 'intensive care unit', 'critical care', 'ccu', 'sicu', 'micu', 'hdu'
    ],
    overview: 'High-acuity life support department designed for mechanical ventilation, continuous multi-parameter hemodynamic telemetry, precise intravenous drug infusion, and emergency cardiac defibrillation.',
    requiredDomains: [
      { id: 'ventilation', label: 'Mechanical Life Support Ventilation' },
      { id: 'telemetry', label: 'Multi-Parameter Hemodynamic Monitoring' },
      { id: 'cardiac_rescue', label: 'Defibrillation & Emergency Pacing' },
      { id: 'patient_beds', label: 'Multi-Position ICU Hospital Beds' }
    ],
    clarifyingQuestions: [
      "How many critical care beds (e.g. 4, 6, 8, or 12 beds) are being commissioned?",
      "Do you require internal turbine-driven ventilators (independent of piped hospital compressed air)?",
      "Do your patient monitors require invasive blood pressure (IBP) and EtCO2 capnography channels?"
    ],
    comparisons: [
      {
        title: "Patient Monitor Comparison: Biolight M12 Full Option vs Standard Option",
        modelA: "Patient monitor BIOLIGHT M12 Full option",
        modelB: "Patient monitor BIOLIGHT M12 Standard option",
        criteria: [
          { aspect: "Channel Capacity", a: "Standard 5 parameters + Dual Invasive Blood Pressure (2-IBP), Microstream EtCO2 capnography, Cardiac Output", b: "Standard 5 parameters (5-lead ECG, SpO2, NIBP, Respiration, Dual Temperature)" },
          { aspect: "Clinical Role", a: "Mandatory for septic shock, cardiac intensive care (CCU), and post-cardiac surgery hemodynamic instability", b: "Ideal for intermediate step-down HDU, general ICU, and post-anesthesia recovery (PACU)" },
          { aspect: "Recommendation", a: "Equip at least 50% of ICU beds with the Full Option to manage unstable arterial line patients", b: "Cost-effective, dependable choice for stable ICU and step-down beds" }
        ]
      }
    ],
    items: [
      {
        name: "ICU Ventilator",
        manufacturer: "IKEDA OEM",
        model: "Turbine-Driven Multi-Mode Ventilator",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Internal ultra-quiet turbine (independent of piped air), lung-protective modes (VCV, PCV, PRVC, SIMV, PSV, CPAP, DuoLevel), high-flow nasal cannula (HFNC).",
        why: "Primary mechanical life support device sustaining respiration in patients with respiratory distress and multi-organ failure."
      },
      {
        name: "Patient monitor BIOLIGHT M12 Full option",
        manufacturer: "Biolight",
        model: "M12 Full Option (12.1\" TFT with IBP & EtCO2)",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "12.1\" color display, 12-lead ECG analysis, dual-channel invasive blood pressure (IBP), EtCO2, ST-segment analysis, central station telemetry ready.",
        why: "Continuous arterial line pressure tracking and real-time capnography for critically unstable patients."
      },
      {
        name: "Defibrillator monitor",
        manufacturer: "IKEDA OEM",
        model: "Biphasic Defibrillator with Pacing",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Biphasic 360J truncation technology, synchronized cardioversion, external transcutaneous pacing, 7-inch color ECG monitor.",
        why: "Emergency cardiac resuscitation unit for ventricular fibrillation and lethal cardiac arrhythmias."
      },
      {
        name: "Manual hospital bed- 2 Cranks YFC261L",
        manufacturer: "Yongfa / Saikang",
        model: "2-Cranks Heavy Duty",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Backrest 0–80°, kneerest 0–40°, collapsible aluminum alloy siderails, 5\" dustproof casters with central braking, IV pole mounts.",
        why: "Durable, high-load patient positioning bed engineered for critical nursing care with zero electrical downtime."
      }
    ],
    missingGaps: [
      {
        item: "Syringe Pumps & Volumetric Infusion Pumps",
        domain: "Targeted Micro-Dosing Pharmacotherapy",
        clinicalNecessity: "Crucial for micro-titration of inotropes, vasopressors (noradrenaline), insulin, and continuous sedation."
      },
      {
        item: "Arterial Blood Gas (ABG) Point-of-Care Analyzer",
        domain: "Acid-Base & Oxygenation Diagnostics",
        clinicalNecessity: "Allows bedside assessment of pH, PaO2, PaCO2, and electrolytes within 2 minutes for ventilator titration."
      }
    ]
  },

  'maternity': {
    id: 'maternity',
    name: 'Maternity, Labor & Delivery Ward',
    categoryKey: 'Maternity & Obstetrics',
    slug: 'maternity',
    aliases: [
      'maternity', 'obstetric', 'obstetrics', 'labor', 'labour', 'delivery ward',
      'delivery room', 'labor and delivery', 'birth suite', 'maternal'
    ],
    overview: 'Clinical maternity department configured for labor monitoring, safe obstetric delivery, neonatal immediate thermal stabilization, maternal vital signs tracking, and postpartum recovery.',
    requiredDomains: [
      { id: 'delivery_table', label: 'Obstetric Delivery & Labor Table' },
      { id: 'fetal_monitoring', label: 'Electronic Fetal Heart Rate & Uterine CTG Monitoring' },
      { id: 'neonatal_warming', label: 'Immediate Newborn Resuscitation & Radiant Warming' },
      { id: 'resuscitation', label: 'Neonatal & Infant Emergency Airway Resuscitation' }
    ],
    clarifyingQuestions: [
      "How many delivery beds and labor suites are being commissioned?",
      "Do you require twin-monitoring fetal CTG machines with auto-scoring?",
      "Will your delivery room connect directly to a dedicated Neonatal Care Unit (NICU)?"
    ],
    comparisons: [
      {
        title: "Fetal CTG Monitor Comparison: Jumper F90 vs Jumper F80",
        modelA: "CTG Machine F90",
        modelB: "CTG Machine Jumper F80",
        criteria: [
          { aspect: "Display Interface", a: "12.1\" high-resolution tilting TFT color touch screen", b: "10.4\" folding color TFT screen" },
          { aspect: "Fetal Heart Detection", a: "12-crystal wide-beam pulse wave waterproof transducer for easier twin heart tracking", b: "9-crystal pulse wave transducer" },
          { aspect: "Diagnostic Scoring", a: "Automated Fischer and Krebs obstetric fetal analysis algorithm", b: "Standard real-time waveform recording and printout" },
          { aspect: "Recommendation", a: "Recommended for high-risk obstetric clinics and tertiary labor wards", b: "Dependable standard monitoring for routine community hospital deliveries" }
        ]
      }
    ],
    items: [
      {
        name: "Gynecology surgical table",
        manufacturer: "Yongfa / IKEDA",
        model: "Obstetric & Delivery Multi-Position",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Adjustable back and seat sections, leg crutches with fixing clamps, stainless steel fluid basin, hand remote control.",
        why: "Ergonomic obstetric delivery table facilitating lithotomy positioning, perineal repair, and natural delivery."
      },
      {
        name: "CTG Machine F90",
        manufacturer: "Jumper Medical",
        model: "F90 12.1\" Touch Twin Monitoring",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "12.1\" color display, waterproof 12-crystal ultrasound transducer, TOCO contraction sensor, automatic fetal movement counter, built-in thermal printer.",
        why: "Continuous non-invasive monitoring of fetal heart rate and uterine contractions during active labor."
      },
      {
        name: "BN-100 Radiant warmer",
        manufacturer: "IKEDA OEM",
        model: "BN-100 Overhead Servo Radiant Warmer",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Microcomputer servo temperature control, APGAR timer, overhead examination lamp, tilting bassinet, skin temp sensor.",
        why: "Immediate delivery-side thermal protection and open-bed neonatal resuscitation right after delivery."
      },
      {
        name: "Resuscitation bag Infant",
        manufacturer: "IKEDA OEM",
        model: "Silicone Infant Manual Resuscitator (280ml)",
        category: "instruments",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Autoclavable 134°C medical silicone, pop-off pressure limiting valve (40cm H2O), reservoir bag and infant silicone masks.",
        why: "Mandatory emergency newborn resuscitation device for managing birth asphyxia."
      }
    ],
    missingGaps: [
      {
        item: "Obstetric Vacuum Extractor & Forceps Set",
        domain: "Instrumental Delivery",
        clinicalNecessity: "Required for assisted instrumental vaginal deliveries during prolonged second-stage labor or fetal distress."
      },
      {
        item: "Emergency Cesarean Section Instrument Set & Class-B Autoclave",
        domain: "Surgical Delivery Readiness",
        clinicalNecessity: "Ensures immediate surgical intervention if emergent labor dystocia requires emergency C-section."
      }
    ]
  },

  'emergency': {
    id: 'emergency',
    name: 'Emergency & Casualty Care Department (ER / Trauma)',
    categoryKey: 'Emergency & Casualty Care',
    slug: 'emergency',
    aliases: [
      'emergency', 'emergency room', 'er', 'casualty', 'triage', 'trauma', 'trauma bay', 'a&e', 'accident and emergency'
    ],
    overview: 'First-line emergency department equipped for rapid trauma intake, cardiopulmonary resuscitation, airway suctioning, acute oxygen therapy, and emergency patient transit.',
    requiredDomains: [
      { id: 'airway_suction', label: 'Mobile Battery Airway Suction' },
      { id: 'oxygen_supply', label: 'High-Output Medical Oxygen Generation' },
      { id: 'trauma_transport', label: 'Heavy-Duty Hydraulic Trauma Stretcher' },
      { id: 'cardiac_resuscitation', label: 'Emergency Defibrillator & Triage Monitoring' }
    ],
    clarifyingQuestions: [
      "How many emergency trauma bays are being commissioned?",
      "Do you require transport stretchers with X-ray translucent backrests for rapid spinal clearance?",
      "What is your primary medical oxygen setup: centralized pipeline or bedside oxygen concentrators?"
    ],
    comparisons: [
      {
        title: "Emergency Airway Suction Comparison: H003-A (Battery) vs H001 (Stationary)",
        modelA: "portable phlegm suction H003-A With battery",
        modelB: "Suction unit H001 20L/min",
        criteria: [
          { aspect: "Portability & Power", a: "Internal rechargeable lithium battery + AC power; lightweight for ambulance transit and mobile triage", b: "High-capacity AC mains stationary unit for resuscitation bays" },
          { aspect: "Vacuum Flow Rate", a: "≥18 L/min rapid negative pressure for emergency airway clearance", b: "≥20 L/min continuous heavy-duty suction" },
          { aspect: "Recommendation", a: "Essential for frontline triage, ambulance transit, and power outage backup", b: "Ideal for stationary emergency minor procedure rooms" }
        ]
      }
    ],
    items: [
      {
        name: "portable phlegm suction H003-A With battery",
        manufacturer: "IKEDA OEM",
        model: "H003-A Mobile Battery",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "High vacuum, negative pressure ≥0.075MPa, pumping speed ≥18L/min, internal battery for mobile resuscitation.",
        why: "Rapid airway clearance for trauma patients with vomitus, blood, or secretions to prevent aspiration."
      },
      {
        name: "Oxygen concentrator 10L Y007F-10W/2",
        manufacturer: "IKEDA OEM",
        model: "10L Dual-Flow",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "High purity medical oxygen 93%±3%, dual flowmeters allowing simultaneous oxygenation of two patients, nebulizer port.",
        why: "Continuous high-concentration oxygen therapy for acute respiratory distress, trauma shock, and hypoxia."
      },
      {
        name: "Hydraulic patient transportation stretcher",
        manufacturer: "Yongfa / Saikang",
        model: "Heavy-Duty Hydraulic Trauma Trolley",
        category: "equipment",
        importance: "essential",
        defaultQty: 2,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Size 2120×800×(610-930)mm, hydraulic height adjustment, Trendelenburg/Reverse-Trendelenburg 0–10°, X-ray translucent back section, central locking casters.",
        why: "Rapid trauma patient transport with integrated X-ray translucent backboard for acute spinal clearance."
      }
    ],
    missingGaps: [
      {
        item: "Biphasic Defibrillator with External Pacing & AED",
        domain: "Cardiac Arrest Resuscitation",
        clinicalNecessity: "Mandatory emergency equipment for immediate cardioversion of shockable rhythms in cardiac arrest."
      },
      {
        item: "Emergency Crash Cart with Breakaway Medication Lock",
        domain: "Resuscitation Pharmacotherapy",
        clinicalNecessity: "Standardized mobile storage for adrenaline, atropine, amiodarone, endotracheal tubes, and laryngoscopes."
      }
    ]
  },

  'consultation': {
    id: 'consultation',
    name: 'General Consultation & Outpatient Clinic (OPD)',
    categoryKey: 'General Hospital Materials',
    slug: 'consultation',
    aliases: [
      'consultation', 'opd', 'outpatient', 'general clinic', 'consultation room',
      'doctor room', 'exam room', 'examination room', 'primary care', 'family medicine'
    ],
    overview: 'Outpatient consultation room equipped for comprehensive clinical diagnostics, cardiac ECG screening, accurate automated blood pressure acquisition, and general medical examinations.',
    requiredDomains: [
      { id: 'diagnostic_set', label: 'Integrated Diagnostic Set (Ophthalmoscope & Otoscope)' },
      { id: 'vital_signs', label: 'Clinical Blood Pressure & Thermometry' },
      { id: 'cardiac_ecg', label: '12-Channel Diagnostic Electrocardiograph (ECG)' },
      { id: 'examination_furniture', label: 'Examination Bed & Doctor Desk Infrastructure' }
    ],
    clarifyingQuestions: [
      "How many outpatient consultation rooms are you equipping?",
      "Will your consultation clinic be performing 12-lead ECG cardiac screenings on-site?",
      "Do you prefer wall-mounted integrated diagnostic sets or portable handheld units?"
    ],
    comparisons: [
      {
        title: "Blood Pressure Acquisition: Folee DX-B6Y vs Yuwell YE670A",
        modelA: "Blood pressure monitor FOLEE DX-B6Y",
        modelB: "Blood pressure monitor YUWELL YE670A",
        criteria: [
          { aspect: "Clinical Accuracy", a: "Clinical oscillometric technology with dual-sensor pulse detection", b: "Standard automated oscillometric upper-arm monitor" },
          { aspect: "Cuff Architecture", a: "Ergonomic wide-range pre-formed cuff (22–42cm) suitable for normal and obese adult patients", b: "Standard upper-arm velcro cuff (22–32cm)" },
          { aspect: "Recommendation", a: "Recommended for busy outpatient consultation desks with variable patient body habitus", b: "Dependable standard blood pressure monitor for private doctor offices" }
        ]
      }
    ],
    items: [
      {
        name: "Wall mounted diagnostic set",
        manufacturer: "IKEDA OEM",
        model: "Integrated Wall Station",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Coaxial ophthalmoscope head, fiber-optic otoscope head, spiral coiled anti-theft cords, automated sensor power cradle.",
        why: "All-in-one clinical examination station providing direct fundoscopy and ear canal examination without battery maintenance."
      },
      {
        name: "12 Channel ECG-E70",
        manufacturer: "IKEDA OEM",
        model: "ECG-E70 (8\" Touch Screen)",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "8-inch color LCD touch screen, simultaneous 12-lead acquisition, automated Glasgow ECG interpretation algorithm, thermal roll printer.",
        why: "Gold-standard non-invasive cardiac evaluation detecting myocardial ischemia, infarction, and conduction arrhythmias."
      },
      {
        name: "Blood pressure monitor YUWELL YE670A",
        manufacturer: "Yuwell",
        model: "YE670A Arm Monitor",
        category: "equipment",
        importance: "essential",
        defaultQty: 1,
        unitPrice: "Upon Request (Proforma Quote)",
        specs: "Large backlight LCD screen, 74 groups of memory, irregular heartbeat (IHB) detection, voice broadcast function.",
        why: "Precise automated blood pressure and pulse acquisition with arrhythmia alerting."
      }
    ],
    missingGaps: [
      {
        item: "Clinical Examination Couch with Paper Roll Holder",
        domain: "Physical Examination Furniture",
        clinicalNecessity: "Required for physical palpation, abdominal examinations, and recumbent patient assessments."
      },
      {
        item: "Digital Medical Column Scale with Stadiometer",
        domain: "Patient Anthropometry",
        clinicalNecessity: "Essential for accurate Body Mass Index (BMI) calculation and weight-based pediatric/adult drug dosing."
      }
    ]
  }
};

// ── 3. CATALOG INDEXER & DUPLICATE IDENTIFIER ──────────────────
function buildCatalogIndex(products) {
  const index = {
    itemsByName: new Map(),
    itemsByCategory: new Map(),
    allItems: []
  };

  products.forEach(cat => {
    (cat.equipmentHighlights || []).forEach((item, idx) => {
      const cleanName = (item.name || '').trim();
      if (!cleanName) return;

      const detectedManufacturer = detectManufacturer(cleanName, item.specification || '');
      const indexedItem = {
        name: cleanName,
        category: item.category || cat.name,
        categorySlug: cat.slug,
        departmentGroup: cat.departmentGroup || '',
        subtitle: item.subtitle || '',
        specification: item.specification || '',
        features: Array.isArray(item.features) ? item.features : [],
        image: item.image || '',
        itemIdx: idx,
        manufacturer: detectedManufacturer
      };

      index.itemsByName.set(cleanName.toLowerCase(), indexedItem);

      if (!index.itemsByCategory.has(cat.slug)) {
        index.itemsByCategory.set(cat.slug, []);
      }
      index.itemsByCategory.get(cat.slug).push(indexedItem);

      index.allItems.push(indexedItem);
    });
  });

  return index;
}

// ── 4. DEPARTMENT DETECTION ENGINE ───────────────────────────
function detectDepartmentFromQuery(query) {
  const q = query.toLowerCase();

  for (const key of Object.keys(DEPARTMENT_BLUEPRINTS)) {
    const dept = DEPARTMENT_BLUEPRINTS[key];
    for (const alias of dept.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, '\\s*')}\\b`, 'i');
      if (regex.test(q)) {
        return dept;
      }
    }
  }

  // Common synonyms and medical combinations
  if (/\b(teeth|dentist|tooth|handpiece|dental\s*chair)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['dental'];
  if (/\b(blood\s*test|microbiology|specimen|centrifuge|microscope)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['laboratory'];
  if (/\b(x-ray|xray|fluoroscopy|c-arm|ultrasound\s*machine)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['radiology'];
  if (/\b(laparoscop\w*|surgical\s*table|anesthesia\s*machine|shadowless\s*light|operating\s*room)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['operating-theatre'];
  if (/\b(icu|ventilator|respirator|intensive\s*care)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['icu'];
  if (/\b(delivery\s*room|labor\s*ward|obstetric|ctg|maternity)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['maternity'];
  if (/\b(trauma|casualty|ambulance|emergency\s*room|resuscitation)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['emergency'];
  if (/\b(outpatient|consultation|doctor\s*office|general\s*clinic|opd)\b/i.test(q)) return DEPARTMENT_BLUEPRINTS['consultation'];

  return null;
}

// ── 5. DEPARTMENT COMPLETENESS AUDITOR ────────────────────────
function assessDepartmentCompleteness(blueprint, currentItems = []) {
  const selectedNames = new Set(currentItems.map(i => (typeof i === 'string' ? i : i.name).toLowerCase().trim()));
  const coveredDomains = [];
  const missingDomains = [];

  // Check each required domain against proposed items
  blueprint.requiredDomains.forEach(domain => {
    let isCovered = false;
    for (const item of blueprint.items) {
      if (selectedNames.has(item.name.toLowerCase().trim())) {
        if (item.domainId === domain.id ||
            item.category === domain.id ||
            (domain.id && item.name.toLowerCase().includes(domain.id.replace(/_/g, ' '))) ||
            (item.specs && item.specs.toLowerCase().includes(domain.label.toLowerCase())) ||
            (domain.keywords && domain.keywords.some(k => (item.name + ' ' + (item.specs || '')).toLowerCase().includes(k)))) {
          isCovered = true;
          break;
        }
      }
    }
    if (isCovered) {
      coveredDomains.push(domain.label);
    } else {
      missingDomains.push(domain.label);
    }
  });

  const totalDomains = blueprint.requiredDomains.length || 1;
  const coveredCount = Math.max(coveredDomains.length, Math.min(selectedNames.size, totalDomains));
  let score = Math.round((coveredCount / totalDomains) * 100);

  // Critical requirement from Section 4:
  // "Do not automatically declare a department clinically complete without sufficient information about its intended services and requirements."
  if (blueprint.missingGaps && blueprint.missingGaps.length > 0) {
    score = Math.min(score, 88); // Cap initial score at 88% until hospital confirms specialized scope
  }

  let status = "Foundational Package (Essential Core Covered • Scope Review Advised)";
  if (score < 60) {
    status = "Preliminary List (Substantial Clinical Gaps Identified)";
  } else if (score >= 90) {
    status = "Turnkey Department Package (Full Specialty Readiness)";
  }

  return {
    score,
    status,
    coveredDomains,
    missingDomains,
    gaps: blueprint.missingGaps || []
  };
}

// ── 6. STRUCTURED QUOTATION GENERATOR ─────────────────────────
function generateStructuredQuotation(blueprint, customItems = null) {
  const itemsToUse = Array.isArray(customItems) && customItems.length ? customItems : blueprint.items;

  const categories = {
    equipment: itemsToUse.filter(i => i.category === 'equipment'),
    instruments: itemsToUse.filter(i => i.category === 'instruments'),
    accessories: itemsToUse.filter(i => i.category === 'accessories'),
    consumables: itemsToUse.filter(i => i.category === 'consumables')
  };

  // Build clean quotation message formatted for contact-form #message
  let formattedMessage = `Hello IKEDA Team,\n\nI would like to request an official proforma quotation, technical specification datasheets, and delivery terms for our ${blueprint.name}.\n\n`;

  formattedMessage += `📋 REQUESTED DEPARTMENT EQUIPMENT LIST:\n\n`;

  if (categories.equipment.length) {
    formattedMessage += `🏥 CAPITAL MEDICAL EQUIPMENT:\n`;
    categories.equipment.forEach((it, idx) => {
      formattedMessage += `${idx + 1}. ${it.name} (${it.manufacturer}) — Qty: ${it.defaultQty || it.qty || 1} unit(s) [${(it.importance || 'Essential').toUpperCase()}]\n   • Specs: ${it.specs || it.why || 'Standard manufacturer specifications'}\n`;
    });
    formattedMessage += `\n`;
  }

  if (categories.instruments.length) {
    formattedMessage += `✂️ SURGICAL & CLINICAL INSTRUMENTS:\n`;
    categories.instruments.forEach((it, idx) => {
      formattedMessage += `${idx + 1}. ${it.name} (${it.manufacturer}) — Qty: ${it.defaultQty || it.qty || 1} set(s) [${(it.importance || 'Essential').toUpperCase()}]\n`;
    });
    formattedMessage += `\n`;
  }

  if (categories.accessories.length) {
    formattedMessage += `🔌 ACCESSORIES & INFRASTRUCTURE:\n`;
    categories.accessories.forEach((it, idx) => {
      formattedMessage += `${idx + 1}. ${it.name} — Qty: ${it.defaultQty || it.qty || 1} unit(s) [${(it.importance || 'Recommended').toUpperCase()}]\n`;
    });
    formattedMessage += `\n`;
  }

  if (categories.consumables.length) {
    formattedMessage += `📦 STERILIZATION & CONSUMABLE PACKAGES:\n`;
    categories.consumables.forEach((it, idx) => {
      formattedMessage += `${idx + 1}. ${it.name} — Qty: ${it.defaultQty || it.qty || 10} unit(s) [${(it.importance || 'Essential').toUpperCase()}]\n`;
    });
    formattedMessage += `\n`;
  }

  formattedMessage += `Please include formal quotation pricing, CE/ISO certificates, transport and delivery lead times to Kigali, and on-site biomedical engineering installation terms.\n\nFacility Name:\nContact Person:`;

  return {
    department: blueprint.name,
    departmentKey: blueprint.id,
    categories,
    items: itemsToUse.map(it => ({
      name: it.name,
      manufacturer: it.manufacturer,
      model: it.model,
      category: it.category,
      importance: it.importance,
      qty: it.defaultQty || it.qty || 1,
      unitPrice: it.unitPrice || "Upon Request (Proforma Quote)",
      specs: it.specs || ''
    })),
    formattedMessage
  };
}

// ── 7. PRODUCT & MANUFACTURER COMPARISON ENGINE ──────────────
const ALL_COMPARISONS = [
  {
    id: "siger_v6000_vs_u100",
    matchRegex: /\b(v6000|u100)\b.*\b(v6000|u100)\b|\b(siger\s*(v6000|u100))\b|\b(compare|difference|versus|vs\.?)\b.*\b(dental\s*chair|siger\s*chair|v6000|u100)\b/i,
    title: "Siger V6000 (Flagship Operatory) vs Siger U100 (Standard Workhorse)",
    modelA: {
      name: "Dental chair Siger V6000",
      manufacturer: "Siger",
      category: "Dentistry & Oral Surgery",
      tier: "Flagship / Tertiary Specialty",
      keySpecs: "SigerSmart™ 7\" capacitive touch OS, motorized 180° ceramic spittoon with automated disinfection cycle, Italian synchronized compensating backrest, dual safety collision cut-off sensors, 4-hole handpiece tubings.",
      advantages: "Touchscreen memory presets for up to 3 dentists, motorized swiveling spittoon for elderly/bariatric patient comfort, automated self-cleaning suction and water line disinfection."
    },
    modelB: {
      name: "Dental chair Siger U100",
      manufacturer: "Siger",
      category: "Dentistry & Oral Surgery",
      tier: "Standard Workhorse / Community Health",
      keySpecs: "Tactile micro-switch membrane push-button panel, manual detachable ceramic spittoon with timed cup filler, articulated backrest, 4-hole handpiece tubings.",
      advantages: "Extremely robust mechanical architecture, lower initial capital investment, minimal electronic maintenance overhead."
    },
    clinicalRecommendation: "Choose the **Siger V6000** for cosmetic dentistry, implantology, and referral dental departments where practitioner ergonomics and patient experience are paramount. Choose the **Siger U100** for high-volume outpatient clinics and community dental services needing durable, daily operational reliability. We never recommend a unit simply for being cheaper; both models meet full CE and ISO13485 clinical safety standards.",
    pricingNote: "Pricing is provided via formal proforma quote based on chosen delivery arms and handpiece packages."
  },
  {
    id: "autoclave_siger_vs_dengguan",
    matchRegex: /\b(autoclave|steriliz\w*)\b/i,
    title: "Siger 23L Class-B Autoclave vs Dengguan 23L Class-B Autoclave",
    modelA: {
      name: "Autoclave 23L- SIGER",
      manufacturer: "Siger",
      category: "Operating Theatre",
      tier: "Dental & Outpatient Specialty",
      keySpecs: "Full color 320×480px LCD display with real-time temperature/pressure dynamic curve telemetry, triple fractionated pre-and-post vacuum, Bowie-Dick and biological leak test compliant.",
      advantages: "Dedicated B-class rapid cycles optimized for dental handpieces and contra-angles with instant visual cycle diagnostics."
    },
    modelB: {
      name: "Autoclave 23L- DENGGUAN",
      manufacturer: "Dengguan",
      category: "Operating Theatre",
      tier: "Hospital Theatre & CSSD Reprocessing",
      keySpecs: "Digital LED segment status display, fractionated pre-vacuum and post-vacuum drying, stainless steel 304 pressure chamber, automated pressure interlocks.",
      advantages: "Heavy-duty design engineered for continuous all-day hospital operating theatre sterilization of narrow-lumen laparoscopic and urological instruments."
    },
    clinicalRecommendation: "Choose **Siger 23L** if outfitting a dental clinic requiring fast turnaround between patients and visual telemetry curves. Choose **Dengguan 23L** for general surgical operating theatres and hospital CSSD suites reprocessing hollow surgical instruments, endoscopes, and theatre dressing packs.",
    pricingNote: "Official proforma pricing includes validation testing and warranty."
  },
  {
    id: "laparoscopy_4k_vs_1080p",
    matchRegex: /\b(4k|1080p)\b.*\b(1080p|4k|laparoscop\w*|tower)\b|\b(compare|difference|versus|vs\.?)\b.*\b(4k|1080p|laparoscop\w*)\b/i,
    title: "Laparoscopy Tower 4K UHD vs Laparoscopy Tower 1080p Full HD",
    modelA: {
      name: "Laparoscopy Tower 4K",
      manufacturer: "IKEDA Medical",
      category: "Operating Theatre",
      tier: "Flagship / Tertiary Oncology",
      keySpecs: "3840×2160 pixels (8.3 MP) true 4K UHD resolution, Sony CMOS sensor, 4K medical surgical monitor, integrated 80W cold LED source, continuous CO2 insufflation.",
      advantages: "4x the resolution of standard HD, resolving microvascular structures, subtle tissue perfusion margins, and delicate pelvic nerves with surgical precision."
    },
    modelB: {
      name: "Laparoscopy Tower 1080p with 1/2.8\" CMOS",
      manufacturer: "IKEDA Medical",
      category: "Operating Theatre",
      tier: "Standard Theatre Workhorse",
      keySpecs: "1920×1080 pixels (2.1 MP) Full HD resolution, 1/2.8\" CMOS optical sensor, integrated LED light source, medical display.",
      advantages: "Crisp optical fidelity for routine surgical procedures (cholecystectomy, appendectomy, hernia repair) with proven field durability."
    },
    clinicalRecommendation: "Choose **4K UHD** for referral hospitals, oncological resection, bariatrics, and endourology where optical delineation of microscopic margins directly impacts patient safety. Choose **1080p Full HD** for district hospitals and ambulatory centres seeking dependable endoscopic surgery without tertiary capital overhead.",
    pricingNote: "Available with matching sapphire-lens telescopes (0° and 30°) and full trocar sets."
  },
  {
    id: "sonoscape_s12_vs_e2",
    matchRegex: /\b(s12|e2)\b.*\b(s12|e2|sonoscape|ultrasound)\b|\b(sonoscape\s*(s12|e2))\b|\b(compare|difference|versus|vs\.?)\b.*\b(sonoscape|ultrasound)\b/i,
    title: "SonoScape S12 (Console Shared-Service) vs SonoScape E2 (Portable 3-Probe)",
    modelA: {
      name: "Ultrasound machine S12 SONOSCAPE",
      manufacturer: "SonoScape",
      category: "Radiology & Diagnostic Imaging",
      tier: "Console Radiology & Shared-Service",
      keySpecs: "Full-height mobile console with articulating arm, 15\" HD monitor, 4 active probe connectors, Color Doppler, Pulsed Wave (PW), Continuous Wave (CW) Doppler for Cardiology.",
      advantages: "Supports full-spectrum shared services (cardiac echocardiography, advanced vascular flow, high-throughput abdominal and OB/GYN)."
    },
    modelB: {
      name: "Ultrasound machine E2 SONOSCAPE",
      manufacturer: "SonoScape",
      category: "Radiology & Diagnostic Imaging",
      tier: "Point-of-Care & Mobile Triage",
      keySpecs: "Laptop-style portable architecture, 15.6\" anti-glare screen, 2 probe ports, bundled with 3 probes: Convex (abdominal/OB), Linear (vascular/MSK), and Transvaginal (pelvic).",
      advantages: "Rapid bedside deployment for emergency trauma (FAST protocol), maternal triage, and mobile community health outreach."
    },
    clinicalRecommendation: "Choose **SonoScape S12** for primary radiology departments conducting cardiology and complex vascular studies. Choose **SonoScape E2** for emergency departments, labor ward triage, and outpatient clinics requiring multi-probe versatility in a mobile form factor.",
    pricingNote: "Comes with standard transducers, DICOM connectivity, and printer options."
  },
  {
    id: "microscope_ex33_vs_ex21",
    matchRegex: /\b(ex\s*33|ex\s*21)\b.*\b(ex\s*33|ex\s*21|microscope)\b|\b(compare|difference|versus|vs\.?)\b.*\b(microscope)\b/i,
    title: "Biological Microscope EX 33-B (Infinity Plan) vs EX 21-B (Standard Achromatic)",
    modelA: {
      name: "Biological Microscope- EX 33-B",
      manufacturer: "IKEDA OEM",
      category: "General Hospital Materials",
      tier: "Referral Pathology & Cytology",
      keySpecs: "Color-corrected infinity optical system (CCIS), plan achromatic objectives (4x, 10x, 40x, 100x Oil), Kohler illumination with warm 3W LED, 360° rotatable Gemel binocular head.",
      advantages: "Exceptional edge-to-edge optical flatness, zero chromatic distortion, ideal for delicate microparasitology and histological cytology."
    },
    modelB: {
      name: "Biological Microscope- EX 21-B",
      manufacturer: "IKEDA OEM",
      category: "General Hospital Materials",
      tier: "Routine Outpatient Screening",
      keySpecs: "Finite achromatic optical system, standard LED illumination, double-layer mechanical stage (140×135mm).",
      advantages: "Reliable, durable daily workstation for urinalysis, stool examinations, and rapid malaria screening."
    },
    clinicalRecommendation: "Choose **EX 33-B** for dedicated laboratory and pathology departments where optical resolution across the entire field is critical. Choose **EX 21-B** for outpatient clinics and triage stations handling routine microscopic analyses.",
    pricingNote: "Supplied with dust cover, immersion oil, and calibration slide."
  },
  {
    id: "table_motorized_vs_hydraulic",
    matchRegex: /\b(motorized|hydraulic)\b.*\b(operating\s*table|surgical\s*table|table)\b.*\b(motorized|hydraulic)\b|\b(compare|difference|versus|vs\.?)\b.*\b(operating\s*table|surgical\s*table)\b/i,
    title: "Motorized Operating Table vs Hydraulic Operating Table",
    modelA: {
      name: "Motorized operating table",
      manufacturer: "Yongfa / IKEDA",
      category: "Operating Theatre",
      tier: "Electro-Hydraulic Motorized",
      keySpecs: "Multi-axis motorized positioning with handheld remote control, 400mm longitudinal tabletop sliding for C-Arm 360° imaging, Trendelenburg ±25°, lateral tilt 15°, backup battery.",
      advantages: "Effortless surgeon-controlled positioning during laparoscopy, seamless C-arm fluoroscopy access without repositioning the patient."
    },
    modelB: {
      name: "Hydraulic operating table (hydraulic for height adjustment)",
      manufacturer: "Yongfa",
      category: "Operating Theatre",
      tier: "Mechanical Hydraulic Workhorse",
      keySpecs: "Heavy-duty hydraulic foot-pump elevation, gas spring mechanical backrest articulation, stainless steel base, 100% power-independent.",
      advantages: "Zero risk of electrical downtime; virtually indestructible mechanical components suited for emergency and district theatres."
    },
    clinicalRecommendation: "Choose **Motorized Operating Table** for tertiary surgical suites performing laparoscopic, orthopedic, and cardiovascular procedures requiring intraoperative C-arm imaging. Choose **Hydraulic Table** for day-surgery centres and facilities with unreliable electrical grids.",
    pricingNote: "Includes standard armboards, lateral supports, shoulder rests, and anesthesia screen frame."
  },
  {
    id: "biolight_full_vs_standard",
    matchRegex: /\b(biolight|m12)\b.*\b(full|standard)\b|\b(full|standard)\b.*\b(biolight|m12)\b|\b(compare|difference|versus|vs\.?)\b.*\b(biolight|m12|patient\s*monitor)\b/i,
    title: "Biolight M12 Full Option vs Biolight M12 Standard Option",
    modelA: {
      name: "Patient monitor BIOLIGHT M12 Full option",
      manufacturer: "Biolight",
      category: "Intensive Care Unit (ICU)",
      tier: "Critical Care & Anesthesia",
      keySpecs: "12.1\" display, 12-lead ECG, dual invasive blood pressure (Dual IBP), EtCO2 microstream capnography, cardiac output, arrhythmia analysis.",
      advantages: "Mandatory for intraoperative general anesthesia and ICU mechanical ventilation where end-tidal CO2 and arterial lines are monitored."
    },
    modelB: {
      name: "Patient monitor BIOLIGHT M12 Standard option",
      manufacturer: "Biolight",
      category: "Intensive Care Unit (ICU)",
      tier: "Standard Telemetry & PACU",
      keySpecs: "12.1\" display, 5-lead ECG, SpO2, NIBP, single temperature, respiration rate, electrosurgical interference suppression.",
      advantages: "Lightweight, dependable vital signs acquisition for recovery rooms (PACU), emergency triage, and general ward telemetry."
    },
    clinicalRecommendation: "Choose **Full Option** for Operating Theatre suites and Intensive Care Units. Choose **Standard Option** for post-anesthesia recovery (PACU), emergency observation beds, and general step-down wards.",
    pricingNote: "Supplied with reusable adult sensors, NIBP cuff, ECG cables, and battery."
  },
  {
    id: "incubator_vs_warmer",
    matchRegex: /\b(incubator|bb100)\b.*\b(warmer|bn-?100)\b|\b(warmer|bn-?100)\b.*\b(incubator|bb100)\b|\b(compare|difference|versus|vs\.?)\b.*\b(incubator|warmer)\b/i,
    title: "Baby Incubator BB100 vs BN-100 Radiant Warmer",
    modelA: {
      name: "Baby incubator BB100",
      manufacturer: "IKEDA OEM",
      category: "Neonatal & Pediatric Care",
      tier: "NICU Enclosed Microenvironment",
      keySpecs: "Dual-wall enclosed acrylic hood, servo-controlled microcomputer temperature regulating (skin & air modes), humidity chamber, HEPA air filtration.",
      advantages: "Minimizes radiant and evaporative heat loss for premature infants (<37 weeks) and very low birth weight neonates requiring prolonged thermal stability."
    },
    modelB: {
      name: "BN-100 Radiant warmer",
      manufacturer: "IKEDA OEM",
      category: "Maternity & Obstetrics",
      tier: "Delivery Suite Open Resuscitation",
      keySpecs: "Overhead infrared heating source, APGAR timer, 360° open bed access, tiltable bassinet, integrated LED examination light.",
      advantages: "Provides instant thermal support and open physical access for delivery room resuscitation, suctioning, and neonatal APGAR assessment."
    },
    clinicalRecommendation: "These systems are complementary: **BN-100 Radiant Warmer** is mandatory inside the Labor & Delivery Suite for immediate resuscitation at birth. **Baby Incubator BB100** is mandatory inside the Neonatal Intensive Care Unit (NICU) for ongoing thermoregulation of vulnerable preterm infants.",
    pricingNote: "Comes with skin temperature probes and mattress."
  }
];

function resolveComparisonQuery(query, rawProducts = []) {
  const q = (query || '').toLowerCase().trim();
  const isComparison =
    /\b(compare|comparison|versus|vs\.?|difference|which is better|which one should|better option)\b/i.test(q) ||
    /\b(v6000.*u100|u100.*v6000|s12.*e2|e2.*s12|4k.*1080p|1080p.*4k|siger.*dengguan|dengguan.*siger|bb100.*bn-?100|m12 full.*standard)\b/i.test(q);

  if (!isComparison) return null;

  for (const comp of ALL_COMPARISONS) {
    if (comp.matchRegex.test(q)) {
      let reply = `### 🔍 Intelligent Product & Manufacturer Comparison\n\n`;
      reply += `**${comp.title}**\n\n`;
      reply += `As an experienced medical procurement specialist, evaluating competing models requires analyzing clinical performance, component architecture, workflow suitability, and total cost of ownership rather than price alone.\n\n`;

      reply += `| Evaluation Parameter | **${comp.modelA.name}** | **${comp.modelB.name}** |\n`;
      reply += `| :--- | :--- | :--- |\n`;
      reply += `| **Manufacturer & Origin** | ${comp.modelA.manufacturer} (${comp.modelA.tier}) | ${comp.modelB.manufacturer} (${comp.modelB.tier}) |\n`;
      reply += `| **Core Hardware Architecture** | ${comp.modelA.keySpecs} | ${comp.modelB.keySpecs} |\n`;
      reply += `| **Key Technical Advantage** | ${comp.modelA.advantages} | ${comp.modelB.advantages} |\n`;
      reply += `| **Pricing / Proforma** | Upon Request (Proforma Quote) | Upon Request (Proforma Quote) |\n`;
      reply += `| **Quality & Certification** | CE Mark & ISO13485 Certified | CE Mark & ISO13485 Certified |\n\n`;

      reply += `#### 🩺 Clinical Procurement Recommendation\n`;
      reply += `${comp.clinicalRecommendation}\n\n`;
      reply += `> **Procurement Rule:** *${comp.pricingNote || 'Never select medical equipment solely based on initial price. Clinical efficacy, safety redundancy, and availability of spares in East Africa must dictate the final specification.'}*\n\n`;

      reply += `---\n\n`;
      reply += `**Would you like me to automatically populate your Quotation Inquiry form with one of these models?**`;

      const rfqPayload = {
        department: comp.modelA.category,
        departmentKey: 'comparison',
        completeness: {
          score: 95,
          status: "Verified Clinical Comparison Selection",
          coveredDomains: ["Clinical Equipment Comparison", "Manufacturer Analysis"],
          missingDomains: [],
          gaps: []
        },
        items: [
          {
            name: comp.modelA.name,
            manufacturer: comp.modelA.manufacturer,
            model: comp.modelA.tier,
            category: "equipment",
            importance: "recommended",
            qty: 1,
            unitPrice: "Upon Request (Proforma Quote)",
            specs: comp.modelA.keySpecs
          },
          {
            name: comp.modelB.name,
            manufacturer: comp.modelB.manufacturer,
            model: comp.modelB.tier,
            category: "equipment",
            importance: "recommended",
            qty: 1,
            unitPrice: "Upon Request (Proforma Quote)",
            specs: comp.modelB.keySpecs
          }
        ],
        formattedMessage: `Hello IKEDA Team,\n\nI would like to request an official proforma quotation and technical comparison datasheet for:\n\n1. ${comp.modelA.name} (${comp.modelA.manufacturer})\n2. ${comp.modelB.name} (${comp.modelB.manufacturer})\n\nPlease provide formal quotation pricing, CE/ISO certificates, delivery lead times to Kigali, and on-site biomedical installation terms.\n\nFacility Name:\nContact Person:`
      };

      return {
        reply,
        rfqPayload,
        permissionPrompt: {
          text: `I have prepared quotation specifications for both ${comp.modelA.name} and ${comp.modelB.name}. Would you like me to automatically populate your Quotation Inquiry form?`,
          options: [
            { label: `✓ Yes, fill inquiry for ${comp.modelA.name}`, value: comp.modelA.name, action: "fill_form" },
            { label: "No, I would like to do it myself", value: "manual_quote", action: "dismiss" }
          ]
        },
        actions: [
          {
            label: `Quote for ${comp.modelA.name.split(' ')[0]} ${comp.modelA.name.split(' ')[1] || ''}`,
            url: `/contact?product=${encodeURIComponent(comp.modelA.name)}&rfq=ai`
          },
          {
            label: "WhatsApp Biomedical Specialist",
            url: `https://wa.me/250795360359?text=${encodeURIComponent(`Hello IKEDA Africa, I would like a technical comparison quote between ${comp.modelA.name} and ${comp.modelB.name}.`)}`
          }
        ]
      };
    }
  }

  return null;
}
// ── 8. CONVERSATIONAL MULTI-TURN HELPERS & ADJUSTMENT ENGINE ──

function findBestMatchingItemIndex(items, targetText) {
  if (!Array.isArray(items) || !targetText) return -1;
  const target = targetText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const words = target.split(/\s+/).filter(w => !['the', 'a', 'an', 'extra', 'more', 'unit', 'units', 'machine', 'set', 'option', 'item', 'items', 'please'].includes(w));
  if (!words.length) return -1;

  let bestIdx = -1;
  let bestScore = 0;

  items.forEach((item, idx) => {
    const itemName = (item.name || '').toLowerCase();
    const itemFull = `${item.name} ${item.model || ''} ${item.specs || ''}`.toLowerCase();

    // Exact containment
    if (itemName.includes(target)) {
      if (100 > bestScore) { bestScore = 100; bestIdx = idx; }
    }

    let score = 0;
    words.forEach(w => {
      if (itemName.includes(w)) score += 20;
      else if (itemFull.includes(w)) score += 10;
    });

    // Department & equipment priority matching
    if (target.includes('monitor') && itemName.includes('monitor')) score += 35;
    if (target.includes('autoclave') && itemName.includes('autoclave')) score += 35;
    if (target.includes('table') && (itemName.includes('operating table') || itemName.includes('surgical table'))) score += 35;
    if (target.includes('light') && (itemName.includes('surgical light') || itemName.includes('lamp'))) score += 35;
    if (target.includes('pendant') && itemName.includes('pendant')) score += 35;
    if (target.includes('anesthesia') && itemName.includes('anesthesia')) score += 35;
    if (target.includes('tower') && itemName.includes('tower')) score += 35;
    if (target.includes('chair') && itemName.includes('dental chair')) score += 35;
    if (target.includes('compressor') && itemName.includes('compressor')) score += 35;
    if (target.includes('incubator') && itemName.includes('incubator')) score += 35;
    if (target.includes('warmer') && itemName.includes('warmer')) score += 35;
    if (target.includes('microscope') && itemName.includes('microscope')) score += 35;
    if (target.includes('ultrasound') && itemName.includes('ultrasound')) score += 35;
    if (target.includes('xray') || target.includes('x-ray') && itemName.includes('xray')) score += 35;
    if (target.includes('trocar') && itemName.includes('trocar')) score += 35;
    if (target.includes('endobag') && itemName.includes('endobag')) score += 35;

    if (score > bestScore && score >= 20) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

function findProductInBlueprintsOrCatalog(targetText, rawProducts = []) {
  const target = (targetText || '').toLowerCase().trim();

  // 1. Search existing department blueprints
  for (const deptKey of Object.keys(DEPARTMENT_BLUEPRINTS)) {
    const dept = DEPARTMENT_BLUEPRINTS[deptKey];
    for (const item of dept.items) {
      const name = item.name.toLowerCase();
      if (name.includes(target) ||
          (target.includes('ultrasound') && name.includes('ultrasound')) ||
          (target.includes('autoclave') && name.includes('autoclave')) ||
          (target.includes('monitor') && name.includes('monitor')) ||
          (target.includes('incubator') && name.includes('incubator')) ||
          (target.includes('chair') && name.includes('dental chair')) ||
          (target.includes('table') && name.includes('operating table')) ||
          (target.includes('light') && name.includes('surgical light'))) {
        return {
          name: item.name,
          manufacturer: item.manufacturer || 'IKEDA OEM',
          model: item.model || 'Standard OEM',
          category: item.category || 'equipment',
          importance: item.importance || 'recommended',
          qty: 1,
          unitPrice: item.unitPrice || 'Upon Request (Proforma Quote)',
          specs: item.specs || ''
        };
      }
    }
  }

  // 2. Clinical fallbacks for commonly requested companion equipment
  if (target.includes('ultrasound') || target.includes('sonoscape')) {
    return {
      name: 'Ultrasound machine E2 SONOSCAPE',
      manufacturer: 'SonoScape',
      model: 'Portable 3-Probe Color Doppler',
      category: 'equipment',
      importance: 'recommended',
      qty: 1,
      unitPrice: 'Upon Request (Proforma Quote)',
      specs: '15.6" anti-glare monitor, bundled with Convex, Linear, and Transvaginal probes, Color Doppler.'
    };
  }
  if (target.includes('electrosurgical') || target.includes('esu') || target.includes('diathermy')) {
    return {
      name: 'Electrosurgical Generator Unit (ESU 300W)',
      manufacturer: 'IKEDA OEM',
      model: 'High-Frequency Surgical Diathermy',
      category: 'equipment',
      importance: 'essential',
      qty: 1,
      unitPrice: 'Upon Request (Proforma Quote)',
      specs: '300W monopolar cut/coagulation and bipolar vessel sealing with return plate contact monitoring.'
    };
  }
  if (target.includes('suction') || target.includes('aspirator')) {
    return {
      name: 'Electric Suction Apparatus',
      manufacturer: 'IKEDA OEM',
      model: 'Heavy-Duty Theatre Suction',
      category: 'equipment',
      importance: 'essential',
      qty: 1,
      unitPrice: 'Upon Request (Proforma Quote)',
      specs: 'High vacuum, high flow (≥40L/min), dual 2500ml glass collection bottles with overflow protection.'
    };
  }

  return {
    name: targetText.charAt(0).toUpperCase() + targetText.slice(1),
    manufacturer: 'IKEDA Certified OEM',
    model: 'Clinical Standard',
    category: 'equipment',
    importance: 'recommended',
    qty: 1,
    unitPrice: 'Upon Request (Proforma Quote)',
    specs: 'Standard clinical medical specification.'
  };
}

function parseItemAdjustments(query, currentItems, rawProducts = []) {
  const q = (query || '').toLowerCase().replace(/[?!.,;]/g, ' ').replace(/\s+/g, ' ').trim();
  let items = currentItems.map(it => ({ ...it, qty: it.qty || 1 }));
  const logs = [];
  let modified = false;

  // 1. Model Replacements / Swaps
  // Laparoscopy Tower: 4K vs 1080p
  if (/\b(switch|replace|change|use)\b.*\b(1080p|full\s*hd|hd)\b/i.test(q)) {
    const idx = items.findIndex(i => i.name.toLowerCase().includes('laparoscopy') || i.name.toLowerCase().includes('tower'));
    if (idx > -1 && !items[idx].name.includes('1080p')) {
      const old = items[idx].name;
      items[idx] = {
        name: 'Laparoscopy Tower 1080p with 1/2.8" CMOS',
        manufacturer: 'IKEDA Medical',
        model: 'Full HD Workhorse',
        category: 'equipment',
        importance: 'essential',
        qty: items[idx].qty || 1,
        unitPrice: 'Upon Request (Proforma Quote)',
        specs: '1920×1080 Full HD resolution, 1/2.8" CMOS sensor, integrated LED light source, medical display.'
      };
      logs.push(`• Replaced **${old}** with **${items[idx].name}**.`);
      modified = true;
    }
  } else if (/\b(switch|replace|change|use)\b.*\b(4k|ultra\s*hd)\b/i.test(q)) {
    const idx = items.findIndex(i => i.name.toLowerCase().includes('laparoscopy') || i.name.toLowerCase().includes('tower'));
    if (idx > -1 && !items[idx].name.includes('4K')) {
      const old = items[idx].name;
      items[idx] = {
        name: 'Laparoscopy Tower 4K',
        manufacturer: 'IKEDA Medical',
        model: '4K UHD Flagship',
        category: 'equipment',
        importance: 'essential',
        qty: items[idx].qty || 1,
        unitPrice: 'Upon Request (Proforma Quote)',
        specs: '3840×2160 pixels (8.3 MP) true 4K UHD resolution, Sony CMOS sensor, 4K medical surgical monitor, integrated 80W cold LED.'
      };
      logs.push(`• Replaced **${old}** with **${items[idx].name}**.`);
      modified = true;
    }
  }

  // Operating Table: Motorized vs Hydraulic
  if (/\b(switch|replace|change|use)\b.*\b(hydraulic)\b/i.test(q)) {
    const idx = items.findIndex(i => i.name.toLowerCase().includes('operating table') || i.name.toLowerCase().includes('surgical table'));
    if (idx > -1 && !items[idx].name.includes('Hydraulic')) {
      const old = items[idx].name;
      items[idx] = {
        name: 'Hydraulic operating table (hydraulic for height adjustment)',
        manufacturer: 'Yongfa',
        model: 'Mechanical Hydraulic Workhorse',
        category: 'equipment',
        importance: 'essential',
        qty: items[idx].qty || 1,
        unitPrice: 'Upon Request (Proforma Quote)',
        specs: 'Heavy-duty hydraulic foot-pump elevation, gas spring backrest articulation, stainless steel base, 100% power-independent.'
      };
      logs.push(`• Replaced **${old}** with **${items[idx].name}**.`);
      modified = true;
    }
  } else if (/\b(switch|replace|change|use)\b.*\b(motorized)\b/i.test(q)) {
    const idx = items.findIndex(i => i.name.toLowerCase().includes('operating table') || i.name.toLowerCase().includes('surgical table'));
    if (idx > -1 && !items[idx].name.includes('Motorized')) {
      const old = items[idx].name;
      items[idx] = {
        name: 'Motorized operating table',
        manufacturer: 'Yongfa / IKEDA',
        model: 'Electro-Hydraulic Motorized',
        category: 'equipment',
        importance: 'essential',
        qty: items[idx].qty || 1,
        unitPrice: 'Upon Request (Proforma Quote)',
        specs: 'Multi-axis motorized positioning with handheld remote control, 400mm longitudinal tabletop sliding for C-Arm 360° imaging.'
      };
      logs.push(`• Replaced **${old}** with **${items[idx].name}**.`);
      modified = true;
    }
  }

  // Dental Chair: Siger V6000 vs U100
  if (/\b(switch|replace|change|use)\b.*\b(u100)\b/i.test(q)) {
    const idx = items.findIndex(i => i.name.toLowerCase().includes('dental chair'));
    if (idx > -1 && !items[idx].name.includes('U100')) {
      const old = items[idx].name;
      items[idx] = {
        name: 'Dental chair Siger U100',
        manufacturer: 'Siger',
        model: 'U100 Standard Workhorse',
        category: 'equipment',
        importance: 'essential',
        qty: items[idx].qty || 1,
        unitPrice: 'Upon Request (Proforma Quote)',
        specs: 'Tactile micro-switch membrane panel, manual detachable ceramic spittoon with timed cup filler, articulated backrest.'
      };
      logs.push(`• Replaced **${old}** with **${items[idx].name}**.`);
      modified = true;
    }
  } else if (/\b(switch|replace|change|use)\b.*\b(v6000)\b/i.test(q)) {
    const idx = items.findIndex(i => i.name.toLowerCase().includes('dental chair'));
    if (idx > -1 && !items[idx].name.includes('V6000')) {
      const old = items[idx].name;
      items[idx] = {
        name: 'Dental chair Siger V6000',
        manufacturer: 'Siger',
        model: 'V6000 Flagship',
        category: 'equipment',
        importance: 'essential',
        qty: items[idx].qty || 1,
        unitPrice: 'Upon Request (Proforma Quote)',
        specs: 'SigerSmart™ 7" touch OS, motorized swiveling ceramic spittoon with automated disinfection cycle, Italian synchronized backrest.'
      };
      logs.push(`• Replaced **${old}** with **${items[idx].name}**.`);
      modified = true;
    }
  }

  // 2. Quantity Changes
  const qtyPatterns = [
    /(?:change|make|set|update|increase|decrease)\s+(?:the\s+)?([a-z0-9\s-]+?)\s+(?:to|quantity\s+to|=)\s*(\d+)/gi,
    /(?:change|make|set)\s+(?:it\s+)?(\d+)\s+([a-z0-9\s-]+?)(?:\s+(?:instead|please)|$|\band\b)/gi,
    /(\d+)\s+([a-z0-9\s-]+?)\s+(?:instead|please)/gi
  ];

  for (const regex of qtyPatterns) {
    let match;
    while ((match = regex.exec(q)) !== null) {
      let targetText, newQty;
      if (/^\d+$/.test(match[1])) {
        newQty = parseInt(match[1], 10);
        targetText = match[2].trim();
      } else {
        targetText = match[1].trim();
        newQty = parseInt(match[2], 10);
      }

      if (newQty > 0 && targetText) {
        const itemIdx = findBestMatchingItemIndex(items, targetText);
        if (itemIdx > -1) {
          const oldQty = items[itemIdx].qty || 1;
          if (oldQty !== newQty) {
            items[itemIdx].qty = newQty;
            logs.push(`• Adjusted **${items[itemIdx].name}** quantity from ${oldQty} to **${newQty} units**.`);
          } else {
            logs.push(`• Confirmed **${items[itemIdx].name}** quantity at **${newQty} units**.`);
          }
          modified = true;
        }
      }
    }
  }

  // 3. Additions
  const addRegex = /\b(?:add|include|put\s*in)\s+(?:an?\s+)?(?:(\d+)\s+)?(?:(more|extra|additional)\s+)?([a-z0-9\s-]+?)(?:\s+(?:too|as\s*well|please)|$|\band\b)/gi;
  let addMatch;
  while ((addMatch = addRegex.exec(q)) !== null) {
    const addQty = addMatch[1] ? parseInt(addMatch[1], 10) : 1;
    const targetText = addMatch[3].trim().replace(/\b(to|the|our|my|department|clinic|package)\b/gi, '').trim();

    if (!targetText || targetText.length < 3) continue;

    const existingIdx = findBestMatchingItemIndex(items, targetText);
    if (existingIdx > -1) {
      const oldQty = items[existingIdx].qty || 1;
      items[existingIdx].qty = oldQty + addQty;
      logs.push(`• Increased **${items[existingIdx].name}** quantity by +${addQty} (Total: **${items[existingIdx].qty} units**).`);
      modified = true;
    } else {
      const newItem = findProductInBlueprintsOrCatalog(targetText, rawProducts);
      if (newItem) {
        newItem.qty = addQty;
        items.push(newItem);
        logs.push(`• Added **${newItem.name}** (${newItem.manufacturer || 'OEM'}, Qty: **${addQty}**) to your package.`);
        modified = true;
      }
    }
  }

  // 4. Removals
  const removeRegex = /\b(?:remove|delete|take\s*out|drop|exclude|don'?t\s*need|no\s*need\s*for)\s+(?:the\s+)?([a-z0-9\s-]+?)(?:\s+(?:too|from\s*the\s*list|please)|$|\band\b)/gi;
  let remMatch;
  while ((remMatch = removeRegex.exec(q)) !== null) {
    const targetText = remMatch[1].trim().replace(/\b(the|from|list|quotation|quote)\b/gi, '').trim();
    if (!targetText || targetText.length < 3) continue;

    const existingIdx = findBestMatchingItemIndex(items, targetText);
    if (existingIdx > -1) {
      const removed = items.splice(existingIdx, 1)[0];
      logs.push(`• Removed **${removed.name}** from the equipment list.`);
      modified = true;
    }
  }

  return { modified, items, logs };
}

function detectAffirmativeConsent(q, session) {
  if (/\b(fill\s*(in)?\s*(my)?\s*(quotation|quote|inquiry|form)|populate\s*(the)?\s*(quote|quotation|form|inquiry)|send\s*inquiry\s*for\s*quotation|put\s*everything\s*(they|we|i|you)?\s*requested\s*(as\s*a\s*list\s*)?in\s*(send\s*)?inquiry|quotation\s*list|proceed\s*with\s*(quote|quotation)|pre-?fill\s*(form|quote))\b/i.test(q)) {
    return true;
  }

  if (session && (session.pendingPermissionPrompt || (session.items && session.items.length > 0))) {
    if (/^(yes|oui|sure|yep|yeah|ok|okay|y|please do|go ahead|proceed|yes please|yes do it|do it|do that|fill it|fill it in|populate it|proceed please)[!., ]*$/i.test(q)) {
      return true;
    }
  }

  return false;
}

function detectDeclineConsent(q, session) {
  if (/\b(no\s*,?\s*i\s*would\s*like\s*to\s*do\s*it\s*myself|i\s*will\s*do\s*it\s*myself|manual\s*quote|do\s*it\s*myself)\b/i.test(q)) {
    return true;
  }
  if (session && session.pendingPermissionPrompt) {
    if (/^(no|non|nope|nah|not yet|later|no thanks|no thank you|cancel)[!., ]*$/i.test(q)) {
      return true;
    }
  }
  return false;
}

function parseDiagnosticSpecs(q) {
  let roomCount = 1;
  const roomMatch = q.match(/(\d+)\s*(rooms?|suites?|theatres?|theaters?|chairs?|beds?|stations?)/i);
  if (roomMatch) {
    roomCount = Math.max(1, parseInt(roomMatch[1], 10));
  }

  const prefers4K = /\b(4k|ultra\s*hd)\b/i.test(q);
  const prefers1080p = /\b(1080p|full\s*hd|hd)\b/i.test(q);
  const prefersMotorized = /\b(motorized|electro-hydraulic)\b/i.test(q);
  const prefersHydraulic = /\b(hydraulic|manual)\b/i.test(q);
  const prefersV6000 = /\b(v6000|flagship)\b/i.test(q);
  const prefersU100 = /\b(u100|standard)\b/i.test(q);
  const prefersFullOption = /\b(full\s*option|icu\s*grade)\b/i.test(q);

  return {
    roomCount,
    prefers4K,
    prefers1080p,
    prefersMotorized,
    prefersHydraulic,
    prefersV6000,
    prefersU100,
    prefersFullOption
  };
}

function buildMultiDepartmentProforma(facilityDepartments, activeDeptName, activeItems) {
  let msg = `Hello IKEDA Team,\n\nI would like to request an official proforma quotation, technical datasheets, and delivery terms for our healthcare facility:\n\n`;
  msg += `📋 COMPREHENSIVE FACILITY EQUIPMENT INQUIRY LIST:\n\n`;

  let deptIndex = 1;
  const allDepts = { ...(facilityDepartments || {}) };
  allDepts[activeDeptName] = { name: activeDeptName, items: activeItems };

  Object.values(allDepts).forEach(deptObj => {
    msg += `🏥 DEPARTMENT ${deptIndex}: ${deptObj.name.toUpperCase()} (${deptObj.items.length} items)\n`;
    deptObj.items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.name} (${it.manufacturer || 'OEM'}) — Qty: ${it.qty || 1} unit(s) [${(it.importance || 'Essential').toUpperCase()}]\n`;
      if (it.specs) msg += `   • Specs: ${it.specs.slice(0, 110)}\n`;
    });
    msg += `\n`;
    deptIndex++;
  });

  msg += `Please include formal proforma pricing, CE/ISO certificates, shipping lead times to Kigali, and on-site biomedical installation terms.\n\nFacility Name:\nContact Person:`;
  return msg;
}

// ── 9. MAIN PROCUREMENT ENGINE DISPATCHER ─────────────────────
function handleProcurementQuery(userQuery, context = {}, rawProducts = []) {
  const q = (userQuery || '').toLowerCase().trim();
  if (!q) return null;

  // 1. Check for explicit comparison query first
  const comparisonResult = resolveComparisonQuery(q, rawProducts);
  if (comparisonResult) return comparisonResult;

  // 2. Resolve Active Procurement Session
  let session = (context && context.procurementSession && typeof context.procurementSession === 'object')
    ? { ...context.procurementSession }
    : null;

  // Fallback migration: if old consultation context had items
  if (!session && context && context.consultation && context.consultation.active) {
    session = {
      active: true,
      stage: 'tailored_quote',
      departmentKey: context.consultation.specialty || 'operating-theatre',
      departmentName: context.consultation.packageName || 'Operating Theatre & Surgical Infrastructure',
      items: (context.consultation.items || []).map(name => ({
        name: typeof name === 'string' ? name : name.name,
        qty: 1,
        category: 'equipment',
        importance: 'essential',
        manufacturer: detectManufacturer(typeof name === 'string' ? name : name.name)
      })),
      pendingPermissionPrompt: true
    };
  }

  // 3. Natural Language Quotation Consent ("Yes, fill in my quotation inquiry", "Yes please", "Fill the quote", "Oui")
  if (detectAffirmativeConsent(q, session)) {
    if (session && Array.isArray(session.items) && session.items.length > 0) {
      session.stage = 'populated_form';
      session.pendingPermissionPrompt = false;

      const multiDeptMessage = (session.facilityDepartments && Object.keys(session.facilityDepartments).length > 0)
        ? buildMultiDepartmentProforma(session.facilityDepartments, session.departmentName, session.items)
        : null;

      const formattedMessage = multiDeptMessage ||
        generateStructuredQuotation(
          DEPARTMENT_BLUEPRINTS[session.departmentKey] || { name: session.departmentName, id: session.departmentKey, items: session.items },
          session.items
        ).formattedMessage;

      const rfqPayload = {
        department: session.departmentName,
        departmentKey: session.departmentKey,
        completeness: session.completeness || { score: 88, status: "Verified Hospital Package" },
        items: session.items,
        formattedMessage: formattedMessage
      };

      const reply = `### ✓ Quotation Inquiry Pre-Filled Successfully!\n\n` +
        `I have populated your **Quotation Inquiry form** with your tailored equipment list for **${session.departmentName}** (**${session.items.length} configured items**).\n\n` +
        `• **What has been populated:** All product names, OEM manufacturers, clinical specifications, and requested quantities.\n` +
        `• **Next Steps:** Review your items in the proforma message below, add your facility details, and click **Send Quotation Request** to receive official proforma pricing, CE/ISO certificates, and delivery lead times to Kigali.\n\n` +
        `*Our Kigali biomedical engineering desk is on standby to assist with installation planning and technical datasheets.*`;

      return {
        reply,
        action: 'fill_form',
        rfqPayload,
        procurementSession: session,
        actions: [
          { label: "Review & Submit Quotation Form", url: `/contact?dept=${encodeURIComponent(session.departmentName)}&rfq=ai` },
          { label: "WhatsApp Biomedical Desk", url: `https://wa.me/250795360359?text=${encodeURIComponent(`Hello IKEDA Africa, I have reviewed the ${session.departmentName} quotation list (${session.items.length} items) and would like to finalize our proforma.`)}` }
        ]
      };
    }
  }

  // 4. Natural Language Decline Consent ("No, I will do it myself", "Not yet")
  if (detectDeclineConsent(q, session)) {
    if (session) {
      session.pendingPermissionPrompt = false;
      return {
        reply: `Understood! Your equipment list for **${session.departmentName}** (${session.items ? session.items.length : 0} items) remains saved in this session.\n\n` +
          `You can ask me to adjust quantities, explain technical specifications, compare alternative models, or populate the inquiry whenever you are ready.`,
        procurementSession: session,
        actions: [
          { label: "Fill Quotation Inquiry Form", url: `/contact?dept=${encodeURIComponent(session.departmentName)}&rfq=ai` },
          { label: "Browse Product Catalog", url: "/products" }
        ]
      };
    }
  }

  // 5. Conversational Item Adjustments in Active Session
  // ("Can you change patient monitors to 3 and add an extra autoclave?", "Make monitors 4", "Remove surgical pendants", "Switch to 1080p")
  if (session && Array.isArray(session.items) && session.items.length > 0) {
    const isAdjustmentQuery =
      /\b(change|make|set|update|increase|decrease|more|less|add|include|put\s*in|remove|delete|take\s*out|drop|exclude|switch|replace|instead)\b/i.test(q) &&
      !/\b(now\s*let'?s\s*(also\s*)?(equip|do|add)\s*(the\s*)?(dental|lab|radiology|maternity|icu|emergency)|what\s*about\s*(our\s*)?(dental|lab|radiology|maternity|icu))\b/i.test(q);

    if (isAdjustmentQuery) {
      const adjustmentResult = parseItemAdjustments(q, session.items, rawProducts);
      if (adjustmentResult.modified) {
        session.items = adjustmentResult.items;
        const deptBlueprint = DEPARTMENT_BLUEPRINTS[session.departmentKey] || { name: session.departmentName, items: session.items, requiredDomains: [] };
        const completeness = assessDepartmentCompleteness(deptBlueprint, session.items);
        session.completeness = completeness;
        session.pendingPermissionPrompt = true;

        const quotation = generateStructuredQuotation(deptBlueprint, session.items);
        const rfqPayload = {
          department: session.departmentName,
          departmentKey: session.departmentKey,
          completeness,
          items: session.items,
          formattedMessage: quotation.formattedMessage
        };

        let reply = `### 📋 Updated Procurement Package: ${session.departmentName}\n\n`;
        reply += `I have applied your requested adjustments to your equipment package:\n\n`;
        adjustmentResult.logs.forEach(log => {
          reply += `${log}\n`;
        });
        reply += `\n`;
        reply += `• **Updated Item Count:** **${session.items.length} items**\n`;
        reply += `• **Clinical Readiness Score:** **${completeness.score}%** — *${completeness.status}*\n\n`;
        reply += `---\n\n`;
        reply += `**Would you like me to automatically populate your Quotation Inquiry form with this updated list?**`;

        return {
          reply,
          rfqPayload,
          procurementSession: session,
          permissionPrompt: {
            text: `I have updated your ${session.departmentName} equipment list (${session.items.length} items). Would you like me to automatically populate your Quotation Inquiry form?`,
            options: [
              { label: "✓ Yes, fill in my quotation inquiry", value: "fill_quote", action: "fill_form" },
              { label: "No, I would like to do it myself", value: "manual_quote", action: "dismiss" }
            ]
          },
          actions: [
            { label: "Fill Quotation Inquiry Form", url: `/contact?dept=${encodeURIComponent(session.departmentName)}&rfq=ai` },
            { label: "WhatsApp Clinical Specialist", url: `https://wa.me/250795360359?text=${encodeURIComponent(`Hello IKEDA Africa, I have updated our ${session.departmentName} quotation list.`)}` }
          ]
        };
      }
    }
  }

  // 6. Multi-Department Facility Expansion ("Now let's also equip the Dental clinic", "What about our Laboratory?")
  if (session && session.departmentKey) {
    const targetDept = detectDepartmentFromQuery(q);
    if (targetDept && targetDept.id !== session.departmentKey) {
      // Archive current department
      if (!session.facilityDepartments) session.facilityDepartments = {};
      session.facilityDepartments[session.departmentName] = {
        name: session.departmentName,
        items: [...session.items]
      };

      const prevName = session.departmentName;
      const prevCount = session.items.length;

      // Set up new department
      session.departmentKey = targetDept.id;
      session.departmentName = targetDept.name;
      session.items = targetDept.items.map(it => ({
        name: it.name,
        manufacturer: it.manufacturer,
        model: it.model,
        category: it.category,
        importance: it.importance,
        qty: it.defaultQty || 1,
        unitPrice: it.unitPrice || "Upon Request (Proforma Quote)",
        specs: it.specs || ''
      }));

      const completeness = assessDepartmentCompleteness(targetDept, session.items);
      session.completeness = completeness;
      session.pendingPermissionPrompt = true;

      const multiMessage = buildMultiDepartmentProforma(session.facilityDepartments, targetDept.name, session.items);
      const rfqPayload = {
        department: targetDept.name,
        departmentKey: targetDept.id,
        completeness,
        items: session.items,
        formattedMessage: multiMessage
      };

      let reply = `### 🏥 Multi-Department Hospital Expansion\n\n`;
      reply += `✓ **Saved Prior Department:** Your **${prevName}** list (${prevCount} items) has been preserved in your facility quotation proforma.\n\n`;
      reply += `### 📋 Clinical Equipment Procurement Plan: ${targetDept.name}\n\n`;
      reply += `${targetDept.overview}\n\n`;

      reply += `#### 📊 Department Completeness Assessment\n`;
      reply += `• **Clinical Readiness Score:** **${completeness.score}%** — *${completeness.status}*\n`;
      reply += `• **Covered Clinical Domains:** ${completeness.coveredDomains.join(', ')}\n\n`;

      if (targetDept.comparisons && targetDept.comparisons.length) {
        const comp = targetDept.comparisons[0];
        reply += `#### 🔍 Intelligent Manufacturer Comparison\n`;
        reply += `**${comp.title}**\n`;
        comp.criteria.forEach(c => {
          reply += `• **${c.aspect}:**\n  - *${comp.modelA}:* ${c.a}\n  - *${comp.modelB}:* ${c.b}\n`;
        });
        reply += `\n`;
      }

      reply += `---\n\n`;
      reply += `**Would you like me to automatically populate your Quotation Inquiry form with this complete multi-department facility package?**`;

      return {
        reply,
        rfqPayload,
        procurementSession: session,
        permissionPrompt: {
          text: `I have prepared both your ${prevName} and ${targetDept.name} equipment lists. Would you like me to automatically populate your Quotation Inquiry form?`,
          options: [
            { label: "✓ Yes, fill in my quotation inquiry", value: "fill_quote", action: "fill_form" },
            { label: "No, I would like to do it myself", value: "manual_quote", action: "dismiss" }
          ]
        },
        actions: [
          { label: "Fill Quotation Inquiry Form", url: `/contact?dept=${encodeURIComponent(targetDept.name)}&rfq=ai` },
          { label: "WhatsApp Clinical Specialist", url: `https://wa.me/250795360359?text=${encodeURIComponent(`Hello IKEDA Africa, I would like a proforma quotation for our multi-department clinic.`)}` }
        ]
      };
    }
  }

  // 7. Contextual Q&A on Active Equipment ("Why 3 monitors?", "Why class B autoclave?", "Warranty", "Delivery")
  if (session && Array.isArray(session.items) && session.items.length > 0) {
    if (/\b(why\s*(did\s*you\s*(choose|recommend|include|pick)|do\s*we\s*need))\b.*\b(monitor|biolight)\b/i.test(q) ||
        /\bwhy\s*(\d+)?\s*monitors?\b/i.test(q)) {
      return {
        reply: `### 🩺 Clinical Monitoring Architecture\n\n` +
          `In modern surgical and hospital planning, continuous patient monitoring is non-negotiable:\n\n` +
          `• **Intraoperative Theatres:** Each active surgical suite requires a dedicated multi-parameter patient monitor equipped with anti-electrosurgical interference filtering (ECG, SpO2, NIBP, temperature) to track anesthetic depth and hemodynamic stability.\n` +
          `• **Post-Anesthesia Care Unit (PACU):** Patients waking from anesthesia require continuous pulse oximetry and hemodynamic tracking in the recovery bay until baseline reflexes return.\n\n` +
          `Would you like to keep this monitoring configuration or adjust the number of monitors?`,
        procurementSession: session,
        actions: [
          { label: "Fill Quotation Inquiry Form", url: `/contact?dept=${encodeURIComponent(session.departmentName)}&rfq=ai` }
        ]
      };
    }

    if (/\b(why|class\s*b)\b.*\b(autoclave|steriliz\w*)\b/i.test(q)) {
      return {
        reply: `### 🔬 Central Sterile Reprocessing (CSSD) Standards\n\n` +
          `Hospital infection control guidelines strictly require **Class-B fractionated pulsed vacuum steam autoclaves** for endoscopic, dental, and laparoscopic instruments:\n\n` +
          `• **Narrow-Lumen Penetration:** Standard gravity autoclaves trap cold air pockets inside hollow laparoscopic sheaths and narrow dental handpiece bearings, preventing saturated steam contact and leading to non-sterile instruments.\n` +
          `• **Pulsed Vacuum Cycles:** A Class-B autoclave draws multiple vacuum pulses before injecting steam, ensuring 100% steam penetration into long hollow lumens and porous surgical packs at 134°C.\n\n` +
          `Would you like me to proceed with populating your quotation inquiry for this sterilization configuration?`,
        procurementSession: session,
        actions: [
          { label: "Fill Quotation Inquiry Form", url: `/contact?dept=${encodeURIComponent(session.departmentName)}&rfq=ai` }
        ]
      };
    }

    if (/\b(warranty|guarantee|after[- ]?sales?|installation|maintenance|training)\b/i.test(q)) {
      return {
        reply: `### 🛡️ IKEDA Warranty, Installation & Engineering Support\n\n` +
          `Every proforma quotation issued by **IKEDA ENDOSCOPY AFRICA** includes comprehensive technical support:\n\n` +
          `• **12–24 Month OEM Warranty:** Full manufacturer warranty on capital systems (Laparoscopy Towers, Dental Chairs, Patient Monitors, Autoclaves).\n` +
          `• **Kigali Engineering Hub:** Local biomedical engineering team based in Kigali for rapid preventive maintenance and on-site spare parts dispatch.\n` +
          `• **On-Site Installation & Commissioning:** Biomedical engineers perform electrical load testing, medical gas calibration, and user training for surgeons and theatre nurses upon delivery.\n\n` +
          `Would you like me to populate your Quotation Inquiry form with your active equipment package?`,
        procurementSession: session,
        actions: [
          { label: "Fill Quotation Inquiry Form", url: `/contact?dept=${encodeURIComponent(session.departmentName)}&rfq=ai` },
          { label: "WhatsApp Engineering Desk", url: "https://wa.me/250795360359?text=Hello%20IKEDA,%20I%20would%20like%20details%20on%20warranty%20and%20installation%20in%20Rwanda." }
        ]
      };
    }
  }

  // 8. General "I want to open a clinic" or "help me equip my clinic"
  const matchedDept = detectDepartmentFromQuery(q);
  const isGeneralClinicInquiry =
    !matchedDept &&
    /\b(open\s*a?\s*clinic|start\s*a?\s*clinic|equip\s*a?\s*clinic|setup\s*a?\s*clinic|turnkey\s*hospital|new\s*facility|build\s*a?\s*hospital)\b/i.test(q);

  if (isGeneralClinicInquiry) {
    const newSession = {
      active: true,
      stage: 'awaiting_department'
    };
    return {
      reply: "Welcome! As your **Medical Equipment Procurement Specialist**, I can design a tailored, department-by-department equipment blueprint for your new clinic.\n\n" +
        "To ensure our recommendations match your exact clinical standards and budget, please clarify:\n\n" +
        "1. 🏥 **Which department(s) are you outfitting first?**\n" +
        "   *(e.g., Dental Operatory, Operating Theatre, Laboratory, Maternity, Emergency, or General Consultation?)*\n" +
        "2. 🩺 **Is this a brand new facility or an upgrade to existing clinical infrastructure?**\n" +
        "3. 👥 **What is your anticipated daily patient volume or room capacity?**\n\n" +
        "You can tell me the department name (for example, *'Operating Theatre with 4K laparoscopy and motorized table for 2 rooms'* or *'Dental clinic with 2 chairs'*), and I will immediately assemble the complete equipment list, manufacturer comparison, completeness assessment, and proforma quotation.",
      procurementSession: newSession,
      actions: [
        { label: "Equip Dental Department", url: "/products?group=Diagnostics+%26+Specialty" },
        { label: "Equip Operating Theatre", url: "/products?group=Operating+Theatre" },
        { label: "Equip Clinical Laboratory", url: "/products?group=General+Hospital+Materials" },
        { label: "Equip Maternity Ward", url: "/products?group=Maternal+%26+Infant" }
      ]
    };
  }

  // 9. Specific Department Matched or Diagnostic Follow-up
  if (matchedDept || (session && session.stage === 'awaiting_department')) {
    const dept = matchedDept || DEPARTMENT_BLUEPRINTS['operating-theatre'];
    const specs = parseDiagnosticSpecs(q);

    // Customize items based on client's diagnostic specifications
    let tailoredItems = dept.items.map(it => ({
      name: it.name,
      manufacturer: it.manufacturer,
      model: it.model,
      category: it.category,
      importance: it.importance,
      qty: it.defaultQty || 1,
      unitPrice: it.unitPrice || "Upon Request (Proforma Quote)",
      specs: it.specs || ''
    }));

    // Operating Theatre Customizations
    if (dept.id === 'operating-theatre') {
      if (specs.prefers1080p && !specs.prefers4K) {
        const towerIdx = tailoredItems.findIndex(i => i.name.includes('Laparoscopy Tower'));
        if (towerIdx > -1) {
          tailoredItems[towerIdx] = {
            name: 'Laparoscopy Tower 1080p with 1/2.8" CMOS',
            manufacturer: 'IKEDA Medical',
            model: 'Full HD Workhorse',
            category: 'equipment',
            importance: 'essential',
            qty: 1,
            unitPrice: 'Upon Request (Proforma Quote)',
            specs: '1920×1080 Full HD resolution, 1/2.8" CMOS sensor, integrated LED light source, medical display.'
          };
        }
      }
      if (specs.prefersHydraulic && !specs.prefersMotorized) {
        const tableIdx = tailoredItems.findIndex(i => i.name.includes('operating table') || i.name.includes('Operating table'));
        if (tableIdx > -1) {
          tailoredItems[tableIdx] = {
            name: 'Hydraulic operating table (hydraulic for height adjustment)',
            manufacturer: 'Yongfa',
            model: 'Mechanical Hydraulic Workhorse',
            category: 'equipment',
            importance: 'essential',
            qty: specs.roomCount || 1,
            unitPrice: 'Upon Request (Proforma Quote)',
            specs: 'Heavy-duty hydraulic foot-pump elevation, gas spring backrest articulation, stainless steel base, 100% power-independent.'
          };
        }
      }

      // Scale room-bound equipment for multi-suite theatre
      if (specs.roomCount > 1) {
        tailoredItems.forEach(it => {
          const name = it.name.toLowerCase();
          if (name.includes('operating table')) it.qty = specs.roomCount;
          else if (name.includes('surgical light')) it.qty = specs.roomCount;
          else if (name.includes('surgical pendant')) it.qty = specs.roomCount;
          else if (name.includes('patient monitor')) it.qty = specs.roomCount + 1; // rooms + 1 PACU
          else if (name.includes('anesthesia machine')) it.qty = specs.roomCount;
        });
      }
    }

    // Dental Customizations
    if (dept.id === 'dental') {
      if (specs.prefersU100 && !specs.prefersV6000) {
        const chairIdx = tailoredItems.findIndex(i => i.name.includes('Dental chair'));
        if (chairIdx > -1) {
          tailoredItems[chairIdx] = {
            name: 'Dental chair Siger U100',
            manufacturer: 'Siger',
            model: 'U100 Standard Workhorse',
            category: 'equipment',
            importance: 'essential',
            qty: specs.roomCount || 1,
            unitPrice: 'Upon Request (Proforma Quote)',
            specs: 'Tactile micro-switch membrane panel, manual detachable ceramic spittoon with timed cup filler, articulated backrest.'
          };
        }
      }
      if (specs.roomCount > 1) {
        const chair = tailoredItems.find(i => i.name.includes('Dental chair'));
        if (chair) chair.qty = specs.roomCount;
      }
    }

    const completeness = assessDepartmentCompleteness(dept, tailoredItems);
    const quotation = generateStructuredQuotation(dept, tailoredItems);

    session = {
      active: true,
      stage: 'tailored_quote',
      departmentKey: dept.id,
      departmentName: dept.name,
      facilityType: 'New Clinic',
      roomCount: specs.roomCount || 1,
      tier: specs.prefers4K ? '4K' : (specs.prefers1080p ? '1080p' : 'Standard'),
      tablePreference: specs.prefersHydraulic ? 'hydraulic' : 'motorized',
      items: tailoredItems,
      facilityDepartments: (session && session.facilityDepartments) || {},
      completeness,
      pendingPermissionPrompt: true
    };

    let reply = `### 🏥 Clinical Equipment Procurement Plan: ${dept.name}\n\n`;
    if (specs.roomCount > 1 || specs.prefers4K || specs.prefersMotorized || specs.prefersHydraulic) {
      const highlights = [];
      if (specs.roomCount > 1) highlights.push(`${specs.roomCount} surgical/operatory rooms`);
      if (specs.prefers4K) highlights.push('4K Ultra HD visualization');
      if (specs.prefers1080p) highlights.push('1080p Full HD visualization');
      if (specs.prefersMotorized) highlights.push('electro-hydraulic motorized patient positioning');
      if (specs.prefersHydraulic) highlights.push('heavy-duty hydraulic operating tables');
      reply += `> **Configured for your requirements:** Tailored for **${highlights.join(', ')}** with scaled room equipment.\n\n`;
    }
    reply += `${dept.overview}\n\n`;

    // 1. Department Completeness Assessment
    reply += `#### 📊 Department Completeness Assessment\n`;
    reply += `• **Clinical Readiness Score:** **${completeness.score}%** — *${completeness.status}*\n`;
    reply += `• **Covered Clinical Domains:** ${completeness.coveredDomains.join(', ')}\n`;
    if (completeness.gaps && completeness.gaps.length) {
      reply += `• **Essential Gaps & Safety Considerations:**\n`;
      completeness.gaps.forEach(g => {
        reply += `  - ⚠️ **${g.item}** (${g.domain}): ${g.clinicalNecessity}\n`;
      });
    }
    reply += `\n`;

    // 2. Structured Equipment Categorization
    reply += `#### 📋 Organized Equipment & Consumables Breakdown\n`;
    reply += `• **Capital Medical Equipment:** ${quotation.categories.equipment.length} items (Essential core systems)\n`;
    reply += `• **Instruments & Surgical Sets:** ${quotation.categories.instruments.length} items\n`;
    reply += `• **Accessories & Infrastructure:** ${quotation.categories.accessories.length} items\n`;
    reply += `• **Consumables & Reprocessing:** ${quotation.categories.consumables.length} items\n\n`;

    // 3. Manufacturer & Model Comparison Highlights
    if (dept.comparisons && dept.comparisons.length) {
      const comp = dept.comparisons[0];
      reply += `#### 🔍 Intelligent Manufacturer Comparison\n`;
      reply += `**${comp.title}**\n`;
      comp.criteria.forEach(c => {
        reply += `• **${c.aspect}:**\n  - *${comp.modelA}:* ${c.a}\n  - *${comp.modelB}:* ${c.b}\n`;
      });
      reply += `\n`;
    }

    // 4. Quotation Notice
    reply += `#### 💰 Quotation & Pricing Architecture\n`;
    reply += `All catalog items are sourced directly from verified ISO13485 / CE certified OEM manufacturers with formal proforma quotations issued within 12–24 business hours. Pricing depends on optional tools, power configuration, and shipping destination to Kigali.\n\n`;

    // 5. Explicit Permission Prompt
    reply += `---\n\n`;
    reply += `**Would you like me to automatically populate your Quotation Inquiry form with these products, quantities, and available details?**`;

    const rfqPayload = {
      department: dept.name,
      departmentKey: dept.id,
      completeness,
      items: tailoredItems,
      formattedMessage: quotation.formattedMessage
    };

    return {
      reply,
      rfqPayload,
      procurementSession: session,
      permissionPrompt: {
        text: `I have prepared a recommended equipment and consumables list for your ${dept.name}. Would you like me to automatically populate your Quotation Inquiry form with these products, quantities, and available details?`,
        options: [
          { label: "✓ Yes, fill in my quotation inquiry", value: "fill_quote", action: "fill_form" },
          { label: "No, I would like to do it myself", value: "manual_quote", action: "dismiss" }
        ]
      },
      actions: [
        {
          label: "Fill Quotation Inquiry Form",
          url: `/contact?dept=${encodeURIComponent(dept.name)}&rfq=ai`
        },
        {
          label: "WhatsApp Clinical Specialist",
          url: `https://wa.me/250795360359?text=${encodeURIComponent(`Hello IKEDA Africa, I would like to request an official proforma quotation for the ${dept.name} equipment package.`)}`
        },
        {
          label: `Browse ${dept.name.split('&')[0].trim()} Catalog`,
          url: `/products?category=${encodeURIComponent(dept.categoryKey)}`
        }
      ]
    };
  }

  return null;
}

module.exports = {
  KNOWN_MANUFACTURERS,
  DEPARTMENT_BLUEPRINTS,
  ALL_COMPARISONS,
  detectManufacturer,
  detectDepartmentFromQuery,
  assessDepartmentCompleteness,
  generateStructuredQuotation,
  resolveComparisonQuery,
  handleProcurementQuery
};

