/* eslint-disable @typescript-eslint/no-explicit-any */
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { getOrgTagSync } from "@/lib/data/orgs";
import type { RawContribution, RepoDetails, OrgDetails } from "./types";

const OctokitWithPlugins = Octokit.plugin(throttling, retry);

export function createOctokit(): InstanceType<typeof OctokitWithPlugins> {
  return new OctokitWithPlugins({
    auth: process.env.TOKEN_GITHUB,
    throttle: {
      onRateLimit: (retryAfter: number, _options: any, _octokit: any, retryCount: number) => {
        console.warn(`[GitHub] Rate limit — retrying after ${retryAfter}s (attempt ${retryCount + 1}/3)`);
        return retryCount < 3;
      },
      onSecondaryRateLimit: (_retryAfter: number, options: any) => {
        console.warn(`[GitHub] Secondary rate limit on ${options.url}`);
        return true;
      },
    },
  });
}

//Caches

const repoCache     = new Map<string, RepoDetails | null>();
const upstreamCache = new Map<string, RepoDetails | null>();
const orgCache      = new Map<string, OrgDetails | null>();

export function clearGitHubCaches(): void {
  repoCache.clear();
  upstreamCache.clear();
  orgCache.clear();
}

//Helpers

export function extractOrgLogin(link: string): string | null {
  try {
    const url = new URL(link.startsWith("http") ? link : `https://${link}`);
    if (!url.hostname.includes("github.com")) return null;
    // pathname: "/org" or "/org/repo" — we want only the first segment
    const login = url.pathname.replace(/^\//, "").split("/")[0];
    return login || null;
  } catch {
    return null;
  }
}

async function getRepoDetails(
  octokit: InstanceType<typeof OctokitWithPlugins>,
  repoFullName: string
): Promise<RepoDetails | null> {
  if (repoCache.has(repoFullName)) return repoCache.get(repoFullName)!;
  try {
    const [owner, repo] = repoFullName.split("/");
    const { data } = await octokit.rest.repos.get({ owner, repo });
    const details: RepoDetails = {
      full_name:        data.full_name,
      stargazers_count: data.stargazers_count,
      private:          data.private,
      fork:             data.fork,
      size:             data.size,
      owner: {
        login:      data.owner.login,
        type:       data.owner.type,
        avatar_url: data.owner.avatar_url,
      },
      parent_full_name: data.fork && data.parent ? data.parent.full_name : undefined,
    };
    repoCache.set(repoFullName, details);
    return details;
  } catch (err: any) {
    if (err.status === 404) { repoCache.set(repoFullName, null); return null; }
    throw err;
  }
}

async function resolveUpstream(
  octokit: InstanceType<typeof OctokitWithPlugins>,
  fork: RepoDetails
): Promise<RepoDetails | null> {
  if (!fork.fork) return fork;
  if (upstreamCache.has(fork.full_name)) return upstreamCache.get(fork.full_name)!;
  const upstreamName = fork.parent_full_name;
  if (!upstreamName) { upstreamCache.set(fork.full_name, null); return null; }
  const upstream = await getRepoDetails(octokit, upstreamName);
  upstreamCache.set(fork.full_name, upstream);
  return upstream;
}

async function getOrgDetails(
  octokit: InstanceType<typeof OctokitWithPlugins>,
  orgLogin: string
): Promise<OrgDetails | null> {
  if (orgCache.has(orgLogin)) return orgCache.get(orgLogin)!;
  try {
    const { data } = await octokit.rest.orgs.get({ org: orgLogin });
    const details: OrgDetails = { login: data.login, public_repos: data.public_repos, followers: data.followers };
    orgCache.set(orgLogin, details);
    return details;
  } catch (err: any) {
    if (err.status === 404) { orgCache.set(orgLogin, null); return null; }
    throw err;
  }
}

const OWN_ORG_LOGINS = new Set(
  (process.env.OWN_ORG_LOGINS ?? "pointblank-club")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);
console.log(`[GitHub] OWN_ORG_LOGINS resolved to: ${JSON.stringify([...OWN_ORG_LOGINS])}`);

//OSS validation

type RejectionReason = "private" | "own-repo" | "own-org" | "user-owned-low-stars" | "low-signal";

interface OSSCheckResult {
  valid:         boolean;
  reason?:       RejectionReason;
  effectiveRepo: RepoDetails;
}

async function isValidOSS(
  octokit: InstanceType<typeof OctokitWithPlugins>,
  repo: RepoDetails,
  username: string,
  customOrgLogins: Set<string>,
): Promise<OSSCheckResult> {
  console.log(
    `[isValidOSS] checking repo="${repo.full_name}" owner="${repo.owner.login}" ` +
    `ownerLower="${repo.owner.login.toLowerCase()}" fork=${repo.fork} ` +
    `matchesOwnOrg=${OWN_ORG_LOGINS.has(repo.owner.login.toLowerCase())}`
  );

  if (repo.owner.login.toLowerCase() === username.toLowerCase()) {
    return {
      valid: false,
      reason: "own-repo",
      effectiveRepo: repo,
    };
  }

  if (OWN_ORG_LOGINS.has(repo.owner.login.toLowerCase())) {
    return {
      valid: false,
      reason: "own-org",
      effectiveRepo: repo,
    };
  }

  let effective = repo;

  if (repo.fork) {
    const upstream = await resolveUpstream(octokit, repo);
    if (upstream) effective = upstream;
  }

  const orgLogin = effective.owner.login;
  console.log(
    `[isValidOSS] after fork-resolution repo="${effective.full_name}" ` +
    `orgLogin="${orgLogin}" orgLoginLower="${orgLogin.toLowerCase()}" ` +
    `matchesOwnOrg=${OWN_ORG_LOGINS.has(orgLogin.toLowerCase())}`
  );

  if (effective.private) {
    return {
      valid: false,
      reason: "private",
      effectiveRepo: effective,
    };
  }

  if (orgLogin.toLowerCase() === username.toLowerCase()) {
    return {
      valid: false,
      reason: "own-repo",
      effectiveRepo: effective,
    };
  }

  if (OWN_ORG_LOGINS.has(orgLogin.toLowerCase())) {
    return {
      valid: false,
      reason: "own-org",
      effectiveRepo: effective,
    };
  }

  if (customOrgLogins.has(orgLogin.toLowerCase())) {
    return {
      valid: true,
      effectiveRepo: effective,
    };
  }

  if (getOrgTagSync(orgLogin) !== "none") {
    return {
      valid: true,
      effectiveRepo: effective,
    };
  }

  if (effective.owner.type === "Organization") {
    const orgDetails = await getOrgDetails(octokit, orgLogin);

    if (orgDetails && orgDetails.public_repos >= 5 && orgDetails.followers >= 20) {
      return {
        valid: true,
        effectiveRepo: effective,
      };
    }

    if (effective.stargazers_count >= 50) {
      return {
        valid: true,
        effectiveRepo: effective,
      };
    }
  }

  return {
    valid: false,
    reason: "low-signal",
    effectiveRepo: effective,
  };
}
//Date helpers

function buildDateRanges(since: Date | undefined): Array<{ from: string; to: string }> {
  const startYear  = since ? since.getFullYear() : 2019;
  const startMonth = since ? since.getMonth() + 1 : 1;
  const now        = new Date();
  const endYear    = now.getFullYear();
  const endMonth   = now.getMonth() + 1;

  const quarters = [
    { start: 1, end: 3 },
    { start: 4, end: 6 },
    { start: 7, end: 9 },
    { start: 10, end: 12 },
  ];

  const ranges: Array<{ from: string; to: string }> = [];
  for (let year = startYear; year <= endYear; year++) {
    for (const q of quarters) {
      if (year === startYear && q.end   < startMonth) continue;
      if (year === endYear   && q.start > endMonth)   continue;

      const fromMonth = year === startYear && q.start < startMonth ? startMonth : q.start;
      const toMonth   = year === endYear   && q.end   > endMonth   ? endMonth   : q.end;

      const fromDate = since && year === startYear && q.start <= startMonth
        ? since.toISOString().split("T")[0]
        : `${year}-${String(fromMonth).padStart(2, "0")}-01`;

      const lastDay = new Date(year, toMonth, 0).getDate();
      const toDate  = `${year}-${String(toMonth).padStart(2, "0")}-${lastDay}`;

      ranges.push({ from: fromDate, to: toDate });
    }
  }
  return ranges;
}

//Targeted org fetch (Path A)

async function fetchPRsForOrg(
  octokit: InstanceType<typeof OctokitWithPlugins>,
  username: string,
  memberName: string,
  orgLogin: string,
  seenUrls: Set<string>,
  since: Date | undefined,
): Promise<RawContribution[]> {
  const results: RawContribution[] = [];

  // Fetch org metadata for avatar / html_url display fields
  let orgAvatarUrl = "";
let orgHtmlUrl   = `https://github.com/${orgLogin}`;

try {
  const { data } = await octokit.rest.orgs.get({ org: orgLogin });

  orgAvatarUrl = data.avatar_url || "";

  orgHtmlUrl = data.html_url || `https://github.com/${orgLogin}`;

  orgCache.set(orgLogin, {
    login: data.login,
    public_repos: data.public_repos,
    followers: data.followers,
  });

} catch(err: any) {
  //Eat 5 star do nothing!
  console.warn(`[GitHub/org] Failed to fetch org ${orgLogin}: ${err?.message}`);
}

  const sinceStr = since ? since.toISOString().split("T")[0] : "2019-01-01";

  try {
    const iterator = octokit.paginate.iterator(octokit.rest.search.issuesAndPullRequests, {
      q:        `author:${username} type:pr is:merged is:public org:${orgLogin} merged:>=${sinceStr}`,
      sort:     "updated",
      order:    "desc",
      per_page: 100,
    });

    orgHtmlUrl = orgHtmlUrl || `https://github.com/${orgLogin}`;
    for await (const page of iterator) {
      for (const pr of page.data) {
        if (seenUrls.has(pr.html_url)) continue;
        seenUrls.add(pr.html_url);

        const mergedAt = pr.pull_request?.merged_at;
        if (!mergedAt) continue;

        const repoFullName = pr.repository_url.replace("https://api.github.com/repos/", "");
        results.push({
          memberName,
          username,
          platform:     "github",
          repoFullName,
          orgLogin,
          orgAvatarUrl,
          orgHtmlUrl,
          title:    pr.title,
          url:      pr.html_url,
          mergedAt: new Date(mergedAt),
        });
      }
    }
  } catch (err: any) {
    if (err.status === 422 || err.status === 404) {
      console.warn(`[GitHub/org] Skipping org=${orgLogin} for ${username}: HTTP ${err.status}`);
    } else {
      throw err;
    }
  }

  console.log(`[GitHub/org] ${username} @ ${orgLogin} → ${results.length} PRs`);
  return results;
}

//Main export

export interface GitHubFetchOptions {
  username:       string;
  memberName:     string;
  customOrgLinks: string[];  
  since?:         Date;
}

export async function fetchGitHubMergedPRs(options: GitHubFetchOptions): Promise<RawContribution[]> {
  const { username, memberName, customOrgLinks, since } = options;
  const octokit = createOctokit();

  const customOrgLogins = new Set<string>(
    customOrgLinks
      .map(extractOrgLogin)
      .filter((l): l is string => l !== null)
      .map((l) => l.toLowerCase())
      .filter((l) => {
        if (OWN_ORG_LOGINS.has(l)) {
          console.warn(`[GitHub] Ignoring own-org "${l}" in customOrgLinks for ${username}`);
          return false;
        }
        return true;
      })
  );

  let searchFetched = 0, searchAccepted = 0, skippedSeen = 0;
  const rejectionCounts: Record<string, number> = {};
  const logRejection = (reason: string) => {
    rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
  };

  console.log(
    `[GitHub] Fetching PRs for ${username}` +
    (customOrgLogins.size ? ` | explicit orgs: ${[...customOrgLogins].join(", ")}` : "")
  );

  const results: RawContribution[] = [];
  const seenUrls = new Set<string>();

  for (const orgLogin of customOrgLogins) {
    try {
      const orgPRs = await fetchPRsForOrg(
        octokit, username, memberName, orgLogin, seenUrls, since
      );
      results.push(...orgPRs);
    } catch (err: any) {
      console.error(`[GitHub/org] Failed for ${username} @ ${orgLogin}: ${err.message}`);
    }
  }

  //Path B broad Search sweep for everything 
  for (const { from, to } of buildDateRanges(since)) {
    try {
      const iterator = octokit.paginate.iterator(octokit.rest.search.issuesAndPullRequests, {
        q:        `author:${username} type:pr is:pr is:merged is:public merged:${from}..${to}`,
        sort:     "updated",
        order:    "desc",
        per_page: 100,
      });

      let pages = 0;
      for await (const page of iterator) {
        pages++;
        searchFetched += page.data.length;

        for (const pr of page.data) {
          if (seenUrls.has(pr.html_url)) { skippedSeen++; continue; }
          seenUrls.add(pr.html_url);

          const mergedAt = pr.pull_request?.merged_at;
          if (!mergedAt) { logRejection("no-merged-at"); continue;}
          if (!pr.pull_request) continue; 
          if (!pr.pull_request.merged_at) continue;
          

          const repoFullName = pr.repository_url.replace("https://api.github.com/repos/", "");

          let repo: RepoDetails | null = null;
          try {
            repo = await getRepoDetails(octokit, repoFullName);
          } catch (err: any) {
            console.warn(`[GitHub] Could not fetch repo ${repoFullName}: ${err.message}`);
          }

          if (!repo) { logRejection("repo-fetch-failed"); continue; }

          const check = await isValidOSS(octokit, repo, username, customOrgLogins);
          if (!check.valid) { logRejection(check.reason ?? "unknown"); continue; }

          const eff = check.effectiveRepo;
          results.push({
            memberName, username, platform: "github",
            repoFullName,
            orgLogin:     eff.owner.login,
            orgAvatarUrl: eff.owner.avatar_url,
            orgHtmlUrl:   `https://github.com/${eff.owner.login}`,
            title:        pr.title,
            url:          pr.html_url,
            mergedAt:     new Date(mergedAt),
          });
          searchAccepted++;
        }
      }

      if (pages > 0) console.log(`[GitHub] ${username} range=${from}..${to} → ${pages} pages`);
    } catch (err: any) {
      if (err.status === 422) {
        console.warn(`[GitHub] 422 for ${username} range=${from}..${to}`);
        continue;
      }
      throw err;
    }
  }

  console.log(
    `[GitHub] ${username} done — total=${results.length} ` +
    `(orgFetch=${results.length - searchAccepted}, searchAccepted=${searchAccepted}) ` +
    `searchFetched=${searchFetched} seenDups=${skippedSeen} ` +
    `rejections=${JSON.stringify(rejectionCounts)}`
  );

  return results;
}