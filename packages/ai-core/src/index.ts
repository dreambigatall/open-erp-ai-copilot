export { AiCore } from './AiCore.js'
export { buildSystemPrompt, detectModule, detectIntent, MODULE_HINTS } from './prompts.js'
export {
  createProvider,
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  GrokProvider,
} from './providers/index.js'
export type { AiQueryResult, AiCoreOptions, AiTelemetryEvent } from './AiCore.js'
export type { LLMProvider, LLMResponse, ProviderConfig, ProviderName } from './providers/index.js'
