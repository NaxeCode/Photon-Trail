import { getRequiredUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { plaidClient } from "@/lib/plaid";
import { plaidItems } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const userId = await getRequiredUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json(
      { error: "Plaid keys missing on server" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const publicToken: string | undefined = body?.publicToken;
  if (!publicToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const encryptedToken = encryptSecret(accessToken);

    await db
      .insert(plaidItems)
      .values({
        id: itemId,
        userId,
        institutionId: body?.institutionId,
        institutionName: body?.institutionName,
        accessTokenEncrypted: encryptedToken,
        status: "active",
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: plaidItems.id,
        set: {
          accessTokenEncrypted: encryptedToken,
          institutionId: body?.institutionId,
          institutionName: body?.institutionName,
          status: "active",
          lastSyncedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Plaid exchange error", error);
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}
