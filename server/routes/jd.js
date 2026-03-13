import { Router } from 'express';
import { chromium } from 'playwright';
import { callAI, callAIWithTools } from '../utils/ai.js';
import { Resume } from '../models/Resume.js';
import { SavedJD } from '../models/SavedJD.js';
import { ProfileVault } from '../models/ProfileVault.js';
import { resumeToText } from '../utils/resumeToText.js';
import { vaultToContext } from '../utils/vaultToContext.js';
import { getJobscanClient } from '../utils/jobscanClient.js';

export const jdRouter = Router();

// --- Fetch JD from URL ---

function parseJDFromHtml(html) {
  let jdText = '';
  let jobTitle = '';
  let company = '';

  // Try JSON-LD first (most job boards use this with full description)
  const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const block of jsonLdMatches) {
      const jsonStr = block.replace(/<\/?script[^>]*>/gi, '').trim();
      try {
        const data = JSON.parse(jsonStr);
        const job = data['@type'] === 'JobPosting' ? data
          : Array.isArray(data['@graph']) ? data['@graph'].find(n => n['@type'] === 'JobPosting')
          : null;
        if (job) {
          jobTitle = job.title || '';
          if (job.hiringOrganization) {
            company = typeof job.hiringOrganization === 'string'
              ? job.hiringOrganization
              : job.hiringOrganization.name || '';
          }
          if (job.description) {
            jdText = stripHtmlToText(job.description);
          }
          break;
        }
      } catch { /* not valid JSON */ }
    }
  }

  // Fallback: extract from page body
  if (!jdText) {
    jdText = extractJDFromHtml(html);
  }

  // Extract title/company from meta tags if not from JSON-LD
  if (!jobTitle) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle) jobTitle = ogTitle[1].replace(/\s*[-–|].*$/, '').trim();
  }
  if (!company) {
    const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
    if (ogSite) company = ogSite[1].trim();
  }

  return { jdText, jobTitle, company };
}

async function fetchWithBrowser(url) {
  let browser;
  try {
    console.log('[JD Fetch] Using browser for SPA:', url);
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for SPA content to render
    await page.waitForTimeout(3000);

    const html = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText);

    await browser.close();
    browser = null;

    // Try structured data from rendered page first
    const parsed = parseJDFromHtml(html);
    if (parsed.jdText && parsed.jdText.length >= 50) {
      return parsed;
    }

    // Fall back to visible text from the rendered page
    if (bodyText && bodyText.length >= 100) {
      // Try to extract title from page
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return {
        jdText: bodyText,
        jobTitle: parsed.jobTitle || (titleMatch ? titleMatch[1].trim() : ''),
        company: parsed.company || '',
      };
    }

    return null;
  } catch (err) {
    console.error('[JD Fetch] Browser error:', err.message);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}

jdRouter.post('/fetch-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" field' });
  }

  try {
    // Step 1: Try plain HTTP fetch (fast, works for static sites)
    let html = '';
    let useBrowser = false;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch {
      useBrowser = true;
    }

    // Check if the HTML looks like an SPA (empty body, mostly scripts)
    if (html) {
      const parsed = parseJDFromHtml(html);
      if (parsed.jdText && parsed.jdText.length >= 50) {
        return res.json({ jobDescription: parsed.jdText, jobTitle: parsed.jobTitle, company: parsed.company, url });
      }
      // Content too short - likely an SPA
      useBrowser = true;
    }

    // Step 2: Fall back to browser rendering for SPAs
    if (useBrowser) {
      const result = await fetchWithBrowser(url);
      if (result && result.jdText && result.jdText.length >= 50) {
        return res.json({ jobDescription: result.jdText, jobTitle: result.jobTitle, company: result.company, url });
      }
      return res.status(422).json({ error: 'Could not extract job description from this page. The site may require login or block automated access. Try pasting the JD manually.' });
    }

    return res.status(422).json({ error: 'Could not extract job description text from this URL. Try pasting the JD manually.' });
  } catch (err) {
    console.error('[JD Fetch] Error:', err.message);
    res.status(502).json({ error: `Could not fetch URL: ${err.message}` });
  }
});

function stripHtmlToText(html) {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|section|article|header)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/');
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function extractJDFromHtml(html) {
  // Try to find the main job description content area
  // Look for common job description containers
  const patterns = [
    /<div[^>]*class=["'][^"']*job[-_]?desc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["'][^"']*job[-_]?desc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    /<article[^>]*class=["'][^"']*job[^"']*["'][^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["'][^"']*posting[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const text = stripHtmlToText(match[1]);
      if (text.length > 100) return text;
    }
  }

  // Fallback: strip entire body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  return stripHtmlToText(body);
}

// --- Saved JDs CRUD ---
jdRouter.get('/saved', async (req, res) => {
  try {
    const jds = await SavedJD.find({ userId: req.userId }).sort({ updatedAt: -1 }).select('title company updatedAt');
    res.json(jds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.get('/saved/:id', async (req, res) => {
  try {
    const jd = await SavedJD.findOne({ _id: req.params.id, userId: req.userId });
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
    const jd = await SavedJD.create({ title, company, jobDescription, analysis, userId: req.userId });
    res.status(201).json(jd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.patch('/saved/:id', async (req, res) => {
  try {
    const jd = await SavedJD.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!jd) return res.status(404).json({ error: 'Saved JD not found' });
    res.json(jd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

jdRouter.delete('/saved/:id', async (req, res) => {
  try {
    await SavedJD.findOneAndDelete({ _id: req.params.id, userId: req.userId });
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
    const { jobDescription } = req.body;
    if (!jobDescription || typeof jobDescription !== 'string') {
      return res.status(400).json({ error: 'Missing "jobDescription" field' });
    }

    console.log(`[JD Analyze] Parsing ${jobDescription.length} chars...`);
    const analysis = await callAI(JD_ANALYSIS_PROMPT, jobDescription);

    // ATS scoring is done by Jobscan during scan-and-iterate, not by AI
    res.json({ ...analysis, atsScore: null });
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

    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const resumeText = resumeToText(resume.toObject());
    const scoreInput = `JD ANALYSIS:\n${JSON.stringify(jdAnalysis, null, 2)}\n\nRESUME:\n${resumeText}`;

    console.log(`[JD Score] Scoring resume ${resumeId}...`);
    const atsScore = await callAI(ATS_SCORE_PROMPT, scoreInput);
    res.json(atsScore);
  } catch (err) {
    console.error('[JD Score] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Resume Tailoring ---

const TAILOR_PROMPT = `You are a resume tailoring engine. Given a resume, a JD analysis, a VAULT of all available content, and optionally Jobscan ATS gaps, produce targeted edits to maximize ATS match rate.

CRITICAL RULES:
- NEVER fabricate experience, projects, metrics, or skills not present in the resume OR the vault
- You may SWAP resume bullets with better-matching bullets from the VAULT for the same role/company
- You may ADD or REMOVE projects using content from the VAULT
- ONLY rephrase bullets using JD vocabulary for the SAME real work
- The Skills section is the primary ATS keyword injection zone — add JD keywords freely (only real skills from vault)
- Reorder bullets so the most JD-relevant appears first under each role
- Rewrite the summary to embed missing keywords naturally (2-3 sentences max)
- Never inflate metrics, team sizes, budgets, or scope
- Each bullet must start with a strong action verb
- Use **bold** markdown for key technical terms, tools, frameworks, and metrics

VAULT USAGE RULES:
- The VAULT contains ALL available bullets, projects, and skills the candidate actually has
- You may swap a current resume bullet with a vault bullet from the SAME company/role if it better matches the JD
- You may rephrase vault bullets with JD vocabulary (same real work, different wording)
- You may add projects from the vault that are relevant to the JD
- You may remove projects from the resume that are irrelevant to the JD
- Skills in the vault's comprehensive skills list are all real — you may add any of them to the Skills section

ITERATION RULES (when iteration context is provided):
- Focus ONLY on the remaining gaps listed in the iteration context
- Do NOT re-suggest changes that were already applied in previous rounds
- Be incremental — make the minimum changes needed to close the remaining gaps
- Prioritize adding missing hard skills to the Skills section first
- Then address missing soft skills via summary or bullet rephrasing

Return ONLY valid JSON — no markdown backticks, no explanation.

The JSON must match this exact schema:
{
  "summary": "string (rewritten professional summary with JD keywords, using **bold** for key terms)",
  "skills": [
    {
      "id": "string (existing skill row ID, or 'new-N' for new rows)",
      "category": "string",
      "skills": "string (comma-separated skills)"
    }
  ],
  "bulletChanges": [
    {
      "section": "experience | projects",
      "entryId": "string (ID of the experience/project entry)",
      "bulletId": "string (ID of the bullet being changed)",
      "original": "string (original bullet text for reference)",
      "revised": "string (rephrased bullet with JD keywords, same real work, using **bold** for key terms)"
    }
  ],
  "bulletReorders": [
    {
      "section": "experience | projects",
      "entryId": "string (ID of the entry)",
      "bulletIds": ["string (ordered list of bullet IDs, most JD-relevant first)"]
    }
  ],
  "bulletSwaps": [
    {
      "section": "experience | projects",
      "entryId": "string (ID of the experience/project entry)",
      "removeBulletId": "string (ID of the bullet being replaced)",
      "addBulletText": "string (vault bullet text, optionally rephrased with JD keywords, using **bold**)",
      "vaultSource": "string (which vault company/project and theme this came from)"
    }
  ],
  "projectSwaps": {
    "add": [
      {
        "title": "string (project title from vault)",
        "techStack": "string (tech stack)",
        "date": "string (date)",
        "bullets": ["string (bullet texts with **bold**)"]
      }
    ],
    "remove": ["string (project IDs to remove from resume)"]
  }
}

GUIDELINES:
- Only include bulletChanges for bullets that actually need rephrasing — do NOT change bullets that already match well
- Only include bulletSwaps when the vault has a significantly better-matching bullet for the same role
- summary: always provide a rewritten summary optimized for this JD
- skills: provide the COMPLETE skills array (existing + new rows merged), reordered so JD-critical categories come first
- bulletReorders: only include entries where the order should change
- projectSwaps.add: only add projects from the vault that are highly relevant to the JD
- projectSwaps.remove: only remove projects that are clearly irrelevant to the JD
- For each bulletChange, the "revised" text must describe the SAME work/achievement as the "original"
- Prefer embedding missing keywords naturally over adding them awkwardly
- Keep bullets under 2 lines / ~30 words`;

jdRouter.post('/tailor', async (req, res) => {
  try {
    const { resumeId, jdAnalysis, jobscanGaps, iterationContext } = req.body;
    if (!resumeId || !jdAnalysis) {
      return res.status(400).json({ error: 'resumeId and jdAnalysis are required' });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    // Load the vault for master content
    const vault = await ProfileVault.findOne({ userId: req.userId });
    if (!vault || (!vault.experience?.length && !vault.projects?.length && !vault.skills?.length)) {
      return res.status(400).json({ error: 'Populate your Profile Vault first. Go to the Vault page to import your master resume data.' });
    }

    const doc = resume.toObject();
    const resumeText = resumeToText(doc);

    // Build context for the LLM
    let userContent = `JD ANALYSIS:\n${JSON.stringify(jdAnalysis, null, 2)}\n\n`;

    if (jobscanGaps) {
      userContent += `JOBSCAN ATS GAPS (missing keywords to address):\n`;
      if (jobscanGaps.hardSkills?.missing?.length) {
        userContent += `  Hard skills missing: ${jobscanGaps.hardSkills.missing.join(', ')}\n`;
      }
      if (jobscanGaps.softSkills?.missing?.length) {
        userContent += `  Soft skills missing: ${jobscanGaps.softSkills.missing.join(', ')}\n`;
      }
      userContent += '\n';
    }

    // Iteration context for subsequent rounds
    if (iterationContext) {
      userContent += `ITERATION CONTEXT (Round ${iterationContext.round}):\n`;
      if (iterationContext.scoreHistory?.length) {
        userContent += `  Score history: ${iterationContext.scoreHistory.map(s => `Round ${s.round}: ${s.score}%`).join(', ')}\n`;
      }
      if (iterationContext.previousChangesApplied?.length) {
        userContent += `  Already applied in previous rounds:\n`;
        for (const change of iterationContext.previousChangesApplied) {
          userContent += `    - ${change}\n`;
        }
      }
      if (iterationContext.remainingGaps) {
        const { hardSkills, softSkills } = iterationContext.remainingGaps;
        if (hardSkills?.length) userContent += `  Remaining hard skill gaps: ${hardSkills.join(', ')}\n`;
        if (softSkills?.length) userContent += `  Remaining soft skill gaps: ${softSkills.join(', ')}\n`;
      }
      userContent += `  INSTRUCTION: Focus ONLY on closing the remaining gaps above. Do NOT re-suggest changes already applied.\n\n`;
    }

    // Vault context
    const vaultText = vaultToContext(vault.toObject(), jdAnalysis.roleType);
    userContent += `${vaultText}\n`;

    userContent += `CURRENT RESUME:\n${resumeText}\n\n`;

    // Include structured resume data so LLM can reference IDs
    userContent += `RESUME STRUCTURE (with IDs):\n`;
    userContent += `Summary: ${doc.summary || '(none)'}\n`;
    userContent += `Skills:\n`;
    for (const s of (doc.skills || [])) {
      userContent += `  [${s.id}] ${s.category}: ${s.skills}\n`;
    }
    userContent += `Experience:\n`;
    for (const e of (doc.experience || [])) {
      userContent += `  [${e.id}] ${e.company} — ${e.role}\n`;
      for (const b of (e.bullets || [])) {
        userContent += `    [${b.id}] ${b.text}\n`;
      }
    }
    userContent += `Projects:\n`;
    for (const p of (doc.projects || [])) {
      userContent += `  [${p.id}] ${p.title}\n`;
      for (const b of (p.bullets || [])) {
        userContent += `    [${b.id}] ${b.text}\n`;
      }
    }

    const round = iterationContext?.round || 1;
    console.log(`[JD Tailor] Round ${round}: Generating tailored resume for ${resumeId} (${userContent.length} chars)...`);
    const tailorResult = await callAI(TAILOR_PROMPT, userContent);
    console.log(`[JD Tailor] Round ${round} done. ${tailorResult.bulletChanges?.length || 0} bullet changes, ${tailorResult.bulletSwaps?.length || 0} bullet swaps, ${tailorResult.skills?.length || 0} skill rows`);

    res.json(tailorResult);
  } catch (err) {
    console.error('[JD Tailor] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Jobscan tool definitions for Llama function calling ---
// NOTE: Tools take NO text arguments. The backend already has the resume and JD text.
// This prevents Llama from wasting tokens copying huge text into tool arguments.
const JOBSCAN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'jobscan_scan',
      description: 'Scan the current resume against the job description using Jobscan ATS checker. The resume text and JD are already loaded — just call this with no arguments. Returns match rate and skill gaps.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jobscan_rescan',
      description: 'Rescan the current resume against the same job description. The resume text is already loaded. Use this after edits have been applied. Returns updated match rate and skill gaps.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jobscan_get_gaps',
      description: 'Get detailed keyword gap analysis from the most recent scan. Returns missing keywords that need to be added.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// --- Scan with Jobscan (via Llama tool calling) + auto-generate edits ---
jdRouter.post('/scan-and-iterate', async (req, res) => {
  try {
    const { resumeId, jdAnalysis, jdText, iterationContext } = req.body;
    if (!resumeId || !jdAnalysis || !jdText) {
      return res.status(400).json({ error: 'resumeId, jdAnalysis, and jdText are required' });
    }

    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const vault = await ProfileVault.findOne({ userId: req.userId });
    const hasVault = vault && (vault.experience?.length || vault.projects?.length || vault.skills?.length);

    const doc = resume.toObject();
    const resumeText = resumeToText(doc, { stripBold: true });
    const fullResumeText = resumeToText(doc);
    const round = iterationContext?.round || 1;

    console.log(`[Scan+Iterate] Round ${round}: Starting agentic scan+iterate for resume ${resumeId} (vault: ${hasVault ? 'yes' : 'no'})`);

    // --- Tool executor: routes Llama's tool calls to JobscanMCPClient ---
    const client = await getJobscanClient(req.userId);
    let lastJobscanReport = null;

    const toolExecutor = async (name) => {
      switch (name) {
        case 'jobscan_scan': {
          const report = await client.scan(resumeText, jdText);
          lastJobscanReport = report;
          return JSON.stringify(report);
        }
        case 'jobscan_rescan': {
          const report = await client.rescan(resumeText);
          lastJobscanReport = report;
          return JSON.stringify(report);
        }
        case 'jobscan_get_gaps': {
          return await client.getGaps();
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    };

    // --- Build user message with all context Llama needs ---
    let userContent = `JD ANALYSIS:\n${JSON.stringify(jdAnalysis, null, 2)}\n\n`;
    userContent += `JOB DESCRIPTION TEXT:\n${jdText}\n\n`;

    if (iterationContext) {
      userContent += `ITERATION CONTEXT (Round ${round + 1}):\n`;
      const scoreHistory = iterationContext.scoreHistory || [];
      if (scoreHistory.length) {
        userContent += `  Score history: ${scoreHistory.map(s => `Round ${s.round}: ${s.score}%`).join(', ')}\n`;
      }
      if (iterationContext.previousChangesApplied?.length) {
        userContent += `  Already applied in previous rounds:\n`;
        for (const change of iterationContext.previousChangesApplied) {
          userContent += `    - ${change}\n`;
        }
      }
      userContent += `  INSTRUCTION: Focus ONLY on closing the remaining gaps. Do NOT re-suggest changes already applied.\n\n`;
    }

    if (hasVault) {
      const vaultText = vaultToContext(vault.toObject(), jdAnalysis.roleType);
      userContent += `${vaultText}\n`;
    }
    userContent += `CURRENT RESUME:\n${fullResumeText}\n\n`;

    userContent += `RESUME STRUCTURE (with IDs for edits):\n`;
    userContent += `Summary: ${doc.summary || '(none)'}\n`;
    userContent += `Skills:\n`;
    for (const s of (doc.skills || [])) {
      userContent += `  [${s.id}] ${s.category}: ${s.skills}\n`;
    }
    userContent += `Experience:\n`;
    for (const e of (doc.experience || [])) {
      userContent += `  [${e.id}] ${e.company} - ${e.role}\n`;
      for (const b of (e.bullets || [])) {
        userContent += `    [${b.id}] ${b.text}\n`;
      }
    }
    userContent += `Projects:\n`;
    for (const p of (doc.projects || [])) {
      userContent += `  [${p.id}] ${p.title}\n`;
      for (const b of (p.bullets || [])) {
        userContent += `    [${b.id}] ${b.text}\n`;
      }
    }

    // --- Determine whether to use scan or rescan ---
    const useRescan = client.isOnMatchReport();
    const scanTool = useRescan ? 'jobscan_rescan' : 'jobscan_scan';

    // --- System prompt: tailor instructions + MANDATORY tool workflow ---
    const systemPrompt = `${TAILOR_PROMPT}

You have Jobscan ATS scanning tools. The resume and JD are already loaded — all tools take NO arguments, just call them.

YOUR MANDATORY WORKFLOW:
STEP 1 (REQUIRED): Call ${scanTool}() to get the ATS match rate and skill gaps.
STEP 2: Review the match rate and missing skills from the result.
STEP 3: If score >= 90%, respond with ONLY: {"score": <number>, "noChangesNeeded": true}
STEP 4: If score < 90%, call jobscan_get_gaps() for detailed gaps, then generate resume edits as JSON.
STEP 5: Your final response must be ONLY valid JSON matching the edit schema above. No explanation, no markdown.

IMPORTANT: All tools take NO arguments — do NOT pass resume_text or jd_text. Just call the function with empty arguments.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    // Force the first tool call — require Llama to scan before doing anything else
    const forcedToolChoice = useRescan
      ? { type: 'function', function: { name: 'jobscan_rescan' } }
      : { type: 'function', function: { name: 'jobscan_scan' } };

    // Short-circuit: if scan returns >= 90%, stop immediately
    const shouldStop = (toolName) => {
      if ((toolName === 'jobscan_scan' || toolName === 'jobscan_rescan') && lastJobscanReport) {
        if (lastJobscanReport.matchRate >= 90) {
          console.log(`[Scan+Iterate] Score ${lastJobscanReport.matchRate}% >= 90%, stopping early`);
          return true;
        }
      }
      return false;
    };

    // --- Run agentic loop ---
    // Round 1: forced scan/rescan, Round 2: get_gaps, Round 3: generate final JSON
    // Need at least 4 rounds: tool call rounds + 1 final content round
    let result;
    try {
      result = await callAIWithTools(messages, JOBSCAN_TOOLS, toolExecutor, {
        maxRounds: 5,
        toolChoice: forcedToolChoice,
        shouldStop,
      });
    } catch (loopErr) {
      // If the agentic loop exceeded max rounds, return the scan report without edits
      // rather than failing the entire request
      console.warn(`[Scan+Iterate] Agentic loop error: ${loopErr.message}. Returning scan report only.`);
      if (lastJobscanReport) {
        return res.json({ jobscanReport: lastJobscanReport, tailorResult: null });
      }
      throw loopErr; // No scan report at all — rethrow
    }

    console.log(`[Scan+Iterate] Agentic loop complete. Last Jobscan score: ${lastJobscanReport?.matchRate || 'N/A'}%`);

    // Build response
    const jobscanReport = lastJobscanReport || { scanId: 'none', matchRate: 0, hardSkills: { found: [], missing: [] }, softSkills: { found: [], missing: [] }, otherFindings: [] };

    // result is null when shouldStop fired, or Llama said no changes needed
    if (!result || result.noChangesNeeded) {
      return res.json({ jobscanReport, tailorResult: null });
    }

    res.json({ jobscanReport, tailorResult: result });
  } catch (err) {
    console.error('[Scan+Iterate] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

