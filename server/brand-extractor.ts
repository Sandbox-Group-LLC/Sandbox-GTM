import OpenAI from "openai";
import { logError, logInfo } from "./logger";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ExtractedBrand {
  colors: Array<{ hex: string; frequency: number }>;
  fonts: string[];
  logoUrls: string[];
  suggestedPalette?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
}

function extractHexColors(content: string): Map<string, number> {
  const colorMap = new Map<string, number>();
  
  const hexRegex = /#([0-9a-fA-F]{3}){1,2}\b/g;
  const matches = content.match(hexRegex) || [];
  
  for (const color of matches) {
    const normalizedColor = normalizeHexColor(color.toLowerCase());
    colorMap.set(normalizedColor, (colorMap.get(normalizedColor) || 0) + 1);
  }
  
  return colorMap;
}

function extractRgbColors(content: string): Map<string, number> {
  const colorMap = new Map<string, number>();
  
  const rgbRegex = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
  const rgbaRegex = /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)/gi;
  
  let match;
  while ((match = rgbRegex.exec(content)) !== null) {
    const hex = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }
  
  while ((match = rgbaRegex.exec(content)) !== null) {
    const hex = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }
  
  return colorMap;
}

function normalizeHexColor(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.min(255, Math.max(0, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function extractFonts(content: string): string[] {
  const fonts = new Set<string>();
  
  const fontFamilyRegex = /font-family\s*:\s*([^;{}]+)/gi;
  let match;
  
  while ((match = fontFamilyRegex.exec(content)) !== null) {
    const fontValue = match[1].trim();
    const fontList = fontValue.split(',').map(f => f.trim().replace(/['"`]/g, ''));
    
    for (const font of fontList) {
      const cleanFont = font.trim();
      if (cleanFont && !isGenericFont(cleanFont)) {
        fonts.add(cleanFont);
      }
    }
  }
  
  return Array.from(fonts);
}

function isGenericFont(font: string): boolean {
  const genericFonts = [
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace',
    'inherit', 'initial', 'unset'
  ];
  return genericFonts.includes(font.toLowerCase());
}

function extractLogoUrls(html: string, baseUrl: string): string[] {
  const logos = new Set<string>();
  
  const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;
  const ogImageRegex2 = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi;
  let match;
  
  while ((match = ogImageRegex.exec(html)) !== null) {
    logos.add(resolveUrl(match[1], baseUrl));
  }
  while ((match = ogImageRegex2.exec(html)) !== null) {
    logos.add(resolveUrl(match[1], baseUrl));
  }
  
  const faviconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/gi;
  const faviconRegex2 = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/gi;
  
  while ((match = faviconRegex.exec(html)) !== null) {
    logos.add(resolveUrl(match[1], baseUrl));
  }
  while ((match = faviconRegex2.exec(html)) !== null) {
    logos.add(resolveUrl(match[1], baseUrl));
  }
  
  const logoImgRegex = /<img[^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi;
  const logoImgRegex2 = /<img[^>]*src=["']([^"']+)["'][^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["']/gi;
  
  while ((match = logoImgRegex.exec(html)) !== null) {
    logos.add(resolveUrl(match[1], baseUrl));
  }
  while ((match = logoImgRegex2.exec(html)) !== null) {
    logos.add(resolveUrl(match[1], baseUrl));
  }
  
  return Array.from(logos);
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  if (url.startsWith('/')) {
    const urlObj = new URL(baseUrl);
    return `${urlObj.origin}${url}`;
  }
  return new URL(url, baseUrl).href;
}

function filterUsefulColors(colorMap: Map<string, number>): Array<{ hex: string; frequency: number }> {
  const colors = Array.from(colorMap.entries())
    .map(([hex, frequency]) => ({ hex, frequency }))
    .filter(({ hex }) => {
      const normalized = hex.toLowerCase();
      if (normalized === '#ffffff' || normalized === '#000000') return false;
      if (normalized === '#fff' || normalized === '#000') return false;
      if (/^#([0-9a-f])\1\1\1\1\1$/.test(normalized) && 
          (parseInt(normalized.slice(1), 16) < 0x222222 || parseInt(normalized.slice(1), 16) > 0xdddddd)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.frequency - a.frequency);
  
  return colors.slice(0, 20);
}

async function suggestColorPalette(colors: Array<{ hex: string; frequency: number }>): Promise<ExtractedBrand['suggestedPalette'] | undefined> {
  if (colors.length === 0) return undefined;
  
  try {
    const topColors = colors.slice(0, 10).map(c => c.hex);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a brand design expert. Analyze the provided color palette extracted from a website and suggest the most appropriate brand colors. Return a JSON object with:
- primaryColor: The main brand color (hex)
- secondaryColor: A complementary secondary color (hex)
- accentColor: An accent color for highlights and CTAs (hex)
- backgroundColor: A suitable background color (hex, typically light like #ffffff or #f5f5f5)
- textColor: A suitable text color (hex, typically dark like #1a1a1a or #333333)

Choose from the provided colors when possible, but you may suggest variations if needed for a cohesive palette.`
        },
        {
          role: "user",
          content: `These colors were extracted from a website (sorted by frequency of use): ${topColors.join(', ')}

Suggest the best brand color palette based on these colors.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    
    const content = response.choices[0].message.content;
    if (!content) return undefined;
    
    const palette = JSON.parse(content);
    return {
      primaryColor: palette.primaryColor,
      secondaryColor: palette.secondaryColor,
      accentColor: palette.accentColor,
      backgroundColor: palette.backgroundColor,
      textColor: palette.textColor,
    };
  } catch (error) {
    logError("Error suggesting color palette with AI:", error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

export async function extractBrandFromUrl(url: string): Promise<ExtractedBrand> {
  logInfo(`Extracting brand from URL: ${url}`, 'BrandExtractor');
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandExtractor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    const hexColors = extractHexColors(html);
    const rgbColors = extractRgbColors(html);
    
    const allColors = new Map<string, number>();
    Array.from(hexColors.entries()).forEach(([color, freq]) => {
      allColors.set(color, (allColors.get(color) || 0) + freq);
    });
    Array.from(rgbColors.entries()).forEach(([color, freq]) => {
      allColors.set(color, (allColors.get(color) || 0) + freq);
    });
    
    const colors = filterUsefulColors(allColors);
    const fonts = extractFonts(html);
    const logoUrls = extractLogoUrls(html, url);
    
    const suggestedPalette = await suggestColorPalette(colors);
    
    logInfo(`Extracted ${colors.length} colors, ${fonts.length} fonts, ${logoUrls.length} logos`, 'BrandExtractor');
    
    return {
      colors,
      fonts,
      logoUrls,
      suggestedPalette,
    };
  } catch (error) {
    logError("Error extracting brand from URL:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}
