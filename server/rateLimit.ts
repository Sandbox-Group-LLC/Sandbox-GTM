import rateLimit from 'express-rate-limit';
import type { Response } from 'express';
import { logWarn } from './logger';

function createRateLimiter(windowMs: number, max: number, routeName: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res: Response) => {
      logWarn(`Rate limit exceeded for ${routeName}`, 'RateLimit');
      res.status(429).json({ 
        message: 'Too many requests, please try again later.' 
      });
    },
  });
}

export const createPaymentIntentLimiter = createRateLimiter(
  60 * 1000,
  10,
  'create-payment-intent'
);

export const verifyPaymentLimiter = createRateLimiter(
  60 * 1000,
  20,
  'verify-payment'
);

export const publicRegistrationLimiter = createRateLimiter(
  60 * 1000,
  5,
  'public-registration'
);

export const validateInviteCodeLimiter = createRateLimiter(
  60 * 1000,
  30,
  'validate-invite-code'
);
