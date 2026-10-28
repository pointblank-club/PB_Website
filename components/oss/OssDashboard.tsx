"use client";

import { useEffect, useMemo, useState } from "react";
import OssHero from "@/components/oss/modules/OssHero";
import OssOverviewSection from "@/components/oss/modules/OssOverviewSection";
import OssHighlightsSection from "@/components/oss/modules/OssHighlightsSection";
import OssOrganizationsPanel from "@/components/oss/modules/OssOrganizationsPanel";
import OssContributorsPanel from "@/components/oss/modules/OssContributorsPanel";
import LoadingBrackets from "@/components/ui/LoadingBrackets";
import { Button } from "@/components/ui/button";
import type {
  ContributorSortOptionId,
  ContributorView,
  DashboardStats,
  DashboardTab,
  OrganizationSortOptionId,
  OrganizationTagFilter,
  OrganizationView,
  ContributorsResponse,
  OrgsResponse,
  StatsResponse,
} from "@/components/oss/types";
import {
  SHOW_ORGANIZATION_TAGS,
  TABS,
  matchSearch,
} from "@/components/oss/utils";

// ─── Data fetching & normalization ────────────────────────────────────────────

function buildUrl(endpoint: string, view: "stats" | "orgs" | "contributors") {
  const sep = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${sep}view=${view}`;
}

interface DashboardData {
  stats: DashboardStats;
  organizations: OrganizationView[];
  contributors: ContributorView[];
}

function getPreferredPlatform(
  platforms: Array<"github" | "gitlab" | "linux">,
): "github" | "gitlab" | "linux" | undefined {
  if (platforms.includes("github")) return "github";
  if (platforms.includes("gitlab")) return "gitlab";
  if (platforms.includes("linux")) return "linux";
  return undefined;
}

async function fetchDashboardData(endpoint: string): Promise<DashboardData> {
  const [statsRes, orgsRes, contributorsRes] = await Promise.all([
    fetch(buildUrl(endpoint, "stats")),
    fetch(buildUrl(endpoint, "orgs")),
    fetch(buildUrl(endpoint, "contributors")),
  ]);

  if (!statsRes.ok || !orgsRes.ok || !contributorsRes.ok) {
    throw new Error("One or more API requests failed. Please try again.");
  }

  const statsJson: StatsResponse = await statsRes.json();
  const orgsJson: OrgsResponse = await orgsRes.json();
  const contributorsJson: ContributorsResponse = await contributorsRes.json();

  // Build a username → memberName lookup from contributors
  const loginToName = new Map<string, string>(
    contributorsJson.data.map((c) => [c.username, c.memberName]),
  );

  // Normalize organizations
  const organizations: OrganizationView[] = orgsJson.data.map((org) => ({
    id: org.orgLogin,
    name: org.orgLogin,
    url: org.orgUrl,
    avatarUrl: org.orgAvatar,
    platform: getPreferredPlatform(org.platforms),
    description: undefined,
    tag: org.tag,
    prCount: org.totalMergedPRs,
    // API doesn't expose commits per-org; default to 0
    commitCount: 0,
    totalContributions: org.totalMergedPRs,
    contributors: org.contributors.map((login) => ({
      id: login,
      name: loginToName.get(login) ?? login,
      login,
      platform: getPreferredPlatform(org.platforms),
    })),
  }));

  // Build an orgLogin → OssOrganizationRef lookup
  const orgRefMap = new Map(
    organizations.map((o) => [
      o.id,
      {
        id: o.id,
        name: o.name,
        prCount: o.prCount,
        url: o.url,
        platform: o.platform,
      },
    ]),
  );

  // Normalize contributors
  const contributors: ContributorView[] = contributorsJson.data.map((c) => ({
    id: c.memberName,
    name: c.memberName,
    login: c.username,
    bio: undefined,
    url: c.username
      ? `https://${getPreferredPlatform(c.platforms) === "gitlab" ? "gitlab.com" : "github.com"}/${c.username}`
      : undefined,
    platform: getPreferredPlatform(c.platforms),
    prCount: c.totalMergedPRs,
    totalContributions: c.totalMergedPRs,
    organizations: c.orgs.map((orgLogin) =>
      orgRefMap.get(orgLogin) ?? { id: orgLogin, name: orgLogin },
    ),
  }));

  const stats: DashboardStats = {
    totalMergedPRs: statsJson.totalMergedPRs,
    totalOrganizations: organizations.length,
    totalContributors: contributors.length,
  };

  return { stats, organizations, contributors };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Status = "loading" | "success" | "error";

export default function OssDashboard({ endpoint }: { endpoint: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationTag, setOrganizationTag] =
    useState<OrganizationTagFilter>("all");
  const [orgSort, setOrgSort] =
    useState<OrganizationSortOptionId>("prCount");
  const [contributorSort, setContributorSort] =
    useState<ContributorSortOptionId>("prCount");

  useEffect(() => {
    let cancelled = false;
    fetchDashboardData(endpoint)
      .then((data) => {
        if (!cancelled) {
          setDashboardData(data);
          setStatus("success");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Unexpected error.",
          );
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const query = searchQuery.trim().toLowerCase();

  const organizations: OrganizationView[] = dashboardData?.organizations ?? [];
  const contributors: ContributorView[] = dashboardData?.contributors ?? [];

  const filteredAndSortedOrganizations = useMemo(() => {
    const results = organizations.filter((organization) => {
      const matchesTag =
        !SHOW_ORGANIZATION_TAGS
        || organizationTag === "all"
        || organization.tag === organizationTag;
      const matchesQuery = matchSearch(
        [
          organization.name,
          organization.url,
          organization.description,
          ...(SHOW_ORGANIZATION_TAGS ? [organization.tag] : []),
          ...organization.contributors.map((c) => c.name),
          ...organization.contributors.map((c) => c.login),
        ],
        query,
      );
      return matchesTag && matchesQuery;
    });

    results.sort((l, r) => {
      if (orgSort === "totalContributions")
        return r.totalContributions - l.totalContributions;
      if (orgSort === "prCount") return r.prCount - l.prCount;
      if (orgSort === "contributors")
        return r.contributors.length - l.contributors.length;
      return l.name.localeCompare(r.name);
    });

    return results;
  }, [organizations, orgSort, organizationTag, query]);

  const filteredAndSortedContributors = useMemo(() => {
    const results = contributors.filter((contributor) =>
      matchSearch(
        [
          contributor.name,
          contributor.login ?? "",
          contributor.bio,
          ...contributor.organizations.map((o) => o.name),
        ],
        query,
      ),
    );

    results.sort((l, r) => {
      if (contributorSort === "totalContributions")
        return r.totalContributions - l.totalContributions;
      if (contributorSort === "prCount") return r.prCount - l.prCount;
      return l.name.localeCompare(r.name);
    });

    return results;
  }, [contributors, contributorSort, query]);

  // ── Loading state ──
  if (status === "loading") {
    return <LoadingBrackets />;
  }

  // ── Error state ──
  if (status === "error") {
    return (
      <div className="min-h-screen bg-pbpages px-3 py-6 font-medium text-zinc-300 sm:px-4 sm:py-12">
        <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-[1700px] items-center justify-center sm:min-h-[calc(100vh-11rem)] sm:px-6 lg:px-10 xl:px-[80px]">
          <div className="flex w-full max-w-lg flex-col items-center rounded-[20px] border border-red-400/10 bg-[#1c1c1c] px-4 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:px-8 sm:py-10">
            <h2 className="mb-4 text-center text-2xl font-medium text-white">
              Failed to load data
            </h2>
            <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-zinc-500 sm:text-base">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center rounded-full bg-[#39FF14] px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#32e600] sm:text-base sm:tracking-[0.24em]"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ──
  const { stats } = dashboardData!;

  return (
    <div className="min-h-screen bg-pbpages font-medium text-zinc-300 selection:bg-[#00FF41]/30 selection:text-white">
      <main className="mx-auto w-full max-w-[1700px] px-3 py-6 sm:px-5 sm:py-10 lg:px-10 xl:px-[80px]">
        <OssHero />

        <div className="mb-8 grid grid-cols-3 gap-2 sm:mb-10 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              size="pill"
              variant={activeTab === tab.id ? "success" : "surface"}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
              }}
              className="w-full px-3 py-2 text-[10px] tracking-[0.08em] sm:min-w-[170px] sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm sm:tracking-[0.18em] md:px-7 md:text-base"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="mb-8 sm:mb-10">
          <OssOverviewSection
            totalContributors={stats.totalContributors}
            totalMergedPRs={stats.totalMergedPRs}
            totalOrganizations={stats.totalOrganizations}
          />
        </div>

        {activeTab === "dashboard" && (
          <OssHighlightsSection
            contributorStats={contributors}
            organizationStats={organizations}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === "organizations" && (
          <OssOrganizationsPanel
            onOrganizationTagChange={setOrganizationTag}
            onOrgSortChange={setOrgSort}
            onSearchQueryChange={setSearchQuery}
            organizationTag={organizationTag}
            organizations={filteredAndSortedOrganizations}
            orgSort={orgSort}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === "contributors" && (
          <OssContributorsPanel
            contributorSort={contributorSort}
            contributors={filteredAndSortedContributors}
            onContributorSortChange={setContributorSort}
            onSearchQueryChange={setSearchQuery}
            searchQuery={searchQuery}
          />
        )}
      </main>
    </div>
  );
}
