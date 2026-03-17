import { ClaudeProvider } from './ClaudeProvider.js'
import { OpenAIProvider } from './OpenAIProvider.js'
import { GeminiProvider } from './GeminiProvider.js'
import { GrokProvider } from './GrokProvider.js'
import type { LLMProvider } from './types.js'

export { ClaudeProvider, OpenAIProvider, GeminiProvider, GrokProvider }
export type { LLMProvider, LLMMessage, LLMResponse } from './types.js'

export type ProviderName = 'claude' | 'openai' | 'gemini' | 'grok'

export interface ProviderConfig {
  provider: ProviderName
  apiKey?: string
  model?: string
}

/** Create a provider from a config object — useful for erp-copilot.config.js */
export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model)
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model)
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model)
    case 'grok':
      return new GrokProvider(config.apiKey, config.model)
    default:
      throw new Error(`Unknown provider: ${String(config.provider)}`)
  }
}
