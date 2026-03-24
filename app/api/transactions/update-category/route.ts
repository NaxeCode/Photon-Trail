import { getRequiredUserId } from "@/lib/auth";
import { updateManualCategory } from "@/lib/data";
import { manualCategorySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const userId = await getRequiredUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = manualCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const tx = await updateManualCategory(
      userId,
      parsed.data.transactionId,
      parsed.data.manualCategory,
    );

    return NextResponse.json({
      ...tx,
      amount: Number(tx.amount),
      postedAt: tx.postedAt.toISOString(),
    });
  } catch (error) {
    console.error("Manual category error", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}
