// import OpenAI from 'openai'
// import type { LLMProvider, LLMResponse } from './types.js'

// export class OpenAIProvider implements LLMProvider {
//   readonly name = 'openai'
//   readonly model: string
//   private client: OpenAI

//   constructor(apiKey?: string, model = 'gpt-4o') {
//     this.model = model
//     this.client = new OpenAI({
//       apiKey: apiKey ?? process.env['OPENAI_API_KEY'],
//     })
//   }

//   async complete(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
//     const response = await this.client.chat.completions.create({
//       model: this.model,
//       max_tokens: 1024,
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: userMessage },
//       ],
//     })

//     const text = response.choices[0]?.message?.content ?? ''
//     const inputTokens = response.usage?.prompt_tokens
//     const outputTokens = response.usage?.completion_tokens

//     return {
//       text,
//       model: this.model,
//       provider: this.name,
//       ...(inputTokens !== undefined ? { inputTokens } : {}),
//       ...(outputTokens !== undefined ? { outputTokens } : {}),
//     }
//   }
// }

import OpenAI from 'openai'
import type { LLMProvider, LLMResponse } from './types.js'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly model: string
  private client: OpenAI

  constructor(apiKey?: string, model = 'gpt-4o') {
    this.model = model
    this.client = new OpenAI({ apiKey: apiKey ?? process.env['OPENAI_API_KEY'] })
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
    const llmResponse: LLMResponse = {
      text,
      model: this.model,
      provider: this.name,
    }
    if (response.usage?.prompt_tokens !== undefined) {
      llmResponse.inputTokens = response.usage.prompt_tokens
    }
    if (response.usage?.completion_tokens !== undefined) {
      llmResponse.outputTokens = response.usage.completion_tokens
    }
    return llmResponse
  }

  async *completeStream(
    systemPrompt: string,
    userMessage: string,
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }
  }
}
