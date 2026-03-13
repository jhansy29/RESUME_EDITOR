/**
 * Serialize a ProfileVault document into a compact text block for LLM prompts.
 * Filters/highlights content by roleType for relevance.
 */
export function vaultToContext(vault, roleType) {
  if (!vault) return '';

  const lines = [];
  lines.push('VAULT — ALL AVAILABLE CONTENT (use these to swap bullets, add projects, add skills):');
  lines.push('');

  // Summary variants
  if (vault.summaryVariants?.length) {
    lines.push('SUMMARY VARIANTS:');
    for (const sv of vault.summaryVariants) {
      lines.push(`  [${sv.label || 'Untitled'}]: ${sv.text}`);
    }
    lines.push('');
  }

  // Experience with bullet groups
  if (vault.experience?.length) {
    lines.push('EXPERIENCE BULLETS (available for swapping):');
    for (const exp of vault.experience) {
      lines.push(`  ${exp.company} — ${exp.role} (${exp.dates})`);
      if (exp.context) lines.push(`    Context: ${exp.context}`);
      for (const bg of (exp.bulletGroups || [])) {
        lines.push(`    [Theme: ${bg.theme || 'General'}]`);
        for (const b of (bg.bullets || [])) {
          const tags = b.tags?.length ? ` (tags: ${b.tags.join(', ')})` : '';
          const metrics = b.metrics?.length ? ` (metrics: ${b.metrics.join(', ')})` : '';
          lines.push(`      - ${b.text}${tags}${metrics}`);
        }
      }
    }
    lines.push('');
  }

  // Projects with bullet groups
  if (vault.projects?.length) {
    lines.push('PROJECTS (available for adding/swapping):');
    for (const proj of vault.projects) {
      lines.push(`  ${proj.title} | ${proj.techStack || ''} | ${proj.date || ''}`);
      if (proj.description) lines.push(`    ${proj.description}`);
      for (const bg of (proj.bulletGroups || [])) {
        for (const b of (bg.bullets || [])) {
          lines.push(`    - ${b.text}`);
        }
      }
    }
    lines.push('');
  }

  // Comprehensive skills
  if (vault.skills?.length) {
    lines.push('COMPREHENSIVE SKILLS (all real skills the candidate has):');
    for (const sk of vault.skills) {
      lines.push(`  ${sk.category}: ${sk.skills}`);
    }
    lines.push('');
  }

  // Role type hint
  if (roleType) {
    lines.push(`TARGET ROLE TYPE: ${roleType}`);
    lines.push('Prioritize bullets and skills most relevant to this role type.');
    lines.push('');
  }

  return lines.join('\n');
}
