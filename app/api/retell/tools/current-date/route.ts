import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";

/**
 * POST /api/retell/tools/current-date
 *
 * Retell custom tool endpoint — returns the current date and day of week.
 * Called by the AI coordinator to resolve relative dates like "tomorrow".
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // ── Verify Retell signature ───────────────────────────────────
    const apiKey = process.env.RETELL_API_KEY;
    if (apiKey) {
      const signature = request.headers.get("x-retell-signature") ?? "";
      const isValid = await Retell.verify(body, apiKey, signature);
      if (!isValid) {
        return NextResponse.json(
          { result: "error", message: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
    const formatted = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return NextResponse.json({
      result: "success",
      today: dateStr,
      day_of_week: dayOfWeek,
      formatted: formatted,
      message: `Today is ${formatted} (${dateStr}).`,
    });
  } catch (err) {
    console.error("[current-date] Error:", err);
    return NextResponse.json({
      result: "error",
      message: "Failed to get current date",
    });
  }
}
