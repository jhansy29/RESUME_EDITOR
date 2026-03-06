import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
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
  css: { type: String, default: '' },
  layout: { type: mongoose.Schema.Types.Mixed },
  sectionOrder: { type: [String], default: ['header', 'education', 'summary', 'skills', 'experience', 'projects'] },
  resumeData: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  toJSON: { virtuals: false, versionKey: false },
});

export const Template = mongoose.model('Template', templateSchema);
