import { Router } from 'express';
import multer from 'multer';
import { extractRawText, convertToHtml } from 'mammoth';
import { Template } from '../models/Template.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export const generateRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

const CONTENT_PROMPT = `You are a resume parser. Given raw resume text, extract it into a structured JSON object.
Return ONLY valid JSON — no markdown, no backticks, no explanation.

The JSON must match this exact schema:
{
  "contact": {
    "name": "string",
    "phone": "string",
    "email": "string",
    "linkedin": "string",
    "github": "string (optional)",
    "portfolio": "string (optional)"
  },
  "education": [
    {
      "id": "edu-1",
      "school": "string",
      "location": "string",
      "degree": "string",
      "gpa": "string (optional)",
      "dates": "string",
      "coursework": "string (optional)"
    }
  ],
  "skills": [
    {
      "id": "sk-1",
      "category": "string (e.g. Programming, Frameworks, Tools)",
      "skills": "string (comma-separated list)"
    }
  ],
  "summary": "string (professional summary if present, empty string if not)",
  "experience": [
    {
      "id": "exp-1",
      "company": "string",
      "location": "string",
      "role": "string",
      "dates": "string",
      "bullets": [
        {
          "id": "b-1",
          "text": "string (wrap key technical terms in **bold** markdown)"
        }
      ]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "string",
      "techStack": "string (optional, comma-separated)",
      "date": "string (optional)",
      "bullets": [
        {
          "id": "pb-1",
          "text": "string (wrap key technical terms in **bold** markdown)"
        }
      ]
    }
  ],
  "customSections": [
    {
      "id": "cs-1",
      "title": "string (section heading, e.g. Recognitions, Awards, Certifications, Publications, Volunteer)",
      "items": [
        {
          "id": "ci-1",
          "text": "string (each item as a single text entry)"
        }
      ]
    }
  ]
}

Rules:
- IDs must be sequential: edu-1, edu-2, ...; exp-1, exp-2, ...; b-1, b-2, ...; proj-1, proj-2, ...; pb-1, pb-2, ...
- Bullet IDs (b-*) should be globally sequential across all experience entries
- Project bullet IDs (pb-*) should be globally sequential across all project entries
- Wrap important technical keywords, tools, and frameworks in **bold** in bullet text
- Keep bullet text exactly as written in the resume — do not rephrase or embellish
- If a section is missing from the resume, use an empty array or empty string
- Extract ALL entries — do not skip any experience, education, or project items
- Any resume sections that don't fit into the standard categories (education, skills, summary, experience, projects) should be extracted as customSections. Examples: Recognitions, Awards, Certifications, Publications, Volunteer Work, Leadership, Interests, etc. Each custom section gets a unique id (cs-1, cs-2, ...) and items get unique ids (ci-1, ci-2, ...) globally sequential.
- Return ONLY the JSON object, nothing else
- IMPORTANT: Include a "sectionOrder" array listing ALL sections in the EXACT order they appear in the original resume. Use these keys for standard sections: "header", "education", "summary", "skills", "experience", "projects". For custom sections, use "custom-cs-1", "custom-cs-2", etc. matching the customSections ids. The header (name/contact) is always first. Look at the order the sections appear in the resume text and replicate it exactly.`;

const STYLE_PROMPT = `You are a resume design analyzer. You will receive resume text AND detailed font metadata extracted from the PDF (font names, sizes, bold/italic flags, positions, and text samples for each font).

Use this metadata to generate a precise JSON object with three keys: "format", "layout", and "css" that EXACTLY replicate the original resume's visual style AND structural layout.

Return ONLY valid JSON — no markdown, no backticks, no explanation.

{
  "format": {
    "fontFamily": "string — CSS font-family stack based on the ACTUAL fonts detected in the metadata. Map detected fonts: CMR/Computer Modern/cmr → 'Computer Modern Serif', Cambria, 'Times New Roman', serif. TimesNewRoman → 'Times New Roman', serif. Arial/Helvetica → Arial, Helvetica, sans-serif. Calibri → Calibri, Arial, sans-serif. Garamond → Garamond, Georgia, serif",
    "fontSize": "number — body text size in pt (use the most common font size from the metadata)",
    "lineHeight": "number — unitless multiplier (estimate from vertical spacing between text lines in metadata)",
    "marginTop": "number — top margin in inches (calculate from the topmost text Y position)",
    "marginBottom": "number — bottom margin in inches",
    "marginLeft": "number — left margin in inches (calculate from the leftmost text X position)",
    "marginRight": "number — right margin in inches",
    "nameFontSize": "number — the largest font size detected (the person's name)",
    "contactFontSize": "number — font size used for contact info line(s)",
    "headingFontSize": "number — font size used for section headings like EDUCATION, EXPERIENCE",
    "sectionSpacing": "number — gap above section headings in pt (estimate from Y gaps between sections)",
    "bulletSpacing": "number — gap between bullet items in pt (0-3pt)"
  },
  "layout": {
    "header": {
      "nameAlignment": "center | left | right",
      "contactLayout": "inline | stacked | two-column",
      "contactSeparator": "' | ' or ' · ' or ' — ' or ', ' or ' / '",
      "contactFields": ["phone", "email", "linkedin", "github", "portfolio", "googleScholar"]
    },
    "education": {
      "rows": "array of arrays of RowSegments. Each RowSegment is {type:'field'|'spacer', value:'fieldName', className:'css-class'}. A 'spacer' segment ({type:'spacer',value:''}) is a flexible gap that pushes adjacent fields apart — use spacers to position fields anywhere in a row. Fields: school, location, degree, gpa, dates, coursework. Example: [[{type:'field',value:'school',className:'edu-school'},{type:'spacer',value:''},{type:'field',value:'location',className:'edu-location'}]] puts school left, location right. Three fields with spacers between them distributes them evenly.",
      "showEntryBulletMarker": "boolean",
      "boldField": "string|null — 'school' or 'degree' or null",
      "italicField": "string|null — 'degree' or 'dates' or null",
      "showCoursework": "boolean"
    },
    "experience": {
      "rows": "same RowSegment format with spacers. Fields: company, location, role, dates. Default: [[{type:'field',value:'company',className:'entry-company'},{type:'spacer',value:''},{type:'field',value:'location',className:'entry-location'}],[{type:'field',value:'role',className:'entry-role'},{type:'spacer',value:''},{type:'field',value:'dates',className:'entry-dates'}]]",
      "showEntryBulletMarker": "boolean",
      "boldField": "'company' or 'role'",
      "italicField": "'role' or 'dates' or null"
    },
    "skills": {
      "showCategories": "boolean — true if skills grouped by category labels",
      "showBulletMarker": "boolean",
      "displayMode": "list | grid",
      "skillSeparator": "', ' or ' | ' or ' · '"
    },
    "projects": {
      "rows": "same RowSegment format with spacers. Fields: title, techStack, date.",
      "showEntryBulletMarker": "boolean",
      "techStackPosition": "inline | below | none",
      "boldField": "'title' or 'techStack'",
      "italicField": "string|null"
    }
  },
  "css": "string — complete CSS overrides for all resume classes"
}

LAYOUT DETECTION RULES:
1. Analyze the ROW STRUCTURE: if company and location are on the SAME line, they go in one row. If role and dates are on a SECOND line, they go in a second row.
2. If NO bullet markers before entries, set showEntryBulletMarker to false.
3. If name is LEFT-aligned, set nameAlignment to 'left'.
4. If contact items are on SEPARATE LINES, set contactLayout to 'stacked'.
5. If skills have NO category labels, set showCategories to false.
6. Detect which field is BOLD from font metadata and set boldField.
7. Detect which field is ITALIC and set italicField.
8. IMPORTANT: Do NOT set font-weight/font-style directly on .entry-company, .entry-role, .edu-school, .edu-degree in CSS — the layout boldField/italicField adds .field-bold/.field-italic classes dynamically.
9. Use SPACER segments ({type:'spacer',value:''}) to position fields within rows. If a field appears on the RIGHT side of a line, put a spacer BEFORE it. If a field is CENTERED between two others, put spacers on both sides of it. If fields are grouped together on the left with one field on the right, put a single spacer between the group and the right field.

The CSS must style these classes to EXACTLY match the original document:

.resume-page { /* font, color */ }
.resume-name { /* name: size, weight, alignment, text-transform */ }
.resume-contact { /* contact line: alignment, separator */ }
.resume-contact span + span::before { /* separator character: ' | ' or ' · ' or ' — ' */ }
.section-heading { /* CRITICAL: section titles — detect: is it small-caps (font-variant: small-caps)? ALL CAPS (text-transform: uppercase)? Bold? What border/line style? letter-spacing? */ }
.edu-entry, .edu-bullet, .edu-content { /* education layout */ }
.edu-row-1 { /* first row: school, gpa, location */ }
.edu-row-2 { /* second row: degree, dates. For SINGLE-ROW education layouts where everything is on one line, set .edu-content { display: flex; flex-wrap: wrap; align-items: baseline; } and .edu-row-1, .edu-row-2 { display: contents; } so all items flow into one line. For TWO-ROW layouts, keep both rows as display:flex. Use spacer segments in layout.rows to control field positioning — do NOT use justify-content:space-between */ }
.edu-school { /* school name weight */ }
.edu-degree { /* italic or normal */ }
.edu-gpa { /* GPA styling */ }
.edu-location { /* location styling — use margin-left:auto to push right */ }
.edu-dates { /* date styling */ }
.skill-row { /* skill line layout */ }
.skill-row::before { /* bullet: '\\2022' (•), '\\25E6' (◦), '\\25AA' (▪), '\\2013' (–), or none */ }
.skill-category { /* category label weight */ }
.entry { /* experience entry */ }
.entry-bullet { /* entry-level bullet character and size */ }
.entry-company { /* company name weight */ }
.entry-role { /* role italic/normal */ }
.entry-dates { /* dates italic/normal */ }
.bullet-list li::before { /* sub-bullet character for experience: '\\25E6' (◦), '\\2022' (•), '\\2013' (–) */ }
.project-entry, .project-bullet, .project-content { /* project layout */ }
.project-title { /* project name weight */ }
.project-bullets li::before { /* project sub-bullet character */ }
.resume-summary { /* summary styling */ }

CRITICAL DETECTION RULES using the font metadata:
1. If font names contain "CMR", "cmr", "Computer Modern", "lmr" → it's LaTeX. Use Computer Modern, small-caps headings, border-bottom on headings, bullet hierarchy (• for entries, ◦ for sub-items)
2. If you see fonts like "CMSSBX" or "cmb" → bold variant of Computer Modern
3. If you see "CMTI" or "cmti" → italic variant of Computer Modern
4. If you see "CMCSC" or "cmcsc" → small-caps variant (used for section headings in LaTeX resumes)
5. Look at the actual font sizes in the metadata to set exact pt values
6. Look at text positions (x,y) to calculate margins and spacing
7. Detect bullet characters from the text content (•, ◦, –, ▪)
8. If a heading text appears with mixed case like "Education" but uses a small-caps font, set font-variant: small-caps and text-transform: none

Return ONLY the JSON object.`;

// Extract text + font metadata from PDF using pdfjs-dist
async function extractPdfWithMetadata(buffer) {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const fullText = [];
  const fontMap = new Map(); // loadedName -> { realName, sizes, samples, positions, count }
  const textItems = []; // individual text items with font and position info

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;
    const textContent = await page.getTextContent();

    // Force font loading by getting the operator list first
    await page.getOperatorList();

    // Resolve actual embedded font names from the page objects
    const fontNameLookup = new Map();
    const fontNames = new Set();
    for (const item of textContent.items) {
      if (item.fontName) fontNames.add(item.fontName);
    }
    for (const fn of fontNames) {
      try {
        const font = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 2000);
          page.commonObjs.get(fn, (obj) => { clearTimeout(timeout); resolve(obj); });
        });
        if (font?.name) fontNameLookup.set(fn, font.name.replace(/^[A-Z]{6}\+/, '')); // strip subset prefix
      } catch { /* ignore timeout */ }
    }

    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;

      const loadedName = item.fontName || 'unknown';
      const realName = fontNameLookup.get(loadedName) || loadedName;
      const fontSize = Math.round(item.height * 10) / 10;
      const x = Math.round(item.transform[4] * 100) / 100;
      const y = Math.round((pageHeight - item.transform[5]) * 100) / 100;

      const key = realName; // group by real font name
      if (!fontMap.has(key)) {
        fontMap.set(key, { realName, sizes: new Set(), samples: [], positions: [], count: 0 });
      }
      const entry = fontMap.get(key);
      entry.sizes.add(fontSize);
      entry.count++;
      if (entry.samples.length < 5) {
        entry.samples.push(item.str.substring(0, 80));
      }
      entry.positions.push({ x, y, size: fontSize });

      textItems.push({ text: item.str, fontName: realName, bold: /BX|Bold|bold|CMBX/i.test(realName), italic: /TI|Italic|italic|CMTI|Oblique/i.test(realName), x, y, size: fontSize });
      fullText.push(item.str);
    }
  }

  // Build font metadata summary with interpretation hints
  const fontSummary = [];
  for (const [, info] of fontMap) {
    const sizes = [...info.sizes].sort((a, b) => a - b);
    const name = info.realName;

    // Detect font properties from the name
    const isBold = /BX|Bold|bold|CMBX/i.test(name);
    const isItalic = /TI|Italic|italic|CMTI|Oblique/i.test(name);
    const isSmallCaps = /CSC|SmallCaps|smallcaps|CMCSC/i.test(name);
    const isSymbol = /SY|Symbol|CMSY|SFRM/i.test(name);
    const isComputerModern = /^CM|Computer\s*Modern|^LM/i.test(name);
    const isSerif = isComputerModern || /Times|Garamond|Georgia|Cambria|Palatino|serif/i.test(name);
    const isSansSerif = /Arial|Helvetica|Calibri|sans|Verdana/i.test(name);

    let role = 'body';
    if (isSymbol) role = 'symbol/bullet';
    else if (isSmallCaps) role = 'small-caps (likely section headings)';
    else if (isBold && isItalic) role = 'bold-italic';
    else if (isBold) role = 'bold (likely headings, company names, or categories)';
    else if (isItalic) role = 'italic (likely dates, degrees, or roles)';

    fontSummary.push({
      fontName: name,
      sizes,
      role,
      bold: isBold,
      italic: isItalic,
      smallCaps: isSmallCaps,
      isComputerModern,
      isSerif,
      isSansSerif,
      sampleText: info.samples,
      occurrences: info.count,
    });
  }

  // Calculate approximate margins from positions
  let minX = Infinity, maxX = 0, minY = Infinity;
  for (const [, info] of fontMap) {
    for (const pos of info.positions) {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
    }
  }

  // Detect if it's a LaTeX document
  const isLaTeX = fontSummary.some(f => f.isComputerModern);

  const margins = {
    leftPx: Math.round(minX),
    topPx: Math.round(minY),
    leftInches: Math.round(minX / 72 * 100) / 100,
    topInches: Math.round(minY / 72 * 100) / 100,
  };

  return {
    text: fullText.join(' '),
    fontMetadata: fontSummary,
    textItems,
    margins,
    isLaTeX,
  };
}

// Detect section order from text
function detectSectionOrder(text) {
  const sections = [
    { key: 'education', patterns: [/\beducation\b/i, /\bacademic\b/i] },
    { key: 'summary', patterns: [/\bsummary\b/i, /\bobjective\b/i, /\bprofile\b/i, /\babout\b/i] },
    { key: 'skills', patterns: [/\bskills?\b/i, /\btechnical skills?\b/i, /\bcompetencies\b/i] },
    { key: 'experience', patterns: [/\bexperience\b/i, /\bwork history\b/i, /\bemployment\b/i] },
    { key: 'projects', patterns: [/\bprojects?\b/i] },
  ];

  const found = [];
  for (const sec of sections) {
    for (const pat of sec.patterns) {
      const match = text.search(pat);
      if (match !== -1) {
        found.push({ key: sec.key, pos: match });
        break;
      }
    }
  }

  found.sort((a, b) => a.pos - b.pos);
  const order = ['header', ...found.map(f => f.key)];

  for (const sec of sections) {
    if (!order.includes(sec.key)) order.push(sec.key);
  }
  return order;
}

// Detect layout from DOCX HTML structure
function detectLayoutFromHtml(html, resumeData) {
  if (!html) return null;
  console.log('  [HTML detect] Running HTML layout detection, html length:', html.length);
  console.log('  [HTML detect] HTML sample:', html.substring(0, 3000));

  const layout = {
    header: {
      nameAlignment: 'center',
      contactLayout: 'inline',
      contactSeparator: ' | ',
      contactFields: ['phone', 'email', 'linkedin', 'github', 'portfolio', 'googleScholar'],
    },
    education: {
      rows: [],
      showEntryBulletMarker: false,
      boldField: null,
      italicField: null,
      showCoursework: true,
    },
    experience: {
      rows: [],
      showEntryBulletMarker: false,
      boldField: null,
      italicField: null,
    },
    skills: {
      showCategories: true,
      showBulletMarker: true,
      displayMode: 'list',
      skillSeparator: ', ',
    },
    projects: {
      rows: [],
      showEntryBulletMarker: false,
      boldField: null,
      italicField: null,
      techStackPosition: 'inline',
    },
  };

  // Helper: check if a field's text appears inside <strong> or <em> tags
  // Extracts all text within <strong>...</strong> blocks and checks if the field value appears there
  const extractTagText = (tag) => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const texts = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      texts.push(m[1].replace(/<[^>]+>/g, '')); // strip nested tags
    }
    return texts.join(' ');
  };
  const boldText = extractTagText('strong') + ' ' + extractTagText('b');
  const italicText = extractTagText('em') + ' ' + extractTagText('i');

  const isBoldInHtml = (text) => {
    if (!text) return false;
    return boldText.toLowerCase().includes(text.substring(0, 20).toLowerCase());
  };
  const isItalicInHtml = (text) => {
    if (!text) return false;
    return italicText.toLowerCase().includes(text.substring(0, 20).toLowerCase());
  };
  console.log('  [HTML detect] bold text:', boldText.substring(0, 200));
  console.log('  [HTML detect] italic text:', italicText.substring(0, 200));

  // Helper: strip HTML tags for plain text comparison
  const allText = html.replace(/<[^>]+>/g, ' ');

  // Helper: measure whitespace gap between two field values in the stripped HTML text
  const measureGap = (fieldValA, fieldValB) => {
    if (!fieldValA || !fieldValB) return 4;
    const a = fieldValA.substring(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const b = fieldValB.substring(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = allText.match(new RegExp(`${a}[\\s\\S]*?([,;|·—\\s]+)${b}`, 'i'));
    if (!match) return 4; // default small gap
    const separator = match[1];
    // Count spaces/tabs — more whitespace = bigger gap
    const spaceCount = (separator.match(/\s/g) || []).length;
    if (spaceCount > 10) return 0; // lots of spaces = probably flex-pushed apart, use spacer instead
    if (spaceCount > 3) return 8;
    return 4;
  };

  // Helper: build a row from ordered field names with detected gaps between them
  const buildRow = (orderedFields, classPrefix, fieldValues) => {
    const row = [];
    let addedSpacer = false;
    for (let i = 0; i < orderedFields.length; i++) {
      const field = orderedFields[i];
      // Add spacer before the last field to push it right (unless it's the only field)
      if (!addedSpacer && i === orderedFields.length - 1 && orderedFields.length > 1) {
        row.push({ type: 'spacer', value: '' });
        addedSpacer = true;
      }
      // Measure gap to next field
      let gap;
      if (i < orderedFields.length - 1 && fieldValues) {
        const nextField = orderedFields[i + 1];
        // Don't add gap if next iteration will insert a spacer (spacer handles the push)
        const nextIsSpacer = !addedSpacer && (i + 1) === orderedFields.length - 1 && orderedFields.length > 1;
        if (!nextIsSpacer) {
          gap = measureGap(fieldValues[field], fieldValues[nextField]);
          if (gap === 0) gap = undefined; // 0 means use spacer, not gap
        }
      }
      row.push({ type: 'field', value: field, className: `${classPrefix}${field}`, gap });
    }
    return row;
  };

  // Helper: detect field order from HTML text positions (only fields that exist)
  const detectFieldOrder = (fields) => {
    const positions = {};
    for (const [field, val] of Object.entries(fields)) {
      if (val) {
        const pos = allText.indexOf(val.substring(0, 15));
        if (pos !== -1) positions[field] = pos;
      }
    }
    return Object.entries(positions).sort((a, b) => a[1] - b[1]).map(e => e[0]);
  };

  // Helper: check if two field values appear on the same line (within ~200 chars of stripped text)
  const areSameLine = (valA, valB) => {
    if (!valA || !valB) return false;
    const a = valA.substring(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const b = valB.substring(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${a}.{0,200}${b}|${b}.{0,200}${a}`, 'i').test(allText);
  };

  // --- Education layout detection ---
  if (resumeData.education && resumeData.education.length > 0) {
    const edu = resumeData.education[0];

    // Only include fields that exist in the extracted data
    const eduFields = {};
    if (edu.school) eduFields.school = edu.school;
    if (edu.degree) eduFields.degree = edu.degree;
    if (edu.dates) eduFields.dates = edu.dates;
    if (edu.gpa) eduFields.gpa = edu.gpa;
    if (edu.location) eduFields.location = edu.location;

    console.log('  [HTML detect] edu fields:', Object.keys(eduFields));
    console.log('  [HTML detect] edu field values:', JSON.stringify(eduFields));

    // Detect bold/italic — pick the first matching field (primary styling)
    for (const [field, val] of Object.entries(eduFields)) {
      if (!layout.education.boldField && isBoldInHtml(val)) layout.education.boldField = field;
    }
    for (const [field, val] of Object.entries(eduFields)) {
      if (!layout.education.italicField && isItalicInHtml(val)) layout.education.italicField = field;
    }

    // Check if degree and school appear on the same line
    const singleRow = areSameLine(edu.degree, edu.school);
    console.log('  [HTML detect] edu singleRow:', singleRow);

    if (singleRow) {
      // All fields on one row, ordered by position in HTML
      const orderedFields = detectFieldOrder(eduFields);
      console.log('  [HTML detect] edu orderedFields (single):', orderedFields);
      layout.education.rows = [buildRow(orderedFields, 'edu-', eduFields)];
    } else {
      // Two-row layout: build rows from fields that exist
      const row1Obj = Object.fromEntries(Object.entries({ school: edu.school, location: edu.location }).filter(([, v]) => v));
      const row2Obj = Object.fromEntries(Object.entries({ degree: edu.degree, gpa: edu.gpa, dates: edu.dates }).filter(([, v]) => v));
      const row1Fields = detectFieldOrder(row1Obj);
      const row2Fields = detectFieldOrder(row2Obj);
      console.log('  [HTML detect] edu row1:', row1Fields, 'row2:', row2Fields);
      layout.education.rows = [];
      if (row1Fields.length > 0) layout.education.rows.push(buildRow(row1Fields, 'edu-', row1Obj));
      if (row2Fields.length > 0) layout.education.rows.push(buildRow(row2Fields, 'edu-', row2Obj));
    }
    if (edu.coursework) {
      layout.education.rows.push([{ type: 'field', value: 'coursework', className: 'edu-coursework' }]);
    }
  }

  // --- Experience layout detection ---
  if (resumeData.experience && resumeData.experience.length > 0) {
    const exp = resumeData.experience[0];

    const expFields = {};
    if (exp.company) expFields.company = exp.company;
    if (exp.role) expFields.role = exp.role;
    if (exp.dates) expFields.dates = exp.dates;
    if (exp.location) expFields.location = exp.location;

    console.log('  [HTML detect] exp fields:', Object.keys(expFields));

    for (const [field, val] of Object.entries(expFields)) {
      if (!layout.experience.boldField && isBoldInHtml(val)) layout.experience.boldField = field;
    }
    for (const [field, val] of Object.entries(expFields)) {
      if (!layout.experience.italicField && isItalicInHtml(val)) layout.experience.italicField = field;
    }

    const singleRow = areSameLine(exp.role, exp.company);
    console.log('  [HTML detect] exp singleRow:', singleRow);

    if (singleRow) {
      const orderedFields = detectFieldOrder(expFields);
      layout.experience.rows = [buildRow(orderedFields, 'entry-', expFields)];
    } else {
      const row1Obj = Object.fromEntries(Object.entries({ company: exp.company, location: exp.location }).filter(([, v]) => v));
      const row2Obj = Object.fromEntries(Object.entries({ role: exp.role, dates: exp.dates }).filter(([, v]) => v));
      const row1Fields = detectFieldOrder(row1Obj);
      const row2Fields = detectFieldOrder(row2Obj);
      layout.experience.rows = [];
      if (row1Fields.length > 0) layout.experience.rows.push(buildRow(row1Fields, 'entry-', row1Obj));
      if (row2Fields.length > 0) layout.experience.rows.push(buildRow(row2Fields, 'entry-', row2Obj));
    }
  }

  // --- Projects layout detection ---
  if (resumeData.projects && resumeData.projects.length > 0) {
    const proj = resumeData.projects[0];

    const projFields = {};
    if (proj.title) projFields.title = proj.title;
    if (proj.techStack) projFields.techStack = proj.techStack;
    if (proj.date) projFields.date = proj.date;

    for (const [field, val] of Object.entries(projFields)) {
      if (!layout.projects.boldField && isBoldInHtml(val)) layout.projects.boldField = field;
    }
    for (const [field, val] of Object.entries(projFields)) {
      if (!layout.projects.italicField && isItalicInHtml(val)) layout.projects.italicField = field;
    }

    const orderedFields = detectFieldOrder(projFields);
    if (orderedFields.length > 0) {
      layout.projects.rows = [buildRow(orderedFields, 'project-', projFields)];
    }
  }

  // --- Header detection ---
  const nameMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (nameMatch) {
    if (/text-align:\s*center/i.test(nameMatch[0])) {
      layout.header.nameAlignment = 'center';
    } else {
      layout.header.nameAlignment = 'left';
    }
  }

  // Detect contact separator from HTML
  const contactText = resumeData.contact;
  if (contactText) {
    // Check common separators in the text near contact fields
    if (allText.includes(' | ')) layout.header.contactSeparator = ' | ';
    else if (allText.includes(' · ')) layout.header.contactSeparator = ' · ';
    else if (allText.includes(' — ')) layout.header.contactSeparator = ' — ';
  }

  // Detect bullet markers
  layout.education.showEntryBulletMarker = false;
  layout.experience.showEntryBulletMarker = false;
  layout.projects.showEntryBulletMarker = false;

  console.log('  HTML layout detection:', {
    eduBold: layout.education.boldField,
    eduItalic: layout.education.italicField,
    eduRows: layout.education.rows.length,
    expBold: layout.experience.boldField,
    expItalic: layout.experience.italicField,
    expRows: layout.experience.rows.length,
  });

  return layout;
}

async function extractContent(file) {
  const ext = file.originalname.toLowerCase().split('.').pop();

  if (ext === 'txt' || ext === 'text') {
    return { text: file.buffer.toString('utf-8'), html: null, fontMetadata: null, margins: null, isLaTeX: false };
  }

  if (ext === 'pdf') {
    const result = await extractPdfWithMetadata(file.buffer);
    return { text: result.text, html: null, fontMetadata: result.fontMetadata, margins: result.margins, isLaTeX: result.isLaTeX };
  }

  if (ext === 'docx' || ext === 'doc') {
    const [textResult, htmlResult] = await Promise.all([
      extractRawText({ buffer: file.buffer }),
      convertToHtml({ buffer: file.buffer }),
    ]);
    return { text: textResult.value, html: htmlResult.value, fontMetadata: null, margins: null, isLaTeX: false };
  }

  throw new Error(`Unsupported file type: .${ext}. Use .txt, .pdf, or .docx`);
}

async function callAI(systemPrompt, userContent) {
  const payload = {
    model: 'meta/llama-3.1-70b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 16384,
    temperature: 0.1,
    top_p: 1.0,
    stream: false,
  };

  console.log(`  -> Sending ${userContent.length} chars to AI...`);

  const response = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log(`  <- Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const err = await response.text();
    console.error('NVIDIA API error body:', err || '(empty)');
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    throw new Error(`AI service error (${response.status}): ${err || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  console.log(`  <- finish_reason: ${data.choices?.[0]?.finish_reason}, content length: ${content?.length || 0}`);

  if (!content) {
    console.error('AI response had no content. Full message:', JSON.stringify(data.choices?.[0]?.message, null, 2));
    throw new Error('AI returned empty content — model may need more max_tokens');
  }

  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common JSON issues: unescaped newlines/tabs inside string values
    const fixed = cleaned.replace(/(?<=:"[^"]*)\n/g, '\\n').replace(/(?<=:"[^"]*)\t/g, '\\t');
    try {
      return JSON.parse(fixed);
    } catch {
      // Last resort: extract format and css separately
      const formatMatch = cleaned.match(/"format"\s*:\s*(\{[^}]+\})/);
      const cssMatch = cleaned.match(/"css"\s*:\s*"([\s\S]*)"$/);
      if (formatMatch) {
        const format = JSON.parse(formatMatch[1]);
        const css = cssMatch ? cssMatch[1].replace(/\\"/g, '"').replace(/\n/g, ' ') : '';
        return { format, css };
      }
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}

// File upload route
generateRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    let text = '';
    let html = null;
    let fontMetadata = null;
    let margins = null;
    let isLaTeX = false;
    const name = req.body.name;

    if (req.file) {
      const result = await extractContent(req.file);
      text = result.text;
      html = result.html;
      fontMetadata = result.fontMetadata;
      margins = result.margins;
      isLaTeX = result.isLaTeX;
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'Could not extract text from the uploaded file. Please try a different format.' });
    }

    // Run content extraction first, then style analysis (sequential to avoid rate limits)
    console.log('Step 1/2: Extracting resume content...');
    const resumeData = await callAI(CONTENT_PROMPT, `Parse this resume into the JSON format:\n\n${text}`);

    // Prefer LLM-detected section order, fall back to regex-based detection
    let sectionOrder;
    if (Array.isArray(resumeData.sectionOrder) && resumeData.sectionOrder.length >= 2) {
      // Ensure 'header' is first and all standard sections are included
      const llmOrder = resumeData.sectionOrder.filter(k => k !== 'header');
      sectionOrder = ['header', ...llmOrder];
      const allKeys = ['education', 'summary', 'skills', 'experience', 'projects'];
      for (const key of allKeys) {
        if (!sectionOrder.includes(key)) sectionOrder.push(key);
      }
      console.log('  Using LLM-detected section order:', sectionOrder);
    } else {
      sectionOrder = detectSectionOrder(text);
      console.log('  Using regex-detected section order:', sectionOrder);
    }

    // Build style analysis input with font metadata when available
    let styleInput;
    if (fontMetadata && fontMetadata.length > 0) {
      const metadataStr = JSON.stringify({ fonts: fontMetadata, margins, isLaTeX }, null, 2);
      styleInput = `Here is the resume text:\n\n${text}\n\n---\n\nHere is the FONT METADATA extracted from the PDF. This contains the actual font names, sizes, and text samples. Use this to determine the exact fonts, sizes, and styling:\n\n${metadataStr}`;
      console.log(`  Font metadata: ${fontMetadata.length} fonts detected: ${fontMetadata.map(f => f.fontName).join(', ')}`);
    } else if (html) {
      styleInput = `Here is the resume text:\n\n${text}\n\n---\n\nHere is the HTML from the DOCX (contains formatting hints like bold, italic, headings, font info):\n\n${html}`;
    } else {
      styleInput = `Here is the resume text. Analyze the formatting patterns (heading styles, spacing, bullet characters, alignment, font choices) and replicate them:\n\n${text}`;
    }

    console.log('Step 2/2: Analyzing style...');
    const styleData = await callAI(STYLE_PROMPT, styleInput);
    console.log('AI calls completed');

    const clamp = (val, min, max, fallback) => {
      const n = Number(val);
      if (isNaN(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };

    const format = {
      fontFamily: styleData.format?.fontFamily || "'Calibri', 'Arial', sans-serif",
      fontSize: clamp(styleData.format?.fontSize, 8, 12, 10),
      lineHeight: clamp(styleData.format?.lineHeight, 1.0, 1.5, 1.2),
      marginTop: clamp(styleData.format?.marginTop, 0.15, 0.5, 0.3),
      marginBottom: clamp(styleData.format?.marginBottom, 0.15, 0.5, 0.3),
      marginLeft: clamp(styleData.format?.marginLeft, 0.3, 0.6, 0.45),
      marginRight: clamp(styleData.format?.marginRight, 0.3, 0.6, 0.45),
      nameFontSize: clamp(styleData.format?.nameFontSize, 12, 28, 20),
      contactFontSize: clamp(styleData.format?.contactFontSize, 8, 12, 10),
      headingFontSize: clamp(styleData.format?.headingFontSize, 9, 14, 11),
      sectionSpacing: clamp(styleData.format?.sectionSpacing, 2, 8, 4),
      bulletSpacing: clamp(styleData.format?.bulletSpacing, 0, 3, 0),
    };

    // If LLM returned empty CSS, generate a sensible default based on the format
    let css = styleData.css || '';
    if (!css.trim()) {
      const ff = format.fontFamily;
      css = `
.resume-page { font-family: ${ff}; color: #000; }
.resume-name { font-size: ${format.nameFontSize}pt; font-weight: 700; text-align: center; margin: 0; line-height: 1.1; }
.resume-contact { text-align: center; font-size: ${format.contactFontSize}pt; margin: 1pt 0 0 0; line-height: 1.2; }
.resume-contact span + span::before { content: ' | '; margin: 0 2pt; }
.contact-link { color: inherit; text-decoration: none; }
.contact-link:hover { text-decoration: underline; }
.section-heading { font-size: ${format.headingFontSize}pt; font-weight: 700; text-transform: uppercase; border-bottom: 1pt solid #000; margin: ${format.sectionSpacing}pt 0 2pt 0; padding-bottom: 1pt; line-height: 1.3; }
.edu-entry { display: flex; margin: 0; margin-top: var(--bullet-gap, 0); }
.edu-entry:first-child { margin-top: 0; }
.edu-bullet { flex-shrink: 0; width: 12pt; font-size: 8pt; line-height: 1.6; }
.edu-content { flex: 1; min-width: 0; }
.edu-row-1, .edu-row-2 { display: flex; align-items: baseline; line-height: 1.25; }
.edu-gpa { margin-left: 4pt; }
.edu-location { flex-shrink: 0; padding-left: 8pt; }
.edu-dates { flex-shrink: 0; padding-left: 8pt; }
.edu-coursework { font-size: 8.5pt; line-height: 1.15; font-style: italic; margin: 0; }
.skill-row { display: flex; line-height: 1.25; margin: 0; margin-top: var(--bullet-gap, 0); }
.skill-row:first-child { margin-top: 0; }
.skill-row::before { content: '\\2022'; margin-right: 5pt; flex-shrink: 0; }
.skill-category { font-weight: 700; white-space: nowrap; margin-right: 3pt; }
.skill-category::after { content: ':'; }
.skill-values { flex: 1; }
.entry { display: flex; margin: 0; margin-top: var(--bullet-gap, 0); }
.entry:first-child { margin-top: 0; }
.entry-bullet { flex-shrink: 0; width: 12pt; font-size: 8pt; line-height: 1.6; }
.entry-content { flex: 1; min-width: 0; }
.entry-row { display: flex; align-items: baseline; line-height: 1.25; }
.entry-location { flex-shrink: 0; padding-left: 8pt; }
.entry-dates { flex-shrink: 0; padding-left: 8pt; }
.bullet-list { list-style: none; padding-left: 12pt; margin: 0; }
.bullet-list li { position: relative; line-height: 1.2; margin: 0; margin-top: var(--bullet-gap, 0); }
.bullet-list li:first-child { margin-top: 0; }
.bullet-list li::before { content: '\\2022'; position: absolute; left: -10pt; top: 0; }
.bullet-list li strong { font-weight: 700; }
.project-entry { display: flex; margin: 0; margin-top: var(--bullet-gap, 0); }
.project-entry:first-child { margin-top: 0; }
.project-bullet { flex-shrink: 0; width: 12pt; font-size: 8pt; line-height: 1.6; }
.project-content { flex: 1; min-width: 0; }
.project-header { display: flex; align-items: baseline; line-height: 1.2; }
.project-date { flex-shrink: 0; padding-left: 8pt; }
.project-bullets { list-style: none; padding-left: 12pt; margin: 0; }
.project-bullets li { position: relative; line-height: 1.2; margin: 0; margin-top: var(--bullet-gap, 0); }
.project-bullets li:first-child { margin-top: 0; }
.project-bullets li::before { content: '\\2022'; position: absolute; left: -10pt; top: 0; }
.project-bullets li strong { font-weight: 700; }
.field-bold { font-weight: 700; }
.field-italic { font-style: italic; }
.resume-summary { font-size: ${format.fontSize}pt; line-height: 1.3; margin: 1pt 0 0 0; }
      `.trim();
      console.log('  LLM returned empty CSS — using fallback CSS based on format values');
    }

    // Strip justify-content: space-between from row classes — spacers handle positioning now
    css = css.replace(/justify-content:\s*space-between\s*;?/g, '');

    // Build validated layout from AI response, with defaults as fallback
    const DEFAULT_LAYOUT = {
      header: {
        nameAlignment: 'center',
        contactLayout: 'inline',
        contactSeparator: ' | ',
        contactFields: ['phone', 'email', 'linkedin', 'github', 'portfolio', 'googleScholar'],
      },
      education: {
        rows: [
          [{ type: 'field', value: 'school', className: 'edu-school' }, { type: 'spacer', value: '' }, { type: 'field', value: 'location', className: 'edu-location' }],
          [{ type: 'field', value: 'degree', className: 'edu-degree' }, { type: 'field', value: 'gpa', className: 'edu-gpa' }, { type: 'spacer', value: '' }, { type: 'field', value: 'dates', className: 'edu-dates' }],
          [{ type: 'field', value: 'coursework', className: 'edu-coursework' }],
        ],
        showEntryBulletMarker: true,
        boldField: 'school',
        italicField: 'degree',
        showCoursework: true,
      },
      experience: {
        rows: [
          [{ type: 'field', value: 'company', className: 'entry-company' }, { type: 'spacer', value: '' }, { type: 'field', value: 'location', className: 'entry-location' }],
          [{ type: 'field', value: 'role', className: 'entry-role' }, { type: 'spacer', value: '' }, { type: 'field', value: 'dates', className: 'entry-dates' }],
        ],
        showEntryBulletMarker: true,
        boldField: 'company',
        italicField: 'role',
      },
      skills: {
        showCategories: true,
        showBulletMarker: true,
        displayMode: 'list',
        skillSeparator: ', ',
      },
      projects: {
        rows: [
          [{ type: 'field', value: 'title', className: 'project-title' }, { type: 'field', value: 'techStack', className: 'project-tech' }, { type: 'spacer', value: '' }, { type: 'field', value: 'date', className: 'project-date' }],
        ],
        showEntryBulletMarker: true,
        techStackPosition: 'inline',
        boldField: 'title',
        italicField: null,
      },
    };

    // Prefer deterministic HTML-based layout detection for DOCX uploads
    // Fall back to AI layout for PDF/text uploads
    const htmlLayout = html ? detectLayoutFromHtml(html, resumeData) : null;
    const aiLayout = styleData.layout || {};
    const sourceLayout = htmlLayout || aiLayout;
    const layout = {
      header: { ...DEFAULT_LAYOUT.header, ...sourceLayout.header },
      education: { ...DEFAULT_LAYOUT.education, ...sourceLayout.education, rows: Array.isArray(sourceLayout.education?.rows) && sourceLayout.education.rows.length > 0 ? sourceLayout.education.rows : DEFAULT_LAYOUT.education.rows },
      experience: { ...DEFAULT_LAYOUT.experience, ...sourceLayout.experience, rows: Array.isArray(sourceLayout.experience?.rows) && sourceLayout.experience.rows.length > 0 ? sourceLayout.experience.rows : DEFAULT_LAYOUT.experience.rows },
      skills: { ...DEFAULT_LAYOUT.skills, ...sourceLayout.skills },
      projects: { ...DEFAULT_LAYOUT.projects, ...sourceLayout.projects, rows: Array.isArray(sourceLayout.projects?.rows) && sourceLayout.projects.rows.length > 0 ? sourceLayout.projects.rows : DEFAULT_LAYOUT.projects.rows },
    };
    console.log('  Layout source:', htmlLayout ? 'HTML detection' : 'AI response');
    console.log('  Layout detected:', JSON.stringify({ eduBold: layout.education.boldField, eduItalic: layout.education.italicField, expBold: layout.experience.boldField, expItalic: layout.experience.italicField, eduRows: layout.education.rows.length, expRows: layout.experience.rows.length }));

    // Remove sectionOrder from resumeData to avoid duplication (it's stored at template level)
    delete resumeData.sectionOrder;

    const templateName = name || `${resumeData.contact?.name || 'Uploaded'}'s Resume Template`;
    const doc = await Template.create({
      name: templateName,
      description: `Auto-generated template matching the style of ${resumeData.contact?.name || 'uploaded'}'s resume`,
      format,
      layout,
      css: css || '',
      sectionOrder,
      resumeData,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Generate template error:', err);
    const message = err instanceof SyntaxError ? 'AI returned invalid JSON — try again' : err.message;
    res.status(500).json({ error: message });
  }
});
