import { authOptions } from "@/lib/auth";
import { getPaginatedTransactions } from "@/lib/data";
import { transactionQuerySchema } from "@/lib/validators";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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
    const data = await getPaginatedTransactions(session.user.id, parsed.data);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Transactions fetch error", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
