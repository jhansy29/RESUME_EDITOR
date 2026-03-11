import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  quotas: {
    maxResumes: { type: Number, default: 5 },
    maxApplications: { type: Number, default: 50 },
    maxSavedJDs: { type: Number, default: 10 },
  },
  jobscanCredentials: {
    email: { type: String, default: '' },
    password: { type: String, default: '' },
  },
  refreshTokens: [{
    token: String,
    expiresAt: Date,
  }],
}, {
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform(_, ret) {
      delete ret.passwordHash;
      delete ret.refreshTokens;
      delete ret.jobscanCredentials;
      return ret;
    },
  },
});

// Clean up expired refresh tokens on save
userSchema.pre('save', function () {
  if (this.refreshTokens?.length) {
    this.refreshTokens = this.refreshTokens.filter(
      (t) => t.expiresAt > new Date()
    );
  }
});

export const User = mongoose.model('User', userSchema);
