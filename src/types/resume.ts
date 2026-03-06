// --- Configurable Row Layout ---
// A segment is either a reference to a structured field or a literal/custom text.
export interface RowSegment {
  type: 'field' | 'literal' | 'spacer';
  value: string;       // field name (e.g. 'school') for 'field', literal text for 'literal', ignored for 'spacer'
  className?: string;  // optional CSS class
  gap?: number;        // right margin in pt after this segment (default: 0 for fields, flex:1 for spacers)
}

// --- Section-Level Layout Schema ---
// Describes HOW each section renders (field arrangement, styling, bullet markers).
// Applied uniformly to all entries within a section.

export type HeaderField = 'phone' | 'email' | 'linkedin' | 'github' | 'portfolio' | 'googleScholar';

export interface HeaderLayout {
  nameAlignment: 'center' | 'left' | 'right';
  contactLayout: 'inline' | 'stacked' | 'two-column';
  contactSeparator: string;
  contactFields: HeaderField[];
}

export interface SectionEntryLayout {
  rows: RowSegment[][];
  showEntryBulletMarker: boolean;
  boldField: string | null;
  italicField: string | null;
}

export interface SkillsLayout {
  showCategories: boolean;
  showBulletMarker: boolean;
  displayMode: 'list' | 'grid';
  skillSeparator: string;
}

export interface ProjectsSectionLayout extends SectionEntryLayout {
  techStackPosition: 'inline' | 'below' | 'none';
}

export interface EducationSectionLayout extends SectionEntryLayout {
  showCoursework: boolean;
}

export interface LayoutSchema {
  header: HeaderLayout;
  education: EducationSectionLayout;
  experience: SectionEntryLayout;
  skills: SkillsLayout;
  projects: ProjectsSectionLayout;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  github?: string;
  portfolio?: string;
  googleScholar?: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  location: string;
  degree: string;
  gpa?: string;
  dates: string;
  coursework?: string;
  extras?: Record<string, string>;
  rowLayout?: RowSegment[][];
}

export interface SkillRow {
  id: string;
  category: string;
  skills: string;
}

export interface Bullet {
  id: string;
  text: string; // Supports **bold** markdown syntax
}

export interface ExperienceEntry {
  id: string;
  company: string;
  location: string;
  role: string;
  dates: string;
  bullets: Bullet[];
  extras?: Record<string, string>;
  rowLayout?: RowSegment[][];
}

export interface ProjectEntry {
  id: string;
  title: string;
  techStack?: string;
  date?: string;
  bullets: Bullet[];
  extras?: Record<string, string>;
  rowLayout?: RowSegment[][];
}

export interface FormatSettings {
  fontFamily: string;
  fontSize: number;         // body text in pt
  lineHeight: number;       // unitless multiplier
  marginTop: number;        // in inches
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  nameFontSize: number;     // in pt
  contactFontSize: number;  // in pt
  headingFontSize: number;  // section headings in pt
  sectionSpacing: number;   // gap above section headings in pt
  bulletSpacing: number;    // gap between bullet items in pt
}

export const DEFAULT_FORMAT: FormatSettings = {
  fontFamily: "'Computer Modern Serif', Cambria, 'Times New Roman', serif",
  fontSize: 9.5,
  lineHeight: 1.18,
  marginTop: 0.22,
  marginBottom: 0.22,
  marginLeft: 0.42,
  marginRight: 0.42,
  nameFontSize: 24,
  contactFontSize: 9,
  headingFontSize: 11,
  sectionSpacing: 5,
  bulletSpacing: 0,
};

export interface CustomSection {
  id: string;
  title: string;
  items: Bullet[];
}

export const DEFAULT_SECTION_ORDER = ['header', 'education', 'summary', 'skills', 'experience', 'projects'];

// --- Default Row Layouts ---
export const DEFAULT_EDU_LAYOUT: RowSegment[][] = [
  [
    { type: 'field', value: 'school', className: 'edu-school' },
    { type: 'spacer', value: '' },
    { type: 'field', value: 'location', className: 'edu-location' },
  ],
  [
    { type: 'field', value: 'degree', className: 'edu-degree' },
    { type: 'field', value: 'gpa', className: 'edu-gpa' },
    { type: 'spacer', value: '' },
    { type: 'field', value: 'dates', className: 'edu-dates' },
  ],
  [
    { type: 'field', value: 'coursework', className: 'edu-coursework' },
  ],
];

export const DEFAULT_EXP_LAYOUT: RowSegment[][] = [
  [
    { type: 'field', value: 'company', className: 'entry-company' },
    { type: 'spacer', value: '' },
    { type: 'field', value: 'location', className: 'entry-location' },
  ],
  [
    { type: 'field', value: 'role', className: 'entry-role' },
    { type: 'spacer', value: '' },
    { type: 'field', value: 'dates', className: 'entry-dates' },
  ],
];

export const DEFAULT_PROJ_LAYOUT: RowSegment[][] = [
  [
    { type: 'field', value: 'title', className: 'project-title' },
    { type: 'field', value: 'techStack', className: 'project-tech' },
    { type: 'spacer', value: '' },
    { type: 'field', value: 'date', className: 'project-date' },
  ],
];

export const DEFAULT_LAYOUT: LayoutSchema = {
  header: {
    nameAlignment: 'center',
    contactLayout: 'inline',
    contactSeparator: ' | ',
    contactFields: ['phone', 'email', 'linkedin', 'github', 'portfolio', 'googleScholar'],
  },
  education: {
    rows: DEFAULT_EDU_LAYOUT,
    showEntryBulletMarker: true,
    boldField: 'school',
    italicField: 'degree',
    showCoursework: true,
  },
  experience: {
    rows: DEFAULT_EXP_LAYOUT,
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
    rows: DEFAULT_PROJ_LAYOUT,
    showEntryBulletMarker: true,
    boldField: 'title',
    italicField: null,
    techStackPosition: 'inline',
  },
};

export interface ResumeData {
  contact: ContactInfo;
  education: EducationEntry[];
  skills: SkillRow[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  summary?: string;
  format?: FormatSettings;
  css?: string;
  layout?: LayoutSchema;
  customSections?: CustomSection[];
  sectionOrder?: string[];
  sectionGaps?: Record<string, number>;  // per-section top margin overrides in pt
}
