import { Router } from 'express';
import { callAI } from '../utils/ai.js';
import { Resume } from '../models/Resume.js';
import { SavedJD } from '../models/SavedJD.js';

export const jdRouter = Router();

// --- Saved JDs CRUD ---
jdRouter.get('/saved', async (_req, res) => {
  try {
    const jds = await SavedJD.find().sort({ updatedAt: -1 }).select('title company updatedAt');
    res.json(jds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.get('/saved/:id', async (req, res) => {
  try {
    const jd = await SavedJD.findById(req.params.id);
    if (!jd) return res.status(404).json({ error: 'Saved JD not found' });
    res.json(jd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.post('/saved', async (req, res) => {
  try {
    const { title, company, jobDescription, analysis } = req.body;
    if (!title || !jobDescription) {
      return res.status(400).json({ error: 'title and jobDescription are required' });
    }
    const jd = await SavedJD.create({ title, company, jobDescription, analysis });
    res.status(201).json(jd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.patch('/saved/:id', async (req, res) => {
  try {
    const jd = await SavedJD.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!jd) return res.status(404).json({ error: 'Saved JD not found' });
    res.json(jd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.delete('/saved/:id', async (req, res) => {
  try {
    await SavedJD.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const JD_ANALYSIS_PROMPT = `You are a strict, precise job description analyzer for ATS resume optimization. Given a job description, extract structured keyword and requirement data.

Return ONLY valid JSON — no markdown, no backticks, no explanation.

The JSON must match this exact schema:
{
  "jobTitle": "string (exact job title from JD)",
  "roleType": "string (one of: ai_ml, backend, frontend, fullstack, data_engineer, data_scientist, mlops, devops, cloud, voice_ai, nlp_llm, general_swe)",
  "company": "string (company name if mentioned)",
  "keywords": {
    "mustHave": [
      {
        "keyword": "string (exact term from JD)",
        "category": "string (one of: language, framework, tool, platform, methodology, skill, soft_skill, domain)",
        "frequency": 0,
        "context": "string (one of: required, described_in_responsibilities, repeated_emphasis)"
      }
    ],
    "niceToHave": [
      {
        "keyword": "string",
        "category": "string",
        "frequency": 0,
        "context": "string (one of: preferred, example_in_parenthetical, mentioned_once)"
      }
    ]
  },
  "requirements": {
    "technical": ["string (specific technical requirements)"],
    "experience": ["string (years/type of experience required)"],
    "education": ["string (degree requirements)"],
    "soft": ["string (soft skills mentioned)"]
  },
  "outcomeLanguage": ["string (key phrases about desired outcomes, e.g. 'drive efficiency', 'scale systems', 'improve accuracy')"]
}

Rules:
- mustHave keywords: skills/tools that are CORE to the role — mentioned 2+ times, appear in "Requirements"/"Must Have"/"Required" sections, or described in main responsibilities
- niceToHave keywords: mentioned once, appear in "Preferred"/"Nice to Have"/"Bonus" sections, OR appear as EXAMPLES in parenthetical lists (e.g., "orchestration tooling (e.g., Ray, Airflow)" — Ray and Airflow are examples, not hard requirements; the REAL requirement is "orchestration tooling")

CRITICAL — Parenthetical examples rule:
When a JD says something like "vector/embedding tooling (e.g., FAISS)" or "RAG tooling (e.g., Chroma, Weaviate)" or "agent authoring tools (e.g., LlamaIndex, LangGraph, CrewAI)":
  - The CATEGORY/CONCEPT (e.g., "vector/embedding tooling", "RAG tooling", "agent authoring tools") is the mustHave keyword
  - The specific tools in parentheses (e.g., FAISS, Chroma, Weaviate, LlamaIndex, CrewAI) are niceToHave with context "example_in_parenthetical"
  - A resume matches if it has ANY tool in that category, not necessarily the exact examples listed
  - Do NOT mark parenthetical examples as mustHave — they are interchangeable alternatives

- frequency: count how many times each keyword appears in the full JD text
- category must be one of the specified values
- Extract ALL technical tools, frameworks, languages, platforms, and methodologies mentioned
- Include both abbreviations and full forms when present (e.g., "Natural Language Processing" AND "NLP")
- outcomeLanguage: extract verb phrases that describe what the role aims to achieve
- Be thorough — missing a keyword means the resume won't match on that term
- Return ONLY the JSON object, nothing else`;

const ATS_SCORE_PROMPT = `You are a strict, honest ATS scoring engine. Your job is to give ACCURATE scores, not flattering ones. An inflated score hurts the user because they won't know what to fix. Given a job description analysis and a resume, calculate how well the resume matches the JD.

Return ONLY valid JSON — no markdown, no backticks, no explanation.

The JSON must match this schema:
{
  "overall": 0,
  "breakdown": {
    "keywordMatch": 0,
    "skillsMatch": 0,
    "experienceMatch": 0,
    "educationMatch": 0
  },
  "matchedKeywords": ["string (JD keywords found in resume)"],
  "missingKeywords": ["string (JD keywords NOT found in resume)"],
  "strongMatches": ["string (areas where resume strongly aligns with JD)"],
  "gaps": ["string (areas where resume is weak relative to JD)"]
}

SCORING METHODOLOGY — follow these formulas precisely:

keywordMatch (0-100):
  - Count how many mustHave keywords from the JD analysis appear in the resume (exact term or very close variant like "ML" for "machine learning")
  - Formula: (matched mustHave count / total mustHave count) * 100
  - For keywords with context "example_in_parenthetical": match if the resume has ANY tool in that category (e.g., if JD says "vector tooling (e.g., FAISS, Chroma)" and resume has FAISS, that counts as matching the category)
  - DO NOT count a keyword as matched just because a vaguely related term appears — "AI" does not match "machine learning", "Python" does not match "scikit-learn"

skillsMatch (0-100):
  - Look ONLY at the resume's Skills/Technical Skills section
  - Count how many JD technical keywords (tools, frameworks, languages, platforms) appear there
  - Formula: (matched technical keywords in skills section / total JD technical keywords) * 100
  - Must be exact matches or standard abbreviations — not loose associations

experienceMatch (0-100):
  - Score based on alignment with JD's experience REQUIREMENTS (years, type, domain)
  - If JD requires "3+ years customer-facing AI/ML" and candidate has 6 months, score LOW (30-40), not high
  - If JD describes specific responsibilities (e.g., "fine-tuning pipelines", "stakeholder enablement"), check if resume demonstrates EACH one
  - Weight: years of relevant experience (40%), responsibility alignment (40%), domain relevance (20%)
  - Be honest about gaps — a strong but junior candidate should score 50-65, not 85+

educationMatch (0-100):
  - Does the resume meet degree requirements? (100 if exceeds, 80-90 if meets, 50-70 if close, <50 if far off)

overall (0-100):
  - Weighted average: keywordMatch (30%) + skillsMatch (25%) + experienceMatch (35%) + educationMatch (10%)
  - This weighting reflects that experience alignment matters most for getting past human review

HONESTY RULES:
- A typical untailored resume scores 40-65% against a specific JD. Scores above 80% should be rare and earned.
- If the resume lists a skill but has NO experience bullets demonstrating it, note this in gaps
- If the JD requires N+ years of specific experience and the candidate has less, this MUST appear in gaps and pull experienceMatch down
- Do not give credit for skills the candidate listed but never used in any experience bullet
- matchedKeywords: ONLY list keywords where the exact term or a standard variant genuinely appears in the resume text
- missingKeywords: list every JD keyword that does NOT appear in the resume — be thorough
- strongMatches: 2-4 specific, evidence-based statements about where the resume excels for this JD
- gaps: 2-4 specific, honest statements about what's missing or weak — these should be ACTIONABLE
- Return ONLY the JSON object, nothing else`;

// Analyze a JD — extract keywords, requirements, and optionally score against a resume
jdRouter.post('/analyze', async (req, res) => {
  try {
    const { jobDescription, resumeId } = req.body;
    if (!jobDescription || typeof jobDescription !== 'string') {
      return res.status(400).json({ error: 'Missing "jobDescription" field' });
    }

    console.log(`[JD Analyze] Parsing ${jobDescription.length} chars...`);
    const analysis = await callAI(JD_ANALYSIS_PROMPT, jobDescription);

    // If a resume ID is provided, also calculate ATS score
    let atsScore = null;
    if (resumeId) {
      const resume = await Resume.findById(resumeId);
      if (resume) {
        const resumeText = serializeResume(resume.toObject());
        const scoreInput = `JD ANALYSIS:\n${JSON.stringify(analysis, null, 2)}\n\nRESUME:\n${resumeText}`;
        console.log(`[JD Analyze] Scoring against resume ${resumeId}...`);
        atsScore = await callAI(ATS_SCORE_PROMPT, scoreInput);
      }
    }

    res.json({ ...analysis, atsScore });
  } catch (err) {
    console.error('[JD Analyze] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Score a resume against an already-analyzed JD
jdRouter.post('/score', async (req, res) => {
  try {
    const { jdAnalysis, resumeId } = req.body;
    if (!jdAnalysis || !resumeId) {
      return res.status(400).json({ error: 'Missing "jdAnalysis" or "resumeId"' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const resumeText = serializeResume(resume.toObject());
    const scoreInput = `JD ANALYSIS:\n${JSON.stringify(jdAnalysis, null, 2)}\n\nRESUME:\n${resumeText}`;

    console.log(`[JD Score] Scoring resume ${resumeId}...`);
    const atsScore = await callAI(ATS_SCORE_PROMPT, scoreInput);
    res.json(atsScore);
  } catch (err) {
    console.error('[JD Score] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: serialize a resume document into a flat text string for LLM scoring
function serializeResume(doc) {
  const lines = [];
  if (doc.contact) {
    lines.push(`${doc.contact.name || ''}`);
    lines.push(`${doc.contact.email || ''} | ${doc.contact.phone || ''} | ${doc.contact.linkedin || ''}`);
  }
  if (doc.summary) lines.push(`SUMMARY: ${doc.summary}`);
  if (doc.education?.length) {
    lines.push('EDUCATION:');
    for (const e of doc.education) {
      lines.push(`  ${e.school} — ${e.degree} (${e.dates})`);
      if (e.coursework) lines.push(`  Coursework: ${e.coursework}`);
    }
  }
  if (doc.skills?.length) {
    lines.push('SKILLS:');
    for (const s of doc.skills) {
      lines.push(`  ${s.category}: ${s.skills}`);
    }
  }
  if (doc.experience?.length) {
    lines.push('EXPERIENCE:');
    for (const e of doc.experience) {
      lines.push(`  ${e.company} — ${e.role} (${e.dates})`);
      for (const b of (e.bullets || [])) {
        lines.push(`    - ${b.text}`);
      }
    }
  }
  if (doc.projects?.length) {
    lines.push('PROJECTS:');
    for (const p of doc.projects) {
      lines.push(`  ${p.title} ${p.techStack ? `| ${p.techStack}` : ''} (${p.date || ''})`);
      for (const b of (p.bullets || [])) {
        lines.push(`    - ${b.text}`);
      }
    }
  }
  return lines.join('\n');
}
