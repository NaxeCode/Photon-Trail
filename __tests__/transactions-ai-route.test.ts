import { categorizeTransactions } from "@/lib/ai";
import { upsertAiSuggestions } from "@/lib/data";
import { getServerSession } from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  categorizeTransactions: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  upsertAiSuggestions: vi.fn(),
}));

let POST: (request: Request) => Promise<Response>;

const mockGetServerSession = vi.mocked(getServerSession);
const mockCategorizeTransactions = vi.mocked(categorizeTransactions);
const mockUpsertAiSuggestions = vi.mocked(upsertAiSuggestions);

describe("POST /api/transactions/ai", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/db";
    const mod = await import("@/app/api/transactions/ai/route");
    POST = mod.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null as any);

    const res = await POST(
      new Request("http://localhost/api/transactions/ai", {
        method: "POST",
        body: JSON.stringify({ transactions: [] }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("validates payload", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } } as any);

    const res = await POST(
      new Request("http://localhost/api/transactions/ai", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("processes AI suggestions", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } } as any);
    mockCategorizeTransactions.mockResolvedValue({
      suggestions: [{ id: "1", category: "Coffee", confidence: 0.9 }],
    } as any);
    mockUpsertAiSuggestions.mockResolvedValue([
      { id: "1", category: "Coffee", confidence: 0.9 },
    ] as any);

    const res = await POST(
      new Request("http://localhost/api/transactions/ai", {
        method: "POST",
        body: JSON.stringify({
          transactions: [
            { id: "1", description: "Latte", merchant: "Cafe", amount: 5, postedAt: "2024-01-01" },
          ],
        }),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions[0].category).toBe("Coffee");
    expect(mockCategorizeTransactions).toHaveBeenCalledTimes(1);
    expect(mockUpsertAiSuggestions).toHaveBeenCalledWith("user-1", [
      { id: "1", category: "Coffee", confidence: 0.9 },
    ]);
  });
});
