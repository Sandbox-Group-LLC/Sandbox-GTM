type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_FIELD_NAMES = new Set([
  'password', 'secret', 'token', 'apikey', 'authorization',
  'cookie', 'session', 'creditcard', 'cardnumber',
  'cvv', 'cvc', 'ssn', 'socialsecurity', 'stripesecretkey',
  'stripepublishablekey', 'paymentintentid', 'clientsecret'
]);

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /sk_live_[a-zA-Z0-9]+/g, replacement: 'sk_live_[REDACTED]' },
  { pattern: /sk_test_[a-zA-Z0-9]+/g, replacement: 'sk_test_[REDACTED]' },
  { pattern: /pk_live_[a-zA-Z0-9]+/g, replacement: 'pk_live_[REDACTED]' },
  { pattern: /pk_test_[a-zA-Z0-9]+/g, replacement: 'pk_test_[REDACTED]' },
  { pattern: /pi_[a-zA-Z0-9]+/g, replacement: 'pi_[REDACTED]' },
  { pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /token[=:]\s*["']?[a-zA-Z0-9._-]+["']?/gi, replacement: 'token=[REDACTED]' },
  { pattern: /api[_-]?key[=:]\s*["']?[a-zA-Z0-9._-]+["']?/gi, replacement: 'api_key=[REDACTED]' },
  { pattern: /password[=:]\s*["']?[^\s"']+["']?/gi, replacement: 'password=[REDACTED]' },
  { pattern: /secret[=:]\s*["']?[a-zA-Z0-9._-]+["']?/gi, replacement: 'secret=[REDACTED]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  { pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, replacement: '[CARD_REDACTED]' },
  { pattern: /\b\d{3,4}\b(?=.*(?:cvv|cvc|security))/gi, replacement: '[CVV_REDACTED]' },
];

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 10;
const MAX_OBJECT_DEPTH = 3;

function isSensitiveFieldName(key: string): boolean {
  const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_FIELD_NAMES.has(lowerKey) || 
    lowerKey.includes('password') || 
    lowerKey.includes('secret') || 
    lowerKey.includes('token') ||
    lowerKey.includes('apikey') ||
    lowerKey.includes('creditcard');
}

function sanitizeObject(obj: unknown, depth: number = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (depth > MAX_OBJECT_DEPTH) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    const sanitized = redactSensitiveData(obj);
    return sanitized.length > MAX_STRING_LENGTH 
      ? sanitized.substring(0, MAX_STRING_LENGTH) + '...[TRUNCATED]' 
      : sanitized;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle circular references
  if (typeof obj === 'object') {
    if (seen.has(obj)) {
      return '[CIRCULAR_REFERENCE]';
    }
    seen.add(obj);
  }

  // Handle Error objects specially - extract safe properties only
  if (obj instanceof Error || (obj && typeof obj === 'object' && 'message' in obj && 'name' in obj)) {
    const errObj = obj as { name?: string; message?: string; code?: string; stack?: string };
    return {
      name: errObj.name || 'Error',
      message: redactSensitiveData(String(errObj.message || '')),
      code: errObj.code,
      // Don't include stack in sanitized output to avoid verbose logs
    };
  }

  if (Array.isArray(obj)) {
    const truncated = obj.slice(0, MAX_ARRAY_LENGTH);
    const sanitized = truncated.map(item => sanitizeObject(item, depth + 1, seen));
    if (obj.length > MAX_ARRAY_LENGTH) {
      sanitized.push(`...[${obj.length - MAX_ARRAY_LENGTH} more items]`);
    }
    return sanitized;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    // Skip objects with circular-prone properties (Socket, HTTPParser, etc.)
    const dangerousKeys = ['socket', 'parser', '_socket', 'connection', 'client', '_readableState', '_writableState'];
    const keys = Object.keys(obj as Record<string, unknown>);
    
    for (const key of keys) {
      if (isSensitiveFieldName(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (dangerousKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[INTERNAL_OBJECT]';
      } else {
        try {
          sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key], depth + 1, seen);
        } catch {
          sanitized[key] = '[SERIALIZATION_ERROR]';
        }
      }
    }
    return sanitized;
  }

  return String(obj);
}

function redactSensitiveData(message: string): string {
  let redacted = message;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

function formatTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatMessage(level: LogLevel, message: string, source?: string): string {
  const timestamp = formatTimestamp();
  const sourceTag = source ? `[${source}]` : '';
  const levelTag = `[${level.toUpperCase()}]`;
  return `${timestamp} ${levelTag}${sourceTag} ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return level === 'warn' || level === 'error';
  }
  return true;
}

function safeStringify(obj: unknown): string {
  try {
    if (typeof obj === 'string') {
      return redactSensitiveData(obj);
    }
    
    if (obj instanceof Error) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        return `${obj.name}: ${redactSensitiveData(obj.message)}`;
      }
      return `${obj.name}: ${redactSensitiveData(obj.message)}`;
    }
    
    const sanitized = sanitizeObject(obj);
    return JSON.stringify(sanitized, null, 2);
  } catch {
    return '[SERIALIZATION_ERROR]';
  }
}

function log(level: LogLevel, message: string | unknown, source?: string): void {
  if (!shouldLog(level)) return;

  const messageStr = typeof message === 'string' ? redactSensitiveData(message) : safeStringify(message);
  const formattedMessage = formatMessage(level, messageStr, source);

  switch (level) {
    case 'debug':
      console.debug(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
  }
}

export function logDebug(message: string | unknown, source?: string): void {
  log('debug', message, source);
}

export function logInfo(message: string | unknown, source?: string): void {
  log('info', message, source);
}

export function logWarn(message: string | unknown, source?: string): void {
  log('warn', message, source);
}

export function logError(message: string | unknown, source?: string): void {
  log('error', message, source);
}

export function createLogger(source: string) {
  return {
    debug: (message: string | unknown) => logDebug(message, source),
    info: (message: string | unknown) => logInfo(message, source),
    warn: (message: string | unknown) => logWarn(message, source),
    error: (message: string | unknown) => logError(message, source),
  };
}
