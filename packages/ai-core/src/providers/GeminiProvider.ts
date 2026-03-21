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
      systemInstruction: systemPrompt,
    })
    const result = await genModel.generateContent(userMessage)
    const text = result.response.text()
    const llmResponse: LLMResponse = {
      text,
      model: this.model,
      provider: this.name,
    }
    if (result.response.usageMetadata?.promptTokenCount !== undefined) {
      llmResponse.inputTokens = result.response.usageMetadata.promptTokenCount
    }
    if (result.response.usageMetadata?.candidatesTokenCount !== undefined) {
      llmResponse.outputTokens = result.response.usageMetadata.candidatesTokenCount
    }
    return llmResponse
  }

  async *completeStream(
    systemPrompt: string,
    userMessage: string,
  ): AsyncGenerator<string, void, unknown> {
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    })
    const result = await genModel.generateContentStream(userMessage)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  }
}
