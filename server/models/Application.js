import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  starred: { type: Boolean, default: false },
  company: { type: String, required: true },
  jobTitle: { type: String, required: true },
  status: {
    type: String,
    enum: ['Bookmarked', 'Applied', 'Phone Screen', 'Technical', 'On-site', 'Offer', 'Accepted', 'Rejected', 'Ghosted', 'Withdrawn'],
    default: 'Applied',
  },
  url: { type: String, default: '' },
  location: { type: String, default: '' },
  salaryRange: { type: String, default: '' },
  resumeVersion: { type: String, default: '' },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  dateApplied: { type: Date, default: Date.now },
  dateUpdated: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  contactName: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
}, { timestamps: true });

export const Application = mongoose.model('Application', applicationSchema);
