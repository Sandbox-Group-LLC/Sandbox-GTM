import OpenAI from "openai";
import { logError, logInfo } from "./logger";

let openai: OpenAI;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? 'not-configured',
    });
  }
  return openai;
}

export interface AIGenerationRequest {
  sectionType: string;
  eventName: string;
  eventDescription?: string;
  eventDate?: string;
  eventLocation?: string;
  prompt?: string;
}

interface HeroContent {
  title: string;
  subtitle: string;
  buttonText: string;
}

interface TextContent {
  heading: string;
  content: string;
}

interface CTAContent {
  heading: string;
  description: string;
  buttonText: string;
}

interface FeatureItem {
  title: string;
  description: string;
}

interface FeaturesContent {
  heading: string;
  features: FeatureItem[];
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQContent {
  heading: string;
  items: FAQItem[];
}

interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
}

interface TestimonialsContent {
  heading: string;
  items: TestimonialItem[];
  disclaimer: string;
}

function buildSystemPrompt(sectionType: string): string {
  const baseContext = `You are a professional copywriter specializing in event marketing. Your task is to generate compelling content for event websites. Write in a professional but engaging tone. Be concise and impactful.`;
  
  switch (sectionType) {
    case "hero":
      return `${baseContext}

Generate a hero section for an event website. Return a JSON object with:
- title: A compelling headline (max 10 words)
- subtitle: A brief supporting message (1-2 sentences)
- buttonText: Call-to-action button text (2-4 words)`;

    case "text":
      return `${baseContext}

Generate a text content section for an event website. Return a JSON object with:
- heading: A clear section heading (3-6 words)
- content: Informative paragraph(s) about the event (2-3 paragraphs, each 2-3 sentences)`;

    case "cta":
      return `${baseContext}

Generate a call-to-action section for an event website. Return a JSON object with:
- heading: An attention-grabbing headline (4-8 words)
- description: A persuasive message encouraging action (1-2 sentences)
- buttonText: Action-oriented button text (2-4 words)`;

    case "features":
      return `${baseContext}

Generate a features/benefits section for an event website. Return a JSON object with:
- heading: A section heading (3-6 words)
- features: An array of 4-6 feature objects, each with:
  - title: Feature name (2-4 words)
  - description: Brief benefit description (1 sentence)`;

    case "faq":
      return `${baseContext}

Generate FAQ content for an event website. Return a JSON object with:
- heading: A section heading (2-4 words)
- items: An array of 4-5 FAQ objects, each with:
  - question: A common attendee question
  - answer: A helpful, concise answer (1-3 sentences)`;

    case "testimonials":
      return `${baseContext}

Generate sample testimonial content for an event website. These are example testimonials to be replaced with real ones. Return a JSON object with:
- heading: A section heading (2-4 words)
- items: An array of 3 testimonial objects, each with:
  - quote: A realistic testimonial quote (1-2 sentences)
  - author: A fictional name
  - role: A fictional job title/company
- disclaimer: A note that these are sample testimonials`;

    default:
      return baseContext;
  }
}

function buildUserPrompt(request: AIGenerationRequest): string {
  let prompt = `Generate content for the ${request.sectionType} section of an event website.\n\n`;
  
  prompt += `Event Details:\n`;
  prompt += `- Event Name: ${request.eventName}\n`;
  
  if (request.eventDescription) {
    prompt += `- Description: ${request.eventDescription}\n`;
  }
  
  if (request.eventDate) {
    prompt += `- Date: ${request.eventDate}\n`;
  }
  
  if (request.eventLocation) {
    prompt += `- Location: ${request.eventLocation}\n`;
  }
  
  if (request.prompt) {
    prompt += `\nAdditional Instructions: ${request.prompt}`;
  }
  
  prompt += `\n\nRespond with only valid JSON.`;
  
  return prompt;
}

export async function generateSectionContent(
  request: AIGenerationRequest
): Promise<Record<string, unknown>> {
  const systemPrompt = buildSystemPrompt(request.sectionType);
  const userPrompt = buildUserPrompt(request);

  logInfo(`Generating AI content for section type: ${request.sectionType}`);

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from AI");
    }

    const parsed = JSON.parse(content);
    logInfo(`Successfully generated AI content for ${request.sectionType}`);
    
    return parsed;
  } catch (error) {
    logError(`Error generating AI content:`, error);
    throw error;
  }
}
