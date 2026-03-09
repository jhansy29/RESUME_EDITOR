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
