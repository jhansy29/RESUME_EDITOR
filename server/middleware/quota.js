import { User } from '../models/User.js';

const PLAN_QUOTAS = {
  free: { maxResumes: 5, maxApplications: 50, maxSavedJDs: 10 },
  pro: { maxResumes: 25, maxApplications: 200, maxSavedJDs: 50 },
};

export function checkQuota(resourceModel, limitField) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ error: 'User not found' });

      const quotas = { ...PLAN_QUOTAS[user.plan || 'free'], ...user.quotas };
      const limit = quotas[limitField];

      if (limit !== undefined) {
        const count = await resourceModel.countDocuments({ userId: req.userId });
        if (count >= limit) {
          return res.status(403).json({
            error: `Quota exceeded: maximum ${limit} ${limitField.replace('max', '').toLowerCase()} allowed on ${user.plan} plan`,
            limit,
            current: count,
          });
        }
      }

      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
