// Utility functions for marketing link tracking

// Parse User-Agent to extract device type, browser, and OS
export function parseUserAgent(userAgent: string): {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini|iemobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (userAgent.length === 0) {
    deviceType = 'unknown';
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('chrome') && !ua.includes('chromium')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
  } else if (ua.includes('chromium')) {
    browser = 'Chromium';
  }
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows nt 10') || ua.includes('windows nt 11')) {
    os = 'Windows';
  } else if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os x') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('cros')) {
    os = 'Chrome OS';
  }
  
  return { deviceType, browser, os };
}

// Detect if the User-Agent appears to be a bot
export function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'slurp',
    'googlebot', 'bingbot', 'yandex', 'baidu', 'duckduck',
    'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'discordbot', 'slack',
    'curl', 'wget', 'python-requests', 'axios', 'node-fetch',
    'headless', 'phantom', 'selenium', 'puppeteer', 'playwright',
    'lighthouse', 'pagespeed', 'gtmetrix',
    'uptime', 'pingdom', 'statuscake', 'site24x7',
    'ahref', 'semrush', 'moz', 'majestic',
  ];
  
  return botPatterns.some(pattern => ua.includes(pattern));
}

// Get time context from a date
export function getTimeContext(date: Date): {
  dayOfWeek: number;
  hourOfDay: number;
} {
  return {
    dayOfWeek: date.getUTCDay(), // 0 = Sunday, 6 = Saturday
    hourOfDay: date.getUTCHours(), // 0-23
  };
}

// Fetch geographic data from IP using Geoapify
export async function getGeoFromIP(ip: string): Promise<{
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
} | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  
  if (!apiKey) {
    console.log('[Geo] No GEOAPIFY_API_KEY configured, skipping geolocation');
    return null;
  }
  
  // Skip private/local IPs
  if (isPrivateIP(ip)) {
    return null;
  }
  
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/ipinfo?ip=${encodeURIComponent(ip)}&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(3000) } // 3 second timeout
    );
    
    if (!response.ok) {
      console.log(`[Geo] Geoapify API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    return {
      country: data.country?.name || null,
      countryCode: data.country?.iso_code || null,
      region: data.state?.name || data.region?.name || null,
      city: data.city?.name || null,
      timezone: data.timezone?.name || null,
    };
  } catch (error) {
    console.log('[Geo] Failed to fetch geolocation:', error);
    return null;
  }
}

// Check if an IP is private/local
function isPrivateIP(ip: string): boolean {
  // Handle IPv4 mapped IPv6
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  // Common private IP patterns
  const privatePatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/i,
    /^::1$/,
    /^0\.0\.0\.0$/,
    /^fe80:/i, // Link-local IPv6
  ];
  
  return privatePatterns.some(pattern => pattern.test(cleanIP));
}

// Extract the real IP from headers (handles proxies)
export function extractRealIP(req: any): string {
  // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Get the first IP (the original client)
    const firstIP = forwarded.split(',')[0].trim();
    if (firstIP) return firstIP;
  }
  
  // Try other common headers
  const realIP = req.headers['x-real-ip'];
  if (realIP) return realIP;
  
  // Fall back to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || '';
}
