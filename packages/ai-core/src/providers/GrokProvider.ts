import OpenAI from 'openai'
import type { LLMProvider, LLMResponse } from './types.js'

/**
 * Grok (xAI) uses an OpenAI-compatible REST API.
 * We reuse the OpenAI SDK, just pointing baseURL at xAI.
 */
export class GrokProvider implements LLMProvider {
  readonly name = 'grok'
  readonly model: string
  private client: OpenAI

  constructor(apiKey?: string, model = 'grok-beta') {
    this.model = model
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env['GROK_API_KEY'],
      baseURL: 'https://api.x.ai/v1', // xAI endpoint
    })
  }

  async complete(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    const inputTokens = response.usage?.prompt_tokens
    const outputTokens = response.usage?.completion_tokens

    return {
      text,
      model: this.model,
      provider: this.name,
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
    }
  }
}
