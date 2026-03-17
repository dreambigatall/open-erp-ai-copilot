export { AiCore } from './AiCore.js'
export { buildSystemPrompt, detectModule, MODULE_HINTS } from './prompts.js'
export {
  createProvider,
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  GrokProvider,
} from './providers/index.js'
export type { AiQueryResult } from './AiCore.js'
export type { LLMProvider, LLMResponse, ProviderConfig, ProviderName } from './providers/index.js'
