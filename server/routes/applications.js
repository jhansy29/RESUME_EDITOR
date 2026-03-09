import { Router } from 'express';
import { Application } from '../models/Application.js';

export const applicationsRouter = Router();

// List all applications (sorted by most recent)
applicationsRouter.get('/', async (req, res) => {
  try {
    const apps = await Application.find().sort({ dateApplied: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single application
applicationsRouter.get('/:id', async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create application
applicationsRouter.post('/', async (req, res) => {
  try {
    const app = await Application.create(req.body);
    res.status(201).json(app);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update application
applicationsRouter.put('/:id', async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { ...req.body, dateUpdated: new Date() },
      { new: true, runValidators: true }
    );
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(app);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete application
applicationsRouter.delete('/:id', async (req, res) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Scrape a job URL and extract fields ---

function stripHtml(html) {
  // Remove script/style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|section|article|header)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/');
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function extractFromMeta(html) {
  const result = { company: '', jobTitle: '', location: '', salaryRange: '' };

  // Try JSON-LD (most job boards use this)
  const jsonLdMatch = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const jsonStr = block.replace(/<\/?script[^>]*>/gi, '').trim();
      try {
        const data = JSON.parse(jsonStr);
        const job = data['@type'] === 'JobPosting' ? data
          : Array.isArray(data['@graph']) ? data['@graph'].find(n => n['@type'] === 'JobPosting')
          : null;
        if (job) {
          result.jobTitle = job.title || '';
          if (job.hiringOrganization) {
            result.company = typeof job.hiringOrganization === 'string'
              ? job.hiringOrganization
              : job.hiringOrganization.name || '';
          }
          if (job.jobLocation) {
            const loc = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
            if (loc?.address) {
              const addr = loc.address;
              const parts = [addr.addressLocality, addr.addressRegion].filter(Boolean);
              result.location = parts.join(', ');
            }
          }
          if (job.jobLocationType === 'TELECOMMUTE' || /remote/i.test(JSON.stringify(job.jobLocation || ''))) {
            result.location = result.location ? `${result.location} / Remote` : 'Remote';
          }
          if (job.baseSalary) {
            const sal = job.baseSalary;
            if (sal.value) {
              const v = sal.value;
              if (v.minValue && v.maxValue) {
                result.salaryRange = `$${Math.round(v.minValue / 1000)}k-$${Math.round(v.maxValue / 1000)}k`;
              } else if (v.value) {
                result.salaryRange = `$${Math.round(v.value / 1000)}k`;
              }
            }
          }
          return result; // JSON-LD is the best source, use it
        }
      } catch { /* not valid JSON, skip */ }
    }
  }

  // Fallback: og:title, og:site_name, meta tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle) result.jobTitle = ogTitle[1].replace(/\s*[-–|].*$/, '').trim();

  const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSite) result.company = ogSite[1].trim();

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag && !result.jobTitle) {
    // "Job Title - Company | Board" or "Job Title at Company"
    const parts = titleTag[1].split(/\s*[-–|]\s*/);
    if (parts.length >= 2) {
      result.jobTitle = result.jobTitle || parts[0].trim();
      result.company = result.company || parts[1].trim();
    } else {
      const atMatch = titleTag[1].match(/^(.+?)\s+at\s+(.+)/i);
      if (atMatch) {
        result.jobTitle = result.jobTitle || atMatch[1].trim();
        result.company = result.company || atMatch[2].trim();
      }
    }
  }

  return result;
}

function parseTextFields(text) {
  const full = text.replace(/\n/g, ' ');

  let location = '';
  const locExplicit = text.match(/(?:location|office|based\s+in)\s*[:：]\s*(.+)/i);
  if (locExplicit) location = locExplicit[1].trim().split('\n')[0].replace(/[.]$/, '');
  else {
    const cityState = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})\b/);
    if (cityState) location = cityState[1];
  }
  if (/\bremote\b/i.test(full)) location = location ? `${location} / Remote` : 'Remote';
  else if (/\bhybrid\b/i.test(full)) location = location ? `${location} / Hybrid` : 'Hybrid';

  let salaryRange = '';
  const salaryMatch = full.match(/\$[\d,]+k?\s*[-–to]+\s*\$[\d,]+k?/i)
    || full.match(/\$[\d,]+\s*[-–]\s*\$[\d,]+/i)
    || full.match(/(?:salary|compensation|pay)\s*[:：]\s*([^\n]{5,40})/i);
  if (salaryMatch) salaryRange = (salaryMatch[1] || salaryMatch[0]).trim();

  return { location, salaryRange };
}

applicationsRouter.post('/scrape-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" field' });
  }

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

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch URL (${response.status})` });
    }

    const html = await response.text();

    // Extract from structured data (JSON-LD, meta tags)
    const meta = extractFromMeta(html);

    // Extract from page text as fallback
    const plainText = stripHtml(html);
    const textFields = parseTextFields(plainText);

    // Merge: meta wins, text fills gaps
    const result = {
      company: meta.company || '',
      jobTitle: meta.jobTitle || '',
      location: meta.location || textFields.location || '',
      salaryRange: meta.salaryRange || textFields.salaryRange || '',
      url,
    };

    res.json(result);
  } catch (err) {
    console.error('[Scrape] Error:', err.message);
    res.status(502).json({ error: 'Could not fetch or parse the URL' });
  }
});

// Get stats/summary
applicationsRouter.get('/stats/summary', async (req, res) => {
  try {
    const total = await Application.countDocuments();
    const byStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusMap = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });
    res.json({ total, byStatus: statusMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
