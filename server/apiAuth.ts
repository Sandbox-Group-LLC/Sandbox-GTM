import type { Request, Response, NextFunction } from 'express';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { storage } from './storage';
import { logWarn, logError } from './logger';

const scryptAsync = promisify(scrypt);

export interface ApiKeyContext {
  apiKeyId: string;
  organizationId: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyContext;
    }
  }
}

async function verifyApiKeySecret(secret: string, hashedSecret: string): Promise<boolean> {
  try {
    const [salt, storedHash] = hashedSecret.split(':');
    if (!salt || !storedHash) return false;
    
    const derivedKey = (await scryptAsync(secret, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(derivedKey, storedBuffer);
  } catch (error) {
    return false;
  }
}

export function isApiAuthenticated(requiredScopes: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'unauthorized',
          message: 'Missing or invalid Authorization header. Expected: Bearer <api_key>' 
        });
      }
      
      const token = authHeader.substring(7);
      const [prefix, secret] = token.split('.');
      
      if (!prefix || !secret || prefix.length !== 8 || secret.length !== 48) {
        return res.status(401).json({ 
          error: 'invalid_key_format',
          message: 'Invalid API key format. Expected format: prefix.secret' 
        });
      }
      
      const apiKey = await storage.getApiKeyByPrefix(prefix);
      
      if (!apiKey) {
        logWarn(`API key not found with prefix: ${prefix}`, 'ApiAuth');
        return res.status(401).json({ 
          error: 'invalid_key',
          message: 'Invalid API key' 
        });
      }
      
      if (apiKey.status === 'revoked') {
        logWarn(`Revoked API key attempted use: ${prefix}`, 'ApiAuth');
        return res.status(401).json({ 
          error: 'key_revoked',
          message: 'This API key has been revoked' 
        });
      }
      
      if (apiKey.status === 'paused') {
        return res.status(403).json({ 
          error: 'key_paused',
          message: 'This API key is currently paused' 
        });
      }
      
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return res.status(401).json({ 
          error: 'key_expired',
          message: 'This API key has expired' 
        });
      }
      
      const isValid = await verifyApiKeySecret(secret, apiKey.hashedSecret);
      if (!isValid) {
        logWarn(`Invalid secret for API key: ${prefix}`, 'ApiAuth');
        return res.status(401).json({ 
          error: 'invalid_key',
          message: 'Invalid API key' 
        });
      }
      
      const keyScopes = apiKey.scopes || [];
      if (requiredScopes.length > 0) {
        const hasAllScopes = requiredScopes.every(scope => keyScopes.includes(scope));
        if (!hasAllScopes) {
          return res.status(403).json({ 
            error: 'insufficient_scopes',
            message: `This API key lacks required scope(s): ${requiredScopes.filter(s => !keyScopes.includes(s)).join(', ')}`,
            requiredScopes,
            grantedScopes: keyScopes
          });
        }
      }
      
      await storage.updateApiKeyLastUsed(apiKey.id);
      
      req.apiKey = {
        apiKeyId: apiKey.id,
        organizationId: apiKey.organizationId,
        scopes: keyScopes,
      };
      
      next();
    } catch (error) {
      logError(`API key authentication error: ${error}`, 'ApiAuth');
      return res.status(500).json({ 
        error: 'authentication_error',
        message: 'Failed to authenticate API key' 
      });
    }
  };
}

export function hasScope(scope: string): (req: Request) => boolean {
  return (req: Request): boolean => {
    return req.apiKey?.scopes?.includes(scope) ?? false;
  };
}
