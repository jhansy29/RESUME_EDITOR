import { Router } from 'express';
import { callAI } from '../utils/ai.js';
import { Resume } from '../models/Resume.js';

export const jdRouter = Router();

const JD_ANALYSIS_PROMPT = `You are a job description analyzer for ATS resume optimization. Given a job description, extract structured keyword and requirement data.

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
        "frequency": 0
      }
    ],
    "niceToHave": [
      {
        "keyword": "string",
        "category": "string",
        "frequency": 0
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
- mustHave keywords: mentioned 2+ times in the JD, or appear in "Requirements"/"Must Have"/"Required" sections
- niceToHave keywords: mentioned once, or appear in "Preferred"/"Nice to Have"/"Bonus" sections
- frequency: count how many times each keyword appears in the full JD text
- category must be one of the specified values
- Extract ALL technical tools, frameworks, languages, platforms, and methodologies mentioned
- Include both abbreviations and full forms when present (e.g., "Natural Language Processing" AND "NLP")
- outcomeLanguage: extract verb phrases that describe what the role aims to achieve
- Be thorough — missing a keyword means the resume won't match on that term
- Return ONLY the JSON object, nothing else`;

const ATS_SCORE_PROMPT = `You are an ATS scoring engine. Given a job description analysis and a resume, calculate how well the resume matches the JD.

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

Rules:
- overall: 0-100 score representing total ATS match percentage
- keywordMatch: percentage of JD must-have keywords found in the resume (exact or close synonym)
- skillsMatch: percentage of JD technical skills present in resume's skills section
- experienceMatch: how well resume experience aligns with JD requirements (0-100)
- educationMatch: how well resume education meets JD requirements (0-100)
- matchedKeywords: list every JD keyword (both must-have and nice-to-have) that appears in the resume
- missingKeywords: list every JD keyword that does NOT appear in the resume
- strongMatches: 2-4 brief statements about where the resume excels for this JD
- gaps: 2-4 brief statements about what's missing or weak
- Be precise: a keyword "matches" only if the exact term or a very close variant appears in the resume text
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
