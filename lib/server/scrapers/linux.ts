/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RawContribution } from "./types";

const LINUX_LOG_BASE =
  "https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/log/";

const KERNEL_REPO = "torvalds/linux";
const KERNEL_ORG = "linux-kernel";

const KERNEL_AVATAR =
  "https://www.kernel.org/theme/images/logos/favicon.png";

const MAX_PAGES = 200;

export interface LinuxFetchOptions {
  kernelName: string;
  kernelEmail?: string;
  memberName: string;
  since?: Date;
}

interface ParsedCommit {
  hash: string;
  title: string;
  url: string;
  date: Date;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

async function fetchLinuxPage(
  query: string,
  offset: number
): Promise<string> {
  const params = new URLSearchParams({
    qt: "author",
    q: query,
    ofs: String(offset),
  });

  const url = `${LINUX_LOG_BASE}?${params.toString()}`;

  console.log(`[Linux] Fetching ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PointBlank-ContributionTracker/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Linux kernel returned ${response.status}`
    );
  }

  return response.text();
}

function parseLinuxCommits(html: string): ParsedCommit[] {
  const out: ParsedCommit[] = [];
  const seen = new Set<string>();

  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const link = row.match(
      /<a[^>]*href=['"]([^'"]*\/commit\/\?id=([0-9a-f]{40}))[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i
    );

    if (!link) continue;

    const hash = link[2];
    if (seen.has(hash)) continue;

    const title = stripHtml(link[3]);
    if (!title) continue;

    const ts = row.match(
      /title=['"](\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})['"]/
    );
    const day = row.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

    const date = ts
      ? new Date(`${ts[1]}T${ts[2]}${ts[3]}${ts[4]}:${ts[5]}`)
      : day
        ? new Date(`${day[1]}T00:00:00Z`)
        : null;

    if (!date || Number.isNaN(date.getTime())) {
      console.warn(`[Linux] Skipping row with unparseable date: ${hash}`);
      continue;
    }

    seen.add(hash);
    out.push({
      hash,
      title,
      url: new URL(link[1], LINUX_LOG_BASE).toString(),
      date,
    });
  }

  return out;
}

async function fetchCommitsForQuery(
  query: string,
  since: Date | undefined,
  label: string,
): Promise<ParsedCommit[]> {
  const collected: ParsedCommit[] = [];
  const seenHashes = new Set<string>();

  let offset = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchLinuxPage(query, offset);

    const commits = parseLinuxCommits(html);

    const rawHashes = new Set(
      [...html.matchAll(/commit\/\?id=([0-9a-f]{40})/g)].map((m) => m[1])
    );

    console.log(
      `[Linux DEBUG] ${label} page ${page}: html=${html.length} ` +
      `rawHashes=${rawHashes.size} parsed=${commits.length}`
    );

    if (rawHashes.size !== commits.length) {
      console.warn(
        `[Linux] ${label} page ${page}: parsed ${commits.length} of ` +
        `${rawHashes.size} commit hashes in the HTML — parser is dropping rows`
      );
    }

    if (commits.length === 0) break;

    let newOnPage = 0;
    let newerThanSince = 0;

    for (const commit of commits) {
      if (seenHashes.has(commit.hash)) continue;
      seenHashes.add(commit.hash);
      newOnPage++;

      if (since && commit.date <= since) continue;

      newerThanSince++;
      collected.push(commit);
    }

    if (newOnPage === 0) break;

    if (since && newerThanSince === 0) break;

    offset += commits.length;

    if (page === MAX_PAGES) {
      console.warn(`[Linux] ${label}: pagination safety limit reached`);
    }
  }

  return collected;
}

export async function fetchLinuxKernelPatches(
  options: LinuxFetchOptions
): Promise<RawContribution[]> {
  const {
    kernelName,
    kernelEmail,
    memberName,
    since,
  } = options;

  if (!kernelName?.trim() && !kernelEmail?.trim()) {
    console.warn(
      `[Linux] ${memberName}: no kernelName or kernelEmail configured`
    );

    return [];
  }

  const queries: Array<{ text: string; label: string }> = [];
  if (kernelName?.trim()) {
    queries.push({ text: kernelName.trim(), label: kernelName.trim() });
  }
  if (kernelEmail?.trim()) {
    queries.push({ text: kernelEmail.trim(), label: kernelEmail.trim() });
  }

  const seen = new Set<string>();
  const merged: ParsedCommit[] = [];

  try {
    for (const { text, label } of queries) {
      const commits = await fetchCommitsForQuery(text, since, label);

      for (const commit of commits) {
        if (seen.has(commit.hash)) continue;
        seen.add(commit.hash);
        merged.push(commit);
      }
    }
  } catch (error: any) {
    console.error(
      `[Linux] ${memberName}:`,
      error?.message ?? error
    );
  }

  const results: RawContribution[] = merged.map((commit) => ({
    memberName,

    username: kernelEmail?.trim() || kernelName,

    platform: "linux",

    repoFullName: KERNEL_REPO,

    orgLogin: KERNEL_ORG,

    orgAvatarUrl: KERNEL_AVATAR,

    orgHtmlUrl: "https://www.kernel.org/",

    title: commit.title,

    url: commit.url,

    mergedAt: commit.date,
  }));

  console.log(
    `[Linux] ${memberName} → ${results.length} mainline commits ` +
    `(from ${queries.length} quer${queries.length === 1 ? "y" : "ies"})`
  );

  return results;
}