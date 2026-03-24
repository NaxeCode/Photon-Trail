import { getRequiredUserId } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
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
    const data = await getDashboardData(userId, parsed.data);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Dashboard fetch error", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
