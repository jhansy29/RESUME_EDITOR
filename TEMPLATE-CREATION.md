# Template Creation — Design Decisions

## Content Parsing → LLM

Raw resume text → structured JSON (contact, education, experience, projects, skills).

Resume formats are too varied for reliable regex/heuristic parsing. LLM handles this.

## Style & Layout Detection → Deterministic

### PDF
- `extractPdfWithMetadata()` pulls font names, sizes, bold/italic flags, positions
- Heuristics map fonts to roles: largest = name, most common = body, bold = headings, etc.
- Margins calculated from text positions
- LaTeX detection from Computer Modern font families

### DOCX/HTML
- `detectLayoutFromHtml()` parses mammoth HTML output
- Bold/italic detected from `<strong>`/`<em>` tags
- Field ordering detected from text positions in HTML
- Row structure (single vs two-row) detected by proximity of field values
- Gap/spacer logic inferred from whitespace between fields

## Summary

| Step | Method |
|---|---|
| Content extraction | LLM |
| Section order detection | Deterministic (regex) |
| Layout detection (DOCX) | Deterministic (HTML parsing) |
| Layout detection (PDF) | Deterministic (font metadata) |
| CSS generation | Deterministic (from detected layout + format) |
