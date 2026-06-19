import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const primaryModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

export interface AiUsageMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GenerateResult {
  text: string;
  usage: AiUsageMetadata;
}

export async function generateWithFallback(prompt: string): Promise<string> {
  const result = await generateWithUsage(prompt);
  return result.text;
}

function buildRequest(prompt: string, generationConfig?: GenerationConfig) {
  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(generationConfig ? { generationConfig } : {}),
  };
}

export async function generateWithUsage(prompt: string, generationConfig?: GenerationConfig): Promise<GenerateResult> {
  try {
    const result = await primaryModel.generateContent(buildRequest(prompt, generationConfig));
    const usage = result.response.usageMetadata;
    return {
      text: result.response.text() || '',
      usage: {
        model: 'gemini-3.5-flash',
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('high demand') || msg.includes('overloaded')) {
      console.warn('Primary model (gemini-3.5-flash) unavailable, falling back to gemini-3.1-flash-lite');
      const result = await fallbackModel.generateContent(buildRequest(prompt, generationConfig));
      const usage = result.response.usageMetadata;
      return {
        text: result.response.text() || '',
        usage: {
          model: 'gemini-3.1-flash-lite',
          promptTokens: usage?.promptTokenCount || 0,
          completionTokens: usage?.candidatesTokenCount || 0,
          totalTokens: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
        },
      };
    }
    throw error;
  }
}
