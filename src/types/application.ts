export type ApplicationStatus =
  | 'Bookmarked'
  | 'Applied'
  | 'Phone Screen'
  | 'Technical'
  | 'On-site'
  | 'Offer'
  | 'Accepted'
  | 'Rejected'
  | 'Ghosted'
  | 'Withdrawn';

export type Priority = 'Low' | 'Medium' | 'High';

export interface Application {
  _id: string;
  starred?: boolean;
  company: string;
  jobTitle: string;
  status: ApplicationStatus;
  url: string;
  location: string;
  salaryRange: string;
  resumeVersion: string;
  resumeId?: string;
  dateApplied: string;
  dateUpdated: string;
  notes: string;
  priority: Priority;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationInput = Omit<Application, '_id' | 'createdAt' | 'updatedAt'>;

export interface ApplicationStats {
  total: number;
  byStatus: Record<string, number>;
}
