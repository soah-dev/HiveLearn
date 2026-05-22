import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const primaryModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

export async function generateWithFallback(prompt: string): Promise<string> {
  try {
    const result = await primaryModel.generateContent(prompt);
    return result.response.text() || '';
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message.toLowerCase() : '';
    if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('high demand') || msg.includes('overloaded')) {
      console.warn('Primary model (gemini-3.5-flash) unavailable, falling back to gemini-3.1-flash-lite');
      const result = await fallbackModel.generateContent(prompt);
      return result.response.text() || '';
    }
    throw error;
  }
}
