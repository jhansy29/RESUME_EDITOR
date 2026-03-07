import { Router } from 'express';
import { callAI } from '../utils/ai.js';

export const suggestionsRouter = Router();

const SUGGESTIONS_PROMPT = `You are a resume optimization engine. Given a JD analysis, a profile vault (all available career data), and the current resume, generate specific, actionable suggestions to improve ATS match.

CRITICAL RULES:
- NEVER fabricate content. Every suggestion must use REAL data from the vault.
- For bullet rephrasing: rephrase using JD vocabulary but keep the same real work and metrics.
- For skill additions: only suggest skills that exist in the vault's skills section.
- For project swaps: only suggest projects from the vault.
- For bullet swaps: only suggest bullets from the vault's bulletGroups.
- Every bullet must start with a strong action verb, contain at least one number, and be under 2 lines.
- Prioritize suggestions by impact: summary rewrite > skill additions > bullet rephrasing > project swaps.

Return ONLY valid JSON — no markdown, no backticks, no explanation.

The JSON must be an array of suggestion objects. Each suggestion must have this structure:
{
  "id": "sug-1",
  "type": "string (one of: summary_rewrite, skill_add, skill_remove, skill_reorder, bullet_rephrase, bullet_reorder, bullet_swap, project_swap, project_add, project_remove)",
  "priority": 1,
  "description": "string (short human-readable description of the change)",
  "reasoning": "string (why this change improves ATS match)",
  ... type-specific fields (see below)
}

Type-specific fields:

summary_rewrite:
  "current": "string (current summary)",
  "suggested": "string (new summary rewritten for this JD)"

skill_add:
  "category": "string (skill category to add to)",
  "keyword": "string (skill keyword to add)"

skill_remove:
  "category": "string",
  "keyword": "string (irrelevant skill to remove)"

bullet_rephrase:
  "section": "experience or projects",
  "entryIndex": 0,
  "bulletIndex": 0,
  "current": "string (current bullet text)",
  "suggested": "string (rephrased bullet using JD language, same real work)"

bullet_swap:
  "section": "experience or projects",
  "entryIndex": 0,
  "bulletIndex": 0,
  "current": "string (current bullet)",
  "suggested": "string (replacement bullet from vault)",
  "vaultSource": "string (which vault experience/project and bullet group this came from)"

project_swap:
  "removeIndex": 0,
  "removeTitle": "string (title of project to remove)",
  "addTitle": "string (title of replacement project from vault)",
  "addTechStack": "string",
  "addBullets": ["string (bullet texts for the new project)"]

project_add:
  "title": "string",
  "techStack": "string",
  "bullets": ["string"]

project_remove:
  "removeIndex": 0,
  "removeTitle": "string"

bullet_reorder:
  "section": "experience or projects",
  "entryIndex": 0,
  "currentOrder": ["string (first few words of each bullet in current order)"],
  "suggestedOrder": [0, 1, 2],
  "reasoning": "string"

Rules:
- Generate 5-15 suggestions, ordered by priority (1 = highest)
- Always include a summary_rewrite as the first suggestion
- Include 2-4 skill_add suggestions for missing JD keywords that exist in the vault
- Include 2-4 bullet_rephrase suggestions that inject JD language
- Only suggest project_swap if there's a clearly better-matching project in the vault
- IDs must be sequential: sug-1, sug-2, ...
- Return ONLY the JSON array, nothing else`;

suggestionsRouter.post('/generate', async (req, res) => {
  try {
    const { jdAnalysis, vault, currentResume } = req.body;

    if (!jdAnalysis || !currentResume) {
      return res.status(400).json({ error: 'Missing jdAnalysis or currentResume' });
    }

    const input = [
      'JD ANALYSIS:',
      JSON.stringify(jdAnalysis, null, 2),
      '',
      'PROFILE VAULT:',
      vault ? JSON.stringify(vault, null, 2) : '(No vault provided — use current resume data only)',
      '',
      'CURRENT RESUME:',
      JSON.stringify(currentResume, null, 2),
    ].join('\n');

    console.log(`[Suggestions] Generating suggestions (${input.length} chars input)...`);
    const suggestions = await callAI(SUGGESTIONS_PROMPT, input);

    // Ensure we got an array
    const result = Array.isArray(suggestions) ? suggestions : suggestions.suggestions || [];

    res.json({ suggestions: result });
  } catch (err) {
    console.error('[Suggestions] Error:', err);
    res.status(500).json({ error: err.message });
  }
});
