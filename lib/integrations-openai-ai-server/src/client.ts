import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_openai) return _openai;

  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY (or provision the OpenAI AI integration in Replit).",
    );
  }

  _openai = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[
      prop
    ];
  },
});
