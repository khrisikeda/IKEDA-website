// Short, neutral explanations of the equipment and techniques on the site,
// in English and French. Educational only — never patient-specific advice.

const GLOSSARY = [
  {
    match: /\b(laparoscop\w*|keyhole surgery|coelioscop\w*)\b/,
    search: 'laparoscopy tower',
    en: '**Laparoscopy** (keyhole surgery) is a minimally invasive technique: the surgeon operates in the abdomen or pelvis through small incisions, using a camera (laparoscope) connected to a video tower and long, thin instruments. A typical setup includes a camera system, light source, insufflator, monitor, telescopes and instruments.',
    fr: "La **laparoscopie** (cœlioscopie) est une technique chirurgicale mini-invasive : le chirurgien opère dans l'abdomen ou le pelvis par de petites incisions, à l'aide d'une caméra (laparoscope) reliée à une colonne vidéo et d'instruments longs et fins. Une installation type comprend un système de caméra, une source de lumière, un insufflateur, un moniteur, des optiques et des instruments."
  },
  {
    match: /\b(endoscop\w*)\b/,
    search: 'endoscope',
    en: 'An **endoscope** is an instrument with a light and camera used to look inside the body without large incisions. Rigid endoscopes are used in laparoscopy, urology, ENT and arthroscopy; flexible endoscopes are used for the digestive tract and airways.',
    fr: "Un **endoscope** est un instrument muni d'une lumière et d'une caméra qui permet de voir à l'intérieur du corps sans grande incision. Les endoscopes rigides servent en laparoscopie, urologie, ORL et arthroscopie ; les endoscopes souples servent pour le tube digestif et les voies respiratoires."
  },
  {
    match: /\b(hysteroscop\w*)\b/,
    search: 'hysteroscope',
    en: '**Hysteroscopy** uses a thin telescope (hysteroscope) to view the inside of the uterus, for diagnostic or operative gynecology.',
    fr: "L'**hystéroscopie** utilise une fine optique (hystéroscope) pour visualiser l'intérieur de l'utérus, en gynécologie diagnostique ou opératoire."
  },
  {
    match: /\b(arthroscop\w*)\b/,
    search: 'arthroscopy',
    en: '**Arthroscopy** uses a small camera inserted into a joint (knee, shoulder, hip…) so orthopedic surgeons can examine and repair it through small incisions.',
    fr: "L'**arthroscopie** utilise une petite caméra introduite dans une articulation (genou, épaule, hanche…) pour l'examiner et la réparer par de petites incisions."
  },
  {
    match: /\b(cystoscop\w*|ureteroscop\w*|endourolog\w*|nephroscop\w*|pcnl)\b/,
    search: 'ureteroscope',
    en: '**Endourology** covers minimally invasive urinary-tract procedures using cystoscopes (bladder), ureteroscopes (ureter) and nephroscopes (kidney), often combined with lasers or lithotripsy for stones.',
    fr: "L'**endo-urologie** regroupe les interventions mini-invasives des voies urinaires avec des cystoscopes (vessie), urétéroscopes (uretère) et néphroscopes (rein), souvent associés au laser ou à la lithotritie pour les calculs."
  },
  {
    match: /\b(vats|thoracoscop\w*)\b/,
    search: 'thoracoscope',
    en: '**VATS** (Video-Assisted Thoracoscopic Surgery) is minimally invasive chest surgery performed through small incisions with a thoracoscope and dedicated instruments, instead of a large open incision.',
    fr: "La **VATS** (chirurgie thoracique vidéo-assistée) est une chirurgie mini-invasive du thorax réalisée par de petites incisions avec un thoracoscope et des instruments dédiés, au lieu d'une large ouverture."
  },
  {
    match: /\b(icg|fluorescence)\b/,
    search: '4k icg fluorescence',
    en: '**ICG fluorescence** imaging uses a special camera mode to show a fluorescent dye (indocyanine green) during surgery, helping surgical teams visualise blood flow and structures in real time.',
    fr: "L'imagerie par **fluorescence ICG** utilise un mode de caméra spécial pour visualiser un colorant fluorescent (vert d'indocyanine) pendant l'intervention, afin de mieux voir la vascularisation et les structures en temps réel."
  },
  {
    match: /\b(incubator\w*|couveuse\w*)\b/,
    search: 'incubator',
    en: 'An **infant incubator** is a closed, temperature- and humidity-controlled unit that keeps premature or fragile newborns warm and protected.',
    fr: 'Une **couveuse** (incubateur néonatal) est une enceinte fermée, à température et humidité contrôlées, qui garde au chaud et protège les nouveau-nés prématurés ou fragiles.'
  },
  {
    match: /\b(radiant warmer\w*|infant warmer\w*)\b/,
    search: 'radiant warmer',
    en: 'A **radiant warmer** is an open bed with an overhead heater, used in delivery rooms and neonatal units to warm newborns while keeping full access for care.',
    fr: "Une **table chauffante** (réchauffeur radiant) est un lit ouvert avec un chauffage au-dessus, utilisé en salle d'accouchement et en néonatologie pour réchauffer le nouveau-né tout en gardant un accès complet."
  },
  {
    match: /\b(ventilat\w*|respirat\w*)\b/,
    search: 'ventilator',
    en: 'A **ventilator** is a machine that helps or replaces a patient\'s breathing, used in ICU, emergency care and during anesthesia.',
    fr: "Un **respirateur** (ventilateur) est un appareil qui assiste ou remplace la respiration du patient, utilisé en réanimation, aux urgences et pendant l'anesthésie."
  },
  {
    match: /\b(patient monitor\w*|vital signs? monitor\w*|multi.?parameter)\b/,
    search: 'patient monitor',
    en: 'A **patient monitor** continuously displays vital signs such as ECG, SpO₂, blood pressure and temperature, with alarms. It is used in theatre, ICU, emergency and recovery.',
    fr: "Un **moniteur patient** affiche en continu les signes vitaux (ECG, SpO₂, tension artérielle, température…) avec des alarmes. Il est utilisé au bloc, en réanimation, aux urgences et en salle de réveil."
  },
  {
    match: /\b(defibrillat\w*)\b/,
    search: 'defibrillator',
    en: 'A **defibrillator** delivers a controlled electric shock to restore a normal heart rhythm in cardiac emergencies; many models also monitor ECG.',
    fr: "Un **défibrillateur** délivre un choc électrique contrôlé pour rétablir un rythme cardiaque normal lors d'urgences cardiaques ; beaucoup de modèles surveillent aussi l'ECG."
  },
  {
    match: /\b(autoclave\w*|steriliz\w*|sterilis\w*)\b/,
    search: 'autoclave steam sterilizer',
    en: 'An **autoclave** (steam sterilizer) uses pressurised steam at high temperature to sterilise surgical instruments and materials. It is the core of a sterilisation department (CSSD).',
    fr: 'Un **autoclave** (stérilisateur à vapeur) utilise de la vapeur sous pression à haute température pour stériliser les instruments et le matériel chirurgical. Il est au cœur du service de stérilisation.'
  },
  {
    match: /\b(c[- ]?arm|fluoroscop\w*)\b/,
    search: 'c arm x ray',
    en: 'A **C-arm** is a mobile X-ray system shaped like a "C" that gives real-time images during surgery, widely used in orthopedics, trauma and vascular procedures.',
    fr: "Un **arceau chirurgical (C-arm)** est un appareil de radiologie mobile en forme de « C » qui fournit des images en temps réel pendant l'intervention, très utilisé en orthopédie, traumatologie et chirurgie vasculaire."
  },
  {
    match: /\b(ultrasound|sonograph\w*|echograph\w*)\b/,
    search: 'ultrasound',
    en: 'An **ultrasound machine** uses sound waves to create real-time images of organs, pregnancies and blood flow — without radiation.',
    fr: "Un **échographe** utilise des ondes sonores pour produire des images en temps réel des organes, de la grossesse et des flux sanguins — sans rayonnement."
  },
  {
    match: /\b(electrosurg\w*|diathermy|cautery|esu)\b/,
    search: 'electrosurgical',
    en: 'An **electrosurgical unit** (diathermy) uses high-frequency electrical current to cut tissue and control bleeding during surgery.',
    fr: "Un **bistouri électrique** (électrochirurgie) utilise un courant électrique haute fréquence pour couper les tissus et contrôler le saignement pendant l'intervention."
  },
  {
    match: /\b(ctg|cardiotocograph\w*|fetal monitor\w*)\b/,
    search: 'ctg fetal monitor',
    en: 'A **CTG (cardiotocograph)** records the baby\'s heart rate and the mother\'s contractions during pregnancy and labour.',
    fr: "Un **cardiotocographe (CTG)** enregistre le rythme cardiaque du bébé et les contractions de la mère pendant la grossesse et l'accouchement."
  },
  {
    match: /\b(slit lamp\w*)\b/,
    search: 'slit lamp',
    en: 'A **slit lamp** is a microscope with a bright, adjustable light used by eye-care professionals to examine the structures of the eye.',
    fr: "Une **lampe à fente** est un microscope muni d'une lumière réglable, utilisé en ophtalmologie pour examiner les structures de l'œil."
  },
  {
    match: /\b(cssd)\b/,
    search: 'autoclave',
    en: 'The **CSSD** (Central Sterile Services Department) is the hospital unit that cleans, disinfects, packs and sterilises reusable surgical instruments.',
    fr: 'Le **service central de stérilisation** (CSSD) est le service hospitalier qui nettoie, désinfecte, conditionne et stérilise les instruments chirurgicaux réutilisables.'
  }
];

const { tokenize } = require('./text');

const DEFINITION_Q = /\b(what is|what are|what's|whats|define|definition|meaning of|explain|how does .* work|what does .* do)\b/;

function lookup(en) {
  if (!DEFINITION_Q.test(en)) return null;
  // Long, specific questions are better answered from articles/pages
  if (tokenize(en).length > 4) return null;
  // Prefer the most specific (longest) match in the question
  let best = null;
  for (const entry of GLOSSARY) {
    const m = en.match(entry.match);
    if (m && (!best || m[0].length > best.len)) best = { entry, len: m[0].length };
  }
  return best ? best.entry : null;
}

module.exports = { lookup };
