const buckets = new Map();

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const now = Date.now();
    const key = `${req.baseUrl}:${req.path}:${clientKey(req)}`;
    let entry = buckets.get(key);

    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
    }
    entry.count += 1;
    buckets.set(key, entry);

    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (now - v.start >= windowMs) buckets.delete(k);
      }
    }

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((entry.start + windowMs) / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

module.exports = {
  rateLimit,
  clientKey
};
