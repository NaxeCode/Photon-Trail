import {
  aiCategorizationSchema,
  aiRequestSchema,
  aiResponseSchema,
  manualCategorySchema,
  transactionQuerySchema,
} from "@/lib/validators";

describe("validators", () => {
  it("parses transaction query defaults", () => {
    const parsed = transactionQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it("rejects oversized limits", () => {
    expect(() => transactionQuerySchema.parse({ limit: 500 })).toThrow();
  });

  it("validates ai payload dates", () => {
    expect(() =>
      aiCategorizationSchema.parse({
        id: "1",
        description: "bad date",
        amount: 12,
        postedAt: "not-a-date",
      }),
    ).toThrow();
  });

  it("requires transactions array in AI request", () => {
    expect(() => aiRequestSchema.parse({ transactions: [] })).toThrow();
  });

  it("accepts valid AI response suggestions", () => {
    const parsed = aiResponseSchema.parse({
      suggestions: [{ id: "1", category: "Coffee", confidence: 0.9 }],
    });
    expect(parsed.suggestions[0].category).toBe("Coffee");
  });

  it("trims manual category updates", () => {
    const parsed = manualCategorySchema.parse({
      transactionId: "tx_1",
      manualCategory: "  Dining ",
    });
    expect(parsed.manualCategory).toBe("Dining");
  });
});
