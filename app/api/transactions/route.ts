import { getRequiredUserId } from "@/lib/auth";
import { getPaginatedTransactions } from "@/lib/data";
import { transactionQuerySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const userId = await getRequiredUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = transactionQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const data = await getPaginatedTransactions(userId, parsed.data);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Transactions fetch error", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
