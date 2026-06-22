"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.createRateLimiter = void 0;
const store = new Map();
const createRateLimiter = (maxRequests, windowMs) => {
    return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || entry.resetAt <= now) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (entry.count >= maxRequests) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
        entry.count += 1;
        return next();
    };
};
exports.createRateLimiter = createRateLimiter;
exports.authRateLimiter = (0, exports.createRateLimiter)(10, 15 * 60 * 1000);
