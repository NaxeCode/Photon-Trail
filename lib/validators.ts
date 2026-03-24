import { z } from "zod";

export const transactionQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const aiCategorizationSchema = z.object({
  id: z.string(),
  description: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  amount: z.number(),
  category: z.string().nullable().optional(),
  postedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "postedAt must be a valid date string"),
});

export const aiResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      confidence: z.number().min(0).max(1),
      label: z.string().nullable(),
      rationale: z.string().nullable(),
    }),
  ),
});

export const aiRequestSchema = z.object({
  transactions: z.array(aiCategorizationSchema).min(1, "At least one transaction required"),
});

export const manualCategorySchema = z.object({
  transactionId: z.string().min(1),
  manualCategory: z.string().trim().min(1).max(64),
});

export const plaidSyncRequestSchema = z.object({
  itemId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
});
