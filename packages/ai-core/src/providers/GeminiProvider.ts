import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider, LLMResponse } from './types.js'

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini'
  readonly model: string
  private client: GoogleGenerativeAI

  constructor(apiKey?: string, model = 'gemini-1.5-pro') {
    this.model = model
    this.client = new GoogleGenerativeAI(apiKey ?? process.env['GEMINI_API_KEY'] ?? '')
  }

  async complete(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt, // Gemini's dedicated system field
    })

    const result = await genModel.generateContent(userMessage)
    const text = result.response.text()
    const inputTokens = result.response.usageMetadata?.promptTokenCount
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount

    return {
      text,
      model: this.model,
      provider: this.name,
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
    }
  }
}
