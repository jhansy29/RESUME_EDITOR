import mongoose from 'mongoose';

const savedJDSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  company: { type: String, default: '' },
  jobDescription: { type: String, required: true },
  analysis: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

export const SavedJD = mongoose.model('SavedJD', savedJDSchema);
