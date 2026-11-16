import { NextRequest, NextResponse } from "next/server";
import { verifyLoginToken } from "@/lib/server/auth";
import connectDB from "@/lib/db/connection";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/admin?error=missing_token", request.url),
      );
    }

    const sessionToken = await verifyLoginToken(token);

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.redirect(
        new URL("/admin?error=invalid_token", request.url),
      );
    }

    try {
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: "admin",
          event: "admin_magic_link_verified",
        });
        await posthog.flush();
      }
    } catch (err) {
      console.error("[PostHog] Error tracking magic link verification:", err);
    }

    const response = NextResponse.redirect(
      new URL("/admin/logs", request.url),
    );
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Auth] Magic link error:", error);
    return NextResponse.redirect(
      new URL("/admin?error=invalid_token", request.url),
    );
  }
}
