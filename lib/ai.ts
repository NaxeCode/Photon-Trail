import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { aiCategorizationSchema, aiResponseSchema } from "./validators";

const openaiApiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY_ID;

const openai =
  openaiApiKey && new OpenAI({ apiKey: openaiApiKey, organization: process.env.OPENAI_ORG });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? 0;
    return status >= 500 || status === 429;
  }
  return false;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3) {
  let delay = 500;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1 || !shouldRetry(error)) {
        throw error;
      }
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error("Retry exceeded");
}

export async function categorizeTransactions(input: unknown) {
  if (!openai) {
    throw new Error("OpenAI key missing");
  }

  const parsed = aiCategorizationSchema.array().safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid transaction payload for AI");
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a finance assistant that categorizes personal transactions. " +
        "Return concise JSON with friendly bucket labels (e.g., Groceries, Housing, Transport, Subscriptions, Entertainment, Coffee, Health, Travel, Utilities, Income, Transfers, Other). " +
        "Provide a confidence score between 0 and 1. " +
        "Always return every field in the schema. Use null for label or rationale when uncertain or unnecessary. " +
        "Keep rationale short. Keep temperature low for consistent output.",
    },
    {
      role: "user",
      content: JSON.stringify({
        transactions: [
          { id: "ex1", description: "Whole Foods Market", amount: 82.73, postedAt: "2024-05-20" },
          { id: "ex2", description: "Uber trip downtown", amount: 14.1, postedAt: "2024-05-18" },
        ],
      }),
    },
    {
      role: "assistant",
      content: JSON.stringify({
        suggestions: [
          {
            id: "ex1",
            category: "Groceries",
            confidence: 0.93,
            label: "Groceries - Whole Foods",
            rationale: "Whole Foods is a grocery merchant.",
          },
          {
            id: "ex2",
            category: "Transport",
            confidence: 0.88,
            label: "Rideshare",
            rationale: "Uber trip indicates transport spending.",
          },
        ],
      }),
    },
    {
      role: "user",
      content: JSON.stringify({ transactions: parsed.data }),
    },
  ];

  const response = await retryWithBackoff(() =>
    openai.beta.chat.completions.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1200,
      response_format: zodResponseFormat(aiResponseSchema, "ai_response"),
      messages,
    }),
  );

  const message = response.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`AI refused request: ${message.refusal}`);
  }

  const parsedResponse = message?.parsed;
  if (!parsedResponse) {
    throw new Error("AI response was not valid JSON");
  }

  return parsedResponse;
}
