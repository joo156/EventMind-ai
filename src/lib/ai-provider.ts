/**
 * AI Provider Abstraction Layer
 *
 * Supports multiple AI providers via environment variables:
 * - VITE_AI_PROVIDER: gemini | openai | anthropic | openrouter
 * - VITE_AI_API_KEY: API key for the selected provider
 * - VITE_AI_MODEL: (optional) specific model ID
 */

export type AIProvider = "gemini" | "openai" | "anthropic" | "openrouter";

export interface AIRequestOptions {
  systemPrompt: string;
  userMessage: string;
  responseFormat?: "json_object" | "text";
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class AIProviderService {
  private provider: AIProvider;
  private apiKey: string;
  private model: string;

  constructor() {
    this.provider = (
      process.env.VITE_AI_PROVIDER ||
      process.env.AI_PROVIDER ||
      "gemini"
    ) as AIProvider;
    // Server functions run in Node/Edge — VITE_ vars may not be injected.
    // Fall back to un-prefixed AI_API_KEY so both work.
    this.apiKey =
      process.env.VITE_AI_API_KEY ||
      process.env.AI_API_KEY ||
      "";
    this.model =
      process.env.VITE_AI_MODEL ||
      process.env.AI_MODEL ||
      this.getDefaultModel();

    if (!this.apiKey) {
      throw new Error(
        `AI API key missing. Set VITE_AI_API_KEY in .env.local (for Gemini, get a key at https://aistudio.google.com/app/apikey).`,
      );
    }
  }

  private getDefaultModel(): string {
    const envModel = process.env.VITE_AI_MODEL || process.env.AI_MODEL;
    if (envModel) return envModel;

    switch (this.provider) {
      case "gemini":
        return "gemini-3.5-flash";
      case "openai":
        return "gpt-4-turbo";
      case "anthropic":
        return "claude-3-sonnet-20240229";
      case "openrouter":
        return "google/gemini-2.0-flash-exp"; // default OpenRouter model
      default:
        throw new Error(`Unknown AI provider: ${this.provider}`);
    }
  }

  async chat(options: AIRequestOptions): Promise<AIResponse> {
    switch (this.provider) {
      case "gemini":
        return this.callGemini(options);
      case "openai":
        return this.callOpenAI(options);
      case "anthropic":
        return this.callAnthropic(options);
      case "openrouter":
        return this.callOpenRouter(options);
      default:
        throw new Error(`Unknown AI provider: ${this.provider}`);
    }
  }

  private async callGemini(options: AIRequestOptions): Promise<AIResponse> {
    const { systemPrompt, userMessage, responseFormat } = options;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      systemInstruction: {
        parts: { text: systemPrompt },
      },
      contents: [
        {
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 1.0,
        responseMimeType: responseFormat === "json_object" ? "application/json" : "text/plain",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error(`Rate limited (429) — please try again in a moment. Details: ${error.slice(0, 500)}`);
      }
      if (response.status === 403) {
        throw new Error(`Invalid API key (403) for Google Gemini. Details: ${error.slice(0, 500)}`);
      }
      throw new Error(`Gemini API error (${response.status}): ${error.slice(0, 500)}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens:
            (data.usageMetadata.promptTokenCount ?? 0) +
            (data.usageMetadata.candidatesTokenCount ?? 0),
        }
      : undefined;

    return { content, usage };
  }

  private async callOpenAI(options: AIRequestOptions): Promise<AIResponse> {
    const { systemPrompt, userMessage, responseFormat } = options;

    const url = "https://api.openai.com/v1/chat/completions";

    const requestBody = {
      model: this.model,
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userMessage },
      ],
      temperature: options.temperature ?? 1.0,
      response_format: responseFormat === "json_object" ? { type: "json_object" } : undefined,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) throw new Error("Rate limited — please try again in a moment.");
      if (response.status === 401) throw new Error("Invalid API key for OpenAI.");
      throw new Error(`OpenAI API error (${response.status}): ${error.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined;

    return { content, usage };
  }

  private async callAnthropic(options: AIRequestOptions): Promise<AIResponse> {
    const { systemPrompt, userMessage } = options;

    const url = "https://api.anthropic.com/v1/messages";

    const requestBody = {
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user" as const, content: userMessage }],
      temperature: options.temperature ?? 1.0,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) throw new Error("Rate limited — please try again in a moment.");
      if (response.status === 401) throw new Error("Invalid API key for Anthropic.");
      throw new Error(`Anthropic API error (${response.status}): ${error.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const content = data.content?.[0]?.text ?? "";
    const usage = data.usage
      ? {
          promptTokens: data.usage.input_tokens ?? 0,
          completionTokens: data.usage.output_tokens ?? 0,
          totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
        }
      : undefined;

    return { content, usage };
  }

  private async callOpenRouter(options: AIRequestOptions): Promise<AIResponse> {
    const { systemPrompt, userMessage, responseFormat } = options;

    const url = "https://openrouter.ai/api/v1/chat/completions";

    const requestBody = {
      model: this.model,
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userMessage },
      ],
      temperature: options.temperature ?? 1.0,
      response_format: responseFormat === "json_object" ? { type: "json_object" } : undefined,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) throw new Error("Rate limited — please try again in a moment.");
      if (response.status === 401) throw new Error("Invalid API key for OpenRouter.");
      throw new Error(`OpenRouter API error (${response.status}): ${error.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined;

    return { content, usage };
  }
}

// Singleton instance — recreated if env vars change (dev hot-reload)
let aiService: AIProviderService | null = null;
let lastApiKey = "";

export function getAIService(): AIProviderService {
  const currentKey =
    process.env.VITE_AI_API_KEY || process.env.AI_API_KEY || "";
  if (!aiService || currentKey !== lastApiKey) {
    aiService = new AIProviderService();
    lastApiKey = currentKey;
  }
  return aiService;
}
