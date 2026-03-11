import mongoose from 'mongoose';

const vaultBulletSchema = new mongoose.Schema({
  id: String,
  text: String,
  tags: [String],
  metrics: [String],
}, { _id: false });

const bulletGroupSchema = new mongoose.Schema({
  id: String,
  theme: String,
  bullets: [vaultBulletSchema],
}, { _id: false });

const vaultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, default: 'My Vault' },
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
  certifications: [{
    id: String,
    name: String,
    issuer: String,
    date: String,
  }],
  summaryVariants: [{
    id: String,
    label: String,
    text: String,
  }],
  experience: [{
    id: String,
    company: String,
    location: String,
    role: String,
    dates: String,
    context: String,
    bulletGroups: [bulletGroupSchema],
  }],
  projects: [{
    id: String,
    title: String,
    techStack: String,
    date: String,
    description: String,
    githubUrl: String,
    bulletGroups: [bulletGroupSchema],
  }],
  skills: [{
    id: String,
    category: String,
    skills: String,
  }],
  extracurriculars: [{
    id: String,
    text: String,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: false, versionKey: false },
});

export const ProfileVault = mongoose.model('ProfileVault', vaultSchema);
