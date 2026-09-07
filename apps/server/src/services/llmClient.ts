export interface LlmCompletionOptions {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  tools?: any[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface LlmCompletionResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  toolCalls?: any[];
  rawResponse?: any;
}

export const EXPERIENTIAL_BASE_URL = "https://api.experientiallabs.ai/v1";
export const MODEL_ID = "gpt-6-astra";

/**
 * Resolves the Experiential Labs API key from environment variables.
 * Throws a descriptive error if not found.
 */
export function getExperientialApiKey(): string {
  const apiKey = process.env.EXPLABS_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "EXPLABS_API_KEY environment variable is not set. Please create one under Settings -> API Keys and export it."
    );
  }
  return apiKey.trim();
}

/**
 * Routes LLM completions for gpt-6-astra through the Experiential gateway.
 * Preserves streaming and tool calls parameters.
 */
export async function callExperientialLlm(
  options: LlmCompletionOptions
): Promise<LlmCompletionResult> {
  const apiKey = getExperientialApiKey();

  const bodyPayload: Record<string, any> = {
    model: MODEL_ID,
    messages: options.messages,
    stream: options.stream ?? false
  };

  if (options.tools && options.tools.length > 0) {
    bodyPayload.tools = options.tools;
  }

  if (typeof options.max_tokens === "number") {
    bodyPayload.max_tokens = options.max_tokens;
  }

  if (typeof options.temperature === "number") {
    bodyPayload.temperature = options.temperature;
  }

  const response = await fetch(`${EXPERIENTIAL_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Experiential LLM API error (HTTP ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || "",
    usage: data.usage,
    toolCalls: choice?.message?.tool_calls,
    rawResponse: data
  };
}
