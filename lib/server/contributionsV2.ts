/* eslint-disable @typescript-eslint/no-explicit-any */
import connectDB from "@/lib/db/connection";
import Contribution from "@/lib/db/models/contributionsV2";
import Org from "@/lib/db/models/orgsV2";
import User from "@/lib/db/models/users";
//import { getOrgTag } from "@/lib/data/orgs";
import { refreshOrgTagCache } from "@/lib/data/orgs";
import { getOrgTagSync } from "@/lib/data/orgs";
import {
  fetchGitHubMergedPRs,
  clearGitHubCaches,
  extractOrgLogin,
} from "./scrapers/github";
import {
  fetchGitLabMergedMRs,
  resolveGitLabUserId,
} from "./scrapers/gitlab";
import { fetchLinuxKernelPatches } from "./scrapers/linux";
import type { RawContribution } from "./scrapers/types";


function splitOrgLinks(links: string[]): {
  github: string[];
  gitlab: string[];
} {
  const github: string[] = [];
  const gitlab: string[] = [];

  for (const raw of links) {
    try {
      const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      if (url.hostname.includes("github.com")) github.push(raw);
      else if (url.hostname.includes("gitlab.com")) gitlab.push(raw);
    } catch {}
  }

  return { github, gitlab };
}

async function saveContributions(
  contributions: RawContribution[]
): Promise<void> {
  if (contributions.length === 0) return;

  const orgsMap = new Map<
    string,
    {
      login: string;
      avatarUrl: string;
      htmlUrl: string;
      platform: "github" | "gitlab" | "linux";
    }
  >();

  for (const c of contributions) {
    const key = `${c.orgLogin.toLowerCase()}:${c.platform}`;
    if (!orgsMap.has(key)) {
      orgsMap.set(key, {
        login: c.orgLogin,
        avatarUrl: c.orgAvatarUrl,
        htmlUrl: c.orgHtmlUrl,
        platform: c.platform,
      });
    }
  }

  // Save orgs
for (const org of orgsMap.values()) {
  const update: Record<string, any> = {
    platform: org.platform,
    lastFetched: new Date(),
  };
  if (org.avatarUrl) update.avatarUrl = org.avatarUrl;
  if (org.htmlUrl)   update.htmlUrl   = org.htmlUrl;

  await Org.findOneAndUpdate(
    { login: org.login.toLowerCase(), platform: org.platform },
    { $set: update },
    { upsert: true }
  );
}

  for (const c of contributions) {
    // Key on url alone. A contribution's URL uniquely identifies the actual
    // PR/commit regardless of platform, and — critically — username is not
    // a stable value to key on: it's computed differently across platforms
    // (and has changed as the Linux scraper's matching strategy evolved).
    // Keying on {username, url} meant a later run with a different username
    // for the same person failed to match the earlier document and
    // inserted a duplicate instead of updating it, silently inflating PR
    // counts. Keying on url alone means the record is always found and
    // its username/memberName are simply refreshed to the current values.
    await Contribution.findOneAndUpdate(
      { url: c.url },
      {
        $set: {
          memberName: c.memberName,
          username: c.username,
          platform: c.platform,
          repoFullName: c.repoFullName,
          orgLogin: c.orgLogin,
          title: c.title,
          url: c.url,
          mergedAt: c.mergedAt,
          tag:getOrgTagSync(c.orgLogin),
          scrapedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  console.log(
    `[DB] Saved ${contributions.length} contributions across ${orgsMap.size} orgs`
  );
}


export async function runScrapeJob(options: {
  incremental?: boolean;
  memberFilter?: string[];
} = {}) {
    await refreshOrgTagCache(); 
  await connectDB();
  clearGitHubCaches();

  const { incremental = false, memberFilter } = options;

  const query: any = memberFilter?.length
    ? { name: { $in: memberFilter } }
    : {};

  const members = await User.find(query).lean();

  if (members.length === 0) {
    throw new Error("No users found.");
  }

  console.log(`[Job] Scraping ${members.length} members`);

  let totalGitHub = 0;
  let totalGitLab = 0;
  let totalLinux = 0;

  for (const member of members) {
    const {
      name,
      githubUsername,
      gitlabUsername,
      kernelName,
      kernelEmail,
      customOrgLinks = [],
    } = member;

    let since: Date | undefined;

if (incremental) {
  const WINDOW_DAYS = 3;
  since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

    const { github: githubLinks, gitlab: gitlabLinks } =
      splitOrgLinks(customOrgLinks);

    const all: RawContribution[] = [];

    // GitHub
    if (githubUsername) {
      try {
        console.log(
          `[Job] GitHub → ${githubUsername}` +
            (githubLinks.length
              ? ` | orgs: ${githubLinks
                  .map(extractOrgLogin)
                  .join(", ")}`
              : "")
        );

        const prs = await fetchGitHubMergedPRs({
          username: githubUsername,
          memberName: name,
          customOrgLinks: githubLinks,
          since,
        });

        all.push(...prs);
        totalGitHub += prs.length;
      } catch (err: any) {
        console.error(`[GitHub] ${name}:`, err.message);
      }
    }

    // Linux kernel (upstream torvalds/linux, keyed by author name + email)
    if (kernelName) {
      try {
        console.log(`[Job] Linux → ${kernelName}`);

        const patches = await fetchLinuxKernelPatches({
          kernelName,
          kernelEmail,
          memberName: name,
          since,
        });

        all.push(...patches);
        totalLinux += patches.length;
      } catch (err: any) {
        console.error(`[Linux] ${name}:`, err.message);
      }
    }

    // GitLab
    if (gitlabUsername) {
      try {
        let gitlabId = member.gitlabId ?? null;

        if (!gitlabId) {
          gitlabId = await resolveGitLabUserId(gitlabUsername);
          if (gitlabId) {
            await User.updateOne({ _id: member._id }, { gitlabId });
          }
        }

        if (gitlabId) {
          const mrs = await fetchGitLabMergedMRs({
            username: gitlabUsername,
            memberName: name,
            gitlabUserId: gitlabId,
            customOrgLinks: gitlabLinks,
            since,
          });

          all.push(...mrs);
          totalGitLab += mrs.length;
        }
      } catch (err: any) {
        console.error(`[GitLab] ${name}:`, err.message);
      }
    }

    if (all.length > 0) {
      await saveContributions(all);
    } else {
      console.log(`[Job] No contributions for ${name}`);
    }
  }

  console.log(
    `[Job] Done — GitHub: ${totalGitHub}, GitLab: ${totalGitLab}, Linux: ${totalLinux}`
  );
}

export async function getOrgBreakdown(tagFilter?: string) {
  await connectDB();

  const result = await Contribution.aggregate([
    {
      $group: {
        _id: "$orgLogin",
        totalMergedPRs: { $sum: 1 },
        contributorPairs: {
          $addToSet: { username: "$username", memberName: "$memberName" },
        },
        memberNames: { $addToSet: "$memberName" },
        platforms: { $addToSet: "$platform" },
      },
    },
    {
      $lookup: {
        from: "orgs_v2",
        let: { orgLogin: { $toLower: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$login", "$$orgLogin"] } } },
        ],
        as: "orgDetails",
      },
    },
    {
      $project: {
        _id: 0,
        orgLogin: "$_id",
        totalMergedPRs: 1,
        contributorPairs: 1,
        memberNames: 1,
        platforms: 1,
        orgAvatar: { $arrayElemAt: ["$orgDetails.avatarUrl", 0] },
        orgUrl: { $arrayElemAt: ["$orgDetails.htmlUrl", 0] },
      },
    },
    { $sort: { totalMergedPRs: -1 } },
  ]);

  const tagged = result.map((org: any) => {
    const byMember = new Map<string, string>();
    for (const pair of org.contributorPairs as Array<{
      username: string;
      memberName: string;
    }>) {
      if (!byMember.has(pair.memberName)) {
        byMember.set(pair.memberName, pair.username);
      }
    }
    const contributors = [...byMember.values()];

    return {
      orgLogin: org.orgLogin,
      totalMergedPRs: org.totalMergedPRs,
      contributors,
      contributorCount: contributors.length,
      memberNames: org.memberNames,
      platforms: org.platforms,
      orgAvatar: org.orgAvatar,
      orgUrl: org.orgUrl,
      tag: getOrgTagSync(org.orgLogin),
    };
  });

  if (tagFilter) {
    return tagged.filter((o) => o.tag === tagFilter);
  }

  return tagged;
}

export async function getContributorStats(username?: string) {
    await connectDB();
  
    const matchStage: Record<string, any> = {};
    if (username) matchStage.username = username;
  
    const result = await Contribution.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$memberName", 
          usernames: { $addToSet: "$username" },
          memberName: { $first: "$memberName" },
          totalMergedPRs: { $sum: 1 },
          githubPRs: {
            $sum: {
              $cond: [{ $eq: ["$platform", "github"] }, 1, 0],
            },
          },
          gitlabPRs: {
            $sum: {
              $cond: [{ $eq: ["$platform", "gitlab"] }, 1, 0],
            },
          },
          linuxPatches: {
            $sum: {
              $cond: [{ $eq: ["$platform", "linux"] }, 1, 0],
            },
          },
          orgs: { $addToSet: "$orgLogin" },
          platforms: { $addToSet: "$platform" },
        },
      },
      {
        $project: {
          _id: 0,
          username: { $arrayElemAt: ["$usernames", 0] }, // pick one
          memberName: 1,
          totalMergedPRs: 1,
          githubPRs: 1,
          gitlabPRs: 1,
          linuxPatches: 1,
          orgs: 1,
          platforms: 1,
          totalOrgs: { $size: "$orgs" },
        },
      },
      { $sort: { totalMergedPRs: -1 } },
    ]);
  
    return result.map((user: any) => ({
      ...user,
      tags: user.orgs.map((org: string) => getOrgTagSync(org)),
    }));
  }
  export async function getMemberPRs(options: {
    memberName?: string;
    username?: string;
    orgLogin?: string;
    tag?: string;
    platform?: string;
    page?: number;
    limit?: number;
  }) {
    await connectDB();
  
    const {
      memberName,
      username,
      orgLogin,
      tag,
      platform,
      page = 1,
      limit = 50,
    } = options;
  
    const match: Record<string, any> = {};
    if (memberName) match.memberName = memberName;
    if (username) match.username = username;
    if (orgLogin) match.orgLogin = orgLogin;
    if (platform) match.platform = platform;
  
    const skip = (page - 1) * limit;
  
    const [data, total] = await Promise.all([
      Contribution.find(match, {
        _id: 0,
        memberName: 1,
        username: 1,
        platform: 1,
        repoFullName: 1,
        orgLogin: 1,
        title: 1,
        url: 1,
        mergedAt: 1,
      })
        .sort({ mergedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contribution.countDocuments(match),
    ]);
  
    const tagged = data.map((d: any) => ({
      ...d,
      tag: getOrgTagSync(d.orgLogin),
    }));
  
    return {
      data: tag ? tagged.filter((d) => d.tag === tag) : tagged,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
  export async function getGlobalStats() {
    const stats = await Contribution.aggregate([
      {
        $group: {
          _id: null,
          totalMergedPRs: { $sum: 1 },
          contributors: { $addToSet: "$memberName" },
          orgs: { $addToSet: "$orgLogin" },
        },
      },
    ]);
  
    return {
      totalMergedPRs: stats[0]?.totalMergedPRs || 0,
      totalContributors: stats[0]?.contributors.length || 0,
      totalOrganizations: stats[0]?.orgs.length || 0,
    };
  }
  export async function retagAllContributions() {
    const contributions = await Contribution.find({}, {
      _id: 1,
      orgLogin: 1,
    }).lean();
  
    let updatedCount = 0;
  
    for (const doc of contributions) {
      const newTag = getOrgTagSync(doc.orgLogin); // 👈 your existing logic
  
      const res = await Contribution.updateOne(
        { _id: doc._id },
        { $set: { tag: newTag } }
      );
  
      if (res.modifiedCount > 0) updatedCount++;
    }
  
    return {
      total: contributions.length,
      updated: updatedCount,
    };
  }