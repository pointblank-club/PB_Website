/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ============================
 * 📡 GET /api/contributions
 * ============================
 *
 * REQUIRED:
 *   ?view=orgs | stats | contributors | prs | user
 *
 * --------------------------------------------
 * 🔹 view=orgs
 *   → Per-organization breakdown
 *   Optional: &tag=gsoc | lfx | both | none
 *
 * 🔹 view=stats
 *   → Global statistics
 *
 * 🔹 view=contributors
 *   → Contributor stats
 *   Optional: &username=<github/gitlab username>
 *
 * 🔹 view=prs
 *   → Paginated PR list
 *   Filters:
 *     &memberName=<name>
 *     &username=<handle>
 *     &orgLogin=<org>
 *     &tag=gsoc|lfx|both|none
 *     &platform=github|gitlab|linux
 *   Pagination:
 *     &page=1
 *     &limit=50 (max 200)
 *
 * 🔹 view=user  ✅ (NEW)
 *   → Aggregated per-user contributions
 *   Required:
 *     &name=<memberName>
 *
 *   Returns:
 *   {
 *     name,
 *     stats: { total, github, gitlab },
 *     orgs: [
 *       {
 *         org,
 *         platform,
 *         prs: [{ title, url, repo, mergedAt }]
 *       }
 *     ]
 *   }
 *
 * --------------------------------------------
 * ⚠️ Notes:
 * - memberName must match DB exactly
 * - URLs must be encoded (e.g. Neel%20Dutta)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOrgBreakdown,
  getGlobalStats,
  getContributorStats,
  getMemberPRs,
} from "@/lib/server/contributionsV2";
import connectDB from "@/lib/db/connection";
import Contribution from "@/lib/db/models/contributionsV2";
import type { OrgTag } from "@/lib/data/orgs";
import { ensureOrgTagCache } from "@/lib/data/orgs";

const VALID_TAGS      = new Set<OrgTag>(["gsoc", "lfx", "both", "none"]);
const VALID_VIEWS     = new Set(["orgs", "stats", "contributors", "prs", "user"]);
const VALID_PLATFORMS = new Set(["github", "gitlab", "linux"]);

export async function GET(req: NextRequest) {
    await ensureOrgTagCache();
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (!view || !VALID_VIEWS.has(view)) {
      return NextResponse.json(
        { error: `Missing or invalid ?view=. Use: ${[...VALID_VIEWS].join(" | ")}` },
        { status: 400 }
      );
    }

    // orgs
    if (view === "orgs") {
      const tagFilter = searchParams.get("tag");

      if (tagFilter && !VALID_TAGS.has(tagFilter as OrgTag)) {
        return NextResponse.json(
          { error: `Invalid tag "${tagFilter}"` },
          { status: 400 }
        );
      }

      const data = await getOrgBreakdown(tagFilter ?? undefined);
      return NextResponse.json({ data });
    }

    // stats
    if (view === "stats") {
      const data = await getGlobalStats();
      return NextResponse.json(data);
    }

    // contributors
    if (view === "contributors") {
      const username = searchParams.get("username") ?? undefined;
      const data = await getContributorStats(username);
      return NextResponse.json({ data });
    }

    // prs
    if (view === "prs") {
      const platform = searchParams.get("platform");

      if (platform && !VALID_PLATFORMS.has(platform)) {
        return NextResponse.json(
          { error: `Invalid platform "${platform}"` },
          { status: 400 }
        );
      }

      const tagFilter = searchParams.get("tag");
      if (tagFilter && !VALID_TAGS.has(tagFilter as OrgTag)) {
        return NextResponse.json(
          { error: `Invalid tag "${tagFilter}"` },
          { status: 400 }
        );
      }

      const page  = parseInt(searchParams.get("page")  ?? "1",  10);
      const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

      const result = await getMemberPRs({
        memberName: searchParams.get("memberName") ?? undefined,
        username:   searchParams.get("username")   ?? undefined,
        orgLogin:   searchParams.get("orgLogin")   ?? undefined,
        tag:        tagFilter ?? undefined,
        platform:   platform  ?? undefined,
        page,
        limit,
      });

      return NextResponse.json(result);
    }

    // user (aggregated view)
    if (view === "user") {
      const name = searchParams.get("name");

      if (!name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 }
        );
      }

      await connectDB();

      const contributions = await Contribution.find(
        { memberName: name },
        { __v: 0 }
      ).lean();

      const stats = {
        total: contributions.length,
        github: contributions.filter(c => c.platform === "github").length,
        gitlab: contributions.filter(c => c.platform === "gitlab").length,
        linux: contributions.filter(c => c.platform === "linux").length,
      };

      const orgMap = new Map();

      for (const c of contributions) {
        const key = `${c.platform}-${c.orgLogin}`;

        if (!orgMap.has(key)) {
          orgMap.set(key, {
            org: c.orgLogin,
            platform: c.platform,
            prs: [],
          });
        }

        orgMap.get(key).prs.push({
          title: c.title,
          url: c.url,
          repo: c.repoFullName,
          mergedAt: c.mergedAt,
        });
      }

      return NextResponse.json({
        name,
        stats,
        orgs: Array.from(orgMap.values()),
      });
    }

    return NextResponse.json({ error: "Invalid view" }, { status: 400 });

  } catch (err: any) {
    console.error("[API] GET /contributions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
}