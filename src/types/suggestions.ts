export type SuggestionType =
  | 'summary_rewrite'
  | 'skill_add'
  | 'skill_remove'
  | 'skill_reorder'
  | 'bullet_rephrase'
  | 'bullet_reorder'
  | 'bullet_swap'
  | 'project_swap'
  | 'project_add'
  | 'project_remove';

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

export interface BaseSuggestion {
  id: string;
  type: SuggestionType;
  priority: number;
  description: string;
  reasoning: string;
  status: SuggestionStatus;
}

export interface SummaryRewriteSuggestion extends BaseSuggestion {
  type: 'summary_rewrite';
  current: string;
  suggested: string;
}

export interface SkillAddSuggestion extends BaseSuggestion {
  type: 'skill_add';
  category: string;
  keyword: string;
}

export interface SkillRemoveSuggestion extends BaseSuggestion {
  type: 'skill_remove';
  category: string;
  keyword: string;
}

export interface BulletRephraseSuggestion extends BaseSuggestion {
  type: 'bullet_rephrase';
  section: 'experience' | 'projects';
  entryIndex: number;
  bulletIndex: number;
  current: string;
  suggested: string;
}

export interface BulletSwapSuggestion extends BaseSuggestion {
  type: 'bullet_swap';
  section: 'experience' | 'projects';
  entryIndex: number;
  bulletIndex: number;
  current: string;
  suggested: string;
  vaultSource: string;
}

export interface ProjectSwapSuggestion extends BaseSuggestion {
  type: 'project_swap';
  removeIndex: number;
  removeTitle: string;
  addTitle: string;
  addTechStack: string;
  addBullets: string[];
}

export interface ProjectAddSuggestion extends BaseSuggestion {
  type: 'project_add';
  title: string;
  techStack: string;
  bullets: string[];
}

export interface ProjectRemoveSuggestion extends BaseSuggestion {
  type: 'project_remove';
  removeIndex: number;
  removeTitle: string;
}

export interface BulletReorderSuggestion extends BaseSuggestion {
  type: 'bullet_reorder';
  section: 'experience' | 'projects';
  entryIndex: number;
  suggestedOrder: number[];
}

export type Suggestion =
  | SummaryRewriteSuggestion
  | SkillAddSuggestion
  | SkillRemoveSuggestion
  | BulletRephraseSuggestion
  | BulletSwapSuggestion
  | ProjectSwapSuggestion
  | ProjectAddSuggestion
  | ProjectRemoveSuggestion
  | BulletReorderSuggestion;
