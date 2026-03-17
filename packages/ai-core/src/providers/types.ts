export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  text: string
  model: string
  provider: string
  inputTokens?: number
  outputTokens?: number
}

//   export interface LLMProvider {
//     /** Human-readable provider name e.g. "claude", "openai", "gemini", "grok" */
//     readonly name: string

//     /** Model identifier e.g. "claude-sonnet-4-20250514" */
//     readonly model: string

//     /**
//      * Send messages to the LLM and return the response text.
//      * systemPrompt is separated so providers that use a dedicated
//      * system field (Anthropic) can use it correctly.
//      */
//     complete(systemPrompt: string, userMessage: string): Promise<LLMResponse>
//   }
export interface LLMProvider {
  readonly name: string
  readonly model: string
  complete(systemPrompt: string, userMessage: string): Promise<LLMResponse>
}
