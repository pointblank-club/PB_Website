import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/server/auth";
import connectDB from "@/lib/db/connection";
import { getPostHogClient } from "@/lib/posthog-server";

/*
 * POST /api/auth/login
 *   body: { email: string }
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const res = await sendVerificationEmail(email);

    try {
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: email,
          event: "admin_magic_link_requested",
          properties: { valid: !!res },
        });
        await posthog.flush();
      }
    } catch (err) {
      console.error("[PostHog] Error tracking login request:", err);
    }

    return NextResponse.json({ success: true, valid: res });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process login request" },
      { status: 500 },
    );
  }
}
