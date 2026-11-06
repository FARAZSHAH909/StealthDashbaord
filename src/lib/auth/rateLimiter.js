/**
 * IN-MEMORY PROGRESSIVE RATE LIMITER & BRUTE FORCE SHIELD
 */

class RateLimiter {
  constructor() {
    this.attempts = new Map(); // ip/identifier -> { count, lockedUntil, lastAttempt }
  }

  getRecord(identifier) {
    if (!this.attempts.has(identifier)) {
      this.attempts.set(identifier, { count: 0, lockedUntil: 0, lastAttempt: Date.now() });
    }
    return this.attempts.get(identifier);
  }

  isLocked(identifier) {
    const record = this.getRecord(identifier);
    if (record.lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return { locked: true, remainingSeconds };
    }
    return { locked: false, remainingSeconds: 0 };
  }

  recordFailure(identifier, maxAttempts = 5, lockMinutes = 15) {
    const record = this.getRecord(identifier);
    record.count += 1;
    record.lastAttempt = Date.now();

    if (record.count >= maxAttempts) {
      record.lockedUntil = Date.now() + lockMinutes * 60 * 1000;
      return {
        locked: true,
        remainingSeconds: lockMinutes * 60,
        attempts: record.count,
      };
    }

    return {
      locked: false,
      remainingAttempts: maxAttempts - record.count,
      attempts: record.count,
    };
  }

  recordSuccess(identifier) {
    this.attempts.delete(identifier);
  }

  resetAll() {
    this.attempts.clear();
  }

  getMetrics() {
    let totalTracked = this.attempts.size;
    let currentlyLocked = 0;
    const now = Date.now();
    for (const record of this.attempts.values()) {
      if (record.lockedUntil > now) currentlyLocked++;
    }
    return { totalTracked, currentlyLocked };
  }
}

// Global singleton across server routes
const globalRateLimiter = globalThis.__authRateLimiter || new RateLimiter();
if (process.env.NODE_ENV !== "production") {
  globalThis.__authRateLimiter = globalRateLimiter;
}

export default globalRateLimiter;

