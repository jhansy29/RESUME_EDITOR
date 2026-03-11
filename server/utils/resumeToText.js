/**
 * Serialize a resume document (MongoDB object) into plain text.
 * Used for LLM scoring and Jobscan ATS scanning.
 *
 * @param {object} doc - Resume document (from MongoDB .toObject() or plain JSON)
 * @param {object} [opts]
 * @param {boolean} [opts.stripBold=false] - Strip **bold** markdown markers
 * @returns {string}
 */
export function resumeToText(doc, { stripBold = false } = {}) {
  const lines = [];

  if (doc.contact) {
    lines.push(`${doc.contact.name || ''}`);
    lines.push(`${doc.contact.email || ''} | ${doc.contact.phone || ''} | ${doc.contact.linkedin || ''}`);
  }

  if (doc.summary) {
    let summary = doc.summary;
    if (stripBold) summary = summary.replace(/\*\*/g, '');
    lines.push(`SUMMARY: ${summary}`);
  }

  if (doc.education?.length) {
    lines.push('EDUCATION:');
    for (const e of doc.education) {
      lines.push(`  ${e.school} — ${e.degree} (${e.dates})`);
      if (e.gpa) lines.push(`  GPA: ${e.gpa}`);
      if (e.coursework) lines.push(`  Coursework: ${e.coursework}`);
    }
  }

  if (doc.skills?.length) {
    lines.push('SKILLS:');
    for (const s of doc.skills) {
      let skillText = s.skills;
      if (stripBold) skillText = skillText.replace(/\*\*/g, '');
      lines.push(`  ${s.category}: ${skillText}`);
    }
  }

  if (doc.experience?.length) {
    lines.push('EXPERIENCE:');
    for (const e of doc.experience) {
      lines.push(`  ${e.company} — ${e.role} (${e.dates})`);
      for (const b of (e.bullets || [])) {
        let text = b.text;
        if (stripBold) text = text.replace(/\*\*/g, '');
        lines.push(`    - ${text}`);
      }
    }
  }

  if (doc.projects?.length) {
    lines.push('PROJECTS:');
    for (const p of doc.projects) {
      lines.push(`  ${p.title} ${p.techStack ? `| ${p.techStack}` : ''} (${p.date || ''})`);
      for (const b of (p.bullets || [])) {
        let text = b.text;
        if (stripBold) text = text.replace(/\*\*/g, '');
        lines.push(`    - ${text}`);
      }
    }
  }

  return lines.join('\n');
}
