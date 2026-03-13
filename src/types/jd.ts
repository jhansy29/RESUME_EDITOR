export interface JDKeyword {
  keyword: string;
  category: 'language' | 'framework' | 'tool' | 'platform' | 'methodology' | 'skill' | 'soft_skill' | 'domain';
  frequency: number;
  context?: 'required' | 'described_in_responsibilities' | 'repeated_emphasis' | 'preferred' | 'example_in_parenthetical' | 'mentioned_once';
}

export interface JDAnalysis {
  jobTitle: string;
  roleType: string;
  company: string;
  keywords: {
    mustHave: JDKeyword[];
    niceToHave: JDKeyword[];
  };
  requirements: {
    technical: string[];
    experience: string[];
    education: string[];
    soft: string[];
  };
  outcomeLanguage: string[];
  atsScore: ATSScore | null;
}

export interface ATSScore {
  overall: number;
  breakdown: {
    keywordMatch: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  strongMatches: string[];
  gaps: string[];
}

// --- Jobscan ATS Scan ---
export interface JobscanReport {
  scanId: string;
  matchRate: number;
  hardSkills: { found: string[]; missing: string[] };
  softSkills: { found: string[]; missing: string[] };
  otherFindings: Array<{
    category: string;
    label: string;
    status: string;
    details?: string;
  }>;
}

export interface JobscanStatus {
  active: boolean;
  onMatchReport: boolean;
  error?: string;
}

// --- Resume Tailoring ---
export interface TailorBulletChange {
  section: 'experience' | 'projects';
  entryId: string;
  bulletId: string;
  original: string;
  revised: string;
}

export interface TailorBulletReorder {
  section: 'experience' | 'projects';
  entryId: string;
  bulletIds: string[];
}

export interface TailorSkillRow {
  id: string;
  category: string;
  skills: string;
}

export interface TailorBulletSwap {
  section: 'experience' | 'projects';
  entryId: string;
  removeBulletId: string;
  addBulletText: string;
  vaultSource: string;
}

export interface TailorProjectSwap {
  add: Array<{ title: string; techStack: string; date: string; bullets: string[] }>;
  remove: string[];
}

export interface TailorResult {
  summary: string;
  skills: TailorSkillRow[];
  bulletChanges: TailorBulletChange[];
  bulletReorders: TailorBulletReorder[];
  bulletSwaps?: TailorBulletSwap[];
  projectSwaps?: TailorProjectSwap;
}

// --- Iteration Loop ---
export interface IterationContext {
  round: number;
  scoreHistory: Array<{ round: number; score: number }>;
  previousChangesApplied: string[];
  remainingGaps: { hardSkills: string[]; softSkills: string[] };
}

// --- Workflow ---
export type WorkflowStep = 'input' | 'analyzed' | 'tailoring' | 'tailor-preview' | 'applying' | 'scanning' | 'results';
