import { authOptions } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json(
      { error: "Plaid keys missing on server" },
      { status: 500 },
    );
  }

  try {
    const webhookBase = process.env.PLAID_WEBHOOK_URL;
    const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;
    const webhook =
      webhookBase &&
      `${webhookBase}${webhookSecret ? `${webhookBase.includes("?") ? "&" : "?"}secret=${webhookSecret}` : ""}`;

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "Photon Trail",
      products: ["transactions"],
      language: "en",
      country_codes: ["US"],
      redirect_uri: process.env.PLAID_REDIRECT_URI ?? undefined,
      webhook: webhook ?? undefined,
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error("Plaid link token error", error);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
