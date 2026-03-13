import mongoose from 'mongoose';

const bulletSchema = new mongoose.Schema({
  id: String,
  text: String,
}, { _id: false });

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  starred: { type: Boolean, default: false },
  contact: {
    name: String,
    phone: String,
    email: String,
    linkedin: String,
    github: String,
    portfolio: String,
    googleScholar: String,
  },
  education: [{
    id: String,
    school: String,
    location: String,
    degree: String,
    gpa: String,
    dates: String,
    coursework: String,
  }],
  skills: [{
    id: String,
    category: String,
    skills: String,
  }],
  experience: [{
    id: String,
    company: String,
    location: String,
    role: String,
    dates: String,
    bullets: [bulletSchema],
  }],
  projects: [{
    id: String,
    title: String,
    techStack: String,
    date: String,
    bullets: [bulletSchema],
  }],
  summary: { type: String, default: '' },
  css: { type: String, default: '' },
  sectionOrder: { type: [String], default: ['header', 'education', 'summary', 'skills', 'experience', 'projects'] },
  customSections: [{
    id: String,
    title: String,
    format: { type: String, enum: ['bullets', 'experience', 'projects'], default: 'bullets' },
    items: [bulletSchema],
    entries: [mongoose.Schema.Types.Mixed],
  }],
  layout: { type: mongoose.Schema.Types.Mixed },
  format: {
    fontFamily: String,
    fontSize: Number,
    lineHeight: Number,
    marginTop: Number,
    marginBottom: Number,
    marginLeft: Number,
    marginRight: Number,
    nameFontSize: Number,
    contactFontSize: Number,
    headingFontSize: Number,
    sectionSpacing: Number,
    bulletSpacing: Number,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: false, versionKey: false },
});

resumeSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Resume = mongoose.model('Resume', resumeSchema);
