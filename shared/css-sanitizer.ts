const MAX_CSS_LENGTH = 50 * 1024; // 50KB max

/**
 * Sanitizes custom CSS by removing potentially malicious patterns.
 * This should be run BEFORE scopeCustomCss to prevent XSS and other attacks.
 */
export function sanitizeCustomCss(css: string): string {
  if (!css || typeof css !== 'string') return '';
  
  // Limit total CSS length to prevent DoS
  let sanitized = css.slice(0, MAX_CSS_LENGTH);
  
  // Remove HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove @import rules entirely (can load external stylesheets)
  sanitized = sanitized.replace(/@import\s+[^;]+;?/gi, '');
  
  // Remove @charset rules
  sanitized = sanitized.replace(/@charset\s+[^;]+;?/gi, '');
  
  // Remove expression() - IE CSS expressions (legacy XSS vector)
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  
  // Remove behavior: property (IE-specific XSS)
  sanitized = sanitized.replace(/behavior\s*:\s*[^;}\n]+[;}]?/gi, '');
  
  // Remove -moz-binding: property (Firefox XSS vector)
  sanitized = sanitized.replace(/-moz-binding\s*:\s*[^;}\n]+[;}]?/gi, '');
  
  // Remove ALL url(data:...) except safe image MIME types
  // Safe types: image/png, image/jpeg, image/gif, image/svg+xml, image/webp
  // This blocks: data:text/css, data:text/plain, data:text/html, data:application/javascript, etc.
  sanitized = sanitized.replace(
    /url\s*\(\s*["']?\s*data\s*:\s*(?!(image\/(png|jpeg|gif|svg\+xml|webp)))[^)]*\)/gi,
    'url()'
  );
  
  return sanitized;
}
