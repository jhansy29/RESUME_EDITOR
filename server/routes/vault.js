import { Router } from 'express';
import { ProfileVault } from '../models/ProfileVault.js';
import { Resume } from '../models/Resume.js';
import { callAI } from '../utils/ai.js';

export const vaultRouter = Router();

const VAULT_IMPORT_PROMPT = `You are a resume master-file parser. Given raw text from a master resume file, extract ALL content into a structured JSON vault.

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
  "certifications": [
    {
      "id": "cert-1",
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "summaryVariants": [
    {
      "id": "sum-1",
      "label": "string (e.g. AI/ML, Backend, MLOps)",
      "text": "string (the full summary text)"
    }
  ],
  "experience": [
    {
      "id": "exp-1",
      "company": "string",
      "location": "string",
      "role": "string",
      "dates": "string",
      "context": "string (brief company/role context if available, empty string otherwise)",
      "bulletGroups": [
        {
          "id": "bg-1",
          "theme": "string (e.g. Backend, SDK, Frontend, ML Pipeline, CI/CD)",
          "bullets": [
            {
              "id": "vb-1",
              "text": "string (the full bullet text)",
              "tags": ["string (lowercase technical keywords extracted from the bullet, e.g. python, fastapi, mongodb, aws)"],
              "metrics": ["string (quantified results extracted, e.g. 91% accuracy, 50K+ resumes, 10s to <2.8s)"]
            }
          ]
        }
      ]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "string",
      "techStack": "string (comma-separated technologies)",
      "date": "string (optional)",
      "description": "string (brief project description if available)",
      "githubUrl": "string (GitHub URL if mentioned, empty string otherwise)",
      "bulletGroups": [
        {
          "id": "pbg-1",
          "theme": "string",
          "bullets": [
            {
              "id": "pvb-1",
              "text": "string",
              "tags": ["string"],
              "metrics": ["string"]
            }
          ]
        }
      ]
    }
  ],
  "skills": [
    {
      "id": "sk-1",
      "category": "string (e.g. AI/ML, Backend, Cloud, Frontend)",
      "skills": "string (comma-separated list)"
    }
  ],
  "extracurriculars": [
    {
      "id": "extra-1",
      "text": "string"
    }
  ]
}

Rules:
- IDs must be globally sequential: edu-1, edu-2, ...; exp-1, exp-2, ...; vb-1, vb-2, ... (vault bullets globally sequential)
- Extract ALL bullet variants — if the same role has multiple versions (PDF version, DOCX version), include ALL as separate bullets in the same or different bullet groups
- Group bullets by theme when the source text has theme headers (e.g. "BACKEND / API BULLETS", "SDK BULLETS")
- If no theme headers exist, use a single bullet group with theme "General" per entry
- For tags: extract lowercase technical keywords (tools, languages, frameworks, services, methodologies) from each bullet
- For metrics: extract any quantified results (percentages, dollar amounts, counts, time improvements, scale numbers)
- Extract ALL summaryVariants if multiple summary options are provided
- Extract certifications separately from education
- Do NOT skip any content — include everything from the master file
- Return ONLY the JSON object, nothing else`;

// Get the vault (one per user)
vaultRouter.get('/', async (req, res) => {
  const doc = await ProfileVault.findOne({ userId: req.userId });
  res.json(doc || null);
});

// Create a new vault
vaultRouter.post('/', async (req, res) => {
  const doc = await ProfileVault.create({ ...req.body, userId: req.userId });
  res.status(201).json(doc);
});

// Update vault sections
vaultRouter.patch('/:id', async (req, res) => {
  const doc = await ProfileVault.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ error: 'Vault not found' });
  res.json(doc);
});

// Delete vault
vaultRouter.delete('/:id', async (req, res) => {
  await ProfileVault.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
});

// Import: parse master text via LLM into vault structure
vaultRouter.post('/:id/import', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing "text" field with master resume content' });
    }

    const vault = await ProfileVault.findOne({ _id: req.params.id, userId: req.userId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    console.log(`[Vault Import] Parsing ${text.length} chars of master text...`);
    const parsed = await callAI(VAULT_IMPORT_PROMPT, text);

    // Merge parsed data into the vault
    const fields = [
      'contact', 'education', 'certifications', 'summaryVariants',
      'experience', 'projects', 'skills', 'extracurriculars',
    ];
    for (const field of fields) {
      if (parsed[field] !== undefined) {
        vault[field] = parsed[field];
      }
    }

    await vault.save();
    console.log('[Vault Import] Done — vault updated.');
    res.json(vault);
  } catch (err) {
    console.error('[Vault Import] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import from an existing resume (no AI — direct mapping)
vaultRouter.post('/:id/import-resume', async (req, res) => {
  try {
    const { resumeId } = req.body;
    if (!resumeId) return res.status(400).json({ error: 'Missing resumeId' });

    const vault = await ProfileVault.findOne({ _id: req.params.id, userId: req.userId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    let bulletIdx = 1;
    let bgIdx = 1;

    // Map contact
    if (resume.contact) vault.contact = resume.contact;

    // Map education
    if (resume.education?.length) vault.education = resume.education;

    // Map skills
    if (resume.skills?.length) vault.skills = resume.skills;

    // Map summary as a variant
    if (resume.summary) {
      const existing = vault.summaryVariants || [];
      const label = resume.name || 'Imported';
      if (!existing.some(v => v.text === resume.summary)) {
        existing.push({ id: `sum-${existing.length + 1}`, label, text: resume.summary });
      }
      vault.summaryVariants = existing;
    }

    // Map experience — convert flat bullets to bulletGroups
    if (resume.experience?.length) {
      vault.experience = resume.experience.map((exp, i) => ({
        id: exp.id || `exp-${i + 1}`,
        company: exp.company,
        location: exp.location,
        role: exp.role,
        dates: exp.dates,
        context: '',
        bulletGroups: [{
          id: `bg-${bgIdx++}`,
          theme: 'General',
          bullets: (exp.bullets || []).map(b => ({
            id: `vb-${bulletIdx++}`,
            text: b.text,
            tags: [],
            metrics: [],
          })),
        }],
      }));
    }

    // Map projects — convert flat bullets to bulletGroups
    if (resume.projects?.length) {
      vault.projects = resume.projects.map((proj, i) => ({
        id: proj.id || `proj-${i + 1}`,
        title: proj.title,
        techStack: proj.techStack || '',
        date: proj.date || '',
        description: '',
        githubUrl: '',
        bulletGroups: [{
          id: `pbg-${bgIdx++}`,
          theme: 'General',
          bullets: (proj.bullets || []).map(b => ({
            id: `pvb-${bulletIdx++}`,
            text: b.text,
            tags: [],
            metrics: [],
          })),
        }],
      }));
    }

    await vault.save();
    console.log(`[Vault Import Resume] Imported from resume "${resume.name}"`);
    res.json(vault);
  } catch (err) {
    console.error('[Vault Import Resume] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import from raw text into a new vault (create + parse in one step)
vaultRouter.post('/import-new', async (req, res) => {
  try {
    const { text, name } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing "text" field with master resume content' });
    }

    console.log(`[Vault Import New] Parsing ${text.length} chars...`);
    const parsed = await callAI(VAULT_IMPORT_PROMPT, text);

    const doc = await ProfileVault.create({
      name: name || 'Imported Vault',
      userId: req.userId,
      ...parsed,
    });

    console.log('[Vault Import New] Done — new vault created.');
    res.status(201).json(doc);
  } catch (err) {
    console.error('[Vault Import New] Error:', err);
    res.status(500).json({ error: err.message });
  }
});
