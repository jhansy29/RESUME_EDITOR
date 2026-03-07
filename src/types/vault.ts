import type { ContactInfo, SkillRow, EducationEntry } from './resume';

export interface VaultBullet {
  id: string;
  text: string;
  tags: string[];
  metrics: string[];
}

export interface BulletGroup {
  id: string;
  theme: string;
  bullets: VaultBullet[];
}

export interface VaultExperience {
  id: string;
  company: string;
  location: string;
  role: string;
  dates: string;
  context: string;
  bulletGroups: BulletGroup[];
}

export interface VaultProject {
  id: string;
  title: string;
  techStack: string;
  date: string;
  description: string;
  githubUrl: string;
  bulletGroups: BulletGroup[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface SummaryVariant {
  id: string;
  label: string;
  text: string;
}

export interface Extracurricular {
  id: string;
  text: string;
}

export interface ProfileVault {
  _id?: string;
  name: string;
  contact: ContactInfo;
  education: EducationEntry[];
  certifications: Certification[];
  summaryVariants: SummaryVariant[];
  experience: VaultExperience[];
  projects: VaultProject[];
  skills: SkillRow[];
  extracurriculars: Extracurricular[];
  createdAt?: string;
  updatedAt?: string;
}
