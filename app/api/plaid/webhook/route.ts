import { syncPlaidItemById } from "@/lib/plaid-sync";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (process.env.PLAID_WEBHOOK_SECRET && secret !== process.env.PLAID_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemId: string | undefined = body?.item_id;

  if (!itemId) {
    return NextResponse.json({ error: "Missing item_id" }, { status: 400 });
  }

  try {
    const summary = await syncPlaidItemById(itemId);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Plaid webhook error", error);
    return NextResponse.json({ error: "Webhook sync failed" }, { status: 500 });
  }
}
