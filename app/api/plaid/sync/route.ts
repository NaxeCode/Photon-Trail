import { authOptions } from "@/lib/auth";
import { syncPlaidForUser } from "@/lib/plaid-sync";
import { plaidSyncRequestSchema } from "@/lib/validators";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = plaidSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const targets = parsed.data.itemIds ?? (parsed.data.itemId ? [parsed.data.itemId] : undefined);

  try {
    const summary = await syncPlaidForUser(session.user.id, targets);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Plaid sync error", error);
    return NextResponse.json({ error: "Failed to sync Plaid transactions" }, { status: 500 });
  }
}
