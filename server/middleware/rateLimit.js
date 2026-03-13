const passthrough = (_req, _res, next) => next();

export const globalLimiter = passthrough;
export const aiLimiter = passthrough;
export const authLimiter = passthrough;
