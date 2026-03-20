// /* eslint-disable @typescript-eslint/no-unnecessary-condition */
// import Anthropic from '@anthropic-ai/sdk'
// import type { LLMProvider, LLMResponse } from './types.js'

// export class ClaudeProvider implements LLMProvider {
//   readonly name = 'claude'
//   readonly model: string
//   private client: Anthropic

//   constructor(apiKey?: string, model = 'claude-sonnet-4-20250514') {
//     this.model = model
//     this.client = new Anthropic({
//       apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'],
//     })
//   }

//   async complete(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
//     const response = await this.client.messages.create({
//       model: this.model,
//       max_tokens: 1024,
//       system: systemPrompt,
//       messages: [{ role: 'user', content: userMessage }],
//     })

//     const text = response.content
//       // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
//       .filter((b) => b.type === 'text')
//       .map((b) => b.text)
//       .join('')

//     return {
//       text,
//       model: this.model,
//       provider: this.name,
//       inputTokens: response.usage.input_tokens,
//       outputTokens: response.usage.output_tokens,
//     }
//   }
// }

import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, LLMResponse } from './types.js'

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude'
  readonly model: string
  private client: Anthropic

  constructor(apiKey?: string, model = 'claude-sonnet-4-20250514') {
    this.model = model
    this.client = new Anthropic({ apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'] })
  }

  async complete(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const text = response.content.map((b) => b.text).join('')
    return {
      text,
      model: this.model,
      provider: this.name,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }

  async *completeStream(
    systemPrompt: string,
    userMessage: string,
  ): AsyncGenerator<string, void, unknown> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        yield event.delta.text
      }
    }
  }
}
