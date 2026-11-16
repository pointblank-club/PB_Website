import { NextRequest, NextResponse } from "next/server";
import { verifyLoginToken } from "@/lib/server/auth";
import connectDB from "@/lib/db/connection";
import { getPostHogClient } from "@/lib/posthog-server";

function getRedirectUrl(path: string, request: NextRequest): URL {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    process.env.NEXT_PUBLIC_DOMAIN;

  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.url.startsWith("https") ? "https" : "http");

  // In Docker / standalone environments, host often reports 0.0.0.0:3000
  if (host && !host.includes("0.0.0.0")) {
    const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return new URL(path, `${proto}://${cleanHost}`);
  }

  // Fallback if host header was 0.0.0.0 or missing
  const fallback = process.env.NEXT_PUBLIC_DOMAIN || "https://www.pointblank.club";
  const cleanFallback = fallback.startsWith("http")
    ? fallback.replace(/\/+$/, "")
    : `https://${fallback.replace(/\/+$/, "")}`;

  return new URL(path, cleanFallback);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        getRedirectUrl("/admin?error=missing_token", request),
      );
    }

    const sessionToken = await verifyLoginToken(token);

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.redirect(
        getRedirectUrl("/admin?error=invalid_token", request),
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
      getRedirectUrl("/admin/logs", request),
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
      getRedirectUrl("/admin?error=invalid_token", request),
    );
  }
}
