import { authOptions } from "@/lib/auth";
import { categorizeTransactions } from "@/lib/ai";
import { upsertAiSuggestions } from "@/lib/data";
import { enforceRateLimit } from "@/lib/rate-limit";
import { aiRequestSchema } from "@/lib/validators";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rate = enforceRateLimit(`ai:${session.user.id}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limited. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  try {
    const result = await categorizeTransactions(parsed.data.transactions);
    const updated = await upsertAiSuggestions(session.user.id, result.suggestions);
    return NextResponse.json({ ok: true, suggestions: updated });
  } catch (error) {
    console.error("AI categorize error", error);
    return NextResponse.json({ error: "AI categorization failed" }, { status: 500 });
  }
}
